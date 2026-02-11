import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = '7d';

/**
 * 生成 JWT Token
 * @param {object} payload - 用户信息
 * @param {string} secret - JWT 密钥
 * @returns {string} token
 */
export function generateToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 验证 JWT Token
 * @param {string} token - JWT Token
 * @param {string} secret - JWT 密钥
 * @returns {object|null} 解码后的 payload 或 null
 */
export function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

/**
 * 从 Cookie 中获取 Token
 * @param {Request} request - 请求对象
 * @returns {string|null} token 或 null
 */
export function getTokenFromCookie(request) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'auth_token') {
      return value;
    }
  }
  return null;
}
