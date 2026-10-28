<template>
  <div class="page-shell">
    <PageHeader
      label="Carpeta"
      :title="collection?.name || 'Carpeta'"
      :subtitle="`${items.length} ${items.length === 1 ? 'producto' : 'productos'} guardados en esta carpeta`"
    >
      <template #actions>
        <RouterLink to="/carrito" class="btn">
          <ArrowLeft :size="15" />
          Volver al carrito
        </RouterLink>
      </template>
    </PageHeader>

    <EmptyState
      v-if="items.length === 0"
      label="Carpeta vacía"
      title="Aún no hay nada"
      accent="aquí"
      text="Añade productos y asígnalos a esta carpeta desde el formulario o con la selección múltiple."
    >
      <template #icon>
        <Folder :size="22" />
      </template>
      <RouterLink to="/carrito" class="btn btn-primary">
        <Plus :size="15" />
        Añadir productos
      </RouterLink>
    </EmptyState>

    <div v-else class="items-grid">
      <ItemCard
        v-for="(item, idx) in items"
        :key="item.id"
        :item="item"
        :index="idx"
        @click="openItem(item)"
        @edit="editItem(item)"
        @delete="deleteItem(item)"
      />
    </div>

    <ItemDetailModal v-model="showDetailModal" :item="selectedItem" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, Folder, Plus } from 'lucide-vue-next'
import { useItemsStore } from '@/stores/items'
import { useCollectionsStore } from '@/stores/collections'
import { askConfirm } from '@/composables/useDialog'
import { toast } from 'vue-sonner'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ItemCard from '@/components/ItemCard.vue'
import ItemDetailModal from '@/components/ItemDetailModal.vue'
import type { Item } from '@/types'

const route = useRoute()
const itemsStore = useItemsStore()
const collectionsStore = useCollectionsStore()

const showDetailModal = ref(false)
const selectedItem = ref<Item | null>(null)

const collection = computed(() =>
  collectionsStore.collections.find((entry) => entry.id === route.params.id)
)

const items = computed(() =>
  itemsStore.items.filter(
    (item) => !item.is_deleted && item.collection_id === route.params.id
  )
)

onMounted(() => {
  itemsStore.fetchItems()
})

function openItem(item: Item) {
  selectedItem.value = item
  showDetailModal.value = true
}

function editItem(item: Item) {
  selectedItem.value = item
  showDetailModal.value = true
}

async function deleteItem(item: Item) {
  const confirmed = await askConfirm({
    title: 'Mover a la papelera',
    message: `“${item.title || 'Este producto'}” se moverá a la papelera.`,
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
</script>
