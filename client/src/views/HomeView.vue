<template>
  <div class="page-shell">
    <PageHeader
      index="01"
      label="Colección"
      title="Carrito"
      accent="editorial"
      :subtitle="summary"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openAddModal">
          <Plus :size="16" />
          Añadir producto
        </button>
        <button
          class="btn"
          :class="{ 'btn-accent': selectMode }"
          @click="toggleSelectMode"
        >
          <CheckSquare :size="15" />
          {{ selectMode ? 'Cancelar' : 'Seleccionar' }}
        </button>
      </template>
    </PageHeader>

    <div class="toolbar">
      <div class="search-wrap">
        <Search :size="15" />
        <input
          v-model="itemsStore.searchQuery"
          class="search-input"
          placeholder="Buscar por título, tienda o nota…"
          aria-label="Buscar productos"
        />
      </div>

      <select v-model="itemsStore.sortBy" class="select toolbar-select" aria-label="Ordenar por">
        <option value="date-desc">Más reciente</option>
        <option value="date-asc">Más antiguo</option>
        <option value="alpha">Alfabético</option>
        <option value="price-asc">Precio ↑</option>
        <option value="price-desc">Precio ↓</option>
      </select>

      <button
        class="btn btn-sm"
        :class="itemsStore.filterFavorite ? 'btn-accent' : ''"
        @click="itemsStore.filterFavorite = !itemsStore.filterFavorite"
      >
        <Heart :size="14" :class="{ 'fill-current': itemsStore.filterFavorite }" />
        Favoritos
      </button>

      <div class="toolbar-spacer"></div>

      <button
        class="btn btn-icon btn-sm"
        :aria-label="itemsStore.viewMode === 'grid' ? 'Ver en lista' : 'Ver en cuadrícula'"
        @click="toggleView"
      >
        <LayoutGrid v-if="itemsStore.viewMode === 'list'" :size="15" />
        <List v-else :size="15" />
      </button>
    </div>

    <Transition name="slide">
      <div v-if="selectMode && selectedIds.length" class="bulk-bar">
        <span class="mono muted">{{ pad(selectedIds.length) }} seleccionados</span>
        <button class="btn btn-sm" @click="bulkMove">Mover a carpeta</button>
        <button class="btn btn-sm" @click="bulkPurchase">Marcar comprado</button>
        <button class="btn btn-sm btn-danger" @click="bulkDelete">Eliminar</button>
        <button class="btn btn-sm btn-ghost ml-auto" @click="selectedIds = []">
          Limpiar
        </button>
      </div>
    </Transition>

    <div v-if="itemsStore.loading" class="items-grid">
      <div v-for="i in 8" :key="i" class="item-card">
        <div class="item-media skeleton"></div>
        <div class="item-body space-y-3">
          <div class="h-4 w-3/4 skeleton"></div>
          <div class="h-4 w-1/2 skeleton"></div>
          <div class="h-3 w-1/3 skeleton"></div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="itemsStore.filteredItems.length === 0"
      label="Sin resultados"
      title="Tu carrito está"
      accent="vacío"
      text="Guarda tu primer producto pegando una URL. Stashly extrae el título, la imagen, el precio y la tienda por ti."
    >
      <template #icon>
        <ShoppingBag :size="22" />
      </template>
      <button class="btn btn-primary" @click="openAddModal">
        <Plus :size="15" />
        Añadir producto
      </button>
    </EmptyState>

    <div
      v-else
      class="items-grid"
      :class="{ 'is-list': itemsStore.viewMode === 'list' }"
    >
      <ItemCard
        v-for="(item, idx) in itemsStore.filteredItems"
        :key="item.id"
        :item="item"
        :index="idx"
        :selected="selectedIds.includes(item.id)"
        :select-mode="selectMode"
        :list="itemsStore.viewMode === 'list'"
        @click="selectMode ? toggleSelect(item.id) : openItem(item)"
        @toggle-select="toggleSelect(item.id)"
        @edit="editItem(item)"
        @delete="deleteItem(item)"
      />
    </div>

    <ItemDetailModal v-model="showDetailModal" :item="selectedItem" />
    <AddItemModal v-model="showAddModal" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CheckSquare,
  Heart,
  LayoutGrid,
  List,
  Plus,
  Search,
  ShoppingBag,
} from 'lucide-vue-next'
import { useItemsStore } from '@/stores/items'
import { useCollectionsStore } from '@/stores/collections'
import { askConfirm, askPrompt } from '@/composables/useDialog'
import { toast } from 'vue-sonner'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ItemCard from '@/components/ItemCard.vue'
import ItemDetailModal from '@/components/ItemDetailModal.vue'
import AddItemModal from '@/components/AddItemModal.vue'
import type { Item } from '@/types'

