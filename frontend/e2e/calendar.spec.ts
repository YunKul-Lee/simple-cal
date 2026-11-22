import { expect, test } from '@playwright/test'
import { allDayCell, apiItems, columnCenterX, dragTo, openApp, seedItem } from './helpers'

const WEEK = ['2026-11-23', '2026-11-29'] as const

const center = (box: { x: number; y: number; width: number; height: number }) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
})

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

test('시간 칸의 일정 블록에 제목이 보인다', async ({ page }) => {
  await seedItem(page, { type: 'event', title: '주간회의', date: '2026-11-23', startTime: '10:00', endTime: '11:00' })

  await expect(page.locator('.fc-timegrid-event')).toContainText('주간회의')
})

test('빈 시간 칸을 클릭해 일정을 만든다', async ({ page }) => {
  const lane = page.locator('td.fc-timegrid-slot-lane[data-time="14:00:00"]')
  await lane.scrollIntoViewIfNeeded()
  const laneBox = (await lane.boundingBox())!
  const x = await columnCenterX(page, '2026-11-24')
  await lane.click({ position: { x: x - laneBox.x, y: laneBox.height / 2 } })

  const popover = page.getByRole('dialog', { name: '새 항목' })
  await expect(popover).toBeVisible()
  await popover.getByLabel('제목').fill('1:1')
  await popover.getByLabel('제목').press('Enter')

  await expect(page.locator('.fc-timegrid-event', { hasText: '1:1' })).toBeVisible()
  const items = await apiItems(page, ...WEEK)
  expect(items).toContainEqual(
    expect.objectContaining({ title: '1:1', date: '2026-11-24', startTime: '14:00', endTime: '15:00' }),
  )
})

test('하루 종일 줄을 클릭해 할 일을 만들고 체크하면 줄이 그어진 채 남는다', async ({ page }) => {
  await allDayCell(page, '2026-11-26').click()

  const popover = page.getByRole('dialog', { name: '새 항목' })
  await expect(popover).toBeVisible()
  await popover.getByLabel('제목').fill('보고서')
  await popover.getByLabel('제목').press('Enter')

  const check = page.getByRole('checkbox', { name: '보고서 완료' })
  await expect(check).toBeVisible()
  await check.click()
  await expect(page.locator('.is-done', { hasText: '보고서' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('checkbox', { name: '보고서 완료' })).toBeChecked()
  await expect(page.locator('.is-done', { hasText: '보고서' })).toBeVisible()
})

test('일정을 다음 날로 끌어 옮기면 새로고침 후에도 유지된다', async ({ page }) => {
  await seedItem(page, { type: 'event', title: '회의', date: '2026-11-23', startTime: '10:00', endTime: '11:00' })

  const event = page.locator('.fc-timegrid-event', { hasText: '회의' })
  await event.scrollIntoViewIfNeeded()
  const from = center((await event.boundingBox())!)
  await dragTo(page, from, { x: await columnCenterX(page, '2026-11-24'), y: from.y })

  await expect
    .poll(async () => (await apiItems(page, ...WEEK)).find((i) => i.title === '회의'))
    .toMatchObject({ date: '2026-11-24', startTime: '10:00', endTime: '11:00' })
})

test('시간 칸 일정을 하루 종일 줄로 끌면 하루 종일 일정이 된다', async ({ page }) => {
  await seedItem(page, { type: 'event', title: '워크숍', date: '2026-11-25', startTime: '10:00', endTime: '11:00' })

  const event = page.locator('.fc-timegrid-event', { hasText: '워크숍' })
  await event.scrollIntoViewIfNeeded()
  const from = center((await event.boundingBox())!)
  const to = center((await allDayCell(page, '2026-11-25').boundingBox())!)
  await dragTo(page, from, to)

  await expect
    .poll(async () => (await apiItems(page, ...WEEK)).find((i) => i.title === '워크숍'))
    .toMatchObject({ startTime: null, endTime: null })
})

test('밀린 할 일은 오늘 하루 종일 줄 맨 위에 원래 날짜 배지와 함께 보인다', async ({ page }) => {
  await seedItem(page, { type: 'task', title: '세금 신고', date: '2026-11-20' })
  await seedItem(page, { type: 'task', title: '가나다', date: '2026-11-25' })

  const today = allDayCell(page, '2026-11-25')
  await expect(today.locator('.task-title')).toHaveCount(2)
  await expect(today.locator('.task-title').first()).toHaveText('세금 신고')
  await expect(today.getByText('11/20부터')).toBeVisible()
})

test('주·월·목록 보기로 전환된다', async ({ page }) => {
  await page.getByRole('button', { name: '월', exact: true }).click()
  await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible()

  await page.getByRole('button', { name: '목록', exact: true }).click()
  await expect(page.locator('.fc-list')).toBeVisible()

  await page.getByRole('button', { name: '주', exact: true }).click()
  await expect(page.locator('.fc-timeGridWeek-view')).toBeVisible()
})

test('캘린더를 숨기면 그 캘린더의 항목이 사라진다', async ({ page }) => {
  await seedItem(page, { type: 'event', title: '숨김테스트', date: '2026-11-24', startTime: '10:00', endTime: '11:00' })
  const item = page.locator('.fc').getByText('숨김테스트')
  await expect(item).toBeVisible()

  // 체크 상태는 낙관적 갱신이 한 틱 뒤에 반영된다 — uncheck()/check()는 클릭 직후 상태를 검사하므로 click + 재시도 단언을 쓴다
  const toggle = page.getByRole('checkbox', { name: '내 캘린더' })
  await toggle.click()
  await expect(toggle).not.toBeChecked()
  await expect(item).toBeHidden()

  await toggle.click()
  await expect(toggle).toBeChecked()
  await expect(item).toBeVisible()
})
