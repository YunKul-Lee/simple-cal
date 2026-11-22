import { useState } from 'react'
import type { Calendar, ItemInput, ItemType } from '../types'
import type { Slot } from '../calendar/CalendarView'
import { addMinutes } from '../lib/dates'
import './QuickCreatePopover.css'

interface Props {
  slot: Slot
  anchor: { x: number; y: number }
  calendars: Calendar[]
  onCreate(input: ItemInput): Promise<void>
  onMore(draft: ItemInput): void
  onClose(): void
}

const WIDTH = 300
const HEIGHT = 200

export function buildDraft(slot: Slot, type: ItemType, calendarId: string, title: string): ItemInput {
  const base: ItemInput = {
    calendarId,
    type,
    title,
    memo: null,
    date: slot.date,
    startTime: slot.startTime,
    endDate: null,
    endTime: null,
    done: false,
  }
  if (type === 'event' && slot.startTime !== null) {
    const end = addMinutes(slot.date, slot.startTime, 60)
    base.endTime = end.time
    base.endDate = end.date === slot.date ? null : end.date
  }
  return base
}

export function QuickCreatePopover({ slot, anchor, calendars, onCreate, onMore, onClose }: Props) {
  const defaultCalendar = calendars.find((c) => c.visible) ?? calendars[0]
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ItemType>(slot.startTime ? 'event' : 'task')
  const [calendarId, setCalendarId] = useState(defaultCalendar?.id ?? '')
  const [saving, setSaving] = useState(false)

  const noCalendars = calendars.length === 0
  const canSave = !noCalendars && title.trim() !== '' && !saving
  const draft = () => buildDraft(slot, type, calendarId, title.trim())

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onCreate(draft())
    } finally {
      setSaving(false)
    }
  }

  const left = Math.max(8, Math.min(anchor.x, window.innerWidth - WIDTH - 8))
  const top = Math.max(8, Math.min(anchor.y, window.innerHeight - HEIGHT - 8))

  return (
    <div className="popover-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="popover"
        role="dialog"
        aria-label="새 항목"
        style={{ left, top, width: WIDTH }}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        {noCalendars ? (
          <p className="form-error">먼저 캘린더를 만들어 주세요</p>
        ) : (
          <>
            <input
              autoFocus
              aria-label="제목"
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="type-toggle" role="radiogroup">
              {(['event', 'task'] as const).map((t) => (
                <label key={t}>
                  <input type="radio" name="quick-type" checked={type === t} onChange={() => setType(t)} />
                  {t === 'event' ? '일정' : '할 일'}
                </label>
              ))}
            </div>
            <label className="field">
              <span>캘린더</span>
              <select value={calendarId} onChange={(e) => setCalendarId(e.target.value)}>
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <div className="modal-actions">
          <button type="button" disabled={noCalendars} onClick={() => onMore(draft())}>
            자세히
          </button>
          <span className="spacer" />
          <button type="submit" className="primary" disabled={!canSave}>
            저장
          </button>
        </div>
      </form>
    </div>
  )
}
