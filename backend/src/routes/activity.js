import { authMiddleware } from '../middleware/auth.js';
import { getCurrentUser } from '../middleware/auth.js';
import { generateId } from '../utils/validation.js';

/**
 * 创建活动路由
 * @param {Hono} app - Hono 应用
 */
export function createActivityRoutes(app) {
  // 获取活动类型列表（公开）
  app.get('/api/activity-types', async (c) => {
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

  // 获取活动列表
  app.get('/api/activities', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const { status, typeId } = c.req.query();

      let query = `
        SELECT a.*, at.name as type_name, at.max_participants,
               u.username as creator_name,
               (SELECT COUNT(*) FROM activity_participants ap WHERE ap.activity_id = a.id) as participant_count
        FROM activities a
        JOIN activity_types at ON a.type_id = at.id
        JOIN users u ON a.creator_id = u.id
      `;

      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (status) {
        conditions.push(`a.status = $${paramIndex++}`);
        params.push(status);
      }

      if (typeId) {
        conditions.push(`a.type_id = $${paramIndex++}`);
        params.push(typeId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY a.scheduled_time ASC, a.created_at DESC';

      const activities = await DB.all(query, params);

      return c.json({ activities });
    } catch (error) {
      console.error('获取活动列表错误:', error);
      return c.json({ error: '获取活动列表失败' }, 500);
    }
  });

  // 创建活动
  app.post('/api/activities', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);
      const { typeId, title, scheduledTime, description } = await c.req.json();

      if (!typeId) {
        return c.json({ error: '请选择活动类型' }, 400);
      }

      if (!title || title.trim().length === 0) {
        return c.json({ error: '请输入活动标题' }, 400);
      }

      // 检查活动类型是否存在
      const activityType = await DB.get(
        'SELECT id FROM activity_types WHERE id = $1',
        [typeId]
      );

      if (!activityType) {
        return c.json({ error: '活动类型不存在' }, 400);
      }

      const activityId = generateId();
      await DB.run(
        'INSERT INTO activities (id, type_id, creator_id, title, scheduled_time, description, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [activityId, typeId, currentUser.id, title.trim(), scheduledTime || null, description || null, 'open']
      );

      return c.json({ message: '活动创建成功', id: activityId });
    } catch (error) {
      console.error('创建活动错误:', error);
      return c.json({ error: '创建活动失败' }, 500);
    }
  });

  // 获取活动详情
  app.get('/api/activities/:id', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const { id } = c.req.param();

      const activity = await DB.get(
        `SELECT a.*, at.name as type_name, at.max_participants, at.description as type_description,
                u.username as creator_name
         FROM activities a
         JOIN activity_types at ON a.type_id = at.id
         JOIN users u ON a.creator_id = u.id
         WHERE a.id = $1`,
        [id]
      );

      if (!activity) {
        return c.json({ error: '活动不存在' }, 404);
      }

      // 获取参与者列表
      const participants = await DB.all(
        `SELECT ap.id as participation_id, ap.role_id, ap.joined_at,
                ur.character_name, ur.job, ur.level, ur.gender, ur.marriage_status,
                u.username
         FROM activity_participants ap
         JOIN user_roles ur ON ap.role_id = ur.id
         JOIN users u ON ap.user_id = u.id
         WHERE ap.activity_id = $1
         ORDER BY ap.joined_at ASC`,
        [id]
      );

      return c.json({
        activity: {
          ...activity,
          participants,
          participantCount: participants.length
        }
      });
    } catch (error) {
      console.error('获取活动详情错误:', error);
      return c.json({ error: '获取活动详情失败' }, 500);
    }
  });

  // 参加活动
  app.post('/api/activities/:id/join', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);
      const { id } = c.req.param();
      const { roleIds } = await c.req.json();

      if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
        return c.json({ error: '请选择要参与的角色' }, 400);
      }

      // 获取活动信息
      const activity = await DB.get(
        `SELECT a.*, at.max_participants,
                (SELECT COUNT(*) FROM activity_participants ap WHERE ap.activity_id = a.id) as current_count
         FROM activities a
         JOIN activity_types at ON a.type_id = at.id
         WHERE a.id = $1`,
        [id]
      );

      if (!activity) {
        return c.json({ error: '活动不存在' }, 404);
      }

      if (activity.status !== 'open') {
        return c.json({ error: '该活动已关闭，无法参加' }, 400);
      }

      // 检查人数限制
      if (parseInt(activity.current_count) + roleIds.length > activity.max_participants) {
        return c.json({
          error: `人数已满，当前 ${activity.current_count}/${activity.max_participants} 人，最多还能添加 ${activity.max_participants - activity.current_count} 个角色`
        }, 400);
      }

      // 验证角色是否属于当前用户
      for (const roleId of roleIds) {
        const role = await DB.get(
          'SELECT id FROM user_roles WHERE id = $1 AND user_id = $2',
          [roleId, currentUser.id]
        );

        if (!role) {
          return c.json({ error: '无效的角色选择' }, 400);
        }

        // 检查角色是否已参加此活动
        const existingParticipation = await DB.get(
          'SELECT id FROM activity_participants WHERE activity_id = $1 AND role_id = $2',
          [id, roleId]
        );

        if (existingParticipation) {
          return c.json({ error: '部分角色已参加此活动' }, 400);
        }
      }

      // 添加参与者
      for (const roleId of roleIds) {
        const participationId = generateId();
        await DB.run(
          'INSERT INTO activity_participants (id, activity_id, user_id, role_id) VALUES ($1, $2, $3, $4)',
          [participationId, id, currentUser.id, roleId]
        );
      }

      return c.json({ message: '成功参加活动' });
    } catch (error) {
      console.error('参加活动错误:', error);
      return c.json({ error: '参加活动失败' }, 500);
    }
  });

  // 取消参加活动
  app.delete('/api/activities/:id/leave', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);
      const { id } = c.req.param();
      const { roleId } = await c.req.json();

      if (!roleId) {
        // 如果没有指定 roleId，则取消该用户在此活动的所有参与
        await DB.run(
          'DELETE FROM activity_participants WHERE activity_id = $1 AND user_id = $2',
          [id, currentUser.id]
        );
      } else {
        // 取消指定角色的参与
        const participation = await DB.get(
          'SELECT id FROM activity_participants WHERE activity_id = $1 AND user_id = $2 AND role_id = $3',
          [id, currentUser.id, roleId]
        );

        if (!participation) {
          return c.json({ error: '未找到参与记录' }, 404);
        }

        await DB.run(
          'DELETE FROM activity_participants WHERE id = $1',
          [participation.id]
        );
      }

      return c.json({ message: '已取消参加' });
    } catch (error) {
      console.error('取消参加错误:', error);
      return c.json({ error: '取消参加失败' }, 500);
    }
  });

  // 更新活动状态（创建者或管理员）
  app.put('/api/activities/:id/status', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);
      const { id } = c.req.param();
      const { status } = await c.req.json();

      // 验证状态值
      const validStatuses = ['open', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return c.json({ error: '无效的状态值' }, 400);
      }

      const activity = await DB.get(
        'SELECT id, creator_id FROM activities WHERE id = $1',
        [id]
      );

      if (!activity) {
        return c.json({ error: '活动不存在' }, 404);
      }

      // 只有创建者或管理员可以更新状态
      if (activity.creator_id !== currentUser.id && !currentUser.isAdmin) {
        return c.json({ error: '只有活动创建者或管理员可以更新状态' }, 403);
      }

      await DB.run(
        'UPDATE activities SET status = $1 WHERE id = $2',
        [status, id]
      );

      const statusTextMap = {
        open: '募集中',
        in_progress: '进行中',
        completed: '已完成',
        cancelled: '已取消'
      };

      return c.json({ message: `活动状态已更新为${statusTextMap[status]}` });
    } catch (error) {
      console.error('更新活动状态错误:', error);
      return c.json({ error: '更新活动状态失败' }, 500);
    }
  });

  // 关闭活动（创建者）- 保留旧接口兼容
  app.post('/api/activities/:id/close', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);
      const { id } = c.req.param();

      const activity = await DB.get(
        'SELECT id, creator_id FROM activities WHERE id = $1',
        [id]
      );

      if (!activity) {
        return c.json({ error: '活动不存在' }, 404);
      }

      if (activity.creator_id !== currentUser.id && !currentUser.isAdmin) {
        return c.json({ error: '只有活动创建者或管理员可以关闭活动' }, 403);
      }

      await DB.run(
        'UPDATE activities SET status = $1 WHERE id = $2',
        ['cancelled', id]
      );

      return c.json({ message: '活动已关闭' });
    } catch (error) {
      console.error('关闭活动错误:', error);
      return c.json({ error: '关闭活动失败' }, 500);
    }
  });

  // 完成活动（创建者）- 保留旧接口兼容
  app.post('/api/activities/:id/complete', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);
      const { id } = c.req.param();

      const activity = await DB.get(
        'SELECT id, creator_id FROM activities WHERE id = $1',
        [id]
      );

      if (!activity) {
        return c.json({ error: '活动不存在' }, 404);
      }

      if (activity.creator_id !== currentUser.id && !currentUser.isAdmin) {
        return c.json({ error: '只有活动创建者或管理员可以完成活动' }, 403);
      }

      await DB.run(
        'UPDATE activities SET status = $1 WHERE id = $2',
        ['completed', id]
      );

      return c.json({ message: '活动已完成' });
    } catch (error) {
      console.error('完成活动错误:', error);
      return c.json({ error: '完成活动失败' }, 500);
    }
  });

  // 删除活动（创建者）
  app.delete('/api/activities/:id', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);
      const { id } = c.req.param();

      const activity = await DB.get(
        'SELECT id, creator_id FROM activities WHERE id = $1',
        [id]
      );

      if (!activity) {
        return c.json({ error: '活动不存在' }, 404);
      }

      if (activity.creator_id !== currentUser.id) {
        return c.json({ error: '只有活动创建者可以删除活动' }, 403);
      }

      // 先删除参与者记录
      await DB.run(
        'DELETE FROM activity_participants WHERE activity_id = $1',
        [id]
      );

      // 再删除活动
      await DB.run(
        'DELETE FROM activities WHERE id = $1',
        [id]
      );

      return c.json({ message: '活动已删除' });
    } catch (error) {
      console.error('删除活动错误:', error);
      return c.json({ error: '删除活动失败' }, 500);
    }
  });

  // 获取我参与的活动
  app.get('/api/activities/my/joined', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);

      const activities = await DB.all(
        `SELECT DISTINCT a.*, at.name as type_name, at.max_participants,
                u.username as creator_name,
                (SELECT COUNT(*) FROM activity_participants ap2 WHERE ap2.activity_id = a.id) as participant_count
         FROM activities a
         JOIN activity_types at ON a.type_id = at.id
         JOIN users u ON a.creator_id = u.id
         JOIN activity_participants ap ON ap.activity_id = a.id
         WHERE ap.user_id = $1
         ORDER BY a.scheduled_time ASC, a.created_at DESC`,
        [currentUser.id]
      );

      return c.json({ activities });
    } catch (error) {
      console.error('获取我参与的活动错误:', error);
      return c.json({ error: '获取活动列表失败' }, 500);
    }
  });

  // 获取我创建的活动
  app.get('/api/activities/my/created', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);

      const activities = await DB.all(
        `SELECT a.*, at.name as type_name, at.max_participants,
                (SELECT COUNT(*) FROM activity_participants ap WHERE ap.activity_id = a.id) as participant_count
         FROM activities a
         JOIN activity_types at ON a.type_id = at.id
         WHERE a.creator_id = $1
         ORDER BY a.scheduled_time ASC, a.created_at DESC`,
        [currentUser.id]
      );

      return c.json({ activities });
    } catch (error) {
      console.error('获取我创建的活动错误:', error);
      return c.json({ error: '获取活动列表失败' }, 500);
    }
  });
}
