<template>
  <el-container class="app-container">
    <!-- 顶部导航栏 -->
    <el-header v-if="userStore.isLoggedIn" class="app-header">
      <div class="header-left">
        <h1 class="app-title">MapleRoyals Events</h1>
      </div>
      <div class="header-right">
        <el-dropdown @command="handleCommand">
          <span class="user-dropdown">
            <el-icon><User /></el-icon>
            {{ userStore.user?.nickname || userStore.user?.username }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <!-- 导航菜单 -->
    <el-menu
      v-if="userStore.isLoggedIn"
      :default-active="activeMenu"
      mode="horizontal"
      :ellipsis="false"
      class="nav-menu"
      router
    >
      <el-menu-item index="/">
        <el-icon><List /></el-icon>
        <span>活动列表</span>
      </el-menu-item>
      <el-menu-item index="/my-roles">
        <el-icon><UserFilled /></el-icon>
        <span>我的角色</span>
      </el-menu-item>
      <el-menu-item index="/my-activities">
        <el-icon><Calendar /></el-icon>
        <span>我的活动</span>
      </el-menu-item>
      <el-menu-item index="/admin" v-if="userStore.user?.isAdmin">
        <el-icon><Setting /></el-icon>
        <span>管理后台</span>
      </el-menu-item>
    </el-menu>

    <!-- 主内容区 -->
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from './stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

const handleCommand = (command) => {
  if (command === 'logout') {
    logout()
  }
}

const logout = async () => {
  await userStore.logout()
  router.push('/login')
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  background-color: #f5f7fa;
}

#app {
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #409eff 0%, #79bbff 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: 56px !important;
}

.header-left {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
  color: white;
}

.user-dropdown:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.nav-menu {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.app-main {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 56px - 60px);
}

/* 全局卡片样式调整 */
.el-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #ebeef5;
}

.el-card__header {
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
}

.el-card__body {
  padding: 20px;
}

/* 通用容器 */
.container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20px;
}

/* 通用间距 */
.mb-16 {
  margin-bottom: 16px;
}

.mb-20 {
  margin-bottom: 20px;
}

.mt-16 {
  margin-top: 16px;
}

.mt-20 {
  margin-top: 20px;
}
</style>
