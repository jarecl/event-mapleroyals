<template>
  <div class="my-activities-page">
    <h1 class="page-title">我的活动</h1>

    <el-radio-group v-model="activeTab" @change="loadActivities" class="tab-group">
      <el-radio-button label="joined">
        <el-icon><UserFilled /></el-icon>
        我参与的
      </el-radio-button>
      <el-radio-button label="created">
        <el-icon><CirclePlus /></el-icon>
        我创建的
      </el-radio-button>
    </el-radio-group>

    <el-skeleton :loading="loading" :rows="3" animated>
      <template #default>
        <el-empty
          v-if="activities.length === 0"
          :description="activeTab === 'joined' ? '暂无参与的活动' : '暂无创建的活动'"
        />

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
                <div class="info-item" v-if="activeTab === 'joined'">
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
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../stores/user'
import { UserFilled, CirclePlus, Clock, User, Avatar } from '@element-plus/icons-vue'

const router = useRouter()

const activeTab = ref('joined')
const activities = ref([])
const loading = ref(false)

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
  try {
    const endpoint = activeTab.value === 'joined'
      ? '/activities/my/joined'
      : '/activities/my/created'
    const response = await api.get(endpoint)
    activities.value = response.data.activities
  } catch (err) {
    console.error('加载活动失败', err)
  } finally {
    loading.value = false
  }
}

const goToActivity = (id) => {
  router.push(`/activity/${id}`)
}

watch(activeTab, () => {
  loadActivities()
})

onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.my-activities-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20px;
}

.tab-group {
  margin-bottom: 20px;
}

.tab-group :deep(.el-radio-button__inner) {
  display: flex;
  align-items: center;
  gap: 6px;
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
