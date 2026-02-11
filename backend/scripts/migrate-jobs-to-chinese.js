import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL 连接配置
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mapleroyals',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// 职业名称映射表（英文 -> 中文）
const jobMapping = {
  // 战士
  'Hero': '英雄',
  'Paladin': '圣骑士',
  'DarkKnight': '黑暗骑士',
  // 法师
  'Bishop': '主教',
  'ILArchMage': '冰雷法师',
  'FPArchMage': '火毒法师',
  // 射手
  'Bowmaster': '弓箭手',
  'Marksman': '弩手',
  // 飞侠
  'NightLord': '镖飞',
  'Shadower': '刀飞',
  // 海盗
  'Buccaneer': '拳手',
  'Corsair': '船长',
  // 其他未匹配的职业统一设为无输出能力小号
};

async function migrateJobs() {
  try {
    console.log('开始迁移职业名称...');
    await pool.connect();

    // 查看当前数据库中的职业分布
    const currentJobs = await pool.query('SELECT DISTINCT job FROM user_roles');
    console.log('当前数据库中的职业:', currentJobs.rows.map(r => r.job));

    // 更新职业名称
    let updateCount = 0;
    for (const [englishName, chineseName] of Object.entries(jobMapping)) {
      const result = await pool.query(
        'UPDATE user_roles SET job = $1 WHERE job = $2',
        [chineseName, englishName]
      );
      if (result.rowCount > 0) {
        console.log(`更新: ${englishName} -> ${chineseName} (${result.rowCount} 条记录)`);
        updateCount += result.rowCount;
      }
    }

    // 对于没有映射的职业，如果存在，询问用户如何处理
    const unmappedJobs = await pool.query(`
      SELECT DISTINCT job FROM user_roles
      WHERE job NOT IN (${Object.keys(jobMapping).map((_, i) => `$${i + 1}`).join(', ')})
      AND job NOT IN (${Object.values(jobMapping).map((_, i) => `$${Object.keys(jobMapping).length + i + 1}`).join(', ')})
    `, [...Object.keys(jobMapping), ...Object.values(jobMapping)]);

    if (unmappedJobs.rows.length > 0) {
      console.log('\n未映射的职业:', unmappedJobs.rows.map(r => r.job));
      console.log('这些职业保持不变，如需修改请手动处理');
    }

    console.log(`\n迁移完成！共更新 ${updateCount} 条记录`);

  } catch (error) {
    console.error('迁移错误:', error);
  } finally {
    await pool.end();
  }
}

migrateJobs();
