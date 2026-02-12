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
                v-if="(isCreator || isAdmin) && activity.status === 'cancelled'"
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
              <div class="status-display">
                <template v-if="!editingStatus">
                  <el-tag :type="getStatusType(activity.status)">
                    {{ statusText(activity.status) }}
                  </el-tag>
                  <el-button
                    v-if="canEditStatus"
                    type="primary"
                    link
                    @click="startEditStatus"
                  >
                    编辑
                  </el-button>
                </template>
                <template v-else>
                  <el-select v-model="tempStatus" size="small" style="width: 120px">
                    <el-option label="募集中" value="open" />
                    <el-option label="进行中" value="in_progress" />
                    <el-option label="已完成" value="completed" />
                    <el-option label="已取消" value="cancelled" />
                  </el-select>
                  <el-button type="primary" size="small" @click="confirmStatusEdit">确定</el-button>
                  <el-button size="small" @click="cancelStatusEdit">取消</el-button>
                </template>
              </div>
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
              <el-table-column prop="character_name" label="角色名" width="100" />
              <el-table-column prop="job" label="职业" width="70" />
              <el-table-column prop="level" label="等级" width="60" align="center" />
              <el-table-column label="性别" width="60" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.gender === 'male' ? 'primary' : 'danger'" size="small">
                    {{ row.gender === 'male' ? '男' : '女' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="婚姻状态" width="80" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.marriage_status !== 'single'" type="warning" size="small">
                    {{ marriageText(row.marriage_status) }}
                  </el-tag>
                  <span v-else class="text-muted">未婚</span>
                </template>
              </el-table-column>
              <!-- APQ活动位置偏好 -->
              <el-table-column v-if="isAPQActivity" label="位置偏好" width="280" align="center">
                <template #default="{ row }">
                  <div v-if="row.username === currentUsername" class="position-selector">
                    <template v-if="editingPositionPref[row.role_id]">
                      <el-checkbox-group v-model="tempPositionPrefs[row.role_id]" size="small">
                        <el-checkbox-button v-for="pos in 6" :key="pos" :label="pos">
                          {{ pos }}
                        </el-checkbox-button>
                      </el-checkbox-group>
                      <div class="position-actions">
                        <el-button type="primary" size="small" @click="savePositionPref(row.role_id)">保存</el-button>
                        <el-button size="small" @click="cancelPositionPref(row.role_id)">取消</el-button>
                      </div>
                    </template>
                    <template v-else>
                      <div v-if="row.position_preferences && row.position_preferences.length > 0" class="position-display">
                        <el-tag
                          v-for="pos in sortedPositionPrefs(row.position_preferences)"
                          :key="pos"
                          type="info"
                          size="small"
                          class="position-tag"
                        >
                          {{ pos }}
                        </el-tag>
                        <el-button type="primary" link size="small" @click="startEditPositionPref(row)">编辑</el-button>
                      </div>
                      <div v-else class="position-display">
                        <span class="text-muted">未设置</span>
                        <el-button type="primary" link size="small" @click="startEditPositionPref(row)">设置</el-button>
                      </div>
                    </template>
                  </div>
                  <div v-else class="position-display">
                    <template v-if="row.position_preferences && row.position_preferences.length > 0">
                      <el-tag
                        v-for="pos in sortedPositionPrefs(row.position_preferences)"
                        :key="pos"
                        type="info"
                        size="small"
                        class="position-tag"
                      >
                        {{ pos }}
                      </el-tag>
                    </template>
                    <span v-else class="text-muted">未设置</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="display_name" label="用户" width="100" />
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
const editingStatus = ref(false)
const tempStatus = ref('')
const editingPositionPref = ref({})
const tempPositionPrefs = ref({})

const isCreator = computed(() => {
  return activity.value?.creator_id === userStore.user?.id
})

const isAdmin = computed(() => {
  return userStore.user?.isAdmin === true
})

const canEditStatus = computed(() => {
  return isCreator.value || isAdmin.value
})

const isParticipant = computed(() => {
  return activity.value?.participants.some(p => p.username === userStore.user?.username)
})

const canLeave = computed(() => {
  return activity.value?.status === 'open'
})

const currentUsername = computed(() => userStore.user?.username)

const isAPQActivity = computed(() => {
  return activity.value?.type_id === 'type-apq'
})

// 位置偏好排序（从小到大）
const sortedPositionPrefs = (prefs) => {
  if (!prefs || !Array.isArray(prefs)) return []
  return [...prefs].sort((a, b) => a - b)
}

const statusText = (status) => {
  const map = {
    open: '募集中',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    closed: '已关闭'
  }
  return map[status] || status
}

const getStatusType = (status) => {
  const map = {
    open: 'success',
    in_progress: 'primary',
    completed: 'info',
    cancelled: 'danger',
    closed: 'warning'
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

const startEditStatus = () => {
  tempStatus.value = activity.value.status
  editingStatus.value = true
}

const confirmStatusEdit = async () => {
  if (tempStatus.value === activity.value.status) {
    editingStatus.value = false
    return
  }
  try {
    await api.put(`/activities/${route.params.id}/status`, { status: tempStatus.value })
    ElMessage.success('状态已更新')
    await loadActivity()
    editingStatus.value = false
  } catch (err) {
    if (!err.silent) {
      ElMessage.error(err.response?.data?.error || '状态更新失败')
    }
  }
}

const cancelStatusEdit = () => {
  tempStatus.value = activity.value.status
  editingStatus.value = false
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

// 位置偏好编辑相关方法
const startEditPositionPref = (row) => {
  editingPositionPref.value[row.role_id] = true
  tempPositionPrefs.value[row.role_id] = [...(row.position_preferences || [])]
}

const savePositionPref = async (roleId) => {
  try {
    await api.put(`/activities/${route.params.id}/position-preferences`, {
      roleIds: [roleId],
      positions: tempPositionPrefs.value[roleId]
    })
    ElMessage.success('位置偏好已更新')
    editingPositionPref.value[roleId] = false
    await loadActivity()
  } catch (err) {
    if (!err.silent) {
      ElMessage.error(err.response?.data?.error || '更新位置偏好失败')
    }
  }
}

const cancelPositionPref = (roleId) => {
  editingPositionPref.value[roleId] = false
  tempPositionPrefs.value[roleId] = []
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

.status-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.position-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.position-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.position-tag {
  margin: 0;
}

.position-actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  justify-content: center;
}
</style>
