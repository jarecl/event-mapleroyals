/**
 * 防抖管理器 - 用于防止接口重复请求
 */
class DebounceManager {
  constructor() {
    this.pendingRequests = new Map()
  }

  /**
   * 生成请求的唯一标识
   * @param {string} method - 请求方法
   * @param {string} url - 请求URL
   * @param {object} data - 请求数据
   * @returns {string} 唯一标识
   */
  getKey(method, url, data) {
    // 对于修改类操作，使用 method + url 生成 key
    // 对于相同 URL 的重复请求会被拦截
    return `${method}:${url}`
  }

  /**
   * 检查请求是否正在进行
   * @param {string} method - 请求方法
   * @param {string} url - 请求URL
   * @returns {boolean} 是否正在请求中
   */
  isPending(method, url) {
    const key = this.getKey(method, url)
    return this.pendingRequests.has(key)
  }

  /**
   * 标记请求开始
   * @param {string} method - 请求方法
   * @param {string} url - 请求URL
   * @returns {Function} 取消函数
   */
  start(method, url) {
    const key = this.getKey(method, url)
    this.pendingRequests.set(key, true)
    return () => this.remove(method, url)
  }

  /**
   * 移除请求记录
   * @param {string} method - 请求方法
   * @param {string} url - 请求URL
   */
  remove(method, url) {
    const key = this.getKey(method, url)
    this.pendingRequests.delete(key)
  }

  /**
   * 清除所有请求记录
   */
  clear() {
    this.pendingRequests.clear()
  }
}

// 创建全局防抖管理器实例
const debounceManager = new DebounceManager()

/**
 * 需要防抖的请求方法列表
 * 只对修改类操作进行防抖，GET 请求不防抖
 */
const DEBOUNCE_METHODS = ['post', 'put', 'delete', 'patch']

/**
 * 为 axios 实例添加防抖功能
 * @param {object} axiosInstance - axios 实例
 */
export function setupDebounce(axiosInstance) {
  // 请求拦截器
  axiosInstance.interceptors.request.use(
    (config) => {
      const method = config.method?.toLowerCase()

      // 只对修改类操作进行防抖
      if (DEBOUNCE_METHODS.includes(method)) {
        if (debounceManager.isPending(method, config.url)) {
          return Promise.reject({
            isDebounce: true,
            message: '请求正在处理中，请勿重复操作'
          })
        }
        config._cancelDebounce = debounceManager.start(method, config.url)
      }

      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  axiosInstance.interceptors.response.use(
    (response) => {
      // 请求成功，清除防抖记录
      if (response.config._cancelDebounce) {
        response.config._cancelDebounce()
      }
      return response
    },
    (error) => {
      // 请求失败，也要清除防抖记录
      if (error.config?._cancelDebounce) {
        error.config._cancelDebounce()
      }

      // 如果是防抖拦截的请求，静默处理（不显示错误提示）
      if (error.isDebounce) {
        return Promise.reject({ ...error, silent: true })
      }

      return Promise.reject(error)
    }
  )
}

export { debounceManager }
