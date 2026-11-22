import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import koLocale from '@fullcalendar/core/locales/ko'
import type { EventChangeArg, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core'
import type { Item } from '../types'
import type { ItemEventProps } from './adapter'
import { addDays, toLocalDate, toLocalTime } from '../lib/dates'
import './CalendarView.css'

export type Slot = { date: string; startTime: string | null }
type Change = { start: Date; end: Date | null; allDay: boolean }

interface Props {
  events: EventInput[]
  initialDate?: string
  onRangeChange(from: string, to: string): void
  onSelectSlot(slot: Slot, anchor: { x: number; y: number }): void
  onItemClick(item: Item): void
  onToggleDone(item: Item): void
  onItemChange(item: Item, change: Change): Promise<void>
}

const propsOf = (arg: { event: { extendedProps: Record<string, unknown> } }) =>
  arg.event.extendedProps as ItemEventProps

function badgeText(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${m}/${d}부터`
}

function renderContent(arg: EventContentArg) {
  const { item, overdueFrom } = propsOf(arg)
  if (item.type === 'event') return undefined // FullCalendar 기본 표시(시간 + 제목)
  return (
    <div className="task-content">
      <input type="checkbox" className="task-check" aria-label={`${item.title} 완료`} checked={item.done} readOnly />
      {arg.timeText && <span className="task-time">{arg.timeText}</span>}
      <span className="task-title">{item.title}</span>
      {overdueFrom && <span className="overdue-badge">{badgeText(overdueFrom)}</span>}
    </div>
  )
}

export function CalendarView({
  events,
  initialDate,
  onRangeChange,
  onSelectSlot,
  onItemClick,
  onToggleDone,
  onItemChange,
}: Props) {
  const handleClick = (info: EventClickArg) => {
    const { item } = propsOf(info)
    const target = info.jsEvent.target as HTMLElement | null
    if (target?.closest('.task-check')) {
      // FullCalendar는 네이티브 리스너라 React stopPropagation이 늦다 — 여기서 갈라낸다
      info.jsEvent.preventDefault()
      onToggleDone(item)
      return
    }
    onItemClick(item)
  }

  const handleChange = (info: EventChangeArg) => {
    const { item } = propsOf(info)
    const { start, end, allDay } = info.event
    if (!start) return
    onItemChange(item, { start, end, allDay }).catch(() => info.revert())
  }

  const handleDateClick = (info: DateClickArg) => {
    onSelectSlot(
      { date: toLocalDate(info.date), startTime: info.allDay ? null : toLocalTime(info.date) },
      { x: info.jsEvent.clientX, y: info.jsEvent.clientY },
    )
  }

  return (
    <div className="calendar-view">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        locale={koLocale}
        initialView="timeGridWeek"
        initialDate={initialDate}
        firstDay={1}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth,listWeek' }}
        buttonText={{ today: '오늘', week: '주', month: '월', list: '목록' }}
        allDayText="하루 종일"
        height="100%"
        nowIndicator
        editable
        selectable={false}
        events={events}
        eventContent={renderContent}
        eventClick={handleClick}
        eventDrop={handleChange}
        eventResize={handleChange}
        dateClick={handleDateClick}
        datesSet={(info) => onRangeChange(toLocalDate(info.start), addDays(toLocalDate(info.end), -1))}
      />
    </div>
  )
}
