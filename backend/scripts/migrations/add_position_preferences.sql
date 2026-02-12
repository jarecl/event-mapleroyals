-- 为APQ活动添加位置偏好功能
-- 执行此迁移前请备份数据库

-- 添加 position_preferences 字段到 activity_participants 表
-- 存储格式为 JSON 数组，如 '[1,2,3]' 表示偏好位置1、2、3
ALTER TABLE activity_participants
ADD COLUMN IF NOT EXISTS position_preferences TEXT;

-- 为新字段添加注释
COMMENT ON COLUMN activity_participants.position_preferences IS '位置偏好(JSON数组格式)，用于APQ等活动';
