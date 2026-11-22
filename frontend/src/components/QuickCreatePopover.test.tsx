import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Calendar } from '../types'
import type { Slot } from '../calendar/CalendarView'
import { QuickCreatePopover } from './QuickCreatePopover'

const c1: Calendar = { id: 'c1', name: '개인', color: '#4a7bd8', visible: true }
const c2: Calendar = { id: 'c2', name: '회사', color: '#3aa66a', visible: true }

function setup(slot: Slot, calendars: Calendar[] = [c1, c2]) {
  const props = {
    onCreate: vi.fn().mockResolvedValue(undefined),
    onMore: vi.fn(),
    onClose: vi.fn(),
  }
  render(<QuickCreatePopover slot={slot} anchor={{ x: 100, y: 100 }} calendars={calendars} {...props} />)
  return { user: userEvent.setup(), ...props }
}

describe('QuickCreatePopover', () => {
  test('시간 칸에서는 1시간 일정으로 만든다', async () => {
    const { user, onCreate } = setup({ date: '2026-11-24', startTime: '14:00' })

    await user.type(screen.getByLabelText('제목'), '1:1{Enter}')

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({
      type: 'event',
      calendarId: 'c1',
      title: '1:1',
      date: '2026-11-24',
      startTime: '14:00',
      endDate: null,
      endTime: '15:00',
      done: false,
      memo: null,
    })
  })

  test('23:30 칸에서는 다음 날 00:30까지', async () => {
    const { user, onCreate } = setup({ date: '2026-11-24', startTime: '23:30' })

    await user.type(screen.getByLabelText('제목'), '야간 작업{Enter}')

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'event',
        date: '2026-11-24',
        startTime: '23:30',
        endDate: '2026-11-25',
        endTime: '00:30',
      }),
    )
  })

  test('하루 종일 줄에서는 할 일로 만든다', async () => {
    const { user, onCreate } = setup({ date: '2026-11-24', startTime: null })

    await user.type(screen.getByLabelText('제목'), '보고서{Enter}')

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'task',
        date: '2026-11-24',
        startTime: null,
        endDate: null,
        endTime: null,
        done: false,
      }),
    )
  })

  test('숨긴 캘린더만 있어도 선택할 수 있다', async () => {
    const hidden1 = { ...c1, visible: false }
    const hidden2 = { ...c2, visible: false }
    const { user, onCreate } = setup({ date: '2026-11-24', startTime: '14:00' }, [hidden1, hidden2])

    expect(screen.getByLabelText('캘린더')).toHaveValue('c1')
    await user.type(screen.getByLabelText('제목'), '1:1')
    const save = screen.getByRole('button', { name: '저장' })
    expect(save).toBeEnabled()
    await user.click(save)

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ calendarId: 'c1', title: '1:1' }))
  })

  test('캘린더가 없으면 안내하고 저장을 막는다', async () => {
    const { user, onCreate } = setup({ date: '2026-11-24', startTime: '14:00' }, [])

    expect(screen.getByText('먼저 캘린더를 만들어 주세요')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: '저장' })
    expect(save).toBeDisabled()
    await user.click(save)
    expect(onCreate).not.toHaveBeenCalled()
  })

  test('자세히는 초안을 넘긴다', async () => {
    const { user, onMore, onCreate } = setup({ date: '2026-11-24', startTime: '14:00' })

    await user.type(screen.getByLabelText('제목'), '회의')
    await user.click(screen.getByRole('button', { name: '자세히' }))

    expect(onMore).toHaveBeenCalledTimes(1)
    expect(onMore).toHaveBeenCalledWith(expect.objectContaining({ title: '회의', date: '2026-11-24' }))
    expect(onCreate).not.toHaveBeenCalled()
  })
})
