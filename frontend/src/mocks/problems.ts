import { HttpResponse } from 'msw'

/** 백엔드 설계서 3.4와 같은 모양의 RFC 9457 Problem Details 응답 */
const TITLES = { 400: 'Bad Request', 404: 'Not Found', 422: 'Unprocessable Content' } as const

export function problem(status: 400 | 404 | 422, type: string, detail: string, instance: string) {
  return HttpResponse.json(
    { type: `/problems/${type}`, title: TITLES[status], status, detail, instance },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

/** validateItem이 돌려주는 문구 → 422 type 이름 */
const VALIDATION_TYPES: Record<string, string> = {
  '제목을 입력해 주세요': 'title-required',
  '날짜 형식이 올바르지 않습니다': 'invalid-date',
  '시간 형식이 올바르지 않습니다': 'invalid-time',
  '할 일에는 종료를 지정할 수 없습니다': 'task-has-end',
  '종료 시간을 입력해 주세요': 'end-time-required',
  '시작 시간을 입력해 주세요': 'start-time-required',
  '종료가 시작보다 빠를 수 없습니다': 'end-before-start',
}

export function validationType(detail: string): string {
  const type = VALIDATION_TYPES[detail]
  if (!type) throw new Error(`알 수 없는 검증 문구: ${detail}`)
  return type
}
