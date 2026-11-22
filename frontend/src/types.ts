export type ItemType = 'event' | 'task'

export interface Calendar {
  id: string
  name: string
  color: string
  visible: boolean
}

export interface Item {
  id: string
  calendarId: string
  type: ItemType
  title: string
  memo: string | null
  date: string
  startTime: string | null
  endDate: string | null
  endTime: string | null
  done: boolean
}

export type ItemInput = Omit<Item, 'id'>
/** 빠진 필드 = 그대로, null = 비움 */
export type ItemPatch = Partial<ItemInput>
export type CalendarInput = Pick<Calendar, 'name' | 'color'>
export type CalendarPatch = Partial<Omit<Calendar, 'id'>>
