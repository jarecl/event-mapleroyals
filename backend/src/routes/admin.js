import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import { generateId } from '../utils/validation.js';

/**
 * 创建管理员路由
 * @param {Hono} app - Hono 应用
 */
export function createAdminRoutes(app) {
  // 管理员认证中间件组合
  const adminAuth = async (c, next) => {
    const { JWT_SECRET } = c.env;
    // 先验证登录
    await authMiddleware(JWT_SECRET)(c, async () => {
      // 再验证管理员权限
      await adminMiddleware(c, next);
    });
  };

  // 获取待处理工单
  app.get('/api/admin/pending', adminAuth, async (c) => {
    try {
      const { DB } = c.env;

      // 获取待处理的注册请求
      const registrationRequests = await DB.all(
        'SELECT id, username, nickname, status, created_at FROM registration_requests WHERE status = $1 ORDER BY created_at DESC',
        ['pending']
      );

      // 获取待处理的密码重置请求
      const passwordResetRequests = await DB.all(
        `SELECT prr.id, prr.user_id, u.username, prr.status, prr.created_at
         FROM password_reset_requests prr
         JOIN users u ON prr.user_id = u.id
         WHERE prr.status = $1
         ORDER BY prr.created_at DESC`,
        ['pending']
      );

      return c.json({
        registrations: registrationRequests,
        passwordResets: passwordResetRequests
      });
    } catch (error) {
      console.error('获取待处理工单错误:', error);
      return c.json({ error: '获取工单失败' }, 500);
    }
  });

  // 获取已完成工单
  app.get('/api/admin/completed', adminAuth, async (c) => {
    try {
      const { DB } = c.env;
      const { type, page = 1, limit = 20 } = c.req.query();
      const offset = (page - 1) * limit;

      let results = [];

      if (type === 'registration' || !type) {
        const registrations = await DB.all(
          `SELECT rr.id, rr.username, rr.nickname, rr.status, rr.admin_note, rr.created_at, rr.processed_at,
                  u.username as processed_by_name
           FROM registration_requests rr
           LEFT JOIN users u ON rr.processed_by = u.id
           WHERE rr.status != 'pending'
           ORDER BY rr.processed_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

        results = [...results, ...registrations.map(r => ({ ...r, type: 'registration' }))];
      }

      if (type === 'password_reset' || !type) {
        const passwordResets = await DB.all(
          `SELECT prr.id, prr.user_id, u.username, prr.status, prr.admin_note,
                  prr.created_at, prr.processed_at, pu.username as processed_by_name
           FROM password_reset_requests prr
           JOIN users u ON prr.user_id = u.id
           LEFT JOIN users pu ON prr.processed_by = pu.id
           WHERE prr.status != 'pending'
           ORDER BY prr.processed_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

        results = [...results, ...passwordResets.map(r => ({ ...r, type: 'password_reset' }))];
      }

      // 按处理时间排序
      results.sort((a, b) => new Date(b.processed_at) - new Date(a.processed_at));

      return c.json({ results });
    } catch (error) {
      console.error('获取已完成工单错误:', error);
      return c.json({ error: '获取工单失败' }, 500);
    }
  });

  // 批准注册
  app.post('/api/admin/approve-registration/:id', adminAuth, async (c) => {
    try {
      const { DB } = c.env;
      const admin = c.get('user');
      const { id } = c.req.param();
      const body = await c.req.json().catch(() => ({}));
      const note = body.note;

      // 获取注册请求
      const request = await DB.get(
        'SELECT * FROM registration_requests WHERE id = $1 AND status = $2',
        [id, 'pending']
      );

      if (!request) {
        return c.json({ error: '注册申请不存在或已处理' }, 404);
      }

      // 创建用户
      const userId = generateId();
      await DB.run(
        'INSERT INTO users (id, username, nickname, password_hash, is_admin, must_change_password) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, request.username, request.nickname, request.password_hash, false, false]
      );

      // 更新注册请求状态
      await DB.run(
        'UPDATE registration_requests SET status = $1, admin_note = $2, processed_at = CURRENT_TIMESTAMP, processed_by = $3 WHERE id = $4',
        ['approved', note || null, admin.id, id]
      );

      return c.json({ message: '注册申请已批准' });
    } catch (error) {
      console.error('批准注册错误:', error);
      return c.json({ error: '批准失败' }, 500);
    }
  });

  // 拒绝注册
  app.post('/api/admin/reject-registration/:id', adminAuth, async (c) => {
    try {
      const { DB } = c.env;
      const admin = c.get('user');
      const { id } = c.req.param();
      const { note } = await c.req.json();

      // 更新注册请求状态
      const result = await DB.run(
        'UPDATE registration_requests SET status = $1, admin_note = $2, processed_at = CURRENT_TIMESTAMP, processed_by = $3 WHERE id = $4 AND status = $5',
        ['rejected', note || null, admin.id, id, 'pending']
      );

      if (result.changes === 0) {
        return c.json({ error: '注册申请不存在或已处理' }, 404);
      }

      return c.json({ message: '注册申请已拒绝' });
    } catch (error) {
      console.error('拒绝注册错误:', error);
      return c.json({ error: '拒绝失败' }, 500);
    }
  });

  // 批准密码重置
  app.post('/api/admin/approve-password-reset/:id', adminAuth, async (c) => {
    try {
      const { DB } = c.env;
      const admin = c.get('user');
      const { id } = c.req.param();
      const body = await c.req.json().catch(() => ({}));
      const note = body.note;

      // 获取密码重置请求
      const request = await DB.get(
        'SELECT * FROM password_reset_requests WHERE id = $1 AND status = $2',
        [id, 'pending']
      );

      if (!request) {
        return c.json({ error: '密码重置申请不存在或已处理' }, 404);
      }

      // 设置用户必须修改密码，并清空当前密码
      await DB.run(
        'UPDATE users SET must_change_password = $1, password_hash = $2 WHERE id = $3',
        [true, '', request.user_id]
      );

      // 更新密码重置请求状态
      await DB.run(
        'UPDATE password_reset_requests SET status = $1, admin_note = $2, processed_at = CURRENT_TIMESTAMP, processed_by = $3 WHERE id = $4',
        ['approved', note || null, admin.id, id]
      );

      return c.json({ message: '密码重置申请已批准，用户可用空密码登录并设置新密码' });
    } catch (error) {
      console.error('批准密码重置错误:', error);
      return c.json({ error: '批准失败' }, 500);
    }
  });

  // 拒绝密码重置
  app.post('/api/admin/reject-password-reset/:id', adminAuth, async (c) => {
    try {
      const { DB } = c.env;
      const admin = c.get('user');
      const { id } = c.req.param();
      const { note } = await c.req.json();

      // 更新密码重置请求状态
      const result = await DB.run(
        'UPDATE password_reset_requests SET status = $1, admin_note = $2, processed_at = CURRENT_TIMESTAMP, processed_by = $3 WHERE id = $4 AND status = $5',
        ['rejected', note || null, admin.id, id, 'pending']
      );

      if (result.changes === 0) {
        return c.json({ error: '密码重置申请不存在或已处理' }, 404);
      }

      return c.json({ message: '密码重置申请已拒绝' });
    } catch (error) {
      console.error('拒绝密码重置错误:', error);
      return c.json({ error: '拒绝失败' }, 500);
    }
  });

  // 获取活动类型列表
  app.get('/api/admin/activity-types', adminAuth, async (c) => {
    try {
      const { DB } = c.env;
      const types = await DB.all(
        'SELECT * FROM activity_types ORDER BY name'
      );

      return c.json({ types });
    } catch (error) {
      console.error('获取活动类型错误:', error);
      return c.json({ error: '获取活动类型失败' }, 500);
    }
  });

  // 创建活动类型
  app.post('/api/admin/activity-types', adminAuth, async (c) => {
    try {
      const { DB } = c.env;
      const { name, maxParticipants, description } = await c.req.json();

      if (!name || name.trim().length === 0) {
        return c.json({ error: '活动类型名称不能为空' }, 400);
      }

      const id = generateId();
      await DB.run(
        'INSERT INTO activity_types (id, name, max_participants, description) VALUES ($1, $2, $3, $4)',
        [id, name.trim(), maxParticipants || 10, description || null]
      );

      return c.json({ message: '活动类型创建成功', id });
    } catch (error) {
      console.error('创建活动类型错误:', error);
      return c.json({ error: '创建失败' }, 500);
    }
  });

  // 更新活动类型
  app.put('/api/admin/activity-types/:id', adminAuth, async (c) => {
    try {
      const { DB } = c.env;
      const { id } = c.req.param();
      const { name, maxParticipants, description } = await c.req.json();

      const result = await DB.run(
        'UPDATE activity_types SET name = $1, max_participants = $2, description = $3 WHERE id = $4',
        [name, maxParticipants, description, id]
      );

      if (result.changes === 0) {
        return c.json({ error: '活动类型不存在' }, 404);
      }

      return c.json({ message: '活动类型更新成功' });
    } catch (error) {
      console.error('更新活动类型错误:', error);
      return c.json({ error: '更新失败' }, 500);
    }
  });

  // 删除活动类型
  app.delete('/api/admin/activity-types/:id', adminAuth, async (c) => {
    try {
      const { DB } = c.env;
      const { id } = c.req.param();

      // 检查是否有活动使用此类型
      const activities = await DB.get(
        'SELECT COUNT(*) as count FROM activities WHERE type_id = $1',
        [id]
      );

      if (parseInt(activities.count) > 0) {
        return c.json({ error: '该活动类型下还有活动，无法删除' }, 400);
      }

      const result = await DB.run(
        'DELETE FROM activity_types WHERE id = $1',
        [id]
      );

      if (result.changes === 0) {
        return c.json({ error: '活动类型不存在' }, 404);
      }

      return c.json({ message: '活动类型删除成功' });
    } catch (error) {
      console.error('删除活动类型错误:', error);
      return c.json({ error: '删除失败' }, 500);
    }
  });

  // 获取所有用户列表
  app.get('/api/admin/users', adminAuth, async (c) => {
    try {
      const { DB } = c.env;
      const users = await DB.all(
        'SELECT id, username, nickname, is_admin, must_change_password, created_at FROM users ORDER BY created_at DESC'
      );

      return c.json({ users });
    } catch (error) {
      console.error('获取用户列表错误:', error);
      return c.json({ error: '获取用户列表失败' }, 500);
    }
  });
}
