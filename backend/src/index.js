import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { createAuthRoutes } from './routes/auth.js';
import { createAdminRoutes } from './routes/admin.js';
import { createUserRoutes } from './routes/user.js';
import { createActivityRoutes } from './routes/activity.js';
import { getDatabase } from './db.js';

const app = new Hono();

// 中间件
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 将数据库注入到 context 中
app.use('*', async (c, next) => {
  c.env = {
    DB: getDatabase(),
    JWT_SECRET: process.env.JWT_SECRET || ''
  };
  await next();
});

// 健康检查
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'MapleRoyals Events API' });
});

// 认证路由
createAuthRoutes(app);

// 管理员路由
createAdminRoutes(app);

// 用户路由
createUserRoutes(app);

// 活动路由
createActivityRoutes(app);

// 错误处理
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

app.onError((err, c) => {
  console.error('Server Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

const port = process.env.PORT || 3001;

serve({
  fetch: app.fetch,
  port
});

console.log(`Server is running on http://localhost:${port}`);
