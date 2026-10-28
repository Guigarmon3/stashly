<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="dialog.open" class="modal-backdrop" @click.self="resolveDialog(false)">
        <div class="modal-panel" style="max-width: 480px" @click.stop>
          <div class="modal-head">
            <div>
              <p class="mono muted">Stashly</p>
              <h2 class="modal-title mt-1">{{ dialog.title }}</h2>
            </div>
            <button class="modal-close" aria-label="Cerrar" @click="resolveDialog(false)">
              <X :size="17" />
            </button>
          </div>

          <div class="modal-body">
            <p v-if="dialog.message" class="text-sm leading-relaxed text-[var(--ink-3)]">
              {{ dialog.message }}
            </p>
            <div v-if="dialog.mode === 'prompt'">
              <label class="field-label">{{ dialog.label || 'Valor' }}</label>
              <input
                ref="inputRef"
                v-model="dialog.value"
                class="input"
                :placeholder="dialog.placeholder"
                @keyup.enter="resolveDialog(true)"
              />
            </div>
          </div>

          <div class="modal-foot">
            <button class="btn btn-sm" @click="resolveDialog(false)">
              {{ dialog.cancelLabel }}
            </button>
            <button
              class="btn btn-sm"
              :class="dialog.danger ? 'btn-danger' : 'btn-primary'"
              @click="resolveDialog(true)"
            >
              {{ dialog.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { dialog, resolveDialog } from '@/composables/useDialog'

const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => dialog.open,
  async (open) => {
    if (open && dialog.mode === 'prompt') {
      await nextTick()
      inputRef.value?.focus()
      inputRef.value?.select()
    }
  }
)

function onKeydown(event: KeyboardEvent) {
  if (!dialog.open) return
  if (event.key === 'Escape') resolveDialog(false)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>
