<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue && item"
        class="modal-backdrop"
        @click.self="close"
      >
        <div class="modal-panel" style="max-width: 880px" @click.stop>
          <div class="modal-head">
            <div class="flex min-w-0 items-start gap-4">
              <div
                class="grid h-20 w-20 flex-shrink-0 place-items-center overflow-hidden border border-[var(--line-soft)] bg-[var(--paper-2)]"
              >
                <img
                  v-if="item.image"
                  :src="item.image"
                  :alt="item.title || ''"
                  class="h-full w-full object-contain p-2 mix-blend-multiply"
                />
                <Image v-else :size="22" class="text-[var(--muted)]" />
              </div>

              <div class="min-w-0">
                <p class="mono muted">{{ item.store || 'Sin tienda' }}</p>
                <h2 class="modal-title mt-1 line-clamp-2">
                  {{ item.title || 'Sin título' }}
                </h2>
                <div class="mt-2 flex flex-wrap items-center gap-3">
                  <span v-if="item.price" class="item-price">{{ item.price }}</span>
                  <a
                    :href="item.url"
                    target="_blank"
                    rel="noopener"
                    class="mono inline-flex items-center gap-1 text-[var(--accent)]"
                  >
                    Abrir producto
                    <ExternalLink :size="12" />
                  </a>
                </div>
              </div>
            </div>

            <button class="modal-close" aria-label="Cerrar" @click="close">
              <X :size="17" />
            </button>
          </div>

          <div class="modal-body">
            <div class="mb-5">
              <label class="field-label">
                <Image :size="13" />
                Foto del producto
              </label>
              <div class="flex flex-col gap-3 sm:flex-row">
                <div
                  role="button"
                  tabindex="0"
                  aria-label="Añadir o cambiar la foto"
                  class="relative grid h-28 w-28 flex-shrink-0 cursor-pointer place-items-center overflow-hidden border border-dashed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  :class="
                    dragOver
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-[var(--line)] bg-[var(--paper-2)] hover:border-[var(--accent)]'
                  "
                  @click="openFilePicker"
                  @keydown.enter.prevent="openFilePicker"
                  @keydown.space.prevent="openFilePicker"
                  @dragover.prevent="dragOver = true"
                  @dragleave.prevent="dragOver = false"
                  @drop.prevent="onDrop"
                >
                  <img
                    v-if="imagePreview"
                    :src="imagePreview"
                    :alt="item.title || ''"
                    class="h-full w-full object-contain p-2 mix-blend-multiply"
                  />
                  <div
                    v-else
                    class="flex flex-col items-center gap-1 px-2 text-center text-[var(--muted)]"
                  >
                    <Upload :size="20" />
                    <span class="text-[11px] leading-tight">
                      Arrastra una imagen
                    </span>
                  </div>
                  <div
                    v-if="imageSaving"
                    class="absolute inset-0 grid place-items-center bg-[var(--bg-card)]/70"
                  >
                    <Loader2 :size="18" class="animate-spin" />
                  </div>
                </div>

                <div class="min-w-0 flex-1 space-y-2">
                  <div class="flex flex-col gap-2 sm:flex-row">
                    <input
                      v-model="imageUrl"
                      type="url"
                      class="input flex-1"
                      placeholder="https://.../imagen.jpg"
                      aria-label="URL de la imagen"
                      @keyup.enter="applyImageUrl"
                    />
                    <button
                      class="btn btn-sm"
                      :disabled="!imageUrl.trim() || imageSaving"
                      @click="applyImageUrl"
                    >
                      Usar URL
                    </button>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      class="btn btn-sm"
                      :disabled="imageSaving"
                      @click="openFilePicker"
                    >
                      <Upload :size="14" />
                      Subir archivo
                    </button>
                    <button
                      v-if="imagePreview"
                      class="btn btn-sm text-[var(--danger)]"
                      :disabled="imageSaving"
                      @click="removeImage"
                    >
                      <Trash2 :size="14" />
                      Quitar
                    </button>
                    <span class="mono muted text-xs">
                      o arrastra una imagen aquí
                    </span>
                  </div>
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="onFileChange"
                  />
                </div>
              </div>
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label class="field-label" for="detail-notes">
                  <FileText :size="13" />
                  Notas
                </label>
                <textarea
                  id="detail-notes"
                  v-model="notes"
                  rows="6"
                  class="textarea"
                  placeholder="Añade notas sobre este producto…"
                  @blur="saveNotes"
                ></textarea>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="field-label" for="detail-target">
                    <Target :size="13" />
                    Precio objetivo
                  </label>
                  <div class="flex gap-2">
                    <input
                      id="detail-target"
                      v-model.number="targetPrice"
                      type="number"
                      step="0.01"
                      class="input flex-1"
                      placeholder="0.00"
                    />
                    <button class="btn btn-sm" @click="saveTargetPrice">
                      Guardar
                    </button>
                  </div>
                  <p
                    v-if="
                      item.target_price &&
                      item.price_value &&
                      item.price_value <= item.target_price
                    "
                    class="mt-2 text-sm text-[var(--success)]"
                  >
                    El precio actual está en o por debajo del objetivo.
                  </p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button class="btn btn-sm" @click="toggleFavorite">
                    <Heart
                      :size="14"
                      :class="item.is_favorite ? 'fill-current text-[var(--favorite)]' : ''"
                    />
                    {{ item.is_favorite ? 'Quitar favorito' : 'Añadir favorito' }}
                  </button>
                  <button class="btn btn-sm" @click="togglePurchased">
                    <CheckCircle2
                      :size="14"
                      :class="item.is_purchased ? 'text-[var(--success)]' : ''"
                    />
                    {{ item.is_purchased ? 'No comprado' : 'Marcar comprado' }}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between">
                <label class="field-label mb-0">
                  <TrendingDown :size="13" />
                  Historial de precios
                </label>
                <span class="mono muted"
                  >{{ history.length }}
                  {{ history.length === 1 ? 'registro' : 'registros' }}</span
                >
              </div>

              <div
                v-if="history.length === 0"
                class="border border-dashed border-[var(--line)] p-5 text-center text-sm text-[var(--muted)]"
              >
                Sin historial todavía.
              </div>

              <div v-else class="border-t border-[var(--line)]">
                <div
                  v-for="entry in history"
                  :key="entry.id"
                  class="history-row"
                >
                  <span class="mono muted">{{ formatDate(entry.recorded_at) }}</span>
                  <span class="font-medium">{{ entry.price || '—' }}</span>
                </div>
                <div class="history-row border-b-0 pt-3">
                  <span class="mono muted">Mínimo / máximo</span>
                  <span class="font-medium">{{ minPrice }} / {{ maxPrice }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Heart,
  Image,
  Loader2,
  Target,
  Trash2,
  TrendingDown,
  Upload,
  X,
} from 'lucide-vue-next'
import { useItemsStore } from '@/stores/items'
import { api } from '@/api'
import { toast } from 'vue-sonner'
import type { Item, PriceHistory } from '@/types'

