import { useMemo, useState } from 'react'
import type { Calendar } from './types'
import { useCalendarMutations, useCalendars } from './hooks/useCalendars'
import { useItemMutations, useItems, useOverdue } from './hooks/useItems'
import { CalendarView } from './calendar/CalendarView'
import { changeToPatch, itemsToEvents } from './calendar/adapter'
import { addDays, todayLocal } from './lib/dates'
import { Sidebar } from './components/Sidebar'
import { CalendarFormDialog } from './components/CalendarFormDialog'
import { Toast } from './components/Toast'
import './App.css'

function thisWeek(today: string): { from: string; to: string } {
  const [y, m, d] = today.split('-').map(Number)
  const mondayOffset = (new Date(y, m - 1, d).getDay() + 6) % 7
  const from = addDays(today, -mondayOffset)
  return { from, to: addDays(from, 6) }
}

type CalendarDialog = { mode: 'create' } | { mode: 'edit'; calendar: Calendar } | null

export default function App() {
  const calendars = useCalendars().data ?? []
  const calendarMut = useCalendarMutations()
  const [calendarDialog, setCalendarDialog] = useState<CalendarDialog>(null)

  const today = todayLocal()
  const [range, setRange] = useState(() => thisWeek(today))
  const items = useItems(range.from, range.to).data
  const overdue = useOverdue(today).data
  const itemMut = useItemMutations()
  const events = useMemo(
    () => itemsToEvents(items ?? [], overdue ?? [], calendars, today),
    [items, overdue, calendars, today],
  )

  return (
    <div className="app">
      <Sidebar
        calendars={calendars}
        onToggle={(id, visible) => void calendarMut.update(id, { visible }).catch(() => {})}
        onCreate={() => setCalendarDialog({ mode: 'create' })}
        onEdit={(calendar) => setCalendarDialog({ mode: 'edit', calendar })}
      />
      <main className="main">
        <CalendarView
          events={events}
          onRangeChange={(from, to) => setRange((r) => (r.from === from && r.to === to ? r : { from, to }))}
          onSelectSlot={() => {}}
          onItemClick={() => {}}
          onToggleDone={(item) => void itemMut.update(item.id, { done: !item.done }).catch(() => {})}
          onItemChange={async (item, change) => {
            await itemMut.update(item.id, changeToPatch(item, change))
          }}
        />
      </main>

      {calendarDialog && (
        <CalendarFormDialog
          initial={calendarDialog.mode === 'edit' ? calendarDialog.calendar : undefined}
          onClose={() => setCalendarDialog(null)}
          onSubmit={(input) => {
            const done =
              calendarDialog.mode === 'edit'
                ? calendarMut.update(calendarDialog.calendar.id, input)
                : calendarMut.create(input)
            done.then(() => setCalendarDialog(null)).catch(() => {})
          }}
          onDelete={
            calendarDialog.mode === 'edit'
              ? () =>
                  calendarMut
                    .remove(calendarDialog.calendar.id)
                    .then(() => setCalendarDialog(null))
                    .catch(() => {})
              : undefined
          }
        />
      )}
      <Toast />
    </div>
  )
}
