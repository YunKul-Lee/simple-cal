import type { CSSProperties } from 'react'
import type { Calendar } from '../types'
import type { Theme } from '../lib/theme'
import './Sidebar.css'

interface Props {
  calendars: Calendar[]
  onToggle(id: string, visible: boolean): void
  onCreate(): void
  onEdit(calendar: Calendar): void
  theme: Theme
  onThemeChange(theme: Theme): void
}

export function Sidebar({ calendars, onToggle, onCreate, onEdit, theme, onThemeChange }: Props) {
  const dark = theme === 'dark'
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
                className="color-check"
                style={{ '--check-color': cal.color } as CSSProperties}
                aria-label={cal.name}
                checked={cal.visible}
                onChange={(e) => onToggle(cal.id, e.target.checked)}
              />
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
      <div className="theme-toggle">
        <span aria-hidden="true">☀</span>
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-label="다크 테마"
          className="theme-switch"
          onClick={() => onThemeChange(dark ? 'light' : 'dark')}
        >
          <span className="theme-switch-thumb" />
        </button>
        <span aria-hidden="true">☾</span>
      </div>
    </aside>
  )
}
