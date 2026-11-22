import { useState } from 'react'
import type { Calendar, Item, ItemInput, ItemType } from '../types'
import { convertTypePatch } from '../calendar/adapter'
import { validateItem } from '../lib/validateItem'
import './ItemEditDialog.css'

interface Props {
  item: Item | null
  draft: ItemInput
  calendars: Calendar[]
  onSave(value: ItemInput): Promise<void>
  onDelete?(): Promise<void>
  onClose(): void
}

export function ItemEditDialog({ item, draft, calendars, onSave, onDelete, onClose }: Props) {
  const [value, setValue] = useState<ItemInput>(draft)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<ItemInput>) => setValue((v) => ({ ...v, ...patch }))
  const allDay = value.startTime === null
  const isEvent = value.type === 'event'

  const changeType = (to: ItemType) => set(convertTypePatch({ ...value, id: '' }, to))

  const toggleAllDay = (on: boolean) => {
    if (on) set({ startTime: null, endTime: null })
    else set({ startTime: '09:00', endTime: isEvent ? '10:00' : null })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized: ItemInput = {
      ...value,
      title: value.title.trim(),
      memo: value.memo?.trim() ? value.memo : null,
      endDate: value.endDate && value.endDate !== value.date ? value.endDate : null,
    }
    const message = validateItem(normalized)
    if (message) {
      setError(message)
      return
    }
    setSaving(true)
    try {
      await onSave(normalized)
    } catch {
      // 오류는 토스트로 알림
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!onDelete || !window.confirm('삭제할까요?')) return
    await onDelete().catch(() => {})
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="modal item-dialog"
        role="dialog"
        aria-label={item ? '항목 편집' : '새 항목'}
        onSubmit={save}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <h3>{item ? '항목 편집' : '새 항목'}</h3>
        <label className="field">
          <span>제목</span>
          <input autoFocus value={value.title} onChange={(e) => set({ title: e.target.value })} />
        </label>

        <div className="type-toggle" role="radiogroup">
          {(['event', 'task'] as const).map((t) => (
            <label key={t}>
              <input type="radio" name="edit-type" checked={value.type === t} onChange={() => changeType(t)} />
              {t === 'event' ? '일정' : '할 일'}
            </label>
          ))}
        </div>

        <label className="field">
          <span>캘린더</span>
          <select value={value.calendarId} onChange={(e) => set({ calendarId: e.target.value })}>
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="row">
          <label className="field">
            <span>날짜</span>
            <input type="date" value={value.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          {!allDay && (
            <label className="field">
              <span>시작 시간</span>
              <input
                type="time"
                value={value.startTime ?? ''}
                onChange={(e) => set({ startTime: e.target.value || null })}
              />
            </label>
          )}
          <label className="inline">
            <input type="checkbox" checked={allDay} onChange={(e) => toggleAllDay(e.target.checked)} />
            하루 종일
          </label>
        </div>

        {isEvent && (
          <div className="row">
            <label className="field">
              <span>종료 날짜</span>
              <input
                type="date"
                value={value.endDate ?? value.date}
                onChange={(e) => set({ endDate: e.target.value || null })}
              />
            </label>
            {!allDay && (
              <label className="field">
                <span>종료 시간</span>
                <input
                  type="time"
                  value={value.endTime ?? ''}
                  onChange={(e) => set({ endTime: e.target.value || null })}
                />
              </label>
            )}
          </div>
        )}

        {!isEvent && (
          <label className="inline">
            <input type="checkbox" checked={value.done} onChange={(e) => set({ done: e.target.checked })} />
            완료
          </label>
        )}

        <label className="field">
          <span>메모</span>
          <textarea rows={3} value={value.memo ?? ''} onChange={(e) => set({ memo: e.target.value })} />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          {item && onDelete && (
            <button type="button" className="danger" onClick={() => void remove()}>
              삭제
            </button>
          )}
          <span className="spacer" />
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="primary" disabled={saving}>
            저장
          </button>
        </div>
      </form>
    </div>
  )
}