const props = defineProps<{ modelValue: boolean; item: Item | null }>()
const emit = defineEmits(['update:modelValue'])

const itemsStore = useItemsStore()

const notes = ref('')
const targetPrice = ref<number | null>(null)
const history = ref<PriceHistory[]>([])

const fileInput = ref<HTMLInputElement | null>(null)
const imagePreview = ref('')
const imageUrl = ref('')
const imageSaving = ref(false)
const dragOver = ref(false)

const MAX_IMAGE_BYTES = 9_000_000

watch(
  () => props.item,
  async (newItem) => {
    if (newItem) {
      notes.value = newItem.notes || ''
      targetPrice.value = newItem.target_price
      imagePreview.value = newItem.image || ''
      imageUrl.value = ''
      dragOver.value = false
      try {
        history.value = await api.items.history(newItem.id)
      } catch {
        history.value = []
      }
    }
  },
  { immediate: true }
)

const minPrice = computed(() => {
  const values = history.value
    .map((h) => h.price_value)
    .filter((v) => v !== null) as number[]
  if (values.length === 0) return '-'
  const min = Math.min(...values)
  const entry = history.value.find((x) => x.price_value === min)
  return entry?.price || min
})

const maxPrice = computed(() => {
  const values = history.value
    .map((h) => h.price_value)
    .filter((v) => v !== null) as number[]
  if (values.length === 0) return '-'
  const max = Math.max(...values)
  const entry = history.value.find((x) => x.price_value === max)
  return entry?.price || max
})

