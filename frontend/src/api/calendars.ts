import type { Calendar, CalendarInput, CalendarPatch } from '../types'
import { apiRequest } from './client'

export const fetchCalendars = () => apiRequest<Calendar[]>('GET', '/api/calendars')
export const createCalendar = (input: CalendarInput) => apiRequest<Calendar>('POST', '/api/calendars', input)
export const updateCalendar = (id: string, patch: CalendarPatch) =>
  apiRequest<Calendar>('PATCH', `/api/calendars/${encodeURIComponent(id)}`, patch)
export const deleteCalendar = (id: string) =>
  apiRequest<void>('DELETE', `/api/calendars/${encodeURIComponent(id)}`)
