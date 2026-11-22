import type { Item, ItemInput, ItemPatch } from '../types'
import { apiRequest } from './client'

export const fetchItems = (from: string, to: string) =>
  apiRequest<Item[]>('GET', `/api/items?from=${from}&to=${to}`)
export const fetchOverdue = (today: string) => apiRequest<Item[]>('GET', `/api/items/overdue?today=${today}`)
export const createItem = (input: ItemInput) => apiRequest<Item>('POST', '/api/items', input)
export const updateItem = (id: string, patch: ItemPatch) =>
  apiRequest<Item>('PATCH', `/api/items/${encodeURIComponent(id)}`, patch)
export const deleteItem = (id: string) => apiRequest<void>('DELETE', `/api/items/${encodeURIComponent(id)}`)
