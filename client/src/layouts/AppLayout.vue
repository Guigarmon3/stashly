<template>
  <div class="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
    <Transition name="fade">
      <div
        v-if="mobileOpen"
        class="fixed inset-0 z-[55] bg-[color-mix(in_srgb,var(--ink)_44%,transparent)] backdrop-blur-sm lg:hidden"
        @click="mobileOpen = false"
      ></div>
    </Transition>

    <aside
      class="sidebar flex flex-col"
      :class="{ 'is-open': mobileOpen, 'is-collapsed': sidebarCollapsed }"
    >
      <div class="sidebar-brand">
        <RouterLink to="/carrito" class="flex min-w-0 items-center gap-3" @click="mobileOpen = false">
          <span class="brand-mark">S</span>
          <span v-if="!sidebarCollapsed" class="min-w-0">
            <span class="brand-word block">Stashly</span>
            <span class="brand-sub block">Wishlist editorial</span>
          </span>
        </RouterLink>
        <button
          class="sidebar-collapse ml-auto hidden lg:grid"
          aria-label="Colapsar barra lateral"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <ChevronLeft
            :size="16"
            class="transition-transform"
            :class="{ 'rotate-180': sidebarCollapsed }"
          />
        </button>
      </div>

      <div class="px-3.5 pb-4">
        <button
          class="btn btn-primary w-full"
          :class="{ 'px-0': sidebarCollapsed }"
          @click="openAddModal"
        >
          <Plus :size="16" />
          <span v-if="!sidebarCollapsed">Añadir producto</span>
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto pb-4">
        <div class="nav-section">
          <p v-if="!sidebarCollapsed" class="nav-section-label mono">Índice</p>

          <RouterLink
            to="/carrito"
            class="nav-link"
            :class="{ 'is-active': $route.name === 'home' }"
            @click="mobileOpen = false"
          >
            <ShoppingBag :size="16" />
            <span v-if="!sidebarCollapsed">Carrito</span>
            <span v-if="!sidebarCollapsed" class="nav-index">{{ pad(totalCount) }}</span>
          </RouterLink>

          <RouterLink
            to="/favorites"
            class="nav-link"
            :class="{ 'is-active': $route.name === 'favorites' }"
            @click="mobileOpen = false"
          >
            <Heart :size="16" />
            <span v-if="!sidebarCollapsed">Favoritos</span>
            <span v-if="!sidebarCollapsed" class="nav-index">{{ pad(favoriteCount) }}</span>
          </RouterLink>

          <RouterLink
            to="/purchased"
            class="nav-link"
            :class="{ 'is-active': $route.name === 'purchased' }"
            @click="mobileOpen = false"
          >
            <CheckCircle2 :size="16" />
            <span v-if="!sidebarCollapsed">Comprados</span>
            <span v-if="!sidebarCollapsed" class="nav-index">{{ pad(purchasedCount) }}</span>
          </RouterLink>
        </div>

        <div class="nav-section mt-5">
          <div class="nav-section-label">
            <span v-if="!sidebarCollapsed" class="mono">Carpetas</span>
            <button
              class="folder-toggle"
              aria-label="Crear carpeta"
              @click="createNewCollection"
            >
              <Plus :size="14" />
            </button>
          </div>

          <div
            v-for="col in collectionsStore.collections"
            :key="col.id"
            class="folder-row"
          >
            <button
              class="folder-toggle"
              :aria-label="col.collapsed ? 'Expandir carpeta' : 'Colapsar carpeta'"
              @click="collectionsStore.toggleCollapse(col.id)"
            >
              <ChevronRight
                :size="13"
                class="transition-transform"
                :class="{ 'rotate-90': !col.collapsed }"
              />
            </button>
            <RouterLink
              :to="`/folder/${col.id}`"
              class="nav-link min-w-0 flex-1"
              :class="{ 'is-active': $route.params.id === col.id }"
              @click="mobileOpen = false"
            >
              <span
                class="folder-dot"
                :style="{ background: col.color || 'var(--accent)' }"
              ></span>
              <span v-if="!sidebarCollapsed" class="truncate">{{ col.name }}</span>
              <span v-if="!sidebarCollapsed" class="nav-index">{{ pad(folderCount(col.id)) }}</span>
            </RouterLink>
          </div>

          <p
            v-if="!collectionsStore.collections.length && !sidebarCollapsed"
            class="px-2 py-2 text-xs text-[var(--muted)]"
          >
            Sin carpetas todavía.
          </p>
        </div>

        <div class="nav-section mt-5 border-t border-[var(--line)] pt-3">
          <RouterLink
            to="/trash"
            class="nav-link"
            :class="{ 'is-active': $route.name === 'trash' }"
            @click="mobileOpen = false"
          >
            <Trash2 :size="16" />
            <span v-if="!sidebarCollapsed">Papelera</span>
          </RouterLink>

          <RouterLink
            to="/explain"
            class="nav-link"
            :class="{ 'is-active': $route.name === 'explain' }"
            @click="mobileOpen = false"
          >
            <HelpCircle :size="16" />
            <span v-if="!sidebarCollapsed">Explicaciones</span>
          </RouterLink>
        </div>
      </nav>

      <div class="sidebar-foot">
        <div class="flex items-center gap-2.5">
          <span class="user-avatar">{{ initial }}</span>
          <div v-if="!sidebarCollapsed" class="min-w-0 flex-1">
            <p class="truncate text-xs">{{ authStore.user?.email }}</p>
            <button
              class="mono text-[var(--muted)] transition-colors hover:text-[var(--danger)]"
              @click="logout"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </aside>

    <div class="relative flex min-w-0 flex-1 flex-col">
      <header
        class="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--bg-surface)] px-4 py-3 lg:hidden"
      >
        <button class="btn btn-icon btn-sm" aria-label="Abrir menú" @click="mobileOpen = true">
          <Menu :size="17" />
        </button>
        <RouterLink to="/carrito" class="brand-word text-xl">Stashly</RouterLink>
        <button class="btn btn-icon btn-sm" aria-label="Añadir producto" @click="openAddModal">
          <Plus :size="17" />
        </button>
      </header>

      <main ref="mainRef" class="relative flex-1 overflow-y-auto" @scroll="onScroll">
        <div class="scroll-progress" :style="{ transform: `scaleX(${progress})` }"></div>

        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <AddItemModal v-model="showAddModal" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Heart,
  HelpCircle,
  Menu,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useCollectionsStore } from '@/stores/collections'
