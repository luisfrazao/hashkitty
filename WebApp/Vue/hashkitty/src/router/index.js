import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from "../stores/user.js"
import HomeView from '@/views/HomeView.vue'
import Login from '@/components/auth/Login.vue'
import Dashboard from '@/components/Dashboard.vue'
import AdminDashboard from '@/components/admin/AdminDashboard.vue'
import Register from '@/components/auth/Register.vue'
import Management from '@/components/admin/Management.vue'
import UserManagement from '@/components/admin/UserManagement.vue'
import WaitList from '@/components/admin/WaitList.vue'
import Jobs from '@/components/user/Jobs.vue'
import JobStatistics from '@/components/statistics/JobStatistics.vue'
import Profile from '@/components/user/Profile.vue'

let handlingFirstRoute = true

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'Login',
      component : Login
    },
    {
      path: '/register',
      name: 'Register',
      component: Register
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      meta: { requiresUser: true }
    },
    {
      path: '/admin',
      name: 'AdminDashboard',
      component: AdminDashboard,
      meta: { requiresAdmin: true }
    },
    {
      path: '/management',
      name: 'Management',
      component: Management,
      meta: { requiresAdmin: true }
    },
    {
      path: '/waitlist',
      name: 'WaitList',
      component: WaitList,
      meta: { requiresAdmin: true }
    },
    {
      path: '/jobs',
      name: 'Jobs',
      component: Jobs,
      meta: { requiresUser: true }
    },
    {
      path: '/jobs/:id/statistics',
      name: 'JobStatistics',
      component: JobStatistics,
      meta: { requiresUser: true }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: Profile
    },
    {
      path: '/management/users',
      name: 'UserManagement',
      component : UserManagement,
      meta: { requiresAdmin: true }
    }
  ]
})

router.beforeEach(async (to, from, next) => {  
  const userStore = useUserStore()  
  if (handlingFirstRoute) {
    handlingFirstRoute = false
    await userStore.restoreToken()
  }
  if ((to.name == 'Login') || (to.name == 'Home') || (to.name == 'Register')) {
    next()
    return
  }
  if (!userStore.user) {
    next({ name: 'Home' })
    return
  }
  const userRole = userStore.user.type
  if (to.meta.requiresAdmin && userRole != 'admin') {
    next({ name: 'Dashboard' })
    return
  }
  if (to.meta.requiresUser && userRole != 'user') {
    next({ name: 'AdminDashboard' })
    return
  }
  next()
})

export default router
