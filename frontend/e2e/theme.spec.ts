import { expect, test, type Locator } from '@playwright/test'
import { allDayCell, openApp, seedItem } from './helpers'

/** 첫 캘린더의 기본 색 #4a7bd8 */
const CALENDAR_COLOR = 'rgb(74, 123, 216)'

const css = (locator: Locator, prop: string) =>
  locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.describe('라이트(기본)', () => {
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

  test('앱 색이 Forma 기준이다', async ({ page }) => {
    expect(await page.locator('html').getAttribute('data-color-scheme')).toBe('light')
    expect(await css(page.locator('body'), 'color')).toBe('rgb(3, 7, 18)')
    expect(await css(page.locator('.sidebar'), 'border-right-color')).toBe('rgb(224, 224, 224)')
  })

  test('주요 버튼은 Forma 파랑, 모서리 4px', async ({ page }) => {
    await allDayCell(page, '2026-11-24').click()

    const popover = page.getByRole('dialog', { name: '새 항목' })
    await expect(popover).toBeVisible()
    expect(await css(popover, 'background-color')).toBe('rgb(255, 255, 255)')
    expect(await css(popover, 'border-radius')).toBe('4px')

    // 저장 버튼은 제목이 없으면 disabled라 — 제목을 넣어 활성 상태의 색을 본다
    await popover.getByLabel('제목').fill('색 확인')
    const save = popover.locator('button.primary')
    await expect(save).toBeEnabled()
    expect(await css(save, 'background-color')).toBe('rgb(15, 108, 189)')
  })

  test('다크 표시를 붙이면 앱 색이 함께 바뀐다', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-color-scheme', 'dark'))

    const body = page.locator('body')
    await expect.poll(() => css(body, 'background-color')).toBe('rgb(3, 7, 18)')
    expect(await css(body, 'color')).toBe('rgb(255, 255, 255)')
  })

  test('오류 토스트는 바탕과 구분된다', async ({ page }) => {
    // e2e의 API는 MSW 서비스 워커가 페이지 안에서 응답하므로 page.route로는 가로챌 수 없다
    // (요청이 Playwright 네트워크 층까지 오지 않는다). 대신 팝오버를 연 뒤 그 캘린더를 API로 지워
    // 저장 요청이 422(calendar-not-found)로 실패하게 만든다 — 모든 mutation 오류는 같은 토스트로 뜬다.
    await allDayCell(page, '2026-11-24').click()
    const popover = page.getByRole('dialog', { name: '새 항목' })
    await expect(popover).toBeVisible()
    await popover.getByLabel('제목').fill('실패할 항목')

    await page.evaluate(async () => {
      const calendars: { id: string }[] = await fetch('/api/calendars').then((r) => r.json())
      for (const c of calendars) {
        const r = await fetch(`/api/calendars/${c.id}`, { method: 'DELETE' })
        if (!r.ok) throw new Error(`DELETE /api/calendars ${r.status}`)
      }
    })
    await popover.getByLabel('제목').press('Enter')

    const toast = page.getByRole('alert')
    await expect(toast).toBeVisible()
    const bodyBg = await css(page.locator('body'), 'background-color')
    expect(await css(toast, 'background-color')).not.toBe(bodyBg)
    expect(await css(toast, 'border-radius')).toBe('4px')
  })

  test('사이드바 체크박스는 캘린더 색', async ({ page }) => {
    const check = page.getByRole('checkbox', { name: '내 캘린더' })
    await expect(check).toBeChecked()
    expect(await css(check, 'border-top-color')).toBe(CALENDAR_COLOR)
    expect(await css(check, 'background-color')).toBe(CALENDAR_COLOR)

    await check.click()
    await expect(check).not.toBeChecked()
    await expect.poll(() => css(check, 'background-color')).not.toBe(CALENDAR_COLOR)

    await expect(page.locator('.sidebar .swatch')).toHaveCount(0)

    // 두 번째 캘린더도 자기 색을 테두리로 쓴다
    await page.evaluate(async () => {
      const r = await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '회사', color: '#d9822b' }),
      })
      if (!r.ok) throw new Error(`POST /api/calendars ${r.status}`)
    })
    await page.reload()
    const work = page.getByRole('checkbox', { name: '회사' })
    await expect(work).toBeVisible()
    expect(await css(work, 'border-top-color')).toBe('rgb(217, 130, 43)')
  })

  test('사이드바 체크박스도 키보드로 켜고 끈다', async ({ page }) => {
    const check = page.getByRole('checkbox', { name: '내 캘린더' })
    await check.focus()

    await page.keyboard.press('Space')
    await expect(check).not.toBeChecked()

    await page.keyboard.press('Space')
    await expect(check).toBeChecked()

    await expect(check).toBeFocused()
    expect(await css(check, 'outline-style')).not.toBe('none')
  })

  test('체크박스는 13px 정사각형', async ({ page }) => {
    await seedItem(page, { type: 'task', title: '보고서', date: '2026-11-25' })

    for (const name of ['보고서 완료', '내 캘린더']) {
      const box = await page.getByRole('checkbox', { name }).boundingBox()
      expect(box, name).not.toBeNull()
      expect(box!.width, `${name} width`).toBeCloseTo(13, 0)
      expect(box!.height, `${name} height`).toBeCloseTo(13, 0)
    }
  })
})

