import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { guest: true }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/ResetPassword.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/UserHome.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/create-activity',
    name: 'CreateActivity',
    component: () => import('../views/CreateActivity.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/activity/:id',
    name: 'ActivityDetail',
    component: () => import('../views/ActivityDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/my-roles',
    name: 'MyRoles',
    component: () => import('../views/MyRoles.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/my-activities',
    name: 'MyActivities',
    component: () => import('../views/MyActivities.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'AdminPanel',
    component: () => import('../views/AdminPanel.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // 如果还没检查过登录状态，先检查
  if (!userStore.checked) {
    await userStore.checkAuth()
  }

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.guest && userStore.isLoggedIn) {
    next('/')
  } else if (to.meta.requiresAdmin && !userStore.user?.isAdmin) {
    next('/')
  } else {
    next()
  }
})

export default router
