<template>
  <div class="admin-panel">
    <h1 class="page-title">管理后台</h1>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 待处理工单 -->
      <el-tab-pane label="待处理工单" name="pending">
        <el-skeleton :loading="loading" :rows="3" animated>
          <template #default>
            <el-empty v-if="pendingData.registrations.length === 0 && pendingData.passwordResets.length === 0" description="暂无待处理的工单" />

            <el-row :gutter="16" v-else>
              <el-col :xs="24" :lg="12">
                <el-card>
                  <template #header>
                    <div class="card-header">
                      <el-icon><UserFilled /></el-icon>
                      <span>注册申请 ({{ pendingData.registrations.length }})</span>
                    </div>
                  </template>

                  <div v-if="pendingData.registrations.length === 0" class="empty-in-card">
                    暂无待处理的注册申请
                  </div>

                  <div v-else class="request-list">
                    <div v-for="req in pendingData.registrations" :key="req.id" class="request-item">
                      <div class="request-info">
                        <div class="request-name">{{ req.username }}</div>
                        <div class="request-time">{{ formatTime(req.created_at) }}</div>
                      </div>
                      <div class="request-actions">
                        <el-input
                          v-model="req.note"
                          placeholder="备注（可选）"
                          style="width: 140px; margin-right: 8px"
                        />
                        <el-button type="success" size="small" @click="approveRegistration(req)">
                          批准
                        </el-button>
                        <el-button type="danger" size="small" @click="rejectRegistration(req)">
                          拒绝
                        </el-button>
                      </div>
                    </div>
                  </div>
                </el-card>
              </el-col>

              <el-col :xs="24" :lg="12">
                <el-card>
                  <template #header>
                    <div class="card-header">
                      <el-icon><Lock /></el-icon>
                      <span>密码重置申请 ({{ pendingData.passwordResets.length }})</span>
                    </div>
                  </template>

                  <div v-if="pendingData.passwordResets.length === 0" class="empty-in-card">
                    暂无待处理的密码重置申请
                  </div>

                  <div v-else class="request-list">
                    <div v-for="req in pendingData.passwordResets" :key="req.id" class="request-item">
                      <div class="request-info">
                        <div class="request-name">{{ req.username }}</div>
                        <div class="request-time">{{ formatTime(req.created_at) }}</div>
                      </div>
                      <div class="request-actions">
                        <el-input
                          v-model="req.note"
                          placeholder="备注（可选）"
                          style="width: 140px; margin-right: 8px"
                        />
                        <el-button type="success" size="small" @click="approvePasswordReset(req)">
                          批准
                        </el-button>
                        <el-button type="danger" size="small" @click="rejectPasswordReset(req)">
                          拒绝
                        </el-button>
                      </div>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </template>
        </el-skeleton>
      </el-tab-pane>

      <!-- 已完成工单 -->
      <el-tab-pane label="已完成工单" name="completed">
        <el-skeleton :loading="loading" :rows="3" animated>
          <template #default>
            <el-empty v-if="completedData.length === 0" description="暂无已完成工单" />

            <el-card v-else>
              <el-table :data="completedData" stripe>
                <el-table-column prop="type" label="类型" width="100">
                  <template #default="{ row }">
                    {{ row.type === 'registration' ? '注册' : '密码重置' }}
                  </template>
                </el-table-column>
                <el-table-column prop="username" label="用户" width="150" />
                <el-table-column label="状态" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'approved' ? 'success' : 'danger'" size="small">
                      {{ row.status === 'approved' ? '已批准' : '已拒绝' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="admin_note" label="备注" />
                <el-table-column prop="processed_by_name" label="处理人" width="120" />
                <el-table-column prop="processed_at" label="处理时间" width="180">
                  <template #default="{ row }">
                    {{ formatTime(row.processed_at) }}
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </template>
        </el-skeleton>
      </el-tab-pane>

      <!-- 活动类型管理 -->
      <el-tab-pane label="活动类型" name="types">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-card class="mb-16">
              <template #header>
                <div class="card-header">
                  <el-icon><Plus /></el-icon>
                  <span>添加活动类型</span>
                </div>
              </template>

              <el-form :inline="true" :model="newType">
                <el-form-item label="类型名称">
                  <el-input v-model="newType.name" placeholder="请输入类型名称" clearable />
                </el-form-item>
                <el-form-item label="最大人数">
                  <el-input-number v-model="newType.maxParticipants" :min="1" :max="50" />
                </el-form-item>
                <el-form-item label="描述">
                  <el-input v-model="newType.description" placeholder="请输入描述" clearable />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="addingType" @click="addActivityType">
                    {{ addingType ? '添加中...' : '添加' }}
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>
        </el-row>

        <el-card>
          <el-table :data="activityTypes" stripe v-loading="loading">
            <el-table-column prop="name" label="名称" width="150" />
            <el-table-column prop="max_participants" label="最大人数" width="100" align="center" />
            <el-table-column prop="description" label="描述" />
            <el-table-column label="操作" width="150" align="center">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="openEditDialog(row)">
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click="deleteActivityType(row.id)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 用户列表 -->
      <el-tab-pane label="用户列表" name="users">
        <el-skeleton :loading="loading" :rows="3" animated>
          <template #default>
            <el-card>
              <el-table :data="users" stripe>
                <el-table-column prop="username" label="用户名" width="200" />
                <el-table-column label="是否管理员" width="120" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.is_admin ? 'warning' : 'info'" size="small">
                      {{ row.is_admin ? '是' : '否' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="需修改密码" width="120" align="center">
                  <template #default="{ row }">
                    <el-tag v-if="row.must_change_password" type="danger" size="small">
                      是
                    </el-tag>
                    <span v-else class="text-muted">否</span>
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="创建时间" width="180">
                  <template #default="{ row }">
                    {{ formatTime(row.created_at) }}
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </template>
        </el-skeleton>
      </el-tab-pane>
    </el-tabs>

    <!-- 编辑活动类型对话框 -->
    <el-dialog v-model="editingType" title="编辑活动类型" width="500px">
      <el-form :model="editTypeData" label-width="90px">
        <el-form-item label="类型名称">
          <el-input v-model="editTypeData.name" placeholder="请输入类型名称" clearable />
        </el-form-item>
        <el-form-item label="最大人数">
          <el-input-number v-model="editTypeData.maxParticipants" :min="1" :max="50" style="width: 100%" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editTypeData.description" placeholder="请输入描述" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeEditDialog">取消</el-button>
        <el-button type="primary" @click="updateActivityType">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { api } from '../stores/user'
import { UserFilled, Lock, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('pending')
const loading = ref(false)
const addingType = ref(false)
const editingType = ref(false)

const pendingData = ref({
  registrations: [],
  passwordResets: []
})
const completedData = ref([])
const activityTypes = ref([])
const users = ref([])

const newType = reactive({
  name: '',
  maxParticipants: 10,
  description: ''
})

const editTypeData = reactive({
  id: '',
  name: '',
  maxParticipants: 10,
  description: ''
})

const formatTime = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

const loadPendingData = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/pending')
    pendingData.value = {
      registrations: response.data.registrations.map(r => ({ ...r, note: '' })),
      passwordResets: response.data.passwordResets.map(r => ({ ...r, note: '' }))
    }
  } catch (err) {
    console.error('加载待处理工单失败', err)
  } finally {
    loading.value = false
  }
}

const loadCompletedData = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/completed')
    completedData.value = response.data.results
  } catch (err) {
    console.error('加载已完成工单失败', err)
  } finally {
    loading.value = false
  }
}

const loadActivityTypes = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/activity-types')
    activityTypes.value = response.data.types
  } catch (err) {
    console.error('加载活动类型失败', err)
  } finally {
    loading.value = false
  }
}

