import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EventInput } from '@fullcalendar/react'
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

function setup(events: EventInput[], colorScheme?: 'light' | 'dark') {
  const props = {
    onRangeChange: vi.fn(),
    onSelectSlot: vi.fn(),
    onItemClick: vi.fn(),
    onToggleDone: vi.fn(),
    onItemChange: vi.fn().mockResolvedValue(undefined),
  }
  const { container } = render(
    <CalendarView
      events={events}
      initialDate="2026-11-25"
      colorScheme={colorScheme}
      {...props}
    />,
  )
  return { user: userEvent.setup(), container, ...props }
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

  test('밀린 할 일이 오늘 하루 종일 줄 맨 위에 온다', async () => {
    const normal = task({ id: 't-normal', title: '가나다', date: '2026-11-25' })
    const overdue = task({ id: 't-over', title: '하하하', date: '2026-11-20' })
    const { container } = setup(itemsToEvents([normal, overdue], [overdue], [c1], today))

    await screen.findByText('하하하')
    await screen.findByText('가나다')
    const titles = Array.from(container.querySelectorAll('.task-title')).map((el) => el.textContent)
    expect(titles.indexOf('하하하')).toBeGreaterThanOrEqual(0)
    expect(titles.indexOf('하하하')).toBeLessThan(titles.indexOf('가나다'))
  })

  test('한국어 툴바 버튼', async () => {
    setup(events)
    expect(await screen.findByRole('button', { name: '오늘' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '주' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '월' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '목록' })).toBeInTheDocument()
  })

  test('일정은 제목이 보인다', async () => {
    const meeting: Item = {
      ...task({ id: 'e1', title: '주간회의', startTime: '10:00', endTime: '11:00' }),
      type: 'event',
    }
    setup(itemsToEvents([meeting], [], [c1], today))
    expect(await screen.findByText('주간회의')).toBeVisible()
  })

  test('종일 줄 라벨은 하루 종일', async () => {
    setup(events)
    expect(await screen.findByText('하루 종일')).toBeInTheDocument()
  })

  test('기본은 밝은 색 테마', async () => {
    const { container } = setup(events)
    await screen.findByText('보고서')
    expect(container.querySelector('[data-color-scheme="light"]')).not.toBeNull()
  })

  test('colorScheme을 넘기면 그대로 적용', async () => {
    const { container } = setup(events, 'dark')
    await screen.findByText('보고서')
    expect(container.querySelector('[data-color-scheme="dark"]')).not.toBeNull()
  })

  test('목록 보기의 할 일은 시간 열이 따로 있다', async () => {
    const { user, container } = setup(events)
    await user.click(await screen.findByRole('tab', { name: '목록' }))
    await waitFor(() => expect(container.querySelector('.sc-view-listWeek')).not.toBeNull())
    const check = await screen.findByRole('checkbox', { name: '보고서 완료' })
    const content = check.closest('.task-content')
    const row = check.closest('.item-task')
    expect(content).not.toBeNull()
    expect(row).not.toBeNull()
    expect(content!.textContent).not.toContain('하루 종일')
    expect(row!.textContent).toContain('하루 종일')
  })

  test('보기 루트에 훅 클래스', async () => {
    const { container } = setup(events)
    await screen.findByText('보고서')
    expect(container.querySelector('.sc-view-timeGridWeek')).not.toBeNull()
  })
})
