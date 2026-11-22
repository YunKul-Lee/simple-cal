import type { ItemInput } from '../types'
import { compareDateTime } from './dates'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

export function validateItem(input: ItemInput): string | null {
  if (!input.title.trim()) return '제목을 입력해 주세요'
  if (!DATE_RE.test(input.date) || (input.endDate !== null && !DATE_RE.test(input.endDate))) {
    return '날짜 형식이 올바르지 않습니다'
  }
  if (
    (input.startTime !== null && !TIME_RE.test(input.startTime)) ||
    (input.endTime !== null && !TIME_RE.test(input.endTime))
  ) {
    return '시간 형식이 올바르지 않습니다'
  }

  if (input.type === 'task') {
    if (input.endDate !== null || input.endTime !== null) return '할 일에는 종료를 지정할 수 없습니다'
    return null
  }

  if (input.startTime !== null && input.endTime === null) return '종료 시간을 입력해 주세요'
  if (input.startTime === null && input.endTime !== null) return '시작 시간을 입력해 주세요'
  const endDate = input.endDate ?? input.date
  if (compareDateTime(endDate, input.endTime, input.date, input.startTime) < 0) {
    return '종료가 시작보다 빠를 수 없습니다'
  }
  return null
}
