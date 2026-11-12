import type { Collection, Item, PriceHistory } from '@/types'

export interface DemoUser {
  id: string
  email: string
  passwordHash: string
  salt: string
}

export interface DemoState {
  users: DemoUser[]
  sessionUserId: string | null
  collections: Collection[]
  items: Item[]
  priceHistory: PriceHistory[]
}
