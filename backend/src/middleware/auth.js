import { verifyToken, getTokenFromCookie } from '../utils/jwt.js';

/**
 * JWT 认证中间件
 */
export function authMiddleware(secret) {
  return async (c, next) => {
    const token = getTokenFromCookie(c.req.raw);

    if (!token) {
      return c.json({ error: '未登录' }, 401);
    }

    const payload = verifyToken(token, secret);

    if (!payload) {
      return c.json({ error: '登录已过期，请重新登录' }, 401);
    }

    // 将用户信息存入 context
    c.set('user', payload);
    await next();
  };
}

/**
 * 获取当前登录用户信息
 * @param {Context} c - Hono context
 * @returns {object} 用户信息
 */
export function getCurrentUser(c) {
  return c.get('user');
}
