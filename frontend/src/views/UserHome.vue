<template>
  <div class="activity-list-page">
    <div class="page-header">
      <h1 class="page-title">活动列表</h1>
      <el-button type="primary" :icon="Plus" @click="$router.push('/create-activity')">
        创建活动
      </el-button>
    </div>

    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      class="mb-16"
    />

    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable @change="loadActivities" style="width: 140px">
            <el-option label="进行中" value="open" />
            <el-option label="已关闭" value="closed" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filterForm.typeId" placeholder="全部类型" clearable @change="loadActivities" style="width: 160px">
            <el-option
              v-for="type in activityTypes"
              :key="type.id"
              :label="type.name"
              :value="type.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-skeleton :loading="loading" :rows="3" animated>
      <template #template>
        <el-skeleton-item variant="rect" style="height: 120px; margin-bottom: 16px" />
      </template>
      <template #default>
        <el-empty v-if="activities.length === 0" description="暂无活动" />

        <el-row :gutter="16" v-else>
          <el-col
            v-for="activity in activities"
            :key="activity.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <el-card class="activity-card" shadow="hover" @click="goToActivity(activity.id)">
              <div class="activity-header">
                <el-tag size="small">{{ activity.type_name }}</el-tag>
                <el-tag :type="getStatusType(activity.status)" size="small">
                  {{ statusText(activity.status) }}
                </el-tag>
              </div>
              <h3 class="activity-title">{{ activity.title }}</h3>
              <div class="activity-info">
                <div class="info-item" v-if="activity.scheduled_time">
                  <el-icon><Clock /></el-icon>
                  <span>{{ formatTime(activity.scheduled_time) }}</span>
                </div>
                <div class="info-item">
                  <el-icon><User /></el-icon>
                  <span>{{ activity.participant_count }} / {{ activity.max_participants }}</span>
                </div>
                <div class="info-item">
                  <el-icon><Avatar /></el-icon>
                  <span>{{ activity.creator_name }}</span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </template>
    </el-skeleton>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../stores/user'
import { Plus, Clock, User, Avatar } from '@element-plus/icons-vue'

const router = useRouter()

const activities = ref([])
const activityTypes = ref([])
const loading = ref(false)
const error = ref('')
const filterForm = reactive({
  status: '',
  typeId: ''
})

const statusText = (status) => {
  const map = {
    open: '进行中',
    closed: '已关闭',
    completed: '已完成'
  }
  return map[status] || status
}

const getStatusType = (status) => {
  const map = {
    open: 'success',
    closed: 'warning',
    completed: 'info'
  }
  return map[status] || ''
}

const formatTime = (time) => {
  return new Date(time).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadActivities = async () => {
  loading.value = true
  error.value = ''

  try {
    const params = new URLSearchParams()
    if (filterForm.status) params.append('status', filterForm.status)
    if (filterForm.typeId) params.append('typeId', filterForm.typeId)

    const response = await api.get(`/activities?${params.toString()}`)
    activities.value = response.data.activities
  } catch (err) {
    error.value = err.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
}

const loadActivityTypes = async () => {
  try {
    const response = await api.get('/activity-types')
    activityTypes.value = response.data.types
  } catch (err) {
    console.error('加载活动类型失败', err)
  }
}

const goToActivity = (id) => {
  router.push(`/activity/${id}`)
}

onMounted(() => {
  loadActivities()
  loadActivityTypes()
})
</script>

<style scoped>
.activity-list-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.filter-card {
  margin-bottom: 20px;
}

.activity-card {
  cursor: pointer;
  height: 100%;
  transition: all 0.3s;
}

.activity-card:hover {
  transform: translateY(-4px);
}

.activity-card :deep(.el-card__body) {
  padding: 16px;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.activity-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.info-item .el-icon {
  font-size: 14px;
  color: #909399;
}
</style>
