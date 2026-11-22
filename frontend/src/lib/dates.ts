const pad = (n: number) => String(n).padStart(2, '0')

function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toLocalTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function todayLocal(now: Date = new Date()): string {
  return toLocalDate(now)
}

export function addDays(date: string, n: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + n)
  return toLocalDate(d)
}

export function addMinutes(date: string, time: string, minutes: number): { date: string; time: string } {
  const [h, m] = time.split(':').map(Number)
  const d = parseDate(date)
  d.setHours(h, m + minutes)
  return { date: toLocalDate(d), time: toLocalTime(d) }
}

export function compareDateTime(
  aDate: string,
  aTime: string | null,
  bDate: string,
  bTime: string | null,
): number {
  const a = `${aDate}T${aTime ?? '00:00'}`
  const b = `${bDate}T${bTime ?? '00:00'}`
  return a < b ? -1 : a > b ? 1 : 0
}
