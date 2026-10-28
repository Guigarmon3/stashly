<template>
  <article
    class="item-card group"
    :class="{ 'is-selected': selected, 'is-list': list }"
    v-motion
    :initial="{ opacity: 0, y: 18 }"
    :enter="{ opacity: 1, y: 0, transition: { delay: index * 40, duration: 450 } }"
    @click="emit('click')"
  >
    <template v-if="list">
      <span class="item-index">{{ pad(index + 1) }}</span>

      <div class="item-media">
        <img
          v-if="item.image && !imageFailed"
          :src="item.image"
          :alt="item.title || ''"
          @error="imageFailed = true"
        />
        <Image v-else :size="20" class="text-[var(--muted)]" />
      </div>

      <div class="item-body">
        <span class="item-store-inline mono muted">{{ item.store || 'Sin tienda' }}</span>

        <h3 class="item-title" :title="item.title || ''">
          {{ item.title || 'Sin título' }}
        </h3>

        <span v-if="item.price" class="item-price">{{ item.price }}</span>
        <span v-else class="mono muted">Sin precio</span>

        <div class="item-actions">
          <button
            class="item-action"
            :aria-label="item.is_favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'"
            @click.stop="toggleFavorite"
          >
            <Heart
              :size="15"
              :class="item.is_favorite ? 'fill-current text-[var(--favorite)]' : ''"
            />
          </button>
          <button class="item-action" aria-label="Abrir enlace" @click.stop="openUrl">
            <ExternalLink :size="15" />
          </button>
          <button
            class="item-action"
            :aria-label="item.is_purchased ? 'Marcar como no comprado' : 'Marcar como comprado'"
            @click.stop="togglePurchased"
          >
            <CheckCircle2
              :size="15"
              :class="item.is_purchased ? 'text-[var(--success)]' : ''"
            />
          </button>
          <button class="item-action" aria-label="Editar" @click.stop="emit('edit')">
            <FileText :size="15" />
          </button>
          <button
            class="item-action is-danger"
            aria-label="Eliminar"
            @click.stop="emit('delete')"
          >
            <Trash2 :size="15" />
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="item-media">
        <img
          v-if="item.image && !imageFailed"
          :src="item.image"
          :alt="item.title || ''"
          @error="imageFailed = true"
        />
        <Image v-else :size="34" class="text-[var(--muted)]" />

        <span class="item-store mono">{{ item.store || 'Sin tienda' }}</span>

        <button
          class="item-fav"
          :class="{ 'is-active': item.is_favorite }"
          :aria-label="item.is_favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'"
          @click.stop="toggleFavorite"
        >
          <Heart
            :size="15"
            :class="item.is_favorite ? 'fill-current text-[var(--favorite)]' : ''"
          />
        </button>

        <button
          v-if="selectMode"
          class="item-select"
          :class="{ 'is-checked': selected }"
          :aria-label="selected ? 'Deseleccionar' : 'Seleccionar'"
          @click.stop="emit('toggle-select')"
        >
          <Check v-if="selected" :size="14" />
        </button>

        <div v-if="item.is_purchased" class="item-purchased">
          <span>Comprado</span>
        </div>
      </div>

      <div class="item-body">
        <h3 class="item-title" :title="item.title || ''">
          {{ item.title || 'Sin título' }}
        </h3>

        <p
          v-if="item.target_price != null"
          class="item-target"
          :class="{ 'is-reached': isTargetReached }"
        >
          <Target :size="12" />
          Objetivo {{ item.target_price }}
          <span v-if="isTargetReached">· alcanzado</span>
        </p>

        <div class="item-row">
          <span v-if="item.price" class="item-price">{{ item.price }}</span>
          <span v-else class="mono muted">Sin precio</span>
          <span class="mono muted">{{ formatDate(item.added_at) }}</span>
        </div>

        <div class="item-actions">
          <button class="item-action" aria-label="Abrir enlace" @click.stop="openUrl">
            <ExternalLink :size="15" />
          </button>
          <button
            class="item-action"
            :aria-label="item.is_purchased ? 'Marcar como no comprado' : 'Marcar como comprado'"
            @click.stop="togglePurchased"
          >
            <CheckCircle2
              :size="15"
              :class="item.is_purchased ? 'text-[var(--success)]' : ''"
            />
          </button>
          <button class="item-action" aria-label="Editar y notas" @click.stop="emit('edit')">
            <FileText :size="15" />
          </button>
          <button
            class="item-action is-danger ml-auto"
            aria-label="Eliminar"
            @click.stop="emit('delete')"
          >
            <Trash2 :size="15" />
          </button>
        </div>
      </div>
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Heart,
  Image,
  Target,
  Trash2,
} from 'lucide-vue-next'
import { useItemsStore } from '@/stores/items'
import { toast } from 'vue-sonner'
import type { Item } from '@/types'

const props = defineProps<{
  item: Item
  index: number
  selected?: boolean
  selectMode?: boolean
  list?: boolean
}>()

const emit = defineEmits(['click', 'edit', 'delete', 'toggle-select'])

const itemsStore = useItemsStore()
const imageFailed = ref(false)

watch(
  () => props.item.image,
  () => {
    imageFailed.value = false
  }
)

const isTargetReached = computed(
  () =>
    props.item.target_price != null &&
    props.item.price_value != null &&
    props.item.price_value <= props.item.target_price
)

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDate(timestamp: number) {
  if (!timestamp) return ''
  return new Date(timestamp)
    .toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    .replace(/\./g, '')
}

async function toggleFavorite() {
  try {
    await itemsStore.updateItem(props.item.id, {
      is_favorite: !props.item.is_favorite,
    })
    toast.success(
      props.item.is_favorite ? 'Eliminado de favoritos' : 'Añadido a favoritos'
    )
  } catch (error: any) {
    toast.error(error.message)
  }
}

async function togglePurchased() {
  try {
    await itemsStore.updateItem(props.item.id, {
      is_purchased: !props.item.is_purchased,
    })
    toast.success(props.item.is_purchased ? 'Marcado como no comprado' : '¡Comprado!')
  } catch (error: any) {
    toast.error(error.message)
  }
}

function openUrl() {
  window.open(props.item.url, '_blank', 'noopener,noreferrer')
}
</script>
