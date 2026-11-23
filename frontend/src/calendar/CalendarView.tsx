import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import listPlugin from '@fullcalendar/react/list'
import interactionPlugin from '@fullcalendar/react/interaction'
import classicTheme from '@fullcalendar/react/themes/classic'
import koLocale from '@fullcalendar/react/locales/ko'
import type { DateClickInfo, EventChangeInfo, EventClickInfo, EventDisplayInfo, EventInput } from '@fullcalendar/react'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/theme.css'
import '@fullcalendar/react/themes/classic/palette.css'
import type { Item } from '../types'
import type { ItemEventProps } from './adapter'
import { addDays, toLocalDate, toLocalTime } from '../lib/dates'
import './CalendarView.css'

export type Slot = { date: string; startTime: string | null }
type Change = { start: Date; end: Date | null; allDay: boolean }

interface Props {
  events: EventInput[]
  /** 이후 테마 기능이 채운다. 지금은 앱 전체가 밝은 색뿐이라 기본 'light' */
  colorScheme?: 'light' | 'dark'
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

const ALL_DAY_TEXT = '하루 종일'

function TaskContent({ item, overdueFrom, timeText }: ItemEventProps & { timeText: string }) {
  return (
    <div className="task-content">
      <input type="checkbox" className="task-check" aria-label={`${item.title} 완료`} checked={item.done} readOnly />
      {timeText && <span className="task-time">{timeText}</span>}
      <span className="task-title">{item.title}</span>
      {overdueFrom && <span className="overdue-badge">{badgeText(overdueFrom)}</span>}
    </div>
  )
}

function renderContent(arg: EventDisplayInfo) {
  const props = propsOf(arg)
  if (props.item.type === 'event') return true // 일정은 FullCalendar 기본 표시(시간 + 제목)
  if (arg.view.type.startsWith('list')) {
    // v7 목록 보기는 eventContent가 시간 열까지 대신 그린다 — 시간 열은 테마 클래스로 따로 둔다
    return (
      <>
        <div className={arg.timeClass}>{arg.timeText || ALL_DAY_TEXT}</div>
        <div className={arg.titleClass}>
          <TaskContent {...props} timeText="" />
        </div>
      </>
    )
  }
  return <TaskContent {...props} timeText={arg.timeText} />
}

export function CalendarView({
  events,
  colorScheme = 'light',
  initialDate,
  onRangeChange,
  onSelectSlot,
  onItemClick,
  onToggleDone,
  onItemChange,
}: Props) {
  const handleClick = (info: EventClickInfo) => {
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

  const handleChange = (info: EventChangeInfo) => {
    const { item } = propsOf(info)
    const { start, end, allDay } = info.event
    if (!start) return
    onItemChange(item, { start, end, allDay }).catch(() => info.revert())
  }

  const handleDateClick = (info: DateClickInfo) => {
    onSelectSlot(
      { date: toLocalDate(info.date), startTime: info.allDay ? null : toLocalTime(info.date) },
      { x: info.jsEvent.clientX, y: info.jsEvent.clientY },
    )
  }

  return (
    <div className="calendar-view">
      <FullCalendar
        plugins={[classicTheme, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        colorScheme={colorScheme}
        // 테마와 무관한 훅 클래스 — v7은 .fc-* 클래스를 붙이지 않으므로 e2e와 우리 CSS가 이것으로 요소를 고른다
        viewClass={(info) => `sc-view sc-view-${info.view.type}`}
        dayHeaderClass="sc-day-header"
        dayCellClass="sc-day-cell"
        slotLaneClass="sc-slot"
        locale={koLocale}
        initialView="timeGridWeek"
        initialDate={initialDate}
        firstDay={1}
        headerToolbar={{ start: 'prev,next today', center: 'title', end: 'timeGridWeek,dayGridMonth,listWeek' }}
        todayText="오늘"
        buttons={{ timeGridWeek: { text: '주' }, dayGridMonth: { text: '월' }, listWeek: { text: '목록' } }}
        allDayText={ALL_DAY_TEXT}
        height="100%"
        nowIndicator
        editable
        selectable={false}
        events={events}
        eventOrder="sortRank,start,-duration,allDay,title"
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
