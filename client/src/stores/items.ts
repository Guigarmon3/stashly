import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'
import type { Item, ScrapedData } from '@/types'

export const useItemsStore = defineStore('items', () => {
  const items = ref<Item[]>([])
  const loading = ref(false)
  const viewMode = ref<'grid' | 'list'>('grid')
  const sortBy = ref<'date-desc' | 'date-asc' | 'price-asc' | 'price-desc' | 'alpha'>('date-desc')
  const searchQuery = ref('')
  const filterFavorite = ref(false)
  const filterPurchased = ref(false)
  const filterStore = ref<string | null>(null)
  
  async function fetchItems(params?: any) {
    loading.value = true
    try {
      items.value = await api.items.getAll(params)
    } finally {
      loading.value = false
    }
  }
  
  async function scrapeUrl(url: string) {
    return api.items.scrape(url)
  }
  
  async function createItem(data: any) {
    const item = await api.items.create(data)
    items.value.unshift(item)
    return item
  }
  
  async function updateItem(id: string, data: Partial<Item>) {
    const item = await api.items.update(id, data)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx >= 0) items.value[idx] = item
    return item
  }
  
  async function deleteItem(id: string) {
    await api.items.delete(id)
    items.value = items.value.filter(i => i.id !== id)
  }
  
  async function restoreItem(id: string) {
    const item = await api.items.restore(id)
    items.value.push(item)
    return item
  }
  
  async function permanentDeleteItem(id: string) {
    await api.items.permanentDelete(id)
    items.value = items.value.filter(i => i.id !== id)
  }
  
  async function bulkAction(action: string, ids: string[], collection_id?: string | null) {
    await api.items.bulk({ action, ids, collection_id })
    if (action === 'delete') {
      items.value = items.value.filter(i => !ids.includes(i.id))
    } else if (action === 'purchase') {
      items.value.forEach(i => { if (ids.includes(i.id)) { i.is_purchased = true; i.purchased_at = Date.now() } })
    } else if (action === 'unpurchase') {
      items.value.forEach(i => { if (ids.includes(i.id)) { i.is_purchased = false; i.purchased_at = null } })
    } else if (action === 'favorite') {
      items.value.forEach(i => { if (ids.includes(i.id)) i.is_favorite = true })
    } else if (action === 'unfavorite') {
      items.value.forEach(i => { if (ids.includes(i.id)) i.is_favorite = false })
    } else if (action === 'move') {
      items.value.forEach(i => { if (ids.includes(i.id)) i.collection_id = collection_id || null })
    }
  }
  
  const filteredItems = computed(() => {
    let result = [...items.value]
    
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(i => 
        i.title?.toLowerCase().includes(q) ||
        i.store?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q)
      )
    }
    if (filterFavorite.value) result = result.filter(i => i.is_favorite)
    if (filterPurchased.value) result = result.filter(i => i.is_purchased)
    else if (filterPurchased.value === false && items.value.some(i => 'filterPurchasedActive' in {})) {
      // handled by view
    }
    if (filterStore.value) result = result.filter(i => i.store === filterStore.value)
    
    result.sort((a, b) => {
      if (sortBy.value === 'date-desc') return b.added_at - a.added_at
      if (sortBy.value === 'date-asc') return a.added_at - b.added_at
      if (sortBy.value === 'alpha') return (a.title || '').localeCompare(b.title || '')
      if (sortBy.value === 'price-asc') return (a.price_value || Infinity) - (b.price_value || Infinity)
      if (sortBy.value === 'price-desc') return (b.price_value || 0) - (a.price_value || 0)
      return 0
    })
    
    return result
  })
  
  const stores = computed(() => {
    const set = new Set(items.value.map(i => i.store).filter(Boolean))
    return Array.from(set)
  })
  
  return { 
    items, loading, viewMode, sortBy, searchQuery, filterFavorite, filterPurchased, filterStore,
    fetchItems, scrapeUrl, createItem, updateItem, deleteItem, restoreItem, permanentDeleteItem, bulkAction,
    filteredItems, stores
  }
})
