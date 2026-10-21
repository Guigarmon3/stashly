<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-backdrop" @click.self="close">
        <div class="modal-panel" @click.stop>
          <div class="modal-head">
            <div>
              <p class="mono muted">Nuevo producto</p>
              <h2 class="modal-title mt-1">
                Añadir al <em>carrito</em>
              </h2>
            </div>
            <button class="modal-close" aria-label="Cerrar" @click="close">
              <X :size="17" />
            </button>
          </div>

          <div class="modal-body">
            <div v-if="step === 1" class="space-y-5">
              <div>
                <label class="field-label" for="product-url">URL del producto</label>
                <div class="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="product-url"
                    v-model="url"
                    type="url"
                    class="input flex-1"
                    placeholder="https://..."
                    @keyup.enter="scrape"
                  />
                  <button
                    class="btn btn-primary"
                    :disabled="!url || scraping"
                    @click="scrape"
                  >
                    <Search :size="15" />
                    {{ scraping ? 'Analizando…' : 'Analizar' }}
                  </button>
                </div>
                <p class="mt-2 text-xs text-[var(--muted)]">
                  Soporta Amazon, PcComponentes y la mayoría de tiendas online.
                </p>
              </div>

              <div class="grid gap-px border border-[var(--line)] bg-[var(--line-soft)] sm:grid-cols-3">
                <div class="bg-[var(--bg-card)] p-3">
                  <p class="mono accent">01</p>
                  <p class="mt-2 text-sm text-[var(--ink-3)]">Pega la URL del producto.</p>
                </div>
                <div class="bg-[var(--bg-card)] p-3">
                  <p class="mono accent">02</p>
                  <p class="mt-2 text-sm text-[var(--ink-3)]">Revisa los datos extraídos.</p>
                </div>
                <div class="bg-[var(--bg-card)] p-3">
                  <p class="mono accent">03</p>
                  <p class="mt-2 text-sm text-[var(--ink-3)]">Guarda y organízalo.</p>
                </div>
              </div>
            </div>

            <div v-else class="space-y-4">
              <div
                v-if="duplicate"
                class="border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-3 text-sm text-[var(--warning)]"
              >
                Esta URL ya está guardada como “{{ duplicateTitle }}”.
              </div>

              <div class="flex gap-4 border border-[var(--line)] bg-[var(--bg-card)] p-3">
                <div
                  class="grid h-24 w-24 flex-shrink-0 place-items-center overflow-hidden border border-[var(--line-soft)] bg-[var(--paper-2)]"
                >
                  <img
                    v-if="form.image"
                    :src="form.image"
                    :alt="form.title || ''"
                    class="h-full w-full object-contain p-2 mix-blend-multiply"
                  />
                  <Image v-else :size="24" class="text-[var(--muted)]" />
                </div>

                <div class="min-w-0 flex-1 space-y-2">
                  <div>
                    <label class="field-label" for="product-title">Título</label>
                    <input
                      id="product-title"
                      v-model="form.title"
                      class="input"
                      placeholder="Título del producto"
                    />
                  </div>
                  <div>
                    <label class="field-label" for="product-price">Precio</label>
                    <input
                      id="product-price"
                      v-model="form.price"
                      class="input"
                      placeholder="Precio"
                    />
                  </div>
                </div>
              </div>

              <p class="mono muted">{{ form.store || 'Tienda desconocida' }}</p>

              <div>
                <label class="field-label" for="product-folder">Carpeta</label>
                <select id="product-folder" v-model="form.collection_id" class="select">
                  <option :value="null">Sin carpeta</option>
                  <option
                    v-for="col in collectionsStore.collections"
                    :key="col.id"
                    :value="col.id"
                  >
                    {{ col.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="field-label" for="product-notes">Notas (opcional)</label>
                <textarea
                  id="product-notes"
                  v-model="form.notes"
                  rows="2"
                  class="textarea"
                  placeholder="Añade notas…"
                ></textarea>
              </div>

              <div>
                <label class="field-label" for="product-target">
                  Precio objetivo (opcional)
                </label>
                <input
                  id="product-target"
                  v-model.number="form.target_price"
                  type="number"
                  step="0.01"
                  class="input"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div v-if="step === 2" class="modal-foot">
            <button class="btn" @click="step = 1">Atrás</button>
            <button
              class="btn btn-primary"
              :disabled="saving"
              @click="save"
            >
              {{ saving ? 'Guardando…' : 'Guardar producto' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Image, Search, X } from 'lucide-vue-next'
import { useItemsStore } from '@/stores/items'
import { useCollectionsStore } from '@/stores/collections'
import { toast } from 'vue-sonner'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])

const itemsStore = useItemsStore()
const collectionsStore = useCollectionsStore()

const step = ref(1)
const url = ref('')
const scraping = ref(false)
const saving = ref(false)
const duplicate = ref(false)
const duplicateTitle = ref('')

const form = reactive({
  url: '',
  title: '',
  image: '',
  price: '',
  price_value: null as number | null,
  currency: null as string | null,
  store: '',
  collection_id: null as string | null,
  notes: '',
  target_price: null as number | null,
})

function close() {
  emit('update:modelValue', false)
  setTimeout(() => {
    step.value = 1
    url.value = ''
    duplicate.value = false
    Object.assign(form, {
      url: '',
      title: '',
      image: '',
      price: '',
      price_value: null,
      currency: null,
      store: '',
      collection_id: null,
      notes: '',
      target_price: null,
    })
  }, 300)
}

async function scrape() {
  if (!url.value) return
  scraping.value = true

  try {
    new URL(url.value)
  } catch {
    toast.error('URL inválida')
    scraping.value = false
    return
  }

  try {
    const response = await itemsStore.scrapeUrl(url.value)
    if (response.duplicate) {
      duplicate.value = true
      duplicateTitle.value = response.existingTitle
    }
    form.url = url.value
    if (response.scraped) {
      form.title = response.scraped.title || ''
      form.image = response.scraped.image || ''
      form.price = response.scraped.price || ''
      form.price_value = response.scraped.price_value
      form.currency = response.scraped.currency
      form.store = response.scraped.store || ''
    }
    step.value = 2
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    scraping.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await itemsStore.createItem(form)
    toast.success('Producto guardado')
    close()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    saving.value = false
  }
}
</script>
