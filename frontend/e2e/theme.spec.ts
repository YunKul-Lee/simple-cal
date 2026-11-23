import { expect, test, type Locator } from '@playwright/test'
import { openApp, seedItem } from './helpers'

/** 첫 캘린더의 기본 색 #4a7bd8 */
const CALENDAR_COLOR = 'rgb(74, 123, 216)'

const css = (locator: Locator, prop: string) =>
  locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

test('Forma 테마가 적용된다', async ({ page }) => {
  const vars = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement)
    return {
      forma: s.getPropertyValue('--fc-forma-primary').trim(),
      classic: s.getPropertyValue('--fc-classic-primary').trim(),
    }
  })
  expect(vars.forma).toBe('#0F6CBD')
  expect(vars.classic).toBe('')
})

test('할 일은 막대 없이 캘린더 색 체크박스', async ({ page }) => {
  await seedItem(page, { type: 'task', title: '보고서', date: '2026-11-25' })

  const task = page.locator('.sc-view-timeGridWeek .item-task', { hasText: '보고서' })
  await expect(task).toBeVisible()
  expect(await css(task, 'border-left-width')).toBe('0px')

  const check = page.getByRole('checkbox', { name: '보고서 완료' })
  expect(await css(check, 'border-top-color')).toBe(CALENDAR_COLOR)

  await check.click()
  await expect(check).toBeChecked()
  await expect.poll(() => css(check, 'background-color')).toBe(CALENDAR_COLOR)
})

test('일정은 왼쪽 막대가 있다', async ({ page }) => {
  await seedItem(page, { type: 'event', title: '회의', date: '2026-11-25', startTime: '10:00', endTime: '11:00' })

  const event = page.locator('.sc-view-timeGridWeek .item-event', { hasText: '회의' })
  await expect(event).toBeAttached()
  expect(await css(event, 'border-left-width')).not.toBe('0px')
})

test('키보드 Space로 할 일을 완료해도 편집 창이 열리지 않는다', async ({ page }) => {
  await seedItem(page, { type: 'task', title: '보고서', date: '2026-11-25' })

  const check = page.getByRole('checkbox', { name: '보고서 완료' })
  await check.focus()
  await page.keyboard.press('Space')

  await expect(check).toBeChecked()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(check).toBeFocused()
  expect(await css(check, 'outline-style')).not.toBe('none')
})

test('월 보기에서 완료한 할 일은 캘린더 색으로 채워진다', async ({ page }) => {
  await seedItem(page, { type: 'task', title: '장보기', date: '2026-11-25', done: true })

  await page.getByRole('tab', { name: '월' }).click()
  await expect(page.locator('.sc-view-dayGridMonth')).toBeAttached()

  const check = page.locator('.sc-view-dayGridMonth').getByRole('checkbox', { name: '장보기 완료' })
  await expect(check).toBeChecked()
  expect(await css(check, 'background-color')).toBe(CALENDAR_COLOR)
})
