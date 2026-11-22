import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Calendar, Item, ItemInput } from '../types'
import { ItemEditDialog } from './ItemEditDialog'

const c1: Calendar = { id: 'c1', name: '개인', color: '#4a7bd8', visible: true }

const meeting: Item = {
  id: 'e1',
  calendarId: 'c1',
  type: 'event',
  title: '회의',
  memo: null,
  date: '2026-11-24',
  startTime: '10:00',
  endDate: null,
  endTime: '11:00',
  done: false,
}

function toDraft(item: Item): ItemInput {
  const { id: _id, ...rest } = item
  return rest
}

function setup(item: Item) {
  const props = {
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  }
  render(<ItemEditDialog item={item} draft={toDraft(item)} calendars={[c1]} {...props} />)
  return { user: userEvent.setup(), ...props }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ItemEditDialog', () => {
  test('종료가 시작보다 빠르면 저장하지 않는다', async () => {
    const { user, onSave } = setup(meeting)

    fireEvent.change(screen.getByLabelText('종료 시간'), { target: { value: '09:00' } })
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('종료가 시작보다 빠를 수 없습니다')).toBeInTheDocument()
    expect(onSave).toHaveBeenCalledTimes(0)
  })

  test('일정을 할 일로 바꾸면 종료가 사라지고 완료 체크가 생긴다', async () => {
    const { user, onSave } = setup(meeting)

    await user.click(screen.getByRole('radio', { name: '할 일' }))

    expect(screen.queryByLabelText('종료 시간')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '완료' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'task', endTime: null, endDate: null }),
    )
  })

  test('하루 종일을 켜면 시간이 비워진다', async () => {
    const { user, onSave } = setup(meeting)

    await user.click(screen.getByRole('checkbox', { name: '하루 종일' }))
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ startTime: null, endTime: null }))
  })

  test('삭제 확인 후 onDelete', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { user, onDelete, onSave } = setup(meeting)

    await user.click(screen.getByRole('button', { name: '삭제' }))

    expect(confirm).toHaveBeenCalledWith('삭제할까요?')
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  test('시작 시간을 지워도 하루 종일로 바뀌지 않는다', async () => {
    const { user, onSave } = setup(meeting)

    fireEvent.change(screen.getByLabelText('시작 시간'), { target: { value: '' } })

    expect(screen.getByLabelText('시작 시간')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '하루 종일' })).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('시간 형식이 올바르지 않습니다')).toBeInTheDocument()
  })
})
