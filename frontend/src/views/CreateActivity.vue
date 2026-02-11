<template>
  <div class="create-activity-page">
    <h1 class="page-title">创建活动</h1>

    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      class="mb-16"
    />

    <el-card>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="活动类型" prop="typeId">
          <el-select
            v-model="form.typeId"
            placeholder="请选择活动类型"
            style="width: 100%"
          >
            <el-option
              v-for="type in activityTypes"
              :key="type.id"
              :label="`${type.name} (最多${type.max_participants}人)`"
              :value="type.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="活动标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入活动标题"
            maxlength="100"
            show-word-limit
            clearable
          />
        </el-form-item>

        <el-form-item label="活动时间">
          <el-date-picker
            v-model="form.scheduledTime"
            type="datetime"
            placeholder="请选择活动时间（可选）"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
            clearable
          />
        </el-form-item>

        <el-form-item label="活动描述">
          <el-input
            v-model="form.description"
            type="textarea"
            placeholder="请输入活动描述（可选）"
            :rows="5"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item>
          <el-button @click="$router.back()">取消</el-button>
          <el-button type="primary" :loading="loading" @click="handleCreate">
            {{ loading ? '创建中...' : '创建活动' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../stores/user'

const router = useRouter()
const formRef = ref()

const activityTypes = ref([])
const loading = ref(false)
const error = ref('')

const form = reactive({
  typeId: '',
  title: '',
  scheduledTime: '',
  description: ''
})

const rules = {
  typeId: [
    { required: true, message: '请选择活动类型', trigger: 'change' }
  ],
  title: [
    { required: true, message: '请输入活动标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度在2-100个字符', trigger: 'blur' }
  ]
}

const loadActivityTypes = async () => {
  try {
    const response = await api.get('/activity-types')
    activityTypes.value = response.data.types
  } catch (err) {
    console.error('加载活动类型失败', err)
  }
}

const handleCreate = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  error.value = ''

  try {
    const response = await api.post('/activities', {
      typeId: form.typeId,
      title: form.title,
      scheduledTime: form.scheduledTime || null,
      description: form.description || null
    })
    router.push(`/activity/${response.data.id}`)
  } catch (err) {
    // 防抖错误不显示提示
    if (!err.silent) {
      error.value = err.response?.data?.error || '创建失败'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadActivityTypes()
})
</script>

<style scoped>
.create-activity-page {
  max-width: 700px;
  margin: 0 auto;
}
</style>
