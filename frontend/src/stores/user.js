import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

// 配置 axios
const api = axios.create({
  baseURL: '/api',
  withCredentials: true
})

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const checked = ref(false)

  const isLoggedIn = computed(() => !!user.value)

  async function checkAuth() {
    try {
      const response = await api.get('/auth/me')
      user.value = response.data.user
    } catch (error) {
      user.value = null
    } finally {
      checked.value = true
    }
  }

  async function login(username, password, newPassword = null) {
    const response = await api.post('/auth/login', { username, password, newPassword })
    user.value = response.data.user
    return response.data
  }

  async function logout() {
    await api.post('/auth/logout')
    user.value = null
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
