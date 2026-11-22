import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Calendar, CalendarInput, CalendarPatch } from '../types'
import * as api from '../api/calendars'
import { onMutationError } from './useItems'

const KEY = ['calendars'] as const

export function useCalendars() {
  return useQuery({ queryKey: KEY, queryFn: api.fetchCalendars })
}

export function useCalendarMutations() {
  const qc = useQueryClient()
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: KEY }),
      qc.invalidateQueries({ queryKey: ['items'] }),
      qc.invalidateQueries({ queryKey: ['overdue'] }),
    ])

  const createM = useMutation({
    mutationFn: (input: CalendarInput) => api.createCalendar(input),
    onError: onMutationError,
    onSettled: invalidate,
  })

  const updateM = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CalendarPatch }) => api.updateCalendar(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const previous = qc.getQueryData<Calendar[]>(KEY)
      if (previous) qc.setQueryData<Calendar[]>(KEY, previous.map((c) => (c.id === id ? { ...c, ...patch } : c)))
      return { previous }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous)
      onMutationError(err)
    },
    onSettled: invalidate,
  })

  const removeM = useMutation({
    mutationFn: (id: string) => api.deleteCalendar(id),
    onError: onMutationError,
    onSettled: invalidate,
  })

  return {
    create: (input: CalendarInput) => createM.mutateAsync(input),
    update: (id: string, patch: CalendarPatch) => updateM.mutateAsync({ id, patch }),
    remove: (id: string) => removeM.mutateAsync(id),
  }
}
