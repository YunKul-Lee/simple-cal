import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EventInput } from '@fullcalendar/core'
import type { Calendar, Item } from '../types'
import { itemsToEvents } from './adapter'
import { CalendarView } from './CalendarView'

const c1: Calendar = { id: 'c1', name: '개인', color: '#4a7bd8', visible: true }
const today = '2026-11-25'

function task(overrides: Partial<Item> = {}): Item {
  return {
    id: 't1',
    calendarId: 'c1',
    type: 'task',
    title: '보고서',
    memo: null,
    date: '2026-11-25',
    startTime: null,
    endDate: null,
    endTime: null,
    done: false,
    ...overrides,
  }
}

function setup(events: EventInput[]) {
  const props = {
    onRangeChange: vi.fn(),
    onSelectSlot: vi.fn(),
    onItemClick: vi.fn(),
    onToggleDone: vi.fn(),
    onItemChange: vi.fn().mockResolvedValue(undefined),
  }
  render(<CalendarView events={events} initialDate="2026-11-25" {...props} />)
  return { user: userEvent.setup(), ...props }
}

describe('CalendarView', () => {
  const report = task()
  const events = itemsToEvents([report], [], [c1], today)

  test('할 일은 체크박스와 함께 보인다', async () => {
    setup(events)
    expect(await screen.findByRole('checkbox', { name: '보고서 완료' })).toBeInTheDocument()
  })

  test('체크박스 클릭은 완료 토글만 하고 편집을 열지 않는다', async () => {
    const { user, onToggleDone, onItemClick } = setup(events)
    await user.click(await screen.findByRole('checkbox', { name: '보고서 완료' }))
    expect(onToggleDone).toHaveBeenCalledTimes(1)
    expect(onToggleDone).toHaveBeenCalledWith(report)
    expect(onItemClick).toHaveBeenCalledTimes(0)
  })

  test('제목 클릭은 편집을 연다', async () => {
    const { user, onItemClick } = setup(events)
    await user.click(await screen.findByText('보고서'))
    await waitFor(() => expect(onItemClick).toHaveBeenCalledWith(report))
  })

  test('밀린 할 일에는 원래 날짜 배지', async () => {
    const overdue = task({ date: '2026-11-20' })
    setup(itemsToEvents([overdue], [overdue], [c1], today))
    expect(await screen.findByText('11/20부터')).toBeInTheDocument()
  })

  test('처음 표시 범위를 알린다', async () => {
    const { onRangeChange } = setup(events)
    await waitFor(() => expect(onRangeChange).toHaveBeenCalledWith('2026-11-23', '2026-11-29'))
  })
})
