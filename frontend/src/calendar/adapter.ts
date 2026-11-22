import type { EventInput } from '@fullcalendar/core'
import type { Calendar, Item, ItemPatch, ItemType } from '../types'
import { addDays, addMinutes, toLocalDate, toLocalTime } from '../lib/dates'

export type ItemEventProps = { item: Item; overdueFrom: string | null }

const TASK_BLOCK_MINUTES = 30
const DEFAULT_EVENT_MINUTES = 60

const isOverdue = (item: Item, today: string) => item.type === 'task' && !item.done && item.date < today

function toEvent(item: Item, color: string, overdueFrom: string | null, today: string): EventInput {
  const extendedProps: ItemEventProps = { item, overdueFrom }
  const base = { id: item.id, title: item.title, extendedProps }

  if (overdueFrom !== null) {
    return {
      ...base,
      start: today,
      allDay: true,
      backgroundColor: 'transparent',
      borderColor: color,
      classNames: ['item-task', 'is-overdue'],
    }
  }

  if (item.type === 'event') {
    const colors = { backgroundColor: color, borderColor: color, classNames: ['item-event'] }
    if (item.startTime !== null && item.endTime !== null) {
      return {
        ...base,
        ...colors,
        start: `${item.date}T${item.startTime}`,
        end: `${item.endDate ?? item.date}T${item.endTime}`,
        allDay: false,
      }
    }
    return { ...base, ...colors, start: item.date, end: addDays(item.endDate ?? item.date, 1), allDay: true }
  }

  const taskStyle = {
    backgroundColor: 'transparent',
    borderColor: color,
    classNames: item.done ? ['item-task', 'is-done'] : ['item-task'],
  }
  if (item.startTime !== null) {
    const end = addMinutes(item.date, item.startTime, TASK_BLOCK_MINUTES)
    return {
      ...base,
      ...taskStyle,
      start: `${item.date}T${item.startTime}`,
      end: `${end.date}T${end.time}`,
      allDay: false,
      durationEditable: false,
    }
  }
  return { ...base, ...taskStyle, start: item.date, allDay: true }
}

export function itemsToEvents(items: Item[], overdue: Item[], calendars: Calendar[], today: string): EventInput[] {
  const colorOf = new Map(calendars.filter((c) => c.visible).map((c) => [c.id, c.color]))
  const events: EventInput[] = []
  const seen = new Set<string>()

  for (const item of items) {
    const color = colorOf.get(item.calendarId)
    if (color === undefined || isOverdue(item, today) || seen.has(item.id)) continue
    seen.add(item.id)
    events.push(toEvent(item, color, null, today))
  }
  for (const item of overdue) {
    const color = colorOf.get(item.calendarId)
    if (color === undefined || !isOverdue(item, today) || seen.has(item.id)) continue
    seen.add(item.id)
    events.push(toEvent(item, color, item.date, today))
  }
  return events
}

export function changeToPatch(
  item: Item,
  change: { start: Date; end: Date | null; allDay: boolean },
): ItemPatch {
  const date = toLocalDate(change.start)

  if (change.allDay) {
    const patch: ItemPatch = { date, startTime: null, endTime: null }
    if (item.type === 'event') {
      const last = change.end ? addDays(toLocalDate(change.end), -1) : null
      patch.endDate = last !== null && last > date ? last : null
    } else {
      patch.endDate = null
    }
    return patch
  }

  const startTime = toLocalTime(change.start)
  if (item.type === 'task') return { date, startTime, endDate: null, endTime: null }

  const end =
    item.startTime === null || change.end === null
      ? addMinutes(date, startTime, DEFAULT_EVENT_MINUTES)
      : { date: toLocalDate(change.end), time: toLocalTime(change.end) }
  return { date, startTime, endDate: end.date === date ? null : end.date, endTime: end.time }
}

export function convertTypePatch(item: Item, to: ItemType): ItemPatch {
  if (item.type === to) return {}
  if (to === 'task') return { type: 'task', endDate: null, endTime: null, done: false }
  if (item.startTime === null) return { type: 'event', done: false, endDate: null, endTime: null }
  const end = addMinutes(item.date, item.startTime, DEFAULT_EVENT_MINUTES)
  return { type: 'event', done: false, endDate: end.date === item.date ? null : end.date, endTime: end.time }
}
