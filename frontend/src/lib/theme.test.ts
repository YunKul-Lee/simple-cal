import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { applyTheme, initialTheme, readTheme, saveTheme, THEME_KEY } from './theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-color-scheme')
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('readTheme: 저장값이 없으면 light', () => {
  expect(readTheme()).toBe('light')
})

test('readTheme: dark 저장 시 dark', () => {
  localStorage.setItem('simple-cal:theme', 'dark')
  expect(THEME_KEY).toBe('simple-cal:theme')
  expect(readTheme()).toBe('dark')
})

test('readTheme: 이상값은 light', () => {
  localStorage.setItem(THEME_KEY, 'blue')
  expect(readTheme()).toBe('light')
  localStorage.setItem(THEME_KEY, '')
  expect(readTheme()).toBe('light')
})

test('readTheme: localStorage 예외면 light', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error()
  })
  expect(readTheme()).toBe('light')
})

test('saveTheme: 저장하고 예외는 삼킨다', () => {
  saveTheme('dark')
  expect(localStorage.getItem(THEME_KEY)).toBe('dark')

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error()
  })
  expect(() => saveTheme('dark')).not.toThrow()
})

test('applyTheme: html 속성을 바꾼다', () => {
  applyTheme('dark')
  expect(document.documentElement.getAttribute('data-color-scheme')).toBe('dark')
  applyTheme('light')
  expect(document.documentElement.getAttribute('data-color-scheme')).toBe('light')
})

test('initialTheme: html 속성을 우선', () => {
  document.documentElement.setAttribute('data-color-scheme', 'dark')
  expect(initialTheme()).toBe('dark')

  document.documentElement.removeAttribute('data-color-scheme')
  localStorage.setItem(THEME_KEY, 'dark')
  expect(initialTheme()).toBe('dark')
})