import { useItemsStore } from '@/stores/items'
import { askPrompt } from '@/composables/useDialog'
import { toast } from 'vue-sonner'
import AddItemModal from '@/components/AddItemModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const collectionsStore = useCollectionsStore()
const itemsStore = useItemsStore()

const sidebarCollapsed = ref(false)
const mobileOpen = ref(false)
const showAddModal = ref(false)
const mainRef = ref<HTMLElement | null>(null)
const progress = ref(0)

const activeItems = computed(() => itemsStore.items.filter((item) => !item.is_deleted))
const totalCount = computed(() => activeItems.value.length)
const favoriteCount = computed(() => activeItems.value.filter((item) => item.is_favorite).length)
const purchasedCount = computed(() => activeItems.value.filter((item) => item.is_purchased).length)
const initial = computed(() => authStore.user?.email?.[0]?.toUpperCase() ?? 'S')

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function folderCount(id: string) {
  return activeItems.value.filter((item) => item.collection_id === id).length
}

function onScroll() {
  const el = mainRef.value
  if (!el) return
  const max = el.scrollHeight - el.clientHeight
  progress.value = max > 0 ? Math.min(1, el.scrollTop / max) : 0
}

function openAddModal() {
  showAddModal.value = true
}

async function createNewCollection() {
  const name = await askPrompt({
    title: 'Nueva carpeta',
    message: 'Agrupa tus productos por tema, tienda o proyecto.',
    label: 'Nombre de la carpeta',
    placeholder: 'Ej. Tecnología',
    confirmLabel: 'Crear carpeta',
  })
  if (!name) return

  try {
    await collectionsStore.createCollection(name)
    toast.success('Carpeta creada')
  } catch (error: any) {
    toast.error(error.message)
  }
}

async function logout() {
  await authStore.logout()
  router.push('/auth/login')
  toast.success('Sesión cerrada')
}

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
    if (mainRef.value) mainRef.value.scrollTop = 0
    progress.value = 0
  }
)

onMounted(() => {
  collectionsStore.fetchCollections()
  if (!itemsStore.items.length) itemsStore.fetchItems()
})
</script>
