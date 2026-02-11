<template>
  <div class="my-roles-page">
    <h1 class="page-title">我的角色</h1>

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

    <!-- 添加角色卡片 -->
    <el-card class="mb-16">
      <template #header>
        <div class="card-header">
          <el-icon><Plus /></el-icon>
          <span>添加新角色</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="角色名称" prop="characterName">
              <el-input
                v-model="form.characterName"
                placeholder="请输入角色名称"
                maxlength="20"
                show-word-limit
                clearable
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="职业" prop="job">
              <el-select v-model="form.job" placeholder="请选择职业" style="width: 100%">
                <el-option-group label="战士">
                  <el-option
                    v-for="job in warriorJobs"
                    :key="job"
                    :label="job"
                    :value="job"
                  />
                </el-option-group>
                <el-option-group label="魔法师">
                  <el-option
                    v-for="job in magicianJobs"
                    :key="job"
                    :label="job"
                    :value="job"
                  />
                </el-option-group>
                <el-option-group label="弓箭手">
                  <el-option
                    v-for="job in bowmanJobs"
                    :key="job"
                    :label="job"
                    :value="job"
                  />
                </el-option-group>
                <el-option-group label="飞侠">
                  <el-option
                    v-for="job in thiefJobs"
                    :key="job"
                    :label="job"
                    :value="job"
                  />
                </el-option-group>
                <el-option-group label="海盗">
                  <el-option
                    v-for="job in pirateJobs"
                    :key="job"
                    :label="job"
                    :value="job"
                  />
                </el-option-group>
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :md="4">
            <el-form-item label="等级" prop="level">
              <el-input-number
                v-model="form.level"
                :min="1"
                :max="200"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :md="4">
            <el-form-item label="性别" prop="gender">
              <el-select v-model="form.gender" placeholder="请选择" style="width: 100%">
                <el-option label="男" value="male" />
                <el-option label="女" value="female" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="婚姻状态">
              <el-select v-model="form.marriageStatus" style="width: 100%">
                <el-option label="未婚" value="single" />
                <el-option label="新郎" value="groom" />
                <el-option label="新娘" value="bride" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button type="primary" :loading="adding" @click="handleAddRole">
            {{ adding ? '添加中...' : '添加角色' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 角色列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <el-icon><UserFilled /></el-icon>
          <span>角色列表</span>
        </div>
      </template>

      <el-skeleton :loading="loading" :rows="3" animated>
        <template #default>
          <el-empty v-if="roles.length === 0" description="暂无角色" />

          <el-table v-else :data="roles" stripe>
            <el-table-column prop="character_name" label="角色名称" width="150" />
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
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click="deleteRole(row.id)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </el-skeleton>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from '../stores/user'
import { Plus, UserFilled, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const roles = ref([])
const loading = ref(false)
const adding = ref(false)
const error = ref('')
const success = ref('')
const formRef = ref()

const warriorJobs = ['Beginner', 'Warrior', 'Fighter', 'Page', 'Spearman', 'Crusader', 'WhiteKnight', 'DragonKnight', 'Hero', 'Paladin', 'DarkKnight']
const magicianJobs = ['Magician', 'FPWizard', 'ILWizard', 'Cleric', 'FPMage', 'ILMage', 'Priest', 'FPArchMage', 'ILArchMage', 'Bishop']
const bowmanJobs = ['Bowman', 'Hunter', 'Crossbowman', 'Ranger', 'Sniper', 'Bowmaster', 'Marksman']
const thiefJobs = ['Thief', 'Assassin', 'Bandit', 'Hermit', 'ChiefBandit', 'NightLord', 'Shadower']
const pirateJobs = ['Pirate', 'Brawler', 'Gunslinger', 'Marauder', 'Outlaw', 'Buccaneer', 'Corsair']

const form = reactive({
  characterName: '',
  job: '',
  level: 1,
  gender: '',
  marriageStatus: 'single'
})

const rules = {
  characterName: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ],
  job: [
    { required: true, message: '请选择职业', trigger: 'change' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ]
}

const marriageText = (status) => {
  const map = {
    single: '未婚',
    groom: '新郎',
    bride: '新娘'
  }
  return map[status] || status
}

const loadRoles = async () => {
  loading.value = true
  try {
    const response = await api.get('/user/roles')
    roles.value = response.data.roles
  } catch (err) {
    error.value = err.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
}

const handleAddRole = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  error.value = ''
  success.value = ''

  adding.value = true

  try {
    await api.post('/user/roles', {
      characterName: form.characterName,
      job: form.job,
      level: form.level,
      gender: form.gender,
      marriageStatus: form.marriageStatus
    })
    success.value = '角色添加成功'

    // 重置表单
    Object.assign(form, {
      characterName: '',
      job: '',
      level: 1,
      gender: '',
      marriageStatus: 'single'
    })
    formRef.value?.resetFields()

    await loadRoles()
  } catch (err) {
    error.value = err.response?.data?.error || '添加失败'
  } finally {
    adding.value = false
  }
}

const deleteRole = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除此角色吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await api.delete(`/user/roles/${id}`)
    ElMessage.success('删除成功')
    await loadRoles()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.error || '删除失败')
    }
  }
}

onMounted(() => {
  loadRoles()
})
</script>

<style scoped>
.my-roles-page {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.text-muted {
  color: #909399;
}
</style>
