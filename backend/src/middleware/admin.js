import { getCurrentUser } from './auth.js';

/**
 * 管理员权限中间件
 */
export async function adminMiddleware(c, next) {
  const user = getCurrentUser(c);

  if (!user || !user.isAdmin) {
    return c.json({ error: '需要管理员权限' }, 403);
  }

  await next();
}
