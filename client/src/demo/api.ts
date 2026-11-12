import type { Collection, Item, PriceHistory } from '@/types'
import { createEmptyState, createStarterContent } from './seed'
import type { DemoState, DemoUser } from './types'

const STORAGE_KEY = 'stashly:demo:v2'
let memory: DemoState | null = null

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function read(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.items)) {
        memory = parsed
        return parsed
      }
    }
  } catch {
    /* localStorage puede estar bloqueado; usamos memoria */
  }

  if (!memory) memory = createEmptyState()
  write(memory)
  return memory
}

function write(state: DemoState) {
  memory = state
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* la demo sigue funcionando en memoria */
  }
}

function requireUser(state: DemoState): DemoUser {
  const user = state.users.find((entry) => entry.id === state.sessionUserId)
  if (!user) throw new Error('No autorizado')
  return user
}

function publicUser(user: DemoUser) {
  return { id: user.id, email: user.email }
}

function activeItems(state: DemoState, userId: string) {
  return state.items.filter((item) => item.user_id === userId && !item.is_deleted)
}

function storeFromHost(host: string) {
  const clean = host.replace(/^www\./, '')
  const known: Array<[string, string]> = [
    ['amazon.', 'Amazon.es'],
    ['pccomponentes.', 'PcComponentes'],
    ['fnac.', 'Fnac'],
    ['zalando.', 'Zalando'],
    ['ikea.', 'IKEA'],
    ['apple.', 'Apple'],
    ['elcorteingles.', 'El Corte Inglés'],
    ['kavehome.', 'Kave Home'],
  ]
  const match = known.find(([needle]) => clean.includes(needle))
  if (match) return match[1]
  const label = clean.split('.')[0] || 'Tienda'
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function titleFromUrl(parsed: URL) {
  const slug = decodeURIComponent(
    parsed.pathname.split('/').filter(Boolean).pop() || '',
  )
  const clean = slug
    .replace(/\.(html?|php|aspx?)$/i, '')
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return null
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

const encoder = new TextEncoder()

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function createSalt() {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeIdentity(value: string) {
  return String(value || '').trim().toLowerCase()
}

function isValidIdentity(identity: string) {
  if (identity.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)
  }
  return /^[a-z0-9._-]{3,30}$/.test(identity)
}

async function hashPassword(password: string, salt: string) {
  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 120_000,
      hash: 'SHA-256',
    },
    material,
    256,
  )
  return toHex(bits)
}

async function verifyPassword(password: string, salt: string, hash: string) {
  const candidate = await hashPassword(password, salt)
  return candidate === hash
}

const auth = {
  async register(email: string, password: string) {
    const state = read()
    const identity = normalizeIdentity(email)
    if (!identity || !password) {
      throw new Error('Usuario/correo y contraseña requeridos')
    }
    if (!isValidIdentity(identity)) {
      throw new Error('Usa un usuario de 3 a 30 caracteres o un correo válido')
    }
    if (String(password).length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres')
    }
    if (state.users.some((user) => user.email === identity)) {
      throw new Error('Esta cuenta ya está registrada')
    }

    const salt = createSalt()
    const passwordHash = await hashPassword(password, salt)
    const user: DemoUser = {
      id: uid(),
      email: identity,
      passwordHash,
      salt,
    }
    state.users.push(user)

    const starter = createStarterContent(user.id)
    state.collections.push(...starter.collections)
    state.items.push(...starter.items)
    state.priceHistory.push(...starter.priceHistory)
    state.sessionUserId = user.id
    write(state)
    return { user: publicUser(user) }
  },

  async login(email: string, password: string) {
    const state = read()
    const identity = normalizeIdentity(email)
    if (!identity || !password) {
      throw new Error('Usuario/correo o contraseña incorrectos')
    }
    const user = state.users.find((entry) => entry.email === identity)
    if (!user) throw new Error('Usuario/correo o contraseña incorrectos')
    const valid = await verifyPassword(password, user.salt, user.passwordHash)
    if (!valid) throw new Error('Usuario/correo o contraseña incorrectos')
    state.sessionUserId = user.id
    write(state)
    return { user: publicUser(user) }
  },

  async logout() {
    const state = read()
    state.sessionUserId = null
    write(state)
    return { ok: true }
  },

  async me() {
    const state = read()
    const user = state.users.find((entry) => entry.id === state.sessionUserId)
    if (!user) throw new Error('No autorizado')
    return { user: publicUser(user) }
  },
}

