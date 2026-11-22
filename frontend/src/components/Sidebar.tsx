import type { Calendar } from '../types'
import './Sidebar.css'

interface Props {
  calendars: Calendar[]
  onToggle(id: string, visible: boolean): void
  onCreate(): void
  onEdit(calendar: Calendar): void
}

export function Sidebar({ calendars, onToggle, onCreate, onEdit }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>내 캘린더</h2>
        <button type="button" className="icon-button" aria-label="캘린더 추가" onClick={onCreate}>
          ＋
        </button>
      </div>
      <ul className="calendar-list">
        {calendars.map((cal) => (
          <li key={cal.id} className="calendar-row">
            <label>
              <input
                type="checkbox"
                aria-label={cal.name}
                checked={cal.visible}
                onChange={(e) => onToggle(cal.id, e.target.checked)}
              />
              <span className="swatch" style={{ background: cal.color }} />
              <span className="calendar-name">{cal.name}</span>
            </label>
            <button
              type="button"
              className="icon-button"
              aria-label={`${cal.name} 편집`}
              onClick={() => onEdit(cal)}
            >
              ⋯
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
