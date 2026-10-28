<template>
  <div class="acc">
    <button class="acc-head" :aria-expanded="open" @click="open = !open">
      <span class="acc-head-left">
        <span class="acc-icon">
          <component :is="iconComponent" :size="17" />
        </span>
        <span class="acc-title">{{ title }}</span>
      </span>
      <ChevronDown
        :size="18"
        class="acc-chevron"
        :class="{ 'is-open': open }"
      />
    </button>

    <Transition name="acc">
      <div v-if="open" class="acc-body">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CheckSquare,
  ChevronDown,
  Cloud,
  Download,
  Filter,
  Folder,
  Heart,
  HelpCircle,
  Link,
  Trash2,
  TrendingDown,
  Zap,
} from 'lucide-vue-next'

const props = defineProps<{ title: string; icon: string }>()
const open = ref(false)

const iconMap: Record<string, any> = {
  Link,
  Folder,
  Heart,
  Filter,
  CheckSquare,
  Download,
  Trash2,
  TrendingDown,
  Cloud,
  Zap,
  HelpCircle,
}

const iconComponent = computed(() => iconMap[props.icon] || HelpCircle)
</script>
