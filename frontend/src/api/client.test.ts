import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ApiError, apiRequest } from './client'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('422 problem+json → status 422, message는 detail, type은 본문 type', async () => {
  server.use(
    http.get('*/api/test', () =>
      HttpResponse.json(
        {
          type: '/problems/end-before-start',
          title: 'Unprocessable Content',
          status: 422,
          detail: 'x',
          instance: '/api/test',
        },
        { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    ),
  )

  const err = await apiRequest('GET', '/api/test').catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect((err as ApiError).status).toBe(422)
  expect((err as ApiError).message).toBe('x')
  expect((err as ApiError).type).toBe('/problems/end-before-start')
})

test('detail 없이 message만 있으면 message 사용', async () => {
  server.use(http.get('*/api/test', () => HttpResponse.json({ message: 'y' }, { status: 400 })))

  const err = await apiRequest('GET', '/api/test').catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect((err as ApiError).status).toBe(400)
  expect((err as ApiError).message).toBe('y')
  expect((err as ApiError).type).toBeNull()
})

test("본문 없는 500 → message '요청에 실패했습니다'", async () => {
  server.use(http.post('*/api/test', () => new HttpResponse(null, { status: 500 })))

  const err = await apiRequest('POST', '/api/test', { a: 1 }).catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect((err as ApiError).status).toBe(500)
  expect((err as ApiError).message).toBe('요청에 실패했습니다')
  expect((err as ApiError).type).toBeNull()
})

test('204 → undefined', async () => {
  server.use(http.delete('*/api/test', () => new HttpResponse(null, { status: 204 })))

  await expect(apiRequest('DELETE', '/api/test')).resolves.toBeUndefined()
})
