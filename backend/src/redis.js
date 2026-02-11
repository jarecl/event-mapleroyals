import { Redis } from 'ioredis';
import 'dotenv/config';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('Redis 连接失败，重试次数过多');
      return null;
    }
    return Math.min(times * 100, 3000);
  }
});

redis.on('connect', () => {
  console.log('Redis 连接成功');
});

redis.on('error', (err) => {
  console.error('Redis 错误:', err);
});

/**
 * 存储 Refresh Token 到 Redis
 * @param {string} tokenHash - Token 的 SHA256 哈希值
 * @param {string} userId - 用户ID
 * @param {number} ttl - 过期时间（秒）
 */
export async function storeRefreshToken(tokenHash, userId, ttl) {
  const key = `refresh_token:${tokenHash}`;
  await redis.setex(key, ttl, JSON.stringify({
    userId,
    createdAt: Date.now()
  }));
}

/**
 * 验证 Refresh Token 是否存在且有效
 * @param {string} tokenHash - Token 的 SHA256 哈希值
 * @returns {object|null} Token 信息或 null
 */
export async function verifyRefreshToken(tokenHash) {
  const key = `refresh_token:${tokenHash}`;
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data);
}

/**
 * 撤销 Refresh Token
 * @param {string} tokenHash - Token 的 SHA256 哈希值
 */
export async function revokeRefreshToken(tokenHash) {
  const key = `refresh_token:${tokenHash}`;
  await redis.del(key);
}

/**
 * 撤销用户的所有 Refresh Token（用于登出所有设备）
 * @param {string} userId - 用户ID
 */
export async function revokeAllUserTokens(userId) {
  // 扫描并删除该用户的所有 Token
  const pattern = 'refresh_token:*';
  let cursor = '0';
  
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const tokenInfo = JSON.parse(data);
        if (tokenInfo.userId === userId) {
          await redis.del(key);
        }
      }
    }
  } while (cursor !== '0');
}

export { redis };
