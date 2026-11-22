import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ReactNode } from 'react'
import { subscribeErrors } from '../lib/errorBus'
import { createQueryClient, useItems } from './useItems'

const server = setupServer()
let client: QueryClient

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  server.resetHandlers(
    http.get('*/api/items', () => HttpResponse.json({ message: '불러오기 실패' }, { status: 500 })),
  )
  client = createQueryClient()
})
afterEach(() => client.clear())
afterAll(() => server.close())

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

test('조회 실패도 오류 알림을 띄운다', async () => {
  const listener = vi.fn()
  const unsubscribe = subscribeErrors(listener)

  renderHook(() => useItems('2026-11-23', '2026-11-29'), { wrapper })

  await waitFor(() => expect(listener).toHaveBeenCalledWith('불러오기 실패'), { timeout: 2000 })
  unsubscribe()
})
