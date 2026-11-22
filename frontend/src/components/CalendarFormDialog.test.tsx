import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Calendar } from '../types'
import { CalendarFormDialog } from './CalendarFormDialog'

const existing: Calendar = { id: 'c1', name: '회사', color: '#4a7bd8', visible: true }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CalendarFormDialog', () => {
  test('이름을 비우고 저장하면 메시지를 보이고 onSubmit을 호출하지 않는다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CalendarFormDialog initial={existing} onSubmit={onSubmit} onClose={vi.fn()} />)

    await user.clear(screen.getByLabelText('이름'))
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('이름을 입력해 주세요')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test("이름 '운동' + 팔레트 #3aa66a 선택 후 저장", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CalendarFormDialog onSubmit={onSubmit} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('이름'), '운동')
    await user.click(screen.getByRole('button', { name: '#3aa66a' }))
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(onSubmit).toHaveBeenCalledWith({ name: '운동', color: '#3aa66a' })
  })

  test('팔레트는 12색을 제공한다', () => {
    render(<CalendarFormDialog onSubmit={vi.fn()} onClose={vi.fn()} />)
    for (const hex of [
      '#4a7bd8', '#3aa66a', '#e08a2c', '#d64545', '#8e5bd8', '#2a9d9d',
      '#c2569b', '#6b7280', '#1e40af', '#ca8a04', '#9f1239', '#92400e',
    ]) {
      expect(screen.getByRole('button', { name: hex })).toBeInTheDocument()
    }
  })

  test('삭제 확인 시 onDelete 호출', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onDelete = vi.fn()
    render(<CalendarFormDialog initial={existing} onSubmit={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '삭제' }))

    expect(confirm).toHaveBeenCalledWith('캘린더와 안의 일정·할 일이 모두 삭제됩니다. 삭제할까요?')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  test('삭제 확인을 취소하면 onDelete를 호출하지 않는다', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onDelete = vi.fn()
    render(<CalendarFormDialog initial={existing} onSubmit={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '삭제' }))

    expect(onDelete).not.toHaveBeenCalled()
  })
})
