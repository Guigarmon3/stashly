<template>
  <div class="page-shell">
    <PageHeader
      index="03"
      label="Índice"
      title="Comprados"
      accent="y disfrutados"
      :subtitle="`${items.length} ${items.length === 1 ? 'producto' : 'productos'} que ya forman parte de tu colección`"
    />

    <EmptyState
      v-if="items.length === 0"
      label="Sin compras"
      title="Todavía no has marcado"
      accent="nada"
      text="Cuando compres algo, márcalo con el check y aparecerá aquí como parte de tu historial."
    >
      <template #icon>
        <CheckCircle2 :size="22" />
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
import { ArrowLeft, CheckCircle2 } from 'lucide-vue-next'
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
  itemsStore.items.filter((item) => !item.is_deleted && item.is_purchased)
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
