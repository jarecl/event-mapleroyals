import { verifyToken, verifyTokenDetailed, getTokenFromCookie, getRefreshTokenFromCookie, generateAccessToken, generateRefreshToken, createCookieString } from '../utils/jwt.js';
import { storeRefreshToken, verifyRefreshToken, revokeRefreshToken } from '../redis.js';
import crypto from 'crypto';

const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15分钟
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7天

/**
 * JWT 认证中间件 - 支持双 Token 无感刷新
 */
export function authMiddleware(secret) {
  return async (c, next) => {
    const { DB } = c.env;
    const accessToken = getTokenFromCookie(c.req.raw);

    if (!accessToken) {
      return c.json({ error: '未登录' }, 401);
    }

    // 验证 Access Token
    const accessResult = verifyTokenDetailed(accessToken, secret);

    if (accessResult.valid) {
      // Access Token 有效，正常继续
      c.set('user', accessResult.payload);
      await next();
      return;
    }

    // Access Token 无效或过期，尝试使用 Refresh Token
    if (accessResult.expired) {
      const refreshToken = getRefreshTokenFromCookie(c.req.raw);

      if (!refreshToken) {
        return c.json({ error: '登录已过期，请重新登录' }, 401);
      }

      // 验证 Refresh Token
      const refreshResult = verifyTokenDetailed(refreshToken, secret);

      if (!refreshResult.valid) {
        return c.json({ error: '登录已过期，请重新登录' }, 401);
      }

      // 检查 Refresh Token 是否有效（Redis 验证）
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const storedToken = await verifyRefreshToken(tokenHash);

      if (!storedToken) {
        return c.json({ error: '登录已过期，请重新登录' }, 401);
      }

      // 生成新的 Token 对（Token 旋转）
      const userPayload = {
        id: refreshResult.payload.id,
        username: refreshResult.payload.username,
        isAdmin: refreshResult.payload.isAdmin
      };

      const newAccessToken = generateAccessToken(userPayload, secret);
      const newRefreshToken = generateRefreshToken(userPayload, secret);
      const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

      // 撤销旧的 Refresh Token（删除 Redis 键）
      await revokeRefreshToken(tokenHash);

      // 存储新的 Refresh Token 到 Redis（7天过期）
      await storeRefreshToken(newTokenHash, userPayload.id, REFRESH_TOKEN_MAX_AGE);

      // 设置新的 Cookie
      c.header('Set-Cookie', [
        createCookieString('access_token', newAccessToken, ACCESS_TOKEN_MAX_AGE),
        createCookieString('refresh_token', newRefreshToken, REFRESH_TOKEN_MAX_AGE)
      ]);

      // 将用户信息存入 context
      c.set('user', userPayload);
      await next();
      return;
    }

    // Access Token 验证失败（非过期原因）
    return c.json({ error: '登录已过期，请重新登录' }, 401);
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
