<template>
  <div class="page-shell">
    <PageHeader
      index="04"
      label="Índice"
      title="Papelera"
      accent="reciente"
      :subtitle="`${items.length} ${items.length === 1 ? 'elemento eliminado' : 'elementos eliminados'}. Puedes restaurarlos o borrarlos para siempre.`"
    />

    <div v-if="loading" class="space-y-0 border-t border-[var(--line)]">
      <div v-for="i in 4" :key="i" class="trash-row">
        <div class="trash-thumb skeleton"></div>
        <div class="space-y-2">
          <div class="h-4 w-56 skeleton"></div>
          <div class="h-3 w-32 skeleton"></div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="items.length === 0"
      label="Papelera vacía"
      title="Todo está en"
      accent="orden"
      text="Los productos que elimines aparecerán aquí y podrás recuperarlos cuando quieras."
    >
      <template #icon>
        <Trash2 :size="22" />
      </template>
      <RouterLink to="/carrito" class="btn btn-primary">
        <ArrowLeft :size="15" />
        Volver al carrito
      </RouterLink>
    </EmptyState>

    <div v-else class="border-t border-[var(--line)]">
      <div v-for="item in items" :key="item.id" class="trash-row">
        <div class="trash-thumb">
          <img v-if="item.image" :src="item.image" :alt="item.title || ''" />
          <Image v-else :size="20" class="text-[var(--muted)]" />
        </div>

        <div class="min-w-0">
          <p class="truncate font-medium">{{ item.title || 'Sin título' }}</p>
          <p class="mono muted mt-1 truncate">{{ item.store || 'Sin tienda' }}</p>
        </div>

        <div class="trash-actions flex items-center gap-2">
          <button class="btn btn-sm" @click="restore(item)">
            <RotateCcw :size="14" />
            Restaurar
          </button>
          <button class="btn btn-sm btn-danger" @click="permanentDelete(item)">
            <X :size="14" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Image, RotateCcw, Trash2, X } from 'lucide-vue-next'
import { useItemsStore } from '@/stores/items'
import { askConfirm } from '@/composables/useDialog'
import { toast } from 'vue-sonner'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import type { Item } from '@/types'

const itemsStore = useItemsStore()

const items = ref<Item[]>([])
const loading = ref(false)

async function loadTrash() {
  loading.value = true
  try {
    const response = await fetch('/api/items?include_deleted=true', {
      credentials: 'include',
    })
    if (!response.ok) throw new Error('No se pudo cargar la papelera')
    items.value = await response.json()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    loading.value = false
  }
}

async function restore(item: Item) {
  try {
    await itemsStore.restoreItem(item.id)
    items.value = items.value.filter((entry) => entry.id !== item.id)
    toast.success('Producto restaurado')
  } catch (error: any) {
    toast.error(error.message)
  }
}

async function permanentDelete(item: Item) {
  const confirmed = await askConfirm({
    title: 'Eliminar definitivamente',
    message: `“${item.title || 'Este producto'}” se borrará para siempre. Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar para siempre',
    danger: true,
  })
  if (!confirmed) return

  try {
    await itemsStore.permanentDeleteItem(item.id)
    items.value = items.value.filter((entry) => entry.id !== item.id)
    toast.success('Eliminado definitivamente')
  } catch (error: any) {
    toast.error(error.message)
  }
}

onMounted(loadTrash)
</script>
