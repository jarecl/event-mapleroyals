import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * 生成 Access Token（短期）
 * @param {object} payload - 用户信息
 * @param {string} secret - JWT 密钥
 * @returns {string} token
 */
export function generateAccessToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

/**
 * 生成 Refresh Token（长期）
 * @param {object} payload - 用户信息
 * @param {string} secret - JWT 密钥
 * @returns {string} token
 */
export function generateRefreshToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

/**
 * 生成 JWT Token（兼容旧接口，使用 Access Token）
 * @param {object} payload - 用户信息
 * @param {string} secret - JWT 密钥
 * @returns {string} token
 */
export function generateToken(payload, secret) {
  return generateAccessToken(payload, secret);
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
 * 验证 JWT Token 并返回详细结果（用于区分错误类型）
 * @param {string} token - JWT Token
 * @param {string} secret - JWT 密钥
 * @returns {object} { valid: boolean, payload?: object, error?: string, expired?: boolean }
 */
export function verifyTokenDetailed(token, secret) {
  try {
    const payload = jwt.verify(token, secret);
    return { valid: true, payload };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token expired', expired: true };
    }
    return { valid: false, error: error.message };
  }
}

/**
 * 从 Cookie 中获取 Token
 * @param {Request} request - 请求对象
 * @returns {string|null} token 或 null
 */
export function getTokenFromCookie(request) {
  return getCookieValue(request, 'access_token');
}

/**
 * 从 Cookie 中获取 Refresh Token
 * @param {Request} request - 请求对象
 * @returns {string|null} token 或 null
 */
export function getRefreshTokenFromCookie(request) {
  return getCookieValue(request, 'refresh_token');
}

/**
 * 从 Cookie 中获取指定名称的值
 * @param {Request} request - 请求对象
 * @param {string} cookieName - Cookie 名称
 * @returns {string|null} cookie 值或 null
 */
function getCookieValue(request, cookieName) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === cookieName) {
      return value;
    }
  }
  return null;
}

/**
 * 生成 Cookie 设置字符串
 * @param {string} name - Cookie 名称
 * @param {string} value - Cookie 值
 * @param {number} maxAge - 有效期（秒）
 * @returns {string} Cookie 字符串
 */
export function createCookieString(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
}
