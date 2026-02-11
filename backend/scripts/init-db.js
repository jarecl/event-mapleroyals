import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const { Pool, Client } = pg;

const dbName = process.env.DB_NAME || 'mapleroyals';

console.log('初始化数据库...');

async function initDatabase() {
  // 第一步：连接到 postgres 数据库（用于创建目标数据库）
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    await client.connect();
    
    // 检查数据库是否存在
    const checkResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    
    if (checkResult.rows.length === 0) {
      // 数据库不存在，创建它
      console.log(`数据库 ${dbName} 不存在，正在创建...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`数据库 ${dbName} 创建成功`);
    } else {
      console.log(`数据库 ${dbName} 已存在`);
    }
    
    await client.end();
  } catch (error) {
    console.error('创建数据库失败:', error);
    await client.end();
    return;
  }

  // 第二步：连接到目标数据库，创建表
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: dbName,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    // 创建表
    await pool.query(`
      -- 用户表
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        must_change_password BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 注册审批工单
      CREATE TABLE IF NOT EXISTS registration_requests (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        processed_by TEXT
      );

      -- 密码重置工单
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        status TEXT DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        processed_by TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- 用户角色表
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        character_name TEXT NOT NULL,
        job TEXT NOT NULL,
        level INTEGER NOT NULL,
        gender TEXT NOT NULL,
        marriage_status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- 活动类型表
      CREATE TABLE IF NOT EXISTS activity_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        max_participants INTEGER DEFAULT 10,
        description TEXT
      );

      -- 活动表
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        type_id TEXT NOT NULL,
        creator_id TEXT NOT NULL,
        title TEXT NOT NULL,
        scheduled_time TIMESTAMP,
        description TEXT,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (type_id) REFERENCES activity_types(id),
        FOREIGN KEY (creator_id) REFERENCES users(id)
      );

      -- 活动参与者表
      CREATE TABLE IF NOT EXISTS activity_participants (
        id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (activity_id) REFERENCES activities(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (role_id) REFERENCES user_roles(id),
        UNIQUE(activity_id, role_id)
      );

      -- Refresh Token 表（用于 Token 旋转和黑名单）
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- 创建索引优化查询
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
    `);

    console.log('数据表创建完成');

    // 检查是否已有管理员账户
    const adminResult = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);

    if (adminResult.rows.length === 0) {
      // 创建默认管理员账户 (密码: admin)
      const passwordHash = bcrypt.hashSync('admin', 10);
      await pool.query(
        'INSERT INTO users (id, username, password_hash, is_admin, must_change_password) VALUES ($1, $2, $3, $4, $5)',
        ['admin-001', 'admin', passwordHash, true, true]
      );
      console.log('已创建默认管理员账户: admin / admin (首次登录需修改密码)');
    }

    // 初始化活动类型
    const typeResult = await pool.query('SELECT COUNT(*) as count FROM activity_types');
    const count = parseInt(typeResult.rows[0].count);

    if (count === 0) {
      const types = [
        ['type-apq', 'APQ', 6, 'Amorian Party Quest - 爱之派对任务'],
        ['type-ht', 'HT', 30, 'Horntail - 暗黑龙王'],
        ['type-zak', 'ZAK', 30, 'Zakum - 扎昆'],
        ['type-scar', 'SCAR', 30, 'Scarlion/Targa - 狮子王/塔格'],
        ['type-vl', 'VL', 6, 'Von Leon - 冯雷翁']
      ];

      for (const type of types) {
        await pool.query(
          'INSERT INTO activity_types (id, name, max_participants, description) VALUES ($1, $2, $3, $4)',
          type
        );
      }
      console.log('已初始化活动类型');
    }

    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化错误:', error);
  } finally {
    await pool.end();
  }
}

initDatabase();
