import { useState } from 'react'
import type { Calendar, CalendarInput } from '../types'

export const PALETTE = [
  '#4a7bd8', '#3aa66a', '#e08a2c', '#d64545', '#8e5bd8', '#2a9d9d',
  '#c2569b', '#6b7280', '#1e40af', '#ca8a04', '#9f1239', '#92400e',
]

interface Props {
  initial?: Calendar
  onSubmit(input: CalendarInput): void
  onDelete?(): void
  onClose(): void
}

export function CalendarFormDialog({ initial, onSubmit, onDelete, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PALETTE[0])
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('이름을 입력해 주세요')
      return
    }
    onSubmit({ name: name.trim(), color })
  }

  const remove = () => {
    if (window.confirm('캘린더와 안의 일정·할 일이 모두 삭제됩니다. 삭제할까요?')) onDelete?.()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="modal"
        role="dialog"
        aria-label={initial ? '캘린더 편집' : '새 캘린더'}
        onSubmit={submit}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <h3>{initial ? '캘린더 편집' : '새 캘린더'}</h3>
        <label className="field">
          <span>이름</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="field">
          <span>색</span>
          <div className="palette">
            {PALETTE.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={hex}
                aria-pressed={color === hex}
                className="palette-swatch"
                style={{ background: hex }}
                onClick={() => setColor(hex)}
              />
            ))}
            <input type="color" aria-label="직접 선택" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          {initial && onDelete && (
            <button type="button" className="danger" onClick={remove}>
              삭제
            </button>
          )}
          <span className="spacer" />
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="primary">
            저장
          </button>
        </div>
      </form>
    </div>
  )
}
