import { useMemo, useState } from 'react'
import type { Calendar, Item, ItemInput } from './types'
import { useCalendarMutations, useCalendars } from './hooks/useCalendars'
import { useItemMutations, useItems, useOverdue } from './hooks/useItems'
import { CalendarView, type Slot } from './calendar/CalendarView'
import { QuickCreatePopover } from './components/QuickCreatePopover'
import { ItemEditDialog } from './components/ItemEditDialog'
import { changeToPatch, itemsToEvents } from './calendar/adapter'
import { addDays, todayLocal } from './lib/dates'
import { Sidebar } from './components/Sidebar'
import { CalendarFormDialog } from './components/CalendarFormDialog'
import { Toast } from './components/Toast'
import { applyTheme, initialTheme, saveTheme, type Theme } from './lib/theme'
import './App.css'

function thisWeek(today: string): { from: string; to: string } {
  const [y, m, d] = today.split('-').map(Number)
  const mondayOffset = (new Date(y, m - 1, d).getDay() + 6) % 7
  const from = addDays(today, -mondayOffset)
  return { from, to: addDays(from, 6) }
}

type QuickCreate = { slot: Slot; anchor: { x: number; y: number } } | null
type EditState = { item: Item | null; draft: ItemInput } | null

type CalendarDialog = { mode: 'create' } | { mode: 'edit'; calendar: Calendar } | null

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const changeTheme = (next: Theme) => {
    setTheme(next)
    applyTheme(next)
    saveTheme(next)
  }
  const calendars = useCalendars().data ?? []
  const calendarMut = useCalendarMutations()
  const [calendarDialog, setCalendarDialog] = useState<CalendarDialog>(null)

  const today = todayLocal()
  const [range, setRange] = useState(() => thisWeek(today))
  const items = useItems(range.from, range.to).data
  const overdue = useOverdue(today).data
  const itemMut = useItemMutations()
  const [quick, setQuick] = useState<QuickCreate>(null)
  const [edit, setEdit] = useState<EditState>(null)
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
        theme={theme}
        onThemeChange={changeTheme}
      />
      <main className="main">
        <CalendarView
          events={events}
          colorScheme={theme}
          onRangeChange={(from, to) => setRange((r) => (r.from === from && r.to === to ? r : { from, to }))}
          onSelectSlot={(slot, anchor) => setQuick({ slot, anchor })}
          onItemClick={(item) => {
            const { id: _id, ...draft } = item
            void _id
            setEdit({ item, draft })
          }}
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
      {quick && (
        <QuickCreatePopover
          slot={quick.slot}
          anchor={quick.anchor}
          calendars={calendars}
          onClose={() => setQuick(null)}
          onCreate={async (input) => {
            const target = calendars.find((c) => c.id === input.calendarId)
            if (target && !target.visible) void calendarMut.update(target.id, { visible: true }).catch(() => {})
            await itemMut.create(input).catch(() => {})
            setQuick(null)
          }}
          onMore={(draft) => {
            setQuick(null)
            setEdit({ item: null, draft })
          }}
        />
      )}

      {edit && (
        <ItemEditDialog
          item={edit.item}
          draft={edit.draft}
          calendars={calendars}
          onClose={() => setEdit(null)}
          onSave={async (value) => {
            const target = calendars.find((c) => c.id === value.calendarId)
            if (target && !target.visible) void calendarMut.update(target.id, { visible: true }).catch(() => {})
            if (edit.item) await itemMut.update(edit.item.id, value)
            else await itemMut.create(value)
            setEdit(null)
          }}
          onDelete={
            edit.item
              ? async () => {
                  await itemMut.remove(edit.item!.id)
                  setEdit(null)
                }
              : undefined
          }
        />
      )}
      <Toast />
    </div>
  )
}
