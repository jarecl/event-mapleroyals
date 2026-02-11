<template>
  <div class="activity-detail-page">
    <el-skeleton :loading="loading" :rows="5" animated>
      <template #default>
        <template v-if="activity">
          <!-- 页面头部 -->
          <div class="page-header">
            <h1 class="page-title">{{ activity.title }}</h1>
            <div class="action-buttons">
              <el-button
                v-if="isCreator && activity.status === 'open'"
                @click="closeActivity"
              >
                关闭活动
              </el-button>
              <el-button
                v-if="isCreator"
                type="danger"
                @click="deleteActivity"
              >
                删除活动
              </el-button>
            </div>
          </div>

          <!-- 活动信息卡片 -->
          <el-descriptions :column="2" border class="mb-16">
            <el-descriptions-item label="活动类型">
              <el-tag type="primary">{{ activity.type_name }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getStatusType(activity.status)">
                {{ statusText(activity.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="人数">
              {{ activity.participantCount }} / {{ activity.max_participants }}
            </el-descriptions-item>
            <el-descriptions-item label="创建者">
              {{ activity.creator_name }}
            </el-descriptions-item>
            <el-descriptions-item label="活动时间" v-if="activity.scheduled_time">
              {{ formatTime(activity.scheduled_time) }}
            </el-descriptions-item>
            <el-descriptions-item label="描述" v-if="activity.description">
              {{ activity.description }}
            </el-descriptions-item>
          </el-descriptions>

          <!-- 参与者列表 -->
          <el-card>
            <template #header>
              <div class="card-header">
                <el-icon><UserFilled /></el-icon>
                <span>参与者列表</span>
              </div>
            </template>

            <el-empty v-if="activity.participants.length === 0" description="暂无参与者" />

            <el-table v-else :data="activity.participants" stripe>
              <el-table-column prop="character_name" label="角色名" width="150" />
              <el-table-column prop="job" label="职业" />
              <el-table-column prop="level" label="等级" width="80" align="center" />
              <el-table-column label="性别" width="80" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.gender === 'male' ? 'primary' : 'danger'" size="small">
                    {{ row.gender === 'male' ? '男' : '女' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="婚姻状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.marriage_status !== 'single'" type="warning" size="small">
                    {{ marriageText(row.marriage_status) }}
                  </el-tag>
                  <span v-else class="text-muted">未婚</span>
                </template>
              </el-table-column>
              <el-table-column prop="username" label="用户" width="120" />
              <el-table-column label="操作" width="100" align="center">
                <template #default="{ row }">
                  <el-button
                    v-if="canLeave && row.username === currentUsername"
                    type="danger"
                    size="small"
                    @click="leaveActivity(row.role_id)"
                  >
                    退出
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <!-- 参加活动区域 -->
            <div v-if="activity.status === 'open' && !isParticipant" class="join-section">
              <el-divider content-position="left">
                <el-icon><Plus /></el-icon>
                选择角色参加活动
              </el-divider>

              <el-empty v-if="myRoles.length === 0" description="您还没有角色">
                <el-button type="primary" @click="$router.push('/my-roles')">
                  添加角色
                </el-button>
              </el-empty>

              <div v-else>
                <div class="role-list">
                  <el-checkbox
                    v-for="role in myRoles"
                    :key="role.id"
                    v-model="selectedRoles"
                    :label="role.id"
                    :disabled="isRoleJoined(role.id)"
                    class="role-checkbox"
                  >
                    <span class="role-name">
                      {{ role.character_name }}
                    </span>
                    <span class="role-info">
                      ({{ role.job }} Lv.{{ role.level }})
                    </span>
                    <el-tag v-if="isRoleJoined(role.id)" type="success" size="small" class="ml-8">
                      已参加
                    </el-tag>
                  </el-checkbox>
                </div>

                <el-button
                  type="primary"
                  size="large"
                  :loading="joining"
                  :disabled="selectedRoles.length === 0"
                  @click="joinActivity"
                  class="join-btn"
                >
                  {{ joining ? '参加中...' : '参加活动' }}
                </el-button>
              </div>
            </div>
          </el-card>
        </template>

        <el-empty v-else description="活动不存在" />
      </template>
    </el-skeleton>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, useUserStore } from '../stores/user'
import { UserFilled, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activity = ref(null)
const myRoles = ref([])
const loading = ref(true)
const joining = ref(false)
const selectedRoles = ref([])

const isCreator = computed(() => {
  return activity.value?.creator_id === userStore.user?.id
})

const isParticipant = computed(() => {
  return activity.value?.participants.some(p => p.username === userStore.user?.username)
})

const canLeave = computed(() => {
  return activity.value?.status === 'open'
})

const currentUsername = computed(() => userStore.user?.username)

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

const marriageText = (status) => {
  const map = {
    single: '未婚',
    groom: '新郎',
    bride: '新娘'
  }
  return map[status] || status
}

const formatTime = (time) => {
  return new Date(time).toLocaleString('zh-CN')
}

const isRoleJoined = (roleId) => {
  return activity.value?.participants.some(p => p.role_id === roleId)
}

const loadActivity = async () => {
  try {
    const response = await api.get(`/activities/${route.params.id}`)
    activity.value = response.data.activity
  } catch (err) {
    console.error('加载活动失败', err)
  } finally {
    loading.value = false
  }
}

const loadMyRoles = async () => {
  try {
    const response = await api.get('/user/roles')
    myRoles.value = response.data.roles
  } catch (err) {
    console.error('加载角色失败', err)
  }
}

const joinActivity = async () => {
  if (selectedRoles.value.length === 0) return

  joining.value = true
  try {
    await api.post(`/activities/${route.params.id}/join`, {
      roleIds: selectedRoles.value
    })
    selectedRoles.value = []
    await loadActivity()
    ElMessage.success('参加成功')
  } catch (err) {
    // 防抖错误不显示提示
    if (!err.silent) {
      ElMessage.error(err.response?.data?.error || '参加失败')
    }
  } finally {
    joining.value = false
  }
}

const leaveActivity = async (roleId) => {
  try {
    await ElMessageBox.confirm('确定要退出此活动吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.delete(`/activities/${route.params.id}/leave`, {
      data: { roleId }
    })
    await loadActivity()
    ElMessage.success('已退出活动')
  } catch (err) {
    // 防抖错误和取消操作不显示提示
    if (err !== 'cancel' && !err.silent) {
      ElMessage.error(err.response?.data?.error || '退出失败')
    }
  }
}

const closeActivity = async () => {
  try {
    await ElMessageBox.confirm('确定要关闭此活动吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.post(`/activities/${route.params.id}/close`)
    await loadActivity()
    ElMessage.success('活动已关闭')
  } catch (err) {
    // 防抖错误和取消操作不显示提示
    if (err !== 'cancel' && !err.silent) {
      ElMessage.error(err.response?.data?.error || '关闭失败')
    }
  }
}

const deleteActivity = async () => {
  try {
    await ElMessageBox.confirm('确定要删除此活动吗？此操作不可恢复！', '警告', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error',
      confirmButtonClass: 'el-button--danger'
    })
    await api.delete(`/activities/${route.params.id}`)
    ElMessage.success('活动已删除')
    router.push('/')
  } catch (err) {
    // 防抖错误和取消操作不显示提示
    if (err !== 'cancel' && !err.silent) {
      ElMessage.error(err.response?.data?.error || '删除失败')
    }
  }
}

onMounted(() => {
  loadActivity()
  loadMyRoles()
})
</script>

<style scoped>
.activity-detail-page {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.join-section {
  margin-top: 24px;
  padding-top: 24px;
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0 20px 0;
}

.role-checkbox {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  transition: all 0.3s;
}

.role-checkbox:hover {
  background-color: #f5f7fa;
}

.role-checkbox.is-disabled {
  background-color: #f5f7fa;
  opacity: 0.6;
}

.role-name {
  font-weight: 500;
  color: #303133;
}

.role-info {
  color: #606266;
  margin-left: 8px;
}

.join-btn {
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  display: block;
}

.text-muted {
  color: #909399;
}

.mb-16 {
  margin-bottom: 16px;
}

.ml-8 {
  margin-left: 8px;
}
</style>
