export interface User {
  id: string
  email: string
}

export interface Collection {
  id: string
  user_id: string
  name: string
  color: string | null
  icon: string | null
  position: number
  collapsed: boolean
  created_at: number
  updated_at: number
}

export interface Item {
  id: string
  user_id: string
  collection_id: string | null
  url: string
  title: string | null
  image: string | null
  price: string | null
  price_value: number | null
  currency: string | null
  store: string | null
  notes: string | null
  target_price: number | null
  target_price_currency: string | null
  is_favorite: boolean
  is_purchased: boolean
  is_deleted: boolean
  position: number
  added_at: number
  updated_at: number
  purchased_at: number | null
  deleted_at: number | null
}

export interface PriceHistory {
  id: string
  item_id: string
  price: string | null
  price_value: number | null
  currency: string | null
  recorded_at: number
}

export interface ScrapedData {
  url: string
  title: string | null
  image: string | null
  price: string | null
  price_value: number | null
  currency: string | null
  store: string | null
}
