<template>
  <div class="register-container">
    <el-card class="register-card">
      <template #header>
        <div class="card-header">
          <el-icon :size="28" color="#409eff"><UserFilled /></el-icon>
          <span>注册账号</span>
        </div>
      </template>

      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        class="mb-16"
      />

      <el-alert
        v-if="success"
        :title="success"
        type="success"
        :closable="false"
        class="mb-16"
      />

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="0"
        @submit.prevent="handleRegister"
      >
        <el-form-item prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入QQ号"
            :prefix-icon="User"
            size="large"
            maxlength="13"
            clearable
          />
          <div class="form-hint">必须是纯数字，最多13位</div>
        </el-form-item>

        <el-form-item prop="nickname">
          <el-input
            v-model="formData.nickname"
            placeholder="请输入昵称如丁真"
            :prefix-icon="User"
            size="large"
            maxlength="20"
            clearable
          />
          <div class="form-hint">用于显示的昵称，最多20个字符</div>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码（数字+字母+符号）"
            :prefix-icon="Lock"
            size="large"
            maxlength="30"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="formData.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            :prefix-icon="Lock"
            size="large"
            maxlength="30"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="register-btn"
            @click="handleRegister"
          >
            {{ loading ? '提交中...' : '提交注册' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="auth-links">
        <el-link type="primary" @click="$router.push('/login')">
          已有账号？去登录
        </el-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { User, UserFilled, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()

const formData = reactive({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: ''
})

const validateNickname = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入昵称'))
  } else if (value.trim().length > 20) {
    callback(new Error('昵称不能超过20个字符'))
  } else {
    callback()
  }
}

const validateUsername = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入QQ号'))
  } else if (!/^\d+$/.test(value)) {
    callback(new Error('用户名必须是纯数字（QQ号）'))
  } else if (value.length > 13) {
    callback(new Error('用户名不能超过13位'))
  } else {
    callback()
  }
}

const validatePassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else if (!/\d/.test(value) || !/[a-zA-Z]/.test(value) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
    callback(new Error('密码必须包含数字、字母和特殊符号'))
  } else if (value.length > 30) {
    callback(new Error('密码不能超过30位'))
  } else {
    if (formData.confirmPassword) {
      formRef.value?.validateField('confirmPassword')
    }
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== formData.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [{ validator: validateUsername, trigger: 'blur' }],
  nickname: [{ validator: validateNickname, trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

const loading = ref(false)
const error = ref('')
const success = ref('')

const handleRegister = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const result = await userStore.register(
      formData.username,
      formData.nickname,
      formData.password,
      formData.confirmPassword
    )
    success.value = result.message
    formData.username = ''
    formData.nickname = ''
    formData.password = ''
    formData.confirmPassword = ''
    formRef.value?.resetFields()
  } catch (err) {
    error.value = err.response?.data?.error || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2ff 0%, #f0f9ff 100%);
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(64, 158, 255, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.register-btn {
  width: 100%;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.auth-links {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
