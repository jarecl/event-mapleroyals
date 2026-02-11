import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// PostgreSQL 连接配置（从环境变量读取）
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mapleroyals',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// 测试连接
pool.on('connect', () => {
  console.log('已连接到 PostgreSQL 数据库');
});

pool.on('error', (err) => {
  console.error('PostgreSQL 连接错误:', err);
});

export function getDatabase() {
  return {
    // 查询单行
    async get(sql, params = []) {
      const result = await pool.query(sql, params);
      return result.rows[0] || null;
    },

    // 查询多行
    async all(sql, params = []) {
      const result = await pool.query(sql, params);
      return result.rows;
    },

    // 执行语句（INSERT/UPDATE/DELETE）
    async run(sql, params = []) {
      const result = await pool.query(sql, params);
      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows[0]?.id || null
      };
    },

    // 执行原始 SQL（用于建表等）
    async exec(sql) {
      await pool.query(sql);
    }
  };
}

export async function closeDatabase() {
  await pool.end();
}
