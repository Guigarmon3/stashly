import { demoApi } from './demo/api'

const API_BASE = '/api'

async function request(url: string, options: RequestInit = {}) {
  const res = await fetch(API_BASE + url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error' }))
    throw new Error(data.error || 'Error')
  }
  return res.json()
}

const httpApi = {
  auth: {
    register: (email: string, password: string) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
    login: (email: string, password: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me')
  },
  collections: {
    getAll: () => request('/collections'),
    create: (data: any) => request('/collections', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/collections/${id}`, { method: 'DELETE' })
  },
  items: {
    getAll: (params?: any) => {
      const qs = new URLSearchParams(params).toString()
      return request('/items' + (qs ? '?' + qs : ''))
    },
    scrape: (url: string) => request('/items/scrape', { method: 'POST', body: JSON.stringify({ url }) }),
    create: (data: any) => request('/items', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/items/${id}`, { method: 'DELETE' }),
    restore: (id: string) => request(`/items/${id}/restore`, { method: 'POST' }),
    permanentDelete: (id: string) => request(`/items/${id}/permanent`, { method: 'DELETE' }),
    history: (id: string) => request(`/items/${id}/history`),
    bulk: (data: any) => request('/items/bulk', { method: 'POST', body: JSON.stringify(data) })
  },
  sync: {
    export: () => request('/sync/export'),
    import: (data: any) => request('/sync/import', { method: 'POST', body: JSON.stringify(data) })
  }
}

const demoFlag = import.meta.env.VITE_DEMO
export const IS_DEMO = demoFlag === '1' || demoFlag === 'true'

export const api = IS_DEMO ? demoApi : httpApi
