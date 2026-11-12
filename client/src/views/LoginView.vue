<template>
  <div>
    <p class="mono muted">Acceso</p>
    <h2 class="auth-form-title mt-2">Bienvenido <em class="italic text-[var(--accent)]">de nuevo</em>.</h2>

    <form class="space-y-5" @submit.prevent="handleLogin">
      <div>
        <label class="field-label" for="login-email">Usuario o correo</label>
        <input
          id="login-email"
          v-model="email"
          type="text"
          required
          autocomplete="username"
          class="input"
          placeholder="tu usuario o tu@correo.com"
          @input="errorMessage = ''"
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
          @input="errorMessage = ''"
        />
      </div>

      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>

      <button type="submit" class="btn btn-primary w-full" :disabled="loading">
        {{ loading ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <p v-if="IS_DEMO" class="mt-4 text-xs leading-relaxed text-[var(--muted)]">
      Demo local: las cuentas se crean aquí y se guardan solo en este navegador.
      No están conectadas a la base de datos real.
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
import { IS_DEMO } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  loading.value = true
  errorMessage.value = ''
  try {
    await authStore.login(email.value, password.value)
    toast.success('¡Bienvenido de vuelta!')
    router.push('/carrito')
  } catch (error: any) {
    const message = error?.message || 'No se pudo iniciar sesión'
    errorMessage.value = message
    toast.error(message)
  } finally {
    loading.value = false
  }
}
</script>
