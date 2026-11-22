import { useState } from 'react'
import type { Calendar } from './types'
import { useCalendarMutations, useCalendars } from './hooks/useCalendars'
import { Sidebar } from './components/Sidebar'
import { CalendarFormDialog } from './components/CalendarFormDialog'
import { Toast } from './components/Toast'
import './App.css'

type CalendarDialog = { mode: 'create' } | { mode: 'edit'; calendar: Calendar } | null

export default function App() {
  const calendars = useCalendars().data ?? []
  const calendarMut = useCalendarMutations()
  const [calendarDialog, setCalendarDialog] = useState<CalendarDialog>(null)

  return (
    <div className="app">
      <Sidebar
        calendars={calendars}
        onToggle={(id, visible) => void calendarMut.update(id, { visible }).catch(() => {})}
        onCreate={() => setCalendarDialog({ mode: 'create' })}
        onEdit={(calendar) => setCalendarDialog({ mode: 'edit', calendar })}
      />
      <main className="main" />

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
