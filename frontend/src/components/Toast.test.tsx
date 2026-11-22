import { act, render, screen } from '@testing-library/react'
import { reportError } from '../lib/errorBus'
import { Toast } from './Toast'

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast', () => {
  test("reportError('저장 실패') → role=alert에 표시", () => {
    render(<Toast />)
    act(() => {
      reportError('저장 실패')
    })
    expect(screen.getByRole('alert')).toHaveTextContent('저장 실패')
  })

  test('4초 후 사라진다', () => {
    vi.useFakeTimers()
    render(<Toast />)
    act(() => {
      reportError('저장 실패')
    })
    expect(screen.getByRole('alert')).toHaveTextContent('저장 실패')

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByText('저장 실패')).not.toBeInTheDocument()
  })
})
