<template>
  <div class="reset-password-page">
    <el-card class="reset-card">
      <template #header>
        <div class="card-header">
          <el-icon :size="28" color="#409eff"><Lock /></el-icon>
          <span>忘记密码</span>
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
        @submit.prevent="handleReset"
      >
        <el-form-item prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入您的QQ号"
            :prefix-icon="User"
            size="large"
            maxlength="13"
            clearable
          />
          <div class="form-hint">提交后需要管理员审批，审批通过后可用空密码登录并设置新密码</div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="submit-btn"
            @click="handleReset"
          >
            {{ loading ? '提交中...' : '提交申请' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="auth-links">
        <el-link type="primary" @click="$router.push('/login')">
          返回登录
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
  username: ''
})

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

const rules = {
  username: [{ validator: validateUsername, trigger: 'blur' }]
}

const loading = ref(false)
const error = ref('')
const success = ref('')

const handleReset = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const result = await userStore.forgotPassword(formData.username)
    success.value = result.message
    formData.username = ''
    formRef.value?.resetFields()
  } catch (err) {
    error.value = err.response?.data?.error || '提交失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reset-password-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2ff 0%, #f0f9ff 100%);
  padding: 20px;
}

.reset-card {
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

.submit-btn {
  width: 100%;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.auth-links {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
