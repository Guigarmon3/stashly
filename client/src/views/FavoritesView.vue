<template>
  <div class="page-shell">
    <PageHeader
      index="02"
      label="Índice"
      title="Favoritos"
      accent="guardados"
      :subtitle="`${items.length} ${items.length === 1 ? 'producto' : 'productos'} que quieres tener cerca`"
    />

    <EmptyState
      v-if="items.length === 0"
      label="Sin favoritos"
      title="Marca lo que te"
      accent="encanta"
      text="Pulsa el corazón de cualquier producto para guardarlo aquí y encontrarlo en un vistazo."
    >
      <template #icon>
        <Heart :size="22" />
      </template>
      <RouterLink to="/carrito" class="btn btn-primary">
        <ArrowLeft :size="15" />
        Ir al carrito
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
import { RouterLink } from 'vue-router'
import { ArrowLeft, Heart } from 'lucide-vue-next'
import { useItemsStore } from '@/stores/items'
import { askConfirm } from '@/composables/useDialog'
import { toast } from 'vue-sonner'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ItemCard from '@/components/ItemCard.vue'
import ItemDetailModal from '@/components/ItemDetailModal.vue'
import type { Item } from '@/types'

const itemsStore = useItemsStore()

const showDetailModal = ref(false)
const selectedItem = ref<Item | null>(null)

const items = computed(() =>
  itemsStore.items.filter((item) => !item.is_deleted && item.is_favorite)
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
