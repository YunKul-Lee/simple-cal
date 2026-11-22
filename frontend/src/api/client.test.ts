import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ApiError, apiRequest } from './client'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test("400 {message:'x'} → status 400, message 'x'인 ApiError", async () => {
  server.use(http.get('*/api/test', () => HttpResponse.json({ message: 'x' }, { status: 400 })))

  const err = await apiRequest('GET', '/api/test').catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect((err as ApiError).status).toBe(400)
  expect((err as ApiError).message).toBe('x')
})

test("본문 없는 500 → message '요청에 실패했습니다'", async () => {
  server.use(http.post('*/api/test', () => new HttpResponse(null, { status: 500 })))

  const err = await apiRequest('POST', '/api/test', { a: 1 }).catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect((err as ApiError).status).toBe(500)
  expect((err as ApiError).message).toBe('요청에 실패했습니다')
})

test('204 → undefined', async () => {
  server.use(http.delete('*/api/test', () => new HttpResponse(null, { status: 204 })))

  await expect(apiRequest('DELETE', '/api/test')).resolves.toBeUndefined()
})
