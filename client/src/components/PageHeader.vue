<template>
  <header class="page-head">
    <div class="page-head-top mono">
      <p>
        <span class="dot"></span>{{ label }}<span v-if="index"> / {{ index }}</span>
      </p>
      <p>{{ dateLabel }}</p>
    </div>
    <div class="page-head-main">
      <h1 class="page-title">
        {{ title }}<em v-if="accent">{{ accent }}</em>
      </h1>
      <div class="page-head-side">
        <p v-if="subtitle" class="page-sub">{{ subtitle }}</p>
        <div v-if="$slots.actions" class="page-head-actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'

withDefaults(
  defineProps<{
    label?: string
    index?: string
    title: string
    accent?: string
    subtitle?: string
  }>(),
  { label: 'Stashly', index: '', accent: '', subtitle: '' }
)

const dateLabel = computed(() =>
  new Date()
    .toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
    .replace(/\./g, '')
    .toUpperCase()
)
</script>
