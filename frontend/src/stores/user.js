import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { setupDebounce } from '../utils/debounce'
import router from '../router'

// 配置 axios
const api = axios.create({
  baseURL: '/api',
  withCredentials: true
})

// 添加防抖功能
setupDebounce(api)

// Token 刷新状态管理
let isRefreshing = false
let refreshSubscribers = []

// 通知所有等待的请求
function onTokenRefreshed() {
  refreshSubscribers.forEach(callback => callback())
  refreshSubscribers = []
}

// 添加等待刷新的请求到队列
function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback)
}

// 刷新 Token
async function refreshToken() {
  try {
    const response = await axios.post('/api/auth/refresh', {}, {
      withCredentials: true
    })
    return response.data
  } catch (error) {
    throw error
  }
}

// 添加响应拦截器处理 Token 过期
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // 如果不是 401 错误，或者已经重试过，直接抛出错误
    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // 如果是刷新接口本身返回 401，说明 Refresh Token 也过期了
    if (originalRequest.url === '/auth/refresh') {
      return Promise.reject(error)
    }

    // 如果正在刷新，将请求加入队列等待
    if (isRefreshing) {
      return new Promise((resolve) => {
        addRefreshSubscriber(() => {
          resolve(api(originalRequest))
        })
      })
    }

    // 开始刷新
    originalRequest._retry = true
    isRefreshing = true

    try {
      await refreshToken()
      // 刷新成功，通知所有等待的请求
      onTokenRefreshed()
      isRefreshing = false
      // 重试原请求
      return api(originalRequest)
    } catch (refreshError) {
      // 刷新失败，跳转登录页
      isRefreshing = false
      refreshSubscribers = []
      // 保存当前路由，登录后跳转回来
      const currentPath = router.currentRoute.value.fullPath
      if (currentPath !== '/login') {
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
      }
      return Promise.reject(refreshError)
    }
  }
)

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const checked = ref(false)

  const isLoggedIn = computed(() => !!user.value)

  async function checkAuth() {
    try {
      const response = await api.get('/auth/user')
      user.value = response.data.user
    } catch (error) {
      user.value = null
    } finally {
      checked.value = true
    }
  }

  async function login(username, password, newPassword = null) {
    // 登录前重置刷新状态，避免旧状态影响
    isRefreshing = false
    refreshSubscribers = []
    
    const response = await api.post('/auth/login', { username, password, newPassword })
    user.value = response.data.user
    return response.data
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      user.value = null
      checked.value = true
      // 重置刷新状态，避免影响下次登录
      isRefreshing = false
      refreshSubscribers = []
    }
  }

  async function register(username, password, confirmPassword) {
    const response = await api.post('/auth/register', { username, password, confirmPassword })
    return response.data
  }

  async function forgotPassword(username) {
    const response = await api.post('/auth/forgot-password', { username })
    return response.data
  }

  async function changePassword(oldPassword, newPassword) {
    const response = await api.post('/auth/change-password', { oldPassword, newPassword })
    return response.data
  }

  return {
    user,
    checked,
    isLoggedIn,
    checkAuth,
    login,
    logout,
    register,
    forgotPassword,
    changePassword
  }
})

export { api }
