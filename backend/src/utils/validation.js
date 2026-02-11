/**
 * 验证用户名（QQ号）
 * 必须是纯数字，最大13位
 * @param {string} username - 用户名
 * @returns {object} { valid: boolean, message: string }
 */
export function validateUsername(username) {
  if (!username || username.length === 0) {
    return { valid: false, message: '用户名不能为空' };
  }

  if (!/^\d+$/.test(username)) {
    return { valid: false, message: '用户名必须是纯数字（QQ号）' };
  }

  if (username.length > 13) {
    return { valid: false, message: '用户名不能超过13位' };
  }

  return { valid: true, message: '' };
}

/**
 * 验证角色名称
 * @param {string} name - 角色名称
 * @returns {object} { valid: boolean, message: string }
 */
export function validateCharacterName(name) {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: '角色名称不能为空' };
  }

  if (name.length > 20) {
    return { valid: false, message: '角色名称不能超过20个字符' };
  }

  return { valid: true, message: '' };
}

/**
 * 验证等级
 * @param {number} level - 等级
 * @returns {object} { valid: boolean, message: string }
 */
export function validateLevel(level) {
  const num = parseInt(level);
  if (isNaN(num) || num < 1 || num > 200) {
    return { valid: false, message: '等级必须在1-200之间' };
  }
  return { valid: true, message: '' };
}

/**
 * 验证职业
 * @param {string} job - 职业
 * @returns {object} { valid: boolean, message: string }
 */
export function validateJob(job) {
  const validJobs = [
    'Beginner', 'Warrior', 'Magician', 'Bowman', 'Thief', 'Pirate',
    'Fighter', 'Page', 'Spearman', 'FPWizard', 'ILWizard', 'Cleric',
    'Hunter', 'Crossbowman', 'Assassin', 'Bandit', 'Brawler', 'Gunslinger',
    'Crusader', 'WhiteKnight', 'DragonKnight', 'FPMage', 'ILMage', 'Priest',
    'Ranger', 'Sniper', 'Hermit', 'ChiefBandit', 'Marauder', 'Outlaw',
    'Hero', 'Paladin', 'DarkKnight', 'FPArchMage', 'ILArchMage', 'Bishop',
    'Bowmaster', 'Marksman', 'NightLord', 'Shadower', 'Buccaneer', 'Corsair'
  ];

  if (!job || !validJobs.includes(job)) {
    return { valid: false, message: '无效的职业' };
  }
  return { valid: true, message: '' };
}

/**
 * 验证性别
 * @param {string} gender - 性别
 * @returns {object} { valid: boolean, message: string }
 */
export function validateGender(gender) {
  if (!['male', 'female'].includes(gender)) {
    return { valid: false, message: '性别必须是 male 或 female' };
  }
  return { valid: true, message: '' };
}

/**
 * 验证婚姻状态
 * @param {string} status - 婚姻状态
 * @returns {object} { valid: boolean, message: string }
 */
export function validateMarriageStatus(status) {
  if (status && !['groom', 'bride', 'single'].includes(status)) {
    return { valid: false, message: '无效的婚姻状态' };
  }
  return { valid: true, message: '' };
}

/**
 * 生成 UUID
 * @returns {string} UUID
 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
