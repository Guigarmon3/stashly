import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)
  
  async function checkAuth() {
    try {
      const data = await api.auth.me()
      user.value = data.user
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }
  
  async function login(email: string, password: string) {
    const data = await api.auth.login(email, password)
    user.value = data.user
  }
  
  async function register(email: string, password: string) {
    const data = await api.auth.register(email, password)
    user.value = data.user
  }
  
  async function logout() {
    await api.auth.logout()
    user.value = null
  }
  
  return { user, loading, checkAuth, login, register, logout }
})
