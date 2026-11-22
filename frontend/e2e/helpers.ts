import { expect, type Page } from '@playwright/test'
import type { Calendar, Item, ItemInput } from '../src/types'

/** "오늘"을 2026-11-25(수)로 고정 — 주 보기는 11-23(월) ~ 11-29(일) */
export const TODAY = new Date('2026-11-25T10:00:00')

async function waitForApp(page: Page) {
  await expect(page.getByRole('checkbox', { name: '내 캘린더' })).toBeVisible()
  await expect(page.locator('.fc-timegrid')).toBeAttached()
}

export async function openApp(page: Page) {
  await page.clock.setFixedTime(TODAY)
  await page.goto('/')
  await waitForApp(page)
}

/** 첫 캘린더에 항목을 API로 넣고 새로고침해 화면에 반영한다 */
export async function seedItem(page: Page, partial: Partial<ItemInput> & Pick<ItemInput, 'title' | 'date'>): Promise<Item> {
  const calendars: Calendar[] = await page.evaluate(() => fetch('/api/calendars').then((r) => r.json()))
  const input: ItemInput = {
    calendarId: calendars[0].id,
    type: 'event',
    memo: null,
    startTime: null,
    endDate: null,
    endTime: null,
    done: false,
    ...partial,
  }
  const created: Item = await page.evaluate(
    (body) =>
      fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error(`POST /api/items ${r.status}`)
        return r.json()
      }),
    input,
  )
  await page.reload()
  await waitForApp(page)
  return created
}

export async function apiItems(page: Page, from: string, to: string): Promise<Item[]> {
  return page.evaluate(
    ([f, t]) => fetch(`/api/items?from=${f}&to=${t}`).then((r) => r.json()),
    [from, to] as const,
  )
}

/** 주 보기 열 머리글의 가로 중앙 */
export async function columnCenterX(page: Page, date: string): Promise<number> {
  const box = await page.locator(`th.fc-col-header-cell[data-date="${date}"]`).boundingBox()
  if (!box) throw new Error(`column header ${date} not found`)
  return box.x + box.width / 2
}

/** 주 보기 '하루 종일' 줄의 날짜 칸 */
export const allDayCell = (page: Page, date: string) =>
  page.locator(`.fc-timegrid .fc-daygrid-day[data-date="${date}"]`)

/** 마우스로 천천히 끌어 놓는다 (FullCalendar는 여러 번의 mousemove가 있어야 드래그로 인식한다) */
export async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 5, from.y + 5, { steps: 5 })
  await page.mouse.move(to.x, to.y, { steps: 15 })
  await page.mouse.up()
}