declare global {
  interface Window {
    __themeAtDcl?: string | null
  }
}

test.describe('다크 저장 상태', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('simple-cal:theme', 'dark'))
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        window.__themeAtDcl = document.documentElement.getAttribute('data-color-scheme')
      })
    })
    await openApp(page)
  })

  test('다크로 저장해 두면 렌더 전에 html이 이미 dark', async ({ page }) => {
    expect(await page.evaluate(() => window.__themeAtDcl)).toBe('dark')
  })

  test('다크에서 네이티브 컨트롤도 어둡다', async ({ page }) => {
    await allDayCell(page, '2026-11-24').click()
    const popover = page.getByRole('dialog', { name: '새 항목' })
    await expect(popover).toBeVisible()

    expect(await css(popover.locator('select').first(), 'color-scheme')).toBe('dark')
    expect(await css(popover, 'background-color')).toBe('rgb(3, 7, 18)')
    expect(await css(popover.getByRole('radio', { name: '일정' }), 'accent-color')).toBe('rgb(55, 136, 216)')
  })

  test('다크에서 밀린 배지와 오류 토스트가 바탕과 구분된다', async ({ page }) => {
    await seedItem(page, { type: 'task', title: '밀린 일', date: '2026-11-20' })

    const bodyBg = await css(page.locator('body'), 'background-color')
    const badge = page.locator('.overdue-badge').first()
    await expect(badge).toBeVisible()
    const badgeColor = await css(badge, 'color')
    expect(badgeColor).not.toBe(bodyBg)
    expect(badgeColor).not.toBe('rgb(214, 69, 69)')

    // 기존 오류 토스트 테스트와 같은 방식: 팝오버를 연 뒤 캘린더를 API로 지워 저장이 422로 실패하게 한다
    await allDayCell(page, '2026-11-24').click()
    const popover = page.getByRole('dialog', { name: '새 항목' })
    await expect(popover).toBeVisible()
    await popover.getByLabel('제목').fill('실패할 항목')

    await page.evaluate(async () => {
      const calendars: { id: string }[] = await fetch('/api/calendars').then((r) => r.json())
      for (const c of calendars) {
        const r = await fetch(`/api/calendars/${c.id}`, { method: 'DELETE' })
        if (!r.ok) throw new Error(`DELETE /api/calendars ${r.status}`)
      }
    })
    await popover.getByLabel('제목').press('Enter')

    const toast = page.getByRole('alert')
    await expect(toast).toBeVisible()
    const toastBg = await css(toast, 'background-color')
    expect(toastBg).not.toBe(bodyBg)
    expect(await css(toast, 'color')).not.toBe(toastBg)
  })
})
