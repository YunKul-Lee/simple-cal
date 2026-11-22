import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Calendar } from '../types'
import { Sidebar } from './Sidebar'

const work: Calendar = { id: 'c1', name: '회사', color: '#4a7bd8', visible: true }
const personal: Calendar = { id: 'c2', name: '개인', color: '#3aa66a', visible: true }

function setup() {
  const onToggle = vi.fn()
  const onCreate = vi.fn()
  const onEdit = vi.fn()
  render(<Sidebar calendars={[work, personal]} onToggle={onToggle} onCreate={onCreate} onEdit={onEdit} />)
  return { user: userEvent.setup(), onToggle, onCreate, onEdit }
}

describe('Sidebar', () => {
  test('제목과 두 캘린더를 렌더한다', () => {
    setup()
    expect(screen.getByText('내 캘린더')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '회사' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '개인' })).toBeChecked()
  })

  test("체크박스 '회사' 클릭 시 onToggle('c1', false)", async () => {
    const { user, onToggle } = setup()
    await user.click(screen.getByRole('checkbox', { name: '회사' }))
    expect(onToggle).toHaveBeenCalledWith('c1', false)
  })

  test("'캘린더 추가' 클릭 시 onCreate", async () => {
    const { user, onCreate } = setup()
    await user.click(screen.getByRole('button', { name: '캘린더 추가' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  test("'회사 편집' 클릭 시 onEdit(cal)", async () => {
    const { user, onEdit } = setup()
    await user.click(screen.getByRole('button', { name: '회사 편집' }))
    expect(onEdit).toHaveBeenCalledWith(work)
  })
})
