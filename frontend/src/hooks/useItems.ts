import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Item, ItemInput, ItemPatch } from '../types'
import * as api from '../api/items'
import { reportError } from '../lib/errorBus'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } },
  })
}

export const onMutationError = (err: unknown) =>
  reportError(err instanceof Error ? err.message : '요청에 실패했습니다')

export function useItems(from: string, to: string) {
  return useQuery({ queryKey: ['items', from, to], queryFn: () => api.fetchItems(from, to) })
}

export function useOverdue(today: string) {
  return useQuery({ queryKey: ['overdue', today], queryFn: () => api.fetchOverdue(today) })
}

/** 항목 목록을 담는 모든 캐시('items', 'overdue') 키 */
const ITEM_KEYS = [['items'], ['overdue']] as const

export function useItemMutations() {
  const qc = useQueryClient()
  const invalidate = () => Promise.all(ITEM_KEYS.map((queryKey) => qc.invalidateQueries({ queryKey })))

  const createM = useMutation({
    mutationFn: (input: ItemInput) => api.createItem(input),
    onError: onMutationError,
    onSettled: invalidate,
  })

  const updateM = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ItemPatch }) => api.updateItem(id, patch),
    onMutate: async ({ id, patch }) => {
      await Promise.all(ITEM_KEYS.map((queryKey) => qc.cancelQueries({ queryKey })))
      const snapshots = ITEM_KEYS.flatMap((queryKey) => qc.getQueriesData<Item[]>({ queryKey }))
      for (const [key, data] of snapshots) {
        if (data) qc.setQueryData<Item[]>(key, data.map((i) => (i.id === id ? { ...i, ...patch } : i)))
      }
      return { snapshots }
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      onMutationError(err)
    },
    onSettled: invalidate,
  })

  const removeM = useMutation({
    mutationFn: (id: string) => api.deleteItem(id),
    onError: onMutationError,
    onSettled: invalidate,
  })

  return {
    create: (input: ItemInput) => createM.mutateAsync(input),
    update: (id: string, patch: ItemPatch) => updateM.mutateAsync({ id, patch }),
    remove: (id: string) => removeM.mutateAsync(id),
  }
}
