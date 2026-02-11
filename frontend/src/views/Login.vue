<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <el-icon :size="28" color="#409eff"><User /></el-icon>
          <span>用户登录</span>
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
        v-if="message"
        :title="message"
        type="success"
        :closable="false"
        class="mb-16"
      />

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="0"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入QQ号"
            :prefix-icon="User"
            size="large"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item v-if="mustChangePassword" prop="newPassword">
          <el-input
            v-model="formData.newPassword"
            type="password"
            placeholder="请设置新密码（数字+字母+符号）"
            :prefix-icon="Lock"
            size="large"
            show-password
            clearable
          />
          <div class="form-hint">首次登录需要修改密码</div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="auth-links">
        <el-link type="primary" @click="$router.push('/reset-password')">
          忘记密码
        </el-link>
        <el-link type="primary" @click="$router.push('/register')">
          注册账号
        </el-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()

const formData = reactive({
  username: '',
  password: '',
  newPassword: ''
})

const rules = {
  username: [
    { required: true, message: '请输入QQ号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ],
  newPassword: [
    {
      validator: (rule, value, callback) => {
        if (mustChangePassword.value && !value) {
          callback(new Error('请设置新密码'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const loading = ref(false)
const error = ref('')
const message = ref('')
const mustChangePassword = ref(false)

const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  error.value = ''
  message.value = ''

  try {
    const result = await userStore.login(
      formData.username,
      formData.password,
      mustChangePassword.value ? formData.newPassword : null
    )

    if (result.mustChangePassword) {
      mustChangePassword.value = true
      message.value = '请设置新密码'
    } else {
      router.push('/')
    }
  } catch (err) {
    error.value = err.response?.data?.error || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2ff 0%, #f0f9ff 100%);
  padding: 20px;
}

.login-card {
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

.login-btn {
  width: 100%;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.auth-links {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
}
</style>
