import type { Calendar, CalendarInput, CalendarPatch, Item, ItemInput, ItemPatch } from '../types'

export const STORAGE_KEY = 'simple-cal:db'

interface DbState {
  calendars: Calendar[]
  items: Item[]
}

export interface Db {
  listCalendars(): Calendar[]
  getCalendar(id: string): Calendar | undefined
  createCalendar(input: CalendarInput): Calendar
  updateCalendar(id: string, patch: CalendarPatch): Calendar | undefined
  deleteCalendar(id: string): boolean
  listItems(from: string, to: string): Item[]
  listOverdue(today: string): Item[]
  getItem(id: string): Item | undefined
  createItem(input: ItemInput): Item
  updateItem(id: string, patch: ItemPatch): Item | undefined
  deleteItem(id: string): boolean
}

export function createDb(storage: Storage, genId: () => string = () => crypto.randomUUID()): Db {
  const load = (): DbState => {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) {
      const seeded: DbState = {
        calendars: [{ id: genId(), name: '내 캘린더', color: '#4a7bd8', visible: true }],
        items: [],
      }
      storage.setItem(STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    return JSON.parse(raw) as DbState
  }
  let state = load()
  const save = () => storage.setItem(STORAGE_KEY, JSON.stringify(state))

  return {
    listCalendars: () => state.calendars,
    getCalendar: (id) => state.calendars.find((c) => c.id === id),
    createCalendar(input) {
      const cal: Calendar = { id: genId(), name: input.name, color: input.color, visible: true }
      state = { ...state, calendars: [...state.calendars, cal] }
      save()
      return cal
    },
    updateCalendar(id, patch) {
      const existing = state.calendars.find((c) => c.id === id)
      if (!existing) return undefined
      const updated = { ...existing, ...patch, id }
      state = { ...state, calendars: state.calendars.map((c) => (c.id === id ? updated : c)) }
      save()
      return updated
    },
    deleteCalendar(id) {
      if (!state.calendars.some((c) => c.id === id)) return false
      state = {
        calendars: state.calendars.filter((c) => c.id !== id),
        items: state.items.filter((i) => i.calendarId !== id),
      }
      save()
      return true
    },
    listItems: (from, to) => state.items.filter((i) => i.date <= to && (i.endDate ?? i.date) >= from),
    listOverdue: (today) => state.items.filter((i) => i.type === 'task' && !i.done && i.date < today),
    getItem: (id) => state.items.find((i) => i.id === id),
    createItem(input) {
      const item: Item = { ...input, id: genId() }
      state = { ...state, items: [...state.items, item] }
      save()
      return item
    },
    updateItem(id, patch) {
      const existing = state.items.find((i) => i.id === id)
      if (!existing) return undefined
      const updated = { ...existing, ...patch, id }
      state = { ...state, items: state.items.map((i) => (i.id === id ? updated : i)) }
      save()
      return updated
    },
    deleteItem(id) {
      if (!state.items.some((i) => i.id === id)) return false
      state = { ...state, items: state.items.filter((i) => i.id !== id) }
      save()
      return true
    },
  }
}