const collections = {
  async getAll() {
    const state = read()
    const user = requireUser(state)
    return state.collections
      .filter((collection) => collection.user_id === user.id)
      .sort((a, b) => a.position - b.position || a.created_at - b.created_at)
      .map((collection) => ({ ...collection }))
  },

  async create(data: any) {
    const state = read()
    const user = requireUser(state)
    const name = String(data?.name ?? '').trim()
    if (!name) throw new Error('Nombre requerido')

    const now = Date.now()
    const position =
      state.collections
        .filter((collection) => collection.user_id === user.id)
        .reduce((max, collection) => Math.max(max, collection.position), -1) + 1

    const collection: Collection = {
      id: uid(),
      user_id: user.id,
      name,
      color: data?.color || null,
      icon: data?.icon || null,
      position,
      collapsed: false,
      created_at: now,
      updated_at: now,
    }
    state.collections.push(collection)
    write(state)
    return { ...collection }
  },

  async update(id: string, data: any) {
    const state = read()
    const user = requireUser(state)
    const collection = state.collections.find(
      (entry) => entry.id === id && entry.user_id === user.id,
    )
    if (!collection) throw new Error('Carpeta no encontrada')

    const patch = data ?? {}
    if (patch.name !== undefined) collection.name = String(patch.name).trim()
    if (patch.color !== undefined) collection.color = patch.color
    if (patch.icon !== undefined) collection.icon = patch.icon
    if (patch.position !== undefined) collection.position = Number(patch.position)
    if (patch.collapsed !== undefined) collection.collapsed = Boolean(patch.collapsed)
    collection.updated_at = Date.now()
    write(state)
    return { ...collection }
  },

  async delete(id: string) {
    const state = read()
    const user = requireUser(state)
    const exists = state.collections.some(
      (entry) => entry.id === id && entry.user_id === user.id,
    )
    if (!exists) throw new Error('Carpeta no encontrada')

    const now = Date.now()
    state.items.forEach((item) => {
      if (item.user_id === user.id && item.collection_id === id) {
        item.collection_id = null
        item.updated_at = now
      }
    })
    state.collections = state.collections.filter((entry) => entry.id !== id)
    write(state)
    return { ok: true }
  },
}

