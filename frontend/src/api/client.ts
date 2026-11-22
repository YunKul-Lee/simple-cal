export class ApiError extends Error {
  status: number
  /** RFC 9457 Problem Details의 type (예: '/problems/end-before-start'). 없으면 null */
  type: string | null
  constructor(status: number, message: string, type: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.type = type
  }
}

const API_BASE: string = import.meta.env.VITE_API_BASE ?? ''

const nonEmptyString = (v: unknown): v is string => typeof v === 'string' && v !== ''

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    let message = '요청에 실패했습니다'
    let type: string | null = null
    try {
      const data = (await res.json()) as { detail?: unknown; message?: unknown; type?: unknown }
      if (nonEmptyString(data?.detail)) message = data.detail
      else if (nonEmptyString(data?.message)) message = data.message
      if (nonEmptyString(data?.type)) type = data.type
    } catch {
      // 본문 없음
    }
    throw new ApiError(res.status, message, type)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
