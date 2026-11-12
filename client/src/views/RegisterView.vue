<template>
  <div>
    <p class="mono muted">Registro</p>
    <h2 class="auth-form-title mt-2">Empieza tu <em class="italic text-[var(--accent)]">colección</em>.</h2>

    <form class="space-y-5" @submit.prevent="handleRegister">
      <div>
        <label class="field-label" for="register-email">Usuario o correo</label>
        <input
          id="register-email"
          v-model="email"
          type="text"
          required
          autocomplete="username"
          class="input"
          placeholder="guigarmon3 o tu@correo.com"
        />
      </div>

      <div>
        <label class="field-label" for="register-password">Contraseña</label>
        <input
          id="register-password"
          v-model="password"
          type="password"
          required
          minlength="6"
          autocomplete="new-password"
          class="input"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      <button type="submit" class="btn btn-primary w-full" :disabled="loading">
        {{ loading ? 'Creando…' : 'Crear cuenta' }}
      </button>
    </form>

    <p v-if="IS_DEMO" class="mt-4 text-xs leading-relaxed text-[var(--muted)]">
      En la demo, la cuenta y sus datos se guardan solo en este navegador.
    </p>

    <p class="mt-6 text-sm text-[var(--ink-3)]">
      ¿Ya tienes cuenta?
      <RouterLink to="/auth/login" class="auth-link">Inicia sesión</RouterLink>
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

async function handleRegister() {
  loading.value = true
  try {
    await authStore.register(email.value, password.value)
    toast.success('¡Cuenta creada! Bienvenido a Stashly')
    router.push('/carrito')
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    loading.value = false
  }
}
</script>
