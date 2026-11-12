<template>
  <div>
    <p class="mono muted">Acceso</p>
    <h2 class="auth-form-title mt-2">Bienvenido <em class="italic text-[var(--accent)]">de nuevo</em>.</h2>

    <form class="space-y-5" @submit.prevent="handleLogin">
      <div>
        <label class="field-label" for="login-email">Correo electrónico</label>
        <input
          id="login-email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="input"
          placeholder="tu@correo.com"
        />
      </div>

      <div>
        <label class="field-label" for="login-password">Contraseña</label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="input"
          placeholder="••••••••"
        />
      </div>

      <button type="submit" class="btn btn-primary w-full" :disabled="loading">
        {{ loading ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <button
      v-if="IS_DEMO"
      type="button"
      class="btn mt-3 w-full"
      :disabled="loading"
      @click="enterDemo"
    >
      <Sparkles :size="15" />
      Entrar en la demo
    </button>

    <p v-if="IS_DEMO" class="mt-4 text-xs leading-relaxed text-[var(--muted)]">
      Demo estática: el acceso y los datos viven solo en este navegador.
    </p>

    <p class="mt-6 text-sm text-[var(--ink-3)]">
      ¿No tienes cuenta?
      <RouterLink to="/auth/register" class="auth-link">Crea una</RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Sparkles } from 'lucide-vue-next'
import { IS_DEMO } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    toast.success('¡Bienvenido de vuelta!')
    router.push('/carrito')
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    loading.value = false
  }
}

async function enterDemo() {
  loading.value = true
  try {
    await authStore.login('demo@stashly.app', 'demo')
    toast.success('Demo lista')
    router.push('/carrito')
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    loading.value = false
  }
}
</script>
