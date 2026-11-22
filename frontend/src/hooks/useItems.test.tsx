import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ReactNode } from 'react'
import { subscribeErrors } from '../lib/errorBus'
import { createDb, type Db } from '../mocks/db'
import { createHandlers } from '../mocks/handlers'
import type { Item, ItemInput, ItemPatch } from '../types'
import { createQueryClient, useItemMutations, useItems, useOverdue } from './useItems'

/** 테스트용 메모리 Storage */
function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
  }
}

let seq = 0
const seqId = () => `id-${++seq}`

const server = setupServer()
let db: Db
let client: QueryClient

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  seq = 0
  db = createDb(memoryStorage(), seqId)
  server.resetHandlers(...createHandlers(db))
  client = createQueryClient()
})
afterEach(() => client.clear())
afterAll(() => server.close())

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function seedTask(overrides: Partial<ItemInput> = {}): Item {
  return db.createItem({
    calendarId: db.listCalendars()[0].id,
    type: 'task',
    title: '할 일',
    memo: null,
    date: '2026-11-23',
    startTime: null,
    endDate: null,
    endTime: null,
    done: false,
    ...overrides,
  })
}

test('update는 서버 응답 전에 캐시에 반영된다', async () => {
  const item = seedTask()
  let responded = false
  server.use(
    http.patch('*/api/items/:id', async ({ params, request }) => {
      await delay(50)
      const patch = (await request.json()) as ItemPatch
      responded = true
      return HttpResponse.json(db.updateItem(String(params.id), patch))
    }),
  )

  const { result } = renderHook(
    () => ({ items: useItems('2026-11-23', '2026-11-29'), mut: useItemMutations() }),
    { wrapper },
  )
  await waitFor(() => expect(result.current.items.isSuccess).toBe(true))
  expect(result.current.items.data?.find((i) => i.id === item.id)?.done).toBe(false)

  let pending: Promise<unknown> | undefined
  act(() => {
    pending = result.current.mut.update(item.id, { done: true })
  })

  await waitFor(
    () => expect(result.current.items.data?.find((i) => i.id === item.id)?.done).toBe(true),
    { interval: 5 },
  )
  expect(responded).toBe(false)

  await act(async () => {
    await pending
  })
})

test('update 실패 시 원래 값으로 되돌리고 오류를 알린다', async () => {
  const item = seedTask()
  server.use(
    http.patch('*/api/items/:id', () => HttpResponse.json({ message: '서버 오류' }, { status: 500 })),
  )
  const listener = vi.fn()
  const unsubscribe = subscribeErrors(listener)

  const { result } = renderHook(
    () => ({ items: useItems('2026-11-23', '2026-11-29'), mut: useItemMutations() }),
    { wrapper },
  )
  await waitFor(() => expect(result.current.items.isSuccess).toBe(true))

  await act(async () => {
    await result.current.mut.update(item.id, { done: true }).catch(() => {})
  })

  await waitFor(() =>
    expect(result.current.items.data?.find((i) => i.id === item.id)?.done).toBe(false),
  )
  await waitFor(() => expect(listener).toHaveBeenCalledWith('서버 오류'))
  unsubscribe()
})

test('밀린 할 일 완료 후 overdue 쿼리가 다시 조회된다', async () => {
  const item = seedTask({ date: '2026-11-20' })

  const { result } = renderHook(
    () => ({ overdue: useOverdue('2026-11-22'), mut: useItemMutations() }),
    { wrapper },
  )
  await waitFor(() => expect(result.current.overdue.isSuccess).toBe(true))
  expect(result.current.overdue.data?.map((i) => i.id)).toContain(item.id)

  await act(async () => {
    await result.current.mut.update(item.id, { done: true })
  })

  await waitFor(() =>
    expect(result.current.overdue.data?.map((i) => i.id)).not.toContain(item.id),
  )
})
