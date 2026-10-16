import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'home', alias: '/carrito', component: () => import('@/views/HomeView.vue') },
        { path: 'folder/:id', name: 'folder', component: () => import('@/views/FolderView.vue') },
        { path: 'purchased', name: 'purchased', component: () => import('@/views/PurchasedView.vue') },
        { path: 'favorites', name: 'favorites', component: () => import('@/views/FavoritesView.vue') },
        { path: 'trash', name: 'trash', component: () => import('@/views/TrashView.vue') },
        { path: 'explain', name: 'explain', component: () => import('@/views/ExplainView.vue') },
      ]
    },
    {
      path: '/auth',
      component: () => import('@/layouts/AuthLayout.vue'),
      children: [
        { path: 'login', name: 'login', component: () => import('@/views/LoginView.vue') },
        { path: 'register', name: 'register', component: () => import('@/views/RegisterView.vue') },
      ]
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  if (authStore.loading) {
    // Wait for auth check
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (!authStore.loading) { clearInterval(check); resolve(true) }
      }, 50)
    })
  }
  
  if (to.meta.requiresAuth && !authStore.user) {
    next('/auth/login')
  } else if ((to.name === 'login' || to.name === 'register') && authStore.user) {
    next('/')
  } else {
    next()
  }
})

export default router