function close() {
  emit('update:modelValue', false)
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function openFilePicker() {
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleImageFile(file)
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    handleImageFile(file)
    return
  }
  const text =
    event.dataTransfer?.getData('text/uri-list') ||
    event.dataTransfer?.getData('text/plain')
  if (text) {
    imageUrl.value = text.trim()
    applyImageUrl()
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo procesar la imagen'))
    img.src = src
  })
}

async function compressImage(file: File) {
  const dataUrl = await readFileAsDataUrl(file)
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return dataUrl

  const img = await loadImageElement(dataUrl)
  const maxSide = 1280
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  ctx.drawImage(img, 0, 0, width, height)
  const webp = canvas.toDataURL('image/webp', 0.85)
  return webp.startsWith('data:image/webp')
    ? webp
    : canvas.toDataURL('image/jpeg', 0.85)
}

async function saveImage(value: string, message: string) {
  if (!props.item) return
  if (value.length > MAX_IMAGE_BYTES) {
    throw new Error('La imagen es demasiado grande, prueba con otra')
  }
  const saved = await itemsStore.updateItem(props.item.id, { image: value })
  props.item.image = saved.image
  imagePreview.value = saved.image || ''
  imageUrl.value = ''
  toast.success(message)
}

async function handleImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    toast.error('El archivo debe ser una imagen')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error('La imagen supera los 10 MB')
    return
  }
  imageSaving.value = true
  try {
    const dataUrl = await compressImage(file)
    await saveImage(dataUrl, 'Foto actualizada')
  } catch (e: any) {
    toast.error(e.message)
  } finally {
    imageSaving.value = false
  }
}

async function applyImageUrl() {
  const value = imageUrl.value.trim()
  if (!value) return
  try {
    const parsed = new URL(value)
    if (!['http:', 'https:', 'data:'].includes(parsed.protocol)) {
      throw new Error()
    }
  } catch {
    toast.error('URL de imagen inválida')
    return
  }
  imageSaving.value = true
  try {
    await saveImage(value, 'Foto actualizada')
  } catch (e: any) {
    toast.error(e.message)
  } finally {
    imageSaving.value = false
  }
}

async function removeImage() {
  if (!props.item) return
  imageSaving.value = true
  try {
    await itemsStore.updateItem(props.item.id, { image: null })
    props.item.image = null
    imagePreview.value = ''
    toast.success('Foto eliminada')
  } catch (e: any) {
    toast.error(e.message)
  } finally {
    imageSaving.value = false
  }
}

async function saveNotes() {
  if (!props.item) return
  try {
    await itemsStore.updateItem(props.item.id, { notes: notes.value })
    toast.success('Notas guardadas')
  } catch (e: any) {
    toast.error(e.message)
  }
}

async function saveTargetPrice() {
  if (!props.item) return
  try {
    await itemsStore.updateItem(props.item.id, {
      target_price: targetPrice.value,
    })
    toast.success('Precio objetivo guardado')
  } catch (e: any) {
    toast.error(e.message)
  }
}

async function toggleFavorite() {
  if (!props.item) return
  try {
    await itemsStore.updateItem(props.item.id, {
      is_favorite: !props.item.is_favorite,
    })
    props.item.is_favorite = !props.item.is_favorite
    toast.success(
      props.item.is_favorite ? 'Añadido a favoritos' : 'Eliminado de favoritos'
    )
  } catch (e: any) {
    toast.error(e.message)
  }
}

async function togglePurchased() {
  if (!props.item) return
  try {
    await itemsStore.updateItem(props.item.id, {
      is_purchased: !props.item.is_purchased,
    })
    props.item.is_purchased = !props.item.is_purchased
    toast.success(
      props.item.is_purchased ? '¡Comprado!' : 'Marcado como no comprado'
    )
  } catch (e: any) {
    toast.error(e.message)
  }
}
</script>