const items = {
  async getAll(params: any = {}) {
    const state = read()
    const user = requireUser(state)
    const includeDeleted =
      params?.include_deleted === true || params?.include_deleted === 'true'

    let rows = state.items.filter(
      (item) =>
        item.user_id === user.id &&
        (includeDeleted ? item.is_deleted : !item.is_deleted),
    )

    if (params?.collection_id && params.collection_id !== 'all') {
      rows = rows.filter((item) => item.collection_id === params.collection_id)
    }

    rows = [...rows].sort(
      (a, b) => a.position - b.position || b.added_at - a.added_at,
    )
    return rows.map((item) => ({ ...item }))
  },

  async scrape(rawUrl: string) {
    const state = read()
    const user = requireUser(state)
    const url = String(rawUrl || '').trim()

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new Error('URL inválida')
    }
    if (!/^https?:$/.test(parsed.protocol)) throw new Error('URL inválida')

    const existing = state.items.find(
      (item) => item.user_id === user.id && item.url === url && !item.is_deleted,
    )
    if (existing) {
      return {
        duplicate: true,
        existingId: existing.id,
        existingTitle: existing.title,
        scraped: null,
      }
    }

    return {
      duplicate: false,
      scraped: {
        url,
        title: titleFromUrl(parsed),
        image: null,
        price: null,
        price_value: null,
        currency: null,
        store: storeFromHost(parsed.hostname),
      },
    }
  },

  async create(data: any) {
    const state = read()
    const user = requireUser(state)
    const url = String(data?.url ?? '').trim()
    if (!url) throw new Error('URL requerida')
    if (
      state.items.some(
        (item) => item.user_id === user.id && item.url === url && !item.is_deleted,
      )
    ) {
      throw new Error('Esta URL ya está guardada')
    }

    const now = Date.now()
    const position =
      activeItems(state, user.id).reduce(
        (max, item) => Math.max(max, item.position),
        -1,
      ) + 1
    const priceValue =
      data?.price_value === null ||
      data?.price_value === undefined ||
      data?.price_value === ''
        ? null
        : Number(data.price_value)
    const targetPrice =
      data?.target_price === null ||
      data?.target_price === undefined ||
      data?.target_price === ''
        ? null
        : Number(data.target_price)

    const item: Item = {
      id: uid(),
      user_id: user.id,
      collection_id: data?.collection_id || null,
      url,
      title: data?.title || null,
      image: data?.image || null,
      price: data?.price || null,
      price_value: Number.isFinite(priceValue) ? priceValue : null,
      currency: data?.currency || null,
      store: data?.store || null,
      notes: data?.notes || null,
      target_price: Number.isFinite(targetPrice) ? targetPrice : null,
      target_price_currency: null,
      is_favorite: false,
      is_purchased: false,
      is_deleted: false,
      position,
      added_at: now,
      updated_at: now,
      purchased_at: null,
      deleted_at: null,
    }
    state.items.push(item)

    if (item.price || item.price_value !== null) {
      state.priceHistory.push({
        id: uid(),
        item_id: item.id,
        price: item.price,
        price_value: item.price_value,
        currency: item.currency,
        recorded_at: now,
      })
    }

    write(state)
    return { ...item }
  },

  async update(id: string, data: any) {
    const state = read()
    const user = requireUser(state)
    const item = state.items.find(
      (entry) => entry.id === id && entry.user_id === user.id && !entry.is_deleted,
    )
    if (!item) throw new Error('Item no encontrado')

    const patch = data ?? {}
    const previousPrice = item.price
    const previousValue = item.price_value

    if (patch.collection_id !== undefined) {
      item.collection_id = patch.collection_id || null
    }
    if (patch.title !== undefined) item.title = patch.title
    if (patch.image !== undefined) item.image = patch.image
    if (patch.price !== undefined) item.price = patch.price
    if (patch.price_value !== undefined) {
      item.price_value =
        patch.price_value === null || patch.price_value === ''
          ? null
          : Number(patch.price_value)
    }
    if (patch.currency !== undefined) item.currency = patch.currency
    if (patch.notes !== undefined) item.notes = patch.notes
    if (patch.target_price !== undefined) {
      item.target_price =
        patch.target_price === null || patch.target_price === ''
          ? null
          : Number(patch.target_price)
    }
    if (patch.is_favorite !== undefined) {
      item.is_favorite = Boolean(patch.is_favorite)
    }
    if (patch.is_purchased !== undefined) {
      item.is_purchased = Boolean(patch.is_purchased)
      item.purchased_at = item.is_purchased ? Date.now() : null
    }
    if (patch.position !== undefined) item.position = Number(patch.position)

    item.updated_at = Date.now()

    if (
      (patch.price !== undefined || patch.price_value !== undefined) &&
      (previousPrice !== item.price || previousValue !== item.price_value)
    ) {
      state.priceHistory.push({
        id: uid(),
        item_id: item.id,
        price: item.price,
        price_value: item.price_value,
        currency: item.currency,
        recorded_at: item.updated_at,
      })
    }

    write(state)
    return { ...item }
  },

  async delete(id: string) {
    const state = read()
    const user = requireUser(state)
    const item = state.items.find(
      (entry) => entry.id === id && entry.user_id === user.id,
    )
    if (!item) throw new Error('Item no encontrado')
    const now = Date.now()
    item.is_deleted = true
    item.deleted_at = now
    item.updated_at = now
    write(state)
    return { ok: true }
  },

  async restore(id: string) {
    const state = read()
    const user = requireUser(state)
    const item = state.items.find(
      (entry) => entry.id === id && entry.user_id === user.id,
    )
    if (!item) throw new Error('Item no encontrado')
    item.is_deleted = false
    item.deleted_at = null
    item.updated_at = Date.now()
    write(state)
    return { ...item }
  },

  async permanentDelete(id: string) {
    const state = read()
    const user = requireUser(state)
    const exists = state.items.some(
      (entry) => entry.id === id && entry.user_id === user.id,
    )
    if (!exists) throw new Error('Item no encontrado')
    state.items = state.items.filter((entry) => entry.id !== id)
    state.priceHistory = state.priceHistory.filter(
      (entry) => entry.item_id !== id,
    )
    write(state)
    return { ok: true }
  },

  async history(id: string) {
    const state = read()
    const user = requireUser(state)
    const item = state.items.find(
      (entry) => entry.id === id && entry.user_id === user.id,
    )
    if (!item) throw new Error('Item no encontrado')
    return state.priceHistory
      .filter((entry) => entry.item_id === id)
      .sort((a, b) => a.recorded_at - b.recorded_at)
      .map((entry) => ({ ...entry }))
  },

  async bulk(data: any) {
    const state = read()
    const user = requireUser(state)
    const ids: string[] = Array.isArray(data?.ids) ? data.ids : []
    if (ids.length === 0) throw new Error('IDs requeridos')

    const now = Date.now()
    const selected = state.items.filter(
      (item) => item.user_id === user.id && ids.includes(item.id),
    )

    selected.forEach((item) => {
      if (data.action === 'move') item.collection_id = data.collection_id || null
      if (data.action === 'purchase') {
        item.is_purchased = true
        item.purchased_at = now
      }
      if (data.action === 'unpurchase') {
        item.is_purchased = false
        item.purchased_at = null
      }
      if (data.action === 'delete') {
        item.is_deleted = true
        item.deleted_at = now
      }
      if (data.action === 'favorite') item.is_favorite = true
      if (data.action === 'unfavorite') item.is_favorite = false
      item.updated_at = now
    })

    write(state)
    return { ok: true, count: selected.length }
  },
}

