/** 라이트/다크 테마: 브라우저 localStorage에 저장하고 <html data-color-scheme>로 적용한다.
 *  앱 색 변수가 Forma 팔레트 변수를 가리키므로 이 속성 하나로 화면 전체가 바뀐다. */
export type Theme = 'light' | 'dark'

export const THEME_KEY = 'simple-cal:theme'

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

/** 저장값이 없거나 이상하거나 localStorage를 쓸 수 없으면 라이트 */
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** 저장할 수 없는 환경이면 조용히 넘어간다 — 그 세션 동안만 적용된다 */
export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // 사생활 보호 모드 등
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-color-scheme', theme)
}

/** index.html의 인라인 스크립트가 렌더 전에 붙인 값을 우선한다 */
export function initialTheme(): Theme {
  const applied = document.documentElement.getAttribute('data-color-scheme')
  return isTheme(applied) ? applied : readTheme()
}
