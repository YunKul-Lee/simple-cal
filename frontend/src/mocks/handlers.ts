import { http, HttpResponse, type HttpHandler } from 'msw'
import type { CalendarInput, CalendarPatch, Item, ItemInput, ItemPatch } from '../types'
import { validateItem } from '../lib/validateItem'
import type { Db } from './db'

const notFound = () => HttpResponse.json({ message: '찾을 수 없습니다' }, { status: 404 })
const badRequest = (message: string) => HttpResponse.json({ message }, { status: 400 })
const noContent = () => new HttpResponse(null, { status: 204 })

function checkItem(db: Db, input: ItemInput): string | null {
  if (!db.getCalendar(input.calendarId)) return '캘린더를 찾을 수 없습니다'
  return validateItem(input)
}

export function createHandlers(db: Db): HttpHandler[] {
  return [
    http.get('*/api/calendars', () => HttpResponse.json(db.listCalendars())),

    http.post('*/api/calendars', async ({ request }) => {
      const body = (await request.json()) as CalendarInput
      if (!body?.name?.trim()) return badRequest('이름을 입력해 주세요')
      return HttpResponse.json(db.createCalendar(body), { status: 201 })
    }),

    http.patch('*/api/calendars/:id', async ({ params, request }) => {
      const patch = (await request.json()) as CalendarPatch
      const updated = db.updateCalendar(String(params.id), patch)
      return updated ? HttpResponse.json(updated) : notFound()
    }),

    http.delete('*/api/calendars/:id', ({ params }) =>
      db.deleteCalendar(String(params.id)) ? noContent() : notFound(),
    ),

    // overdue는 :id 패턴보다 먼저 와야 한다
    http.get('*/api/items/overdue', ({ request }) => {
      const today = new URL(request.url).searchParams.get('today')
      if (!today) return badRequest('today가 필요합니다')
      return HttpResponse.json(db.listOverdue(today))
    }),

    http.get('*/api/items', ({ request }) => {
      const url = new URL(request.url)
      const from = url.searchParams.get('from')
      const to = url.searchParams.get('to')
      if (!from || !to) return badRequest('from, to가 필요합니다')
      return HttpResponse.json(db.listItems(from, to))
    }),

    http.post('*/api/items', async ({ request }) => {
      const body = (await request.json()) as ItemInput
      const error = checkItem(db, body)
      if (error) return badRequest(error)
      return HttpResponse.json(db.createItem(body), { status: 201 })
    }),

    http.patch('*/api/items/:id', async ({ params, request }) => {
      const id = String(params.id)
      const existing = db.getItem(id)
      if (!existing) return notFound()
      const patch = (await request.json()) as ItemPatch
      const { id: _ignored, ...merged } = { ...existing, ...patch } as Item
      void _ignored
      const error = checkItem(db, merged)
      if (error) return badRequest(error)
      return HttpResponse.json(db.updateItem(id, patch))
    }),

    http.delete('*/api/items/:id', ({ params }) =>
      db.deleteItem(String(params.id)) ? noContent() : notFound(),
    ),
  ]
}