const sync = {
  async export() {
    const state = read()
    const user = requireUser(state)
    const userCollections = state.collections.filter(
      (entry) => entry.user_id === user.id,
    )
    const userItems = state.items.filter((entry) => entry.user_id === user.id)
    const ids = new Set(userItems.map((entry) => entry.id))
    return {
      version: 1,
      exported_at: Date.now(),
      collections: copy(userCollections),
      items: copy(userItems),
      price_history: copy(
        state.priceHistory.filter((entry) => ids.has(entry.item_id)),
      ),
    }
  },

  async import(data: any) {
    const state = read()
    const user = requireUser(state)
    const now = Date.now()
    const incomingCollections: any[] = Array.isArray(data?.collections)
      ? data.collections
      : []
    const incomingItems: any[] = Array.isArray(data?.items) ? data.items : []
    const incomingHistory: any[] = Array.isArray(data?.price_history)
      ? data.price_history
      : []

    incomingCollections.forEach((entry) => {
      const existing = state.collections.find(
        (collection) =>
          collection.id === entry.id && collection.user_id === user.id,
      )
      if (existing) {
        existing.name = entry.name
        existing.color = entry.color ?? null
        existing.icon = entry.icon ?? null
        existing.position = entry.position || 0
        existing.collapsed = Boolean(entry.collapsed)
        existing.updated_at = now
      } else {
        state.collections.push({
          id: entry.id || uid(),
          user_id: user.id,
          name: entry.name,
          color: entry.color ?? null,
          icon: entry.icon ?? null,
          position: entry.position || 0,
          collapsed: Boolean(entry.collapsed),
          created_at: entry.created_at || now,
          updated_at: now,
        })
      }
    })

    incomingItems.forEach((entry) => {
      const existing = state.items.find(
        (item) => item.id === entry.id && item.user_id === user.id,
      )
      if (existing) {
        Object.assign(existing, {
          collection_id: entry.collection_id ?? null,
          url: entry.url,
          title: entry.title ?? null,
          image: entry.image ?? null,
          price: entry.price ?? null,
          price_value: entry.price_value ?? null,
          currency: entry.currency ?? null,
          store: entry.store ?? null,
          notes: entry.notes ?? null,
          target_price: entry.target_price ?? null,
          is_favorite: Boolean(entry.is_favorite),
          is_purchased: Boolean(entry.is_purchased),
          is_deleted: Boolean(entry.is_deleted),
          position: entry.position || 0,
          purchased_at: entry.purchased_at ?? null,
          deleted_at: entry.deleted_at ?? null,
          updated_at: now,
        })
      } else {
        state.items.push({
          id: entry.id || uid(),
          user_id: user.id,
          collection_id: entry.collection_id ?? null,
          url: entry.url,
          title: entry.title ?? null,
          image: entry.image ?? null,
          price: entry.price ?? null,
          price_value: entry.price_value ?? null,
          currency: entry.currency ?? null,
          store: entry.store ?? null,
          notes: entry.notes ?? null,
          target_price: entry.target_price ?? null,
          target_price_currency: null,
          is_favorite: Boolean(entry.is_favorite),
          is_purchased: Boolean(entry.is_purchased),
          is_deleted: Boolean(entry.is_deleted),
          position: entry.position || 0,
          added_at: entry.added_at || now,
          updated_at: now,
          purchased_at: entry.purchased_at ?? null,
          deleted_at: entry.deleted_at ?? null,
        })
      }
    })

    incomingHistory.forEach((entry) => {
      if (!entry.id || state.priceHistory.some((row) => row.id === entry.id)) {
        return
      }
      const item = state.items.find(
        (row) => row.id === entry.item_id && row.user_id === user.id,
      )
      if (!item) return
      state.priceHistory.push({
        id: entry.id,
        item_id: entry.item_id,
        price: entry.price ?? null,
        price_value: entry.price_value ?? null,
        currency: entry.currency ?? null,
        recorded_at: entry.recorded_at || now,
      })
    })

    write(state)
    return { ok: true }
  },
}

export const demoApi = { auth, collections, items, sync }
export type DemoApi = typeof demoApi
