import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mapleroyals',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function runMigration() {
  try {
    await pool.query('ALTER TABLE activity_participants ADD COLUMN IF NOT EXISTS position_preferences TEXT;');
    console.log('成功添加 position_preferences 字段到 activity_participants 表');
  } catch (err) {
    console.error('添加字段失败:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
