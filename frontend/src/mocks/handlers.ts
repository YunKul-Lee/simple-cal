import { http, HttpResponse, type HttpHandler } from 'msw'
import type { CalendarInput, CalendarPatch, Item, ItemInput, ItemPatch } from '../types'
import { validateItem } from '../lib/validateItem'
import type { Db } from './db'
import { problem, validationType } from './problems'

const pathOf = (request: Request) => new URL(request.url).pathname
const notFound = (request: Request) => problem(404, 'not-found', '찾을 수 없습니다', pathOf(request))
const noContent = () => new HttpResponse(null, { status: 204 })

/** 캘린더 존재 → 필드 검증 순서. 오류면 422 응답, 아니면 null */
function checkItem(db: Db, input: ItemInput, request: Request) {
  if (!db.getCalendar(input.calendarId)) {
    return problem(422, 'calendar-not-found', '캘린더를 찾을 수 없습니다', pathOf(request))
  }
  const message = validateItem(input)
  return message ? problem(422, validationType(message), message, pathOf(request)) : null
}

export function createHandlers(db: Db): HttpHandler[] {
  return [
    http.get('*/api/calendars', () => HttpResponse.json(db.listCalendars())),

    http.post('*/api/calendars', async ({ request }) => {
      const body = (await request.json()) as CalendarInput
      if (!body?.name?.trim()) return problem(422, 'name-required', '이름을 입력해 주세요', pathOf(request))
      return HttpResponse.json(db.createCalendar(body), { status: 201 })
    }),

    http.patch('*/api/calendars/:id', async ({ params, request }) => {
      const patch = (await request.json()) as CalendarPatch
      const updated = db.updateCalendar(String(params.id), patch)
      return updated ? HttpResponse.json(updated) : notFound(request)
    }),

    http.delete('*/api/calendars/:id', ({ params, request }) =>
      db.deleteCalendar(String(params.id)) ? noContent() : notFound(request),
    ),

    // overdue는 :id 패턴보다 먼저 와야 한다
    http.get('*/api/items/overdue', ({ request }) => {
      const today = new URL(request.url).searchParams.get('today')
      if (!today) return problem(400, 'missing-parameter', 'today가 필요합니다', pathOf(request))
      return HttpResponse.json(db.listOverdue(today))
    }),

    http.get('*/api/items', ({ request }) => {
      const url = new URL(request.url)
      const from = url.searchParams.get('from')
      const to = url.searchParams.get('to')
      if (!from || !to) return problem(400, 'missing-parameter', 'from, to가 필요합니다', pathOf(request))
      return HttpResponse.json(db.listItems(from, to))
    }),

    http.post('*/api/items', async ({ request }) => {
      const body = (await request.json()) as ItemInput
      const error = checkItem(db, body, request)
      if (error) return error
      return HttpResponse.json(db.createItem(body), { status: 201 })
    }),

    http.patch('*/api/items/:id', async ({ params, request }) => {
      const id = String(params.id)
      const existing = db.getItem(id)
      if (!existing) return notFound(request)
      const patch = (await request.json()) as ItemPatch
      const { id: _ignored, ...merged } = { ...existing, ...patch } as Item
      void _ignored
      const error = checkItem(db, merged, request)
      if (error) return error
      return HttpResponse.json(db.updateItem(id, patch))
    }),

    http.delete('*/api/items/:id', ({ params, request }) =>
      db.deleteItem(String(params.id)) ? noContent() : notFound(request),
    ),
  ]
}
