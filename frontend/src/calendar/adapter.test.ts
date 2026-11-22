import type { Calendar, Item } from '../types'
import { changeToPatch, convertTypePatch, itemsToEvents, type ItemEventProps } from './adapter'

const c1: Calendar = { id: 'c1', name: '개인', color: '#4a7bd8', visible: true }
const c2: Calendar = { id: 'c2', name: '숨김', color: '#d84a4a', visible: false }
const calendars = [c1, c2]
const today = '2026-11-25'

function event(overrides: Partial<Item> = {}): Item {
  return {
    id: 'e1',
    calendarId: 'c1',
    type: 'event',
    title: '일정',
    memo: null,
    date: '2026-11-23',
    startTime: '10:00',
    endDate: null,
    endTime: '11:00',
    done: false,
    ...overrides,
  }
}

function task(overrides: Partial<Item> = {}): Item {
  return {
    id: 't1',
    calendarId: 'c1',
    type: 'task',
    title: '할 일',
    memo: null,
    date: '2026-11-26',
    startTime: null,
    endDate: null,
    endTime: null,
    done: false,
    ...overrides,
  }
}

const props = (e: { extendedProps?: unknown }) => e.extendedProps as ItemEventProps

describe('itemsToEvents', () => {
  test('시간 있는 일정 변환', () => {
    const item = event()
    const result = itemsToEvents([item], [], calendars, today)
    expect(result).toHaveLength(1)
    const [e] = result
    expect(e.id).toBe('e1')
    expect(e.start).toBe('2026-11-23T10:00')
    expect(e.end).toBe('2026-11-23T11:00')
    expect(e.allDay).toBe(false)
    expect(e.backgroundColor).toBe('#4a7bd8')
    expect(props(e).item).toEqual(item)
    expect(props(e).overdueFrom).toBeNull()
  })

  test('여러 날 하루 종일 일정은 마지막 날 다음 날을 end로 준다', () => {
    const item = event({ date: '2026-11-27', startTime: null, endDate: '2026-11-29', endTime: null })
    const [e] = itemsToEvents([item], [], calendars, today)
    expect(e.start).toBe('2026-11-27')
    expect(e.end).toBe('2026-11-30')
    expect(e.allDay).toBe(true)
  })

  test('자정 넘는 일정', () => {
    const item = event({ date: '2026-11-23', startTime: '23:30', endDate: '2026-11-24', endTime: '00:30' })
    const [e] = itemsToEvents([item], [], calendars, today)
    expect(e.start).toBe('2026-11-23T23:30')
    expect(e.end).toBe('2026-11-24T00:30')
    expect(e.allDay).toBe(false)
  })

  test('시간 있는 할 일은 30분 블록, 길이 조절 불가', () => {
    const item = task({ date: '2026-11-26', startTime: '15:00' })
    const [e] = itemsToEvents([item], [], calendars, today)
    expect(e.start).toBe('2026-11-26T15:00')
    expect(e.end).toBe('2026-11-26T15:30')
    expect(e.durationEditable).toBe(false)
    expect(e.classNames).toContain('item-task')
  })

  test('완료한 할 일은 is-done 클래스', () => {
    const item = task({ done: true })
    const [e] = itemsToEvents([item], [], calendars, today)
    expect(e.classNames).toContain('item-task')
    expect(e.classNames).toContain('is-done')
  })

  test('숨긴 캘린더 항목은 제외', () => {
    const item = event({ calendarId: 'c2' })
    expect(itemsToEvents([item], [], calendars, today)).toEqual([])
  })

  test('밀린 할 일은 오늘 하루 종일 줄로 옮긴다', () => {
    const item = task({ date: '2026-11-20' })
    const result = itemsToEvents([item], [item], calendars, today)
    expect(result).toHaveLength(1)
    const [e] = result
    expect(e.start).toBe('2026-11-25')
    expect(e.allDay).toBe(true)
    expect(props(e).overdueFrom).toBe('2026-11-20')
    expect(e.classNames).toContain('is-overdue')
  })

  test('완료한 지난 할 일은 원래 날짜에 그대로', () => {
    const item = task({ date: '2026-11-20', done: true })
    const result = itemsToEvents([item], [], calendars, today)
    expect(result).toHaveLength(1)
    const [e] = result
    expect(e.start).toBe('2026-11-20')
    expect(props(e).overdueFrom).toBeNull()
  })

  test('숨긴 캘린더의 밀린 할 일은 오늘 줄에도 없다', () => {
    const item = task({ calendarId: 'c2', date: '2026-11-20' })
    expect(itemsToEvents([item], [item], calendars, today)).toEqual([])
  })

  test('밀린 할 일은 정렬 순위 0, 나머지는 1', () => {
    const overdue = task({ id: 't-over', date: '2026-11-20' })
    const normal = task({ id: 't-normal', date: '2026-11-25' })
    const result = itemsToEvents([overdue, normal], [overdue], calendars, today)
    const byId = (id: string) => result.find((e) => e.id === id)!
    expect(byId('t-over').extendedProps?.sortRank).toBe(0)
    expect(byId('t-normal').extendedProps?.sortRank).toBe(1)
  })
})

