<template>
  <div class="site-shell">
    <div class="grain" aria-hidden="true"></div>
    <div class="frame" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>

    <div class="page-layer">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </div>

    <DialogHost />

    <Toaster
      position="bottom-right"
      :toastOptions="{
        style: {
          background: 'var(--bg-card)',
          color: 'var(--ink)',
          border: '1px solid var(--line)',
          borderRadius: '2px',
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          boxShadow: '0 24px 48px -36px rgba(42, 33, 26, 0.55)',
        }
      }"
    />

    <Transition name="fade">
      <div
        v-if="showPreloader"
        class="preloader"
        :class="{ 'is-done': preloaderDone }"
        role="status"
        aria-live="polite"
        @click="skipPreloader"
      >
        <div class="preloader-top mono">
          <span>Stashly</span>
          <span>Wishlist editorial</span>
        </div>
        <div class="preloader-center">
          <div class="preloader-mark">
            Stashly<sup>®</sup>
          </div>
        </div>
        <div class="preloader-bottom mono">
          <span>Guardar para comprar</span>
          <span>2026</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
import DialogHost from '@/components/DialogHost.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const showPreloader = ref(false)
const preloaderDone = ref(false)
let doneTimer: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined

function finishPreloader() {
  preloaderDone.value = true
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    showPreloader.value = false
  }, 650)
}

function skipPreloader() {
  if (!showPreloader.value) return
  if (doneTimer) clearTimeout(doneTimer)
  finishPreloader()
}

onMounted(() => {
  authStore.checkAuth()

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || sessionStorage.getItem('stashly:loaded')) return

  showPreloader.value = true
  doneTimer = setTimeout(() => {
    sessionStorage.setItem('stashly:loaded', '1')
    finishPreloader()
  }, 950)
})
</script>
