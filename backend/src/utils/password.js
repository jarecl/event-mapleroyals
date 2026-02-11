import bcrypt from 'bcryptjs';

/**
 * 加密密码
 * @param {string} password - 明文密码
 * @returns {Promise<string>} 加密后的密码 hash
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hash - 存储的密码 hash
 * @returns {Promise<boolean>} 是否匹配
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * 验证密码强度
 * 必须包含数字、字母和特殊符号，最大30位
 * @param {string} password - 明文密码
 * @returns {object} { valid: boolean, message: string }
 */
export function validatePassword(password) {
  if (!password || password.length === 0) {
    return { valid: false, message: '密码不能为空' };
  }

  if (password.length > 30) {
    return { valid: false, message: '密码不能超过30位' };
  }

  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasNumber || !hasLetter || !hasSymbol) {
    return { valid: false, message: '密码必须包含数字、字母和特殊符号' };
  }

  return { valid: true, message: '' };
}
