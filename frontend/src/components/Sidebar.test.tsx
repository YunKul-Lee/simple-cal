import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Theme } from '../lib/theme'
import type { Calendar } from '../types'
import { Sidebar } from './Sidebar'

const work: Calendar = { id: 'c1', name: '회사', color: '#4a7bd8', visible: true }
const personal: Calendar = { id: 'c2', name: '개인', color: '#3aa66a', visible: true }

function setup(theme: Theme = 'light') {
  const onToggle = vi.fn()
  const onCreate = vi.fn()
  const onEdit = vi.fn()
  const onThemeChange = vi.fn()
  render(
    <Sidebar
      calendars={[work, personal]}
      onToggle={onToggle}
      onCreate={onCreate}
      onEdit={onEdit}
      theme={theme}
      onThemeChange={onThemeChange}
    />,
  )
  return { user: userEvent.setup(), onToggle, onCreate, onEdit, onThemeChange }
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

  test('테마 토글은 다크 테마 스위치', () => {
    setup()
    expect(screen.getByRole('switch', { name: '다크 테마' })).toHaveAttribute('aria-checked', 'false')
  })

  test('토글을 누르면 dark로 바꾸라고 알린다', async () => {
    const { user, onThemeChange } = setup()
    await user.click(screen.getByRole('switch', { name: '다크 테마' }))
    expect(onThemeChange).toHaveBeenCalledWith('dark')
  })

  test('다크일 때는 켜짐으로 보이고 누르면 light', async () => {
    const { user, onThemeChange } = setup('dark')
    const toggle = screen.getByRole('switch', { name: '다크 테마' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    await user.click(toggle)
    expect(onThemeChange).toHaveBeenCalledWith('light')
  })
})
