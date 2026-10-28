<template>
  <div class="empty">
    <div class="empty-icon">
      <slot name="icon">
        <Sparkles :size="22" />
      </slot>
    </div>
    <p v-if="label" class="mono muted">{{ label }}</p>
    <h2 class="empty-title">
      {{ title }}<em v-if="accent">{{ accent }}</em>
    </h2>
    <p v-if="text" class="empty-text">{{ text }}</p>
    <div v-if="$slots.default" class="mt-6">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    label?: string
    title: string
    accent?: string
    text?: string
  }>(),
  { label: '', accent: '', text: '' }
)
</script>