const loadUsers = async () => {
  loading.value = true
  try {
    const response = await api.get('/admin/users')
    users.value = response.data.users
  } catch (err) {
    console.error('加载用户列表失败', err)
  } finally {
    loading.value = false
  }
}

const approveRegistration = async (req) => {
  try {
    await ElMessageBox.confirm(`确定批准 ${req.username} 的注册申请吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.post(`/admin/approve-registration/${req.id}`, { note: req.note })
    await loadPendingData()
    ElMessage.success('已批准')
  } catch (err) {
    if (err !== 'cancel' && !err.silent) {
      ElMessage.error(err.response?.data?.error || '操作失败')
    }
  }
}

const rejectRegistration = async (req) => {
  try {
    await ElMessageBox.confirm(`确定拒绝 ${req.username} 的注册申请吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.post(`/admin/reject-registration/${req.id}`, { note: req.note })
    await loadPendingData()
    ElMessage.success('已拒绝')
  } catch (err) {
    if (err !== 'cancel' && !err.silent) {
      ElMessage.error(err.response?.data?.error || '操作失败')
    }
  }
}

const approvePasswordReset = async (req) => {
  try {
    await ElMessageBox.confirm(`确定批准 ${req.username} 的密码重置申请吗？\n批准后用户可以用空密码登录。`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.post(`/admin/approve-password-reset/${req.id}`, { note: req.note })
    await loadPendingData()
    ElMessage.success('已批准')
  } catch (err) {
    if (err !== 'cancel' && !err.silent) {
      ElMessage.error(err.response?.data?.error || '操作失败')
    }
  }
}

const rejectPasswordReset = async (req) => {
  try {
    await ElMessageBox.confirm(`确定拒绝 ${req.username} 的密码重置申请吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.post(`/admin/reject-password-reset/${req.id}`, { note: req.note })
    await loadPendingData()
    ElMessage.success('已拒绝')
  } catch (err) {
    if (err !== 'cancel' && !err.silent) {
      ElMessage.error(err.response?.data?.error || '操作失败')
    }
  }
}

const addActivityType = async () => {
  if (!newType.name.trim()) {
    ElMessage.warning('请输入类型名称')
    return
  }

  addingType.value = true
  try {
    await api.post('/admin/activity-types', {
      name: newType.name,
      maxParticipants: newType.maxParticipants,
      description: newType.description
    })
    Object.assign(newType, { name: '', maxParticipants: 10, description: '' })
    await loadActivityTypes()
    ElMessage.success('添加成功')
  } catch (err) {
    if (!err.silent) {
      ElMessage.error(err.response?.data?.error || '添加失败')
    }
  } finally {
    addingType.value = false
  }
}

const deleteActivityType = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除此活动类型吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.delete(`/admin/activity-types/${id}`)
    await loadActivityTypes()
    ElMessage.success('删除成功')
  } catch (err) {
    if (err !== 'cancel' && !err.silent) {
      ElMessage.error(err.response?.data?.error || '删除失败')
    }
  }
}

const openEditDialog = (type) => {
  Object.assign(editTypeData, {
    id: type.id,
    name: type.name,
    maxParticipants: type.max_participants,
    description: type.description || ''
  })
  editingType.value = true
}

const closeEditDialog = () => {
  editingType.value = false
  Object.assign(editTypeData, {
    id: '',
    name: '',
    maxParticipants: 10,
    description: ''
  })
}

const updateActivityType = async () => {
  if (!editTypeData.name.trim()) {
    ElMessage.warning('请输入类型名称')
    return
  }

  if (editTypeData.maxParticipants < 1) {
    ElMessage.warning('最大人数必须大于0')
    return
  }

  try {
    await api.put(`/admin/activity-types/${editTypeData.id}`, {
      name: editTypeData.name,
      maxParticipants: editTypeData.maxParticipants,
      description: editTypeData.description
    })
    await loadActivityTypes()
    closeEditDialog()
    ElMessage.success('更新成功')
  } catch (err) {
    if (!err.silent) {
      ElMessage.error(err.response?.data?.error || '更新失败')
    }
  }
}

const handleTabChange = (tabName) => {
  switch (tabName) {
    case 'pending':
      loadPendingData()
      break
    case 'completed':
      loadCompletedData()
      break
    case 'types':
      loadActivityTypes()
      break
    case 'users':
      loadUsers()
      break
  }
}

onMounted(() => {
  loadPendingData()
})
</script>

<style scoped>
.admin-panel {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  flex-wrap: wrap;
  gap: 12px;
}

.request-item .request-actions {
  display: flex;
  align-items: center;
}

.request-info {
  flex: 1;
  min-width: 120px;
}

.request-name {
  font-weight: 500;
  color: #303133;
}

.request-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.empty-in-card {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.text-muted {
  color: #909399;
}

.mb-16 {
  margin-bottom: 16px;
}
</style>