describe('changeToPatch', () => {
  test('changeToPatch: 시간 격자 이동', () => {
    const item = event()
    const patch = changeToPatch(item, {
      start: new Date(2026, 10, 24, 14, 0),
      end: new Date(2026, 10, 24, 15, 0),
      allDay: false,
    })
    expect(patch).toEqual({ date: '2026-11-24', startTime: '14:00', endDate: null, endTime: '15:00' })
  })

  test('changeToPatch: 시간 격자 → 하루 종일 줄은 시간을 지운다', () => {
    const item = event()
    const patch = changeToPatch(item, { start: new Date(2026, 10, 24), end: null, allDay: true })
    expect(patch).toMatchObject({ date: '2026-11-24', startTime: null, endTime: null, endDate: null })
  })

  test('changeToPatch: 하루 종일 → 23:30 시간 칸은 다음 날 00:30까지', () => {
    const item = event({ startTime: null, endTime: null })
    const patch = changeToPatch(item, { start: new Date(2026, 10, 24, 23, 30), end: null, allDay: false })
    expect(patch).toEqual({ date: '2026-11-24', startTime: '23:30', endDate: '2026-11-25', endTime: '00:30' })
  })

  test('changeToPatch: 여러 날 하루 종일 일정 길이 조절', () => {
    const item = event({ date: '2026-11-27', startTime: null, endDate: '2026-11-28', endTime: null })
    const patch = changeToPatch(item, {
      start: new Date(2026, 10, 27),
      end: new Date(2026, 10, 30),
      allDay: true,
    })
    expect(patch).toMatchObject({ date: '2026-11-27', endDate: '2026-11-29', startTime: null, endTime: null })
  })

  test('changeToPatch: 할 일은 종료를 갖지 않는다', () => {
    const item = task({ date: '2026-11-26' })
    const patch = changeToPatch(item, { start: new Date(2026, 10, 26, 10, 0), end: null, allDay: false })
    expect(patch).toMatchObject({ date: '2026-11-26', startTime: '10:00', endDate: null, endTime: null })
  })
})

test('convertTypePatch', () => {
  expect(convertTypePatch(event(), 'task')).toEqual({
    type: 'task',
    endDate: null,
    endTime: null,
    done: false,
  })
  expect(convertTypePatch(task({ startTime: '15:00' }), 'event')).toEqual({
    type: 'event',
    done: false,
    endDate: null,
    endTime: '16:00',
  })
  expect(convertTypePatch(task(), 'event')).toEqual({
    type: 'event',
    done: false,
    endDate: null,
    endTime: null,
  })
  expect(convertTypePatch(event(), 'event')).toEqual({})
})
