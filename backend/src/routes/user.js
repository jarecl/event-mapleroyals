import { authMiddleware } from '../middleware/auth.js';
import { validateCharacterName, validateLevel, validateJob, validateGender, validateMarriageStatus, generateId } from '../utils/validation.js';
import { getCurrentUser } from '../middleware/auth.js';

/**
 * 创建用户路由
 * @param {Hono} app - Hono 应用
 */
export function createUserRoutes(app) {
  // 获取我的角色列表
  app.get('/api/user/roles', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);

      const roles = await DB.all(
        'SELECT id, character_name, job, level, gender, marriage_status, created_at FROM user_roles WHERE user_id = $1 ORDER BY created_at DESC',
        [currentUser.id]
      );

      return c.json({ roles });
    } catch (error) {
      console.error('获取角色列表错误:', error);
      return c.json({ error: '获取角色列表失败' }, 500);
    }
  });

  // 添加角色
  app.post('/api/user/roles', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);
      const { characterName, job, level, gender, marriageStatus } = await c.req.json();

      // 验证角色名称
      const nameValidation = validateCharacterName(characterName);
      if (!nameValidation.valid) {
        return c.json({ error: nameValidation.message }, 400);
      }

      // 验证职业
      const jobValidation = validateJob(job);
      if (!jobValidation.valid) {
        return c.json({ error: jobValidation.message }, 400);
      }

      // 验证等级
      const levelValidation = validateLevel(level);
      if (!levelValidation.valid) {
        return c.json({ error: levelValidation.message }, 400);
      }

      // 验证性别
      const genderValidation = validateGender(gender);
      if (!genderValidation.valid) {
        return c.json({ error: genderValidation.message }, 400);
      }

      // 验证婚姻状态
      const marriageValidation = validateMarriageStatus(marriageStatus);
      if (!marriageValidation.valid) {
        return c.json({ error: marriageValidation.message }, 400);
      }

      // 检查角色名是否已存在
      const existingRole = await DB.get(
        'SELECT id FROM user_roles WHERE character_name = $1',
        [characterName.trim()]
      );

      if (existingRole) {
        return c.json({ error: '该角色名已存在' }, 400);
      }

      // 创建角色
      const roleId = generateId();
      await DB.run(
        'INSERT INTO user_roles (id, user_id, character_name, job, level, gender, marriage_status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [roleId, currentUser.id, characterName.trim(), job, parseInt(level), gender, marriageStatus || 'single']
      );

      return c.json({ message: '角色添加成功', roleId });
    } catch (error) {
      console.error('添加角色错误:', error);
      return c.json({ error: '添加角色失败' }, 500);
    }
  });

  // 删除角色
  app.delete('/api/user/roles/:id', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);
      const { id } = c.req.param();

      // 检查角色是否属于当前用户
      const role = await DB.get(
        'SELECT id FROM user_roles WHERE id = $1 AND user_id = $2',
        [id, currentUser.id]
      );

      if (!role) {
        return c.json({ error: '角色不存在或无权删除' }, 404);
      }

      // 检查角色是否正在参与活动
      const participation = await DB.get(
        'SELECT a.title FROM activity_participants ap JOIN activities a ON ap.activity_id = a.id WHERE ap.role_id = $1 AND a.status = $2',
        [id, 'open']
      );

      if (participation) {
        return c.json({ error: `该角色正在参与活动 "${participation.title}"，请先退出活动` }, 400);
      }

      // 删除角色
      await DB.run('DELETE FROM user_roles WHERE id = $1', [id]);

      return c.json({ message: '角色删除成功' });
    } catch (error) {
      console.error('删除角色错误:', error);
      return c.json({ error: '删除角色失败' }, 500);
    }
  });

  // 更新角色
  app.put('/api/user/roles/:id', async (c, next) => {
    const { JWT_SECRET } = c.env;
    return authMiddleware(JWT_SECRET)(c, next);
  }, async (c) => {
    try {
      const { DB } = c.env;
      const currentUser = getCurrentUser(c);
      const { id } = c.req.param();
      const { characterName, job, level, gender, marriageStatus } = await c.req.json();

      // 检查角色是否属于当前用户
      const role = await DB.get(
        'SELECT id FROM user_roles WHERE id = $1 AND user_id = $2',
        [id, currentUser.id]
      );

      if (!role) {
        return c.json({ error: '角色不存在或无权修改' }, 404);
      }

      // 验证输入
      if (characterName) {
        const nameValidation = validateCharacterName(characterName);
        if (!nameValidation.valid) {
          return c.json({ error: nameValidation.message }, 400);
        }
      }

      if (job) {
        const jobValidation = validateJob(job);
        if (!jobValidation.valid) {
          return c.json({ error: jobValidation.message }, 400);
        }
      }

      if (level) {
        const levelValidation = validateLevel(level);
        if (!levelValidation.valid) {
          return c.json({ error: levelValidation.message }, 400);
        }
      }

      if (gender) {
        const genderValidation = validateGender(gender);
        if (!genderValidation.valid) {
          return c.json({ error: genderValidation.message }, 400);
        }
      }

      if (marriageStatus) {
        const marriageValidation = validateMarriageStatus(marriageStatus);
        if (!marriageValidation.valid) {
          return c.json({ error: marriageValidation.message }, 400);
        }
      }

      // 更新角色
      await DB.run(
        `UPDATE user_roles SET
          character_name = COALESCE($1, character_name),
          job = COALESCE($2, job),
          level = COALESCE($3, level),
          gender = COALESCE($4, gender),
          marriage_status = COALESCE($5, marriage_status)
        WHERE id = $6`,
        [
          characterName?.trim() || null,
          job || null,
          level ? parseInt(level) : null,
          gender || null,
          marriageStatus || null,
          id
        ]
      );

      return c.json({ message: '角色更新成功' });
    } catch (error) {
      console.error('更新角色错误:', error);
      return c.json({ error: '更新角色失败' }, 500);
    }
  });
}