const itemsStore = useItemsStore()
const collectionsStore = useCollectionsStore()

const selectMode = ref(false)
const selectedIds = ref<string[]>([])
const showDetailModal = ref(false)
const selectedItem = ref<Item | null>(null)
const showAddModal = ref(false)

const summary = computed(() => {
  const count = itemsStore.filteredItems.length
  const stores = itemsStore.stores.length
  return `${count} ${count === 1 ? 'producto' : 'productos'} · ${stores} ${
    stores === 1 ? 'tienda' : 'tiendas'
  }`
})

onMounted(() => {
  itemsStore.fetchItems()
  collectionsStore.fetchCollections()
})

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toggleView() {
  itemsStore.viewMode = itemsStore.viewMode === 'grid' ? 'list' : 'grid'
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) selectedIds.value = []
}

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function openItem(item: Item) {
  selectedItem.value = item
  showDetailModal.value = true
}

function editItem(item: Item) {
  selectedItem.value = item
  showDetailModal.value = true
}

function openAddModal() {
  showAddModal.value = true
}

async function deleteItem(item: Item) {
  const confirmed = await askConfirm({
    title: 'Mover a la papelera',
    message: `“${item.title || 'Este producto'}” se moverá a la papelera. Podrás restaurarlo después.`,
    confirmLabel: 'Mover a papelera',
    danger: true,
  })
  if (!confirmed) return

  try {
    await itemsStore.deleteItem(item.id)
    toast.success('Movido a la papelera')
  } catch (error: any) {
    toast.error(error.message)
  }
}

async function bulkMove() {
  const name = await askPrompt({
    title: 'Mover a carpeta',
    message: 'Deja el nombre vacío para quitar la carpeta a los productos seleccionados.',
    label: 'Nombre de la carpeta',
    placeholder: 'Ej. Tecnología',
    confirmLabel: 'Mover',
  })
  if (name === null) return

  let collectionId: string | null = null
  const trimmed = name.trim()

  if (trimmed) {
    const existing = collectionsStore.collections.find(
      (collection) => collection.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (existing) {
      collectionId = existing.id
    } else {
      try {
        const created = await collectionsStore.createCollection(trimmed)
        collectionId = created.id
      } catch {
        collectionId = null
      }
    }
  }

  try {
    await itemsStore.bulkAction('move', selectedIds.value, collectionId)
    toast.success('Productos movidos')
    selectedIds.value = []
    selectMode.value = false
  } catch (error: any) {
    toast.error(error.message)
  }
}

async function bulkPurchase() {
  try {
    await itemsStore.bulkAction('purchase', selectedIds.value)
    toast.success('Marcados como comprados')
    selectedIds.value = []
    selectMode.value = false
  } catch (error: any) {
    toast.error(error.message)
  }
}

async function bulkDelete() {
  const confirmed = await askConfirm({
    title: 'Mover a la papelera',
    message: `Se moverán ${selectedIds.value.length} producto(s) a la papelera.`,
    confirmLabel: 'Mover a papelera',
    danger: true,
  })
  if (!confirmed) return

  try {
    await itemsStore.bulkAction('delete', selectedIds.value)
    toast.success('Movidos a la papelera')
    selectedIds.value = []
    selectMode.value = false
  } catch (error: any) {
    toast.error(error.message)
  }
}
</script>
