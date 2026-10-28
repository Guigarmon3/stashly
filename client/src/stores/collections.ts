import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import type { Collection } from '@/types'

export const useCollectionsStore = defineStore('collections', () => {
  const collections = ref<Collection[]>([])
  const loading = ref(false)
  
  async function fetchCollections() {
    loading.value = true
    try {
      collections.value = await api.collections.getAll()
    } finally {
      loading.value = false
    }
  }
  
  async function createCollection(name: string, color?: string) {
    const collection = await api.collections.create({ name, color })
    collections.value.push(collection)
    collections.value.sort((a, b) => a.position - b.position)
    return collection
  }
  
  async function updateCollection(id: string, data: Partial<Collection>) {
    const collection = await api.collections.update(id, data)
    const idx = collections.value.findIndex(c => c.id === id)
    if (idx >= 0) collections.value[idx] = collection
    return collection
  }
  
  async function deleteCollection(id: string) {
    await api.collections.delete(id)
    collections.value = collections.value.filter(c => c.id !== id)
  }
  
  function toggleCollapse(id: string) {
    const col = collections.value.find(c => c.id === id)
    if (col) {
      col.collapsed = !col.collapsed
      updateCollection(id, { collapsed: col.collapsed })
    }
  }
  
  return { collections, loading, fetchCollections, createCollection, updateCollection, deleteCollection, toggleCollapse }
})
