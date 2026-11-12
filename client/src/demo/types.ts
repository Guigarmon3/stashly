import type { Collection, Item, PriceHistory } from '@/types'

export interface DemoUser {
  id: string
  email: string
}

export interface DemoState {
  users: DemoUser[]
  sessionUserId: string | null
  autoLogin: boolean
  collections: Collection[]
  items: Item[]
  priceHistory: PriceHistory[]
}
