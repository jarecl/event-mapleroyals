import { hashPassword, verifyPassword, validatePassword } from '../utils/password.js';
import { validateUsername, generateId } from '../utils/validation.js';
import { generateAccessToken, generateRefreshToken, createCookieString, verifyTokenDetailed, getRefreshTokenFromCookie } from '../utils/jwt.js';
import { authMiddleware, getCurrentUser } from '../middleware/auth.js';
import { storeRefreshToken, verifyRefreshToken, revokeRefreshToken } from '../redis.js';
import crypto from 'crypto';

const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15分钟
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7天

/**
 * 创建认证路由
 * @param {Hono} app - Hono 应用
 */
export function createAuthRoutes(app) {
  // 应用认证中间件到需要登录的路由
  app.use('/api/auth/user', authMiddleware(app.env?.JWT_SECRET || process.env.JWT_SECRET || ''));
  app.use('/api/auth/change-password', authMiddleware(app.env?.JWT_SECRET || process.env.JWT_SECRET || ''));
  // 用户注册
  app.post('/api/auth/register', async (c) => {
    try {
      const { DB } = c.env;
      const { username, password, confirmPassword } = await c.req.json();

      // 验证用户名
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return c.json({ error: usernameValidation.message }, 400);
      }

      // 验证密码
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return c.json({ error: passwordValidation.message }, 400);
      }

      // 确认密码
      if (password !== confirmPassword) {
        return c.json({ error: '两次输入的密码不一致' }, 400);
      }

      // 检查是否已存在待处理的注册请求
      const existingRequest = await DB.get(
        'SELECT id FROM registration_requests WHERE username = $1 AND status = $2',
        [username, 'pending']
      );

      if (existingRequest) {
        return c.json({ error: '该用户名已有待审批的注册申请' }, 400);
      }

      // 检查用户是否已存在
      const existingUser = await DB.get(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUser) {
        return c.json({ error: '该用户名已被注册' }, 400);
      }

      // 加密密码
      const passwordHash = await hashPassword(password);

      // 创建注册请求
      const requestId = generateId();
      await DB.run(
        'INSERT INTO registration_requests (id, username, password_hash, status) VALUES ($1, $2, $3, $4)',
        [requestId, username, passwordHash, 'pending']
      );

      return c.json({ message: '注册申请已提交，请等待管理员审批' });
    } catch (error) {
      console.error('注册错误:', error);
      return c.json({ error: '注册失败，请稍后重试' }, 500);
    }
  });

  // 用户登录
  app.post('/api/auth/login', async (c) => {
    try {
      const { DB, JWT_SECRET } = c.env;
      const { username, password, newPassword } = await c.req.json();

      // 查找用户
      const user = await DB.get(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (!user) {
        return c.json({ error: '用户名或密码错误' }, 401);
      }

      // 检查是否需要强制修改密码
      if (user.must_change_password === true) {
        // 检查是否提供了新密码
        if (!newPassword) {
          // 检查是否是空密码登录（密码重置后首次登录）
          if (password === '') {
            return c.json({ error: '请设置新密码', mustChangePassword: true }, 200);
          }
          return c.json({ error: '首次登录需要修改密码', mustChangePassword: true }, 200);
        }

        // 验证新密码
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
          return c.json({ error: passwordValidation.message }, 400);
        }

        // 更新密码
        const newPasswordHash = await hashPassword(newPassword);
        await DB.run(
          'UPDATE users SET password_hash = $1, must_change_password = $2 WHERE id = $3',
          [newPasswordHash, false, user.id]
        );

        // 生成双 Token
        const userPayload = { id: user.id, username: user.username, isAdmin: user.is_admin === true };
        const accessToken = generateAccessToken(userPayload, JWT_SECRET);
        const refreshToken = generateRefreshToken(userPayload, JWT_SECRET);

        // 存储 Refresh Token 到 Redis
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await storeRefreshToken(tokenHash, user.id, REFRESH_TOKEN_MAX_AGE);

        return c.json({
          message: '密码修改成功',
          user: userPayload
        }, 200, {
          'Set-Cookie': [
            createCookieString('access_token', accessToken, ACCESS_TOKEN_MAX_AGE),
            createCookieString('refresh_token', refreshToken, REFRESH_TOKEN_MAX_AGE)
          ]
        });
      }

      // 验证密码
      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        return c.json({ error: '用户名或密码错误' }, 401);
      }

      // 生成双 Token
      const userPayload = { id: user.id, username: user.username, isAdmin: user.is_admin === true };
      const accessToken = generateAccessToken(userPayload, JWT_SECRET);
      const refreshToken = generateRefreshToken(userPayload, JWT_SECRET);

      // 存储 Refresh Token 到 Redis
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await storeRefreshToken(tokenHash, user.id, REFRESH_TOKEN_MAX_AGE);

      return c.json({
        message: '登录成功',
        user: userPayload
      }, 200, {
        'Set-Cookie': [
          createCookieString('access_token', accessToken, ACCESS_TOKEN_MAX_AGE),
          createCookieString('refresh_token', refreshToken, REFRESH_TOKEN_MAX_AGE)
        ]
      });
    } catch (error) {
      console.error('登录错误:', error);
      return c.json({ error: '登录失败，请稍后重试' }, 500);
    }
  });

  // 忘记密码
  app.post('/api/auth/forgot-password', async (c) => {
    try {
      const { DB } = c.env;
      const { username } = await c.req.json();

      // 验证用户名
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return c.json({ error: usernameValidation.message }, 400);
      }

      // 检查用户是否存在
      const user = await DB.get(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (!user) {
        return c.json({ error: '用户不存在' }, 404);
      }

      // 检查是否已存在待处理的密码重置请求
      const existingRequest = await DB.get(
        'SELECT id FROM password_reset_requests WHERE user_id = $1 AND status = $2',
        [user.id, 'pending']
      );

      if (existingRequest) {
        return c.json({ error: '已有待处理的密码重置申请' }, 400);
      }

      // 创建密码重置请求
      const requestId = generateId();
      await DB.run(
        'INSERT INTO password_reset_requests (id, user_id, status) VALUES ($1, $2, $3)',
        [requestId, user.id, 'pending']
      );

      return c.json({ message: '密码重置申请已提交，请等待管理员审批' });
    } catch (error) {
      console.error('忘记密码错误:', error);
      return c.json({ error: '提交失败，请稍后重试' }, 500);
    }
  });

  // 修改密码
  app.post('/api/auth/change-password', async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);

      // 检查用户是否登录
      if (!currentUser) {
        return c.json({ error: '未登录' }, 401);
      }

      const { oldPassword, newPassword } = await c.req.json();

      // 验证新密码
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return c.json({ error: passwordValidation.message }, 400);
      }

      // 获取用户信息
      const user = await DB.get(
        'SELECT * FROM users WHERE id = $1',
        [currentUser.id]
      );

      if (!user) {
        return c.json({ error: '用户不存在' }, 404);
      }

      // 验证旧密码
      const isValid = await verifyPassword(oldPassword, user.password_hash);
      if (!isValid) {
        return c.json({ error: '原密码错误' }, 400);
      }

      // 更新密码
      const newPasswordHash = await hashPassword(newPassword);
      await DB.run(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, user.id]
      );

      return c.json({ message: '密码修改成功' });
    } catch (error) {
      console.error('修改密码错误:', error);
      return c.json({ error: '修改失败，请稍后重试' }, 500);
    }
  });

  // 获取当前用户信息
  app.get('/api/auth/user', async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);

      // 检查用户是否登录
      if (!currentUser) {
        return c.json({ error: '未登录' }, 401);
      }

      const user = await DB.get(
        'SELECT id, username, is_admin, must_change_password, created_at FROM users WHERE id = $1',
        [currentUser.id]
      );

      if (!user) {
        return c.json({ error: '用户不存在' }, 404);
      }

      return c.json({
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.is_admin === true,
          mustChangePassword: user.must_change_password === true,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('获取用户信息错误:', error);
      return c.json({ error: '获取用户信息失败' }, 500);
    }
  });

  // 刷新 Token 接口（供前端主动刷新使用）
  app.post('/api/auth/refresh', async (c) => {
    try {
      const { DB, JWT_SECRET } = c.env;
      const refreshToken = getRefreshTokenFromCookie(c.req.raw);

      if (!refreshToken) {
        return c.json({ error: '登录已过期，请重新登录' }, 401);
      }

      // 验证 Refresh Token
      const refreshResult = verifyTokenDetailed(refreshToken, JWT_SECRET);

      if (!refreshResult.valid) {
        return c.json({ error: 'Refresh Token 无效' }, 401);
      }

      // 检查 Refresh Token 是否有效（Redis 验证）
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const storedToken = await verifyRefreshToken(tokenHash);

      if (!storedToken) {
        return c.json({ error: 'Refresh Token 已失效' }, 401);
      }

      // 生成新的 Token 对
      const userPayload = {
        id: refreshResult.payload.id,
        username: refreshResult.payload.username,
        isAdmin: refreshResult.payload.isAdmin
      };

      const newAccessToken = generateAccessToken(userPayload, JWT_SECRET);
      const newRefreshToken = generateRefreshToken(userPayload, JWT_SECRET);
      const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

      // 撤销旧的 Refresh Token（删除 Redis 键）
      await revokeRefreshToken(tokenHash);

      // 存储新的 Refresh Token 到 Redis
      await storeRefreshToken(newTokenHash, userPayload.id, REFRESH_TOKEN_MAX_AGE);

      return c.json({
        message: 'Token 刷新成功',
        user: userPayload
      }, 200, {
        'Set-Cookie': [
          createCookieString('access_token', newAccessToken, ACCESS_TOKEN_MAX_AGE),
          createCookieString('refresh_token', newRefreshToken, REFRESH_TOKEN_MAX_AGE)
        ]
      });
    } catch (error) {
      console.error('刷新 Token 错误:', error);
      return c.json({ error: '刷新失败' }, 500);
    }
  });

  // 退出登录
  app.post('/api/auth/logout', async (c) => {
    try {
      const { DB } = c.env;
      const refreshToken = getRefreshTokenFromCookie(c.req.raw);

      // 如果存在 Refresh Token，将其撤销（从 Redis 删除）
      if (refreshToken) {
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await revokeRefreshToken(tokenHash);
      }

      return c.json({ message: '已退出登录' }, 200, {
        'Set-Cookie': [
          createCookieString('access_token', '', 0),
          createCookieString('refresh_token', '', 0)
        ]
      });
    } catch (error) {
      console.error('退出登录错误:', error);
      return c.json({ error: '退出失败' }, 500);
    }
  });
}
