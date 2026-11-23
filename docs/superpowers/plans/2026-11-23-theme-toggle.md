# 라이트/다크 테마 토글 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 이 프로젝트의 분담: 테스트 작성·실행은 `test-writer` 서브에이전트, 제품 코드 구현과 커밋은 메인 세션(executing-plans). 마무리는 GitHub PR.

**Goal:** 사이드바 아래 두 단계 토글로 라이트/다크를 바꾸고, 선택을 localStorage에 저장해 새로고침 후에도 유지한다.

**Architecture:** `src/lib/theme.ts`가 저장·적용을 맡고, 적용은 `<html data-color-scheme>` 속성 하나다(앱 변수가 이미 Forma 변수를 가리킴). `index.html`의 인라인 스크립트가 렌더 전에 저장값을 적용해 깜빡임을 막는다. App이 테마 상태를 들고 Sidebar(토글)와 CalendarView(`colorScheme`)에 내려준다.

**Tech Stack:** React 19, Vite, `@fullcalendar/react` 7.1.5 Forma, Vitest(jsdom), Playwright, `gh`

**Spec:** `docs/superpowers/specs/2026-11-23-theme-toggle-design.md`

## Global Constraints

- 저장 키 `simple-cal:theme`, 값 `'light' | 'dark'`. 저장값 없음·이상값·localStorage 오류 → `'light'`
- 적용: `document.documentElement.setAttribute('data-color-scheme', theme)` (라이트도 `light`를 명시)
- 토글: 사이드바 아래쪽, `role="switch"`, `aria-checked`(다크면 true), 접근 이름 "다크 테마", Space/Enter로 전환
- `CalendarView`의 `colorScheme` = 앱 테마 상태 (달력 루트와 `<html>`이 항상 같은 값)
- 네이티브 컨트롤: `color-scheme`이 테마를 따름, `accent-color: var(--primary)`
- 빨강은 변수로: 하드코딩 `#b91c1c`(Toast.css)·`#d64545`(밀린 배지) 제거. 캘린더 색 팔레트(CalendarFormDialog)는 그대로
- 이번 범위 밖: 운영체제 자동 추종, 서버 저장, 전역 `button:disabled` 반투명
- 기존 단위 88 + e2e 22는 확인 내용 그대로 통과

## Review Focus

1. **localStorage를 쓸 수 없을 때**(사생활 보호·차단) — 앱이 라이트로 열리고 토글은 그 세션 동안 동작해야 한다 → Task 2 e2e
2. **저장값이 이상할 때**(`'blue'`, 빈 문자열) — 라이트 → Task 1 단위
3. **다크로 저장 후 새로고침** — 렌더 전에 이미 `<html>`이 dark(흰 화면 번쩍임 없음) → Task 1 e2e
4. **토글 직후 달력과 화면 전체가 같은 테마** — 달력 루트 `data-color-scheme`과 `<html>` 값이 같아야 한다 → Task 2 e2e
5. **다크에서 빠른 생성 팝오버·오류 토스트·밀린 배지** — 어두운 바탕에서 바탕과 구분돼 읽혀야 한다 → Task 1 e2e

---

### Task 1: 테마 저장·적용 모듈, 렌더 전 적용, 다크용 CSS

**Files:**
- Create: `frontend/src/lib/theme.ts`
- Modify: `frontend/index.html` (`<head>` 인라인 스크립트, `lang="ko"`)
- Modify: `frontend/src/index.css`, `frontend/src/components/Toast.css`, `frontend/src/calendar/CalendarView.css`
- Test: `frontend/src/lib/theme.test.ts`(새 파일), `frontend/e2e/theme.spec.ts`

**Interfaces:**
- Produces (`src/lib/theme.ts`):
  - `export type Theme = 'light' | 'dark'`
  - `export const THEME_KEY = 'simple-cal:theme'`
  - `export function readTheme(): Theme` — localStorage 값, 없음·이상값·예외 → `'light'`
  - `export function saveTheme(theme: Theme): void` — 예외는 삼킨다
  - `export function applyTheme(theme: Theme): void` — `<html>` 속성 설정
  - `export function initialTheme(): Theme` — `<html>`에 이미 붙은 `data-color-scheme`(인라인 스크립트 결과)이 `light`/`dark`면 그것, 아니면 `readTheme()`
- 앱 CSS 변수 추가: `--danger`(글자·테두리), `--danger-bg`(토스트 바탕), `--on-danger` — 라이트/다크 각각

- [ ] **Step 1: 실패하는 테스트 (test-writer)**
  `src/lib/theme.test.ts` (각 테스트 전 `localStorage.clear()`, `<html>` 속성 제거):
  - `readTheme: 저장값이 없으면 light` → `'light'`
  - `readTheme: dark 저장 시 dark` → `localStorage.setItem('simple-cal:theme','dark')` 후 `'dark'`
  - `readTheme: 이상값은 light` → `'blue'`, `''` 각각 `'light'`
  - `readTheme: localStorage 예외면 light` → `vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error() })` 후 `'light'`
  - `saveTheme: 저장하고 예외는 삼킨다` → 저장 후 `getItem` = `'dark'`; `setItem` 예외 mock 상태에서 `expect(() => saveTheme('dark')).not.toThrow()`
  - `applyTheme: html 속성을 바꾼다` → `applyTheme('dark')` 후 `document.documentElement.getAttribute('data-color-scheme')` = `'dark'`, `applyTheme('light')` 후 `'light'`
  - `initialTheme: html 속성을 우선` → 속성 `dark`, 저장값 없음 → `'dark'`; 속성 없음, 저장값 `dark` → `'dark'`

  `e2e/theme.spec.ts`에 (각 테스트는 `page.addInitScript(() => localStorage.setItem('simple-cal:theme','dark'))` 후 `openApp`):
  - `다크로 저장해 두면 렌더 전에 html이 이미 dark`: `addInitScript`로 `document.addEventListener('DOMContentLoaded', () => { window.__themeAtDcl = document.documentElement.getAttribute('data-color-scheme') })`도 걸고 → `window.__themeAtDcl` = `'dark'`
  - `다크에서 네이티브 컨트롤도 어둡다`: 빠른 생성 팝오버를 열어(`allDayCell(page,'2026-11-24')` 클릭) 그 안 `select`의 computed `color-scheme` = `'dark'`; 팝오버 `background-color` = `'rgb(3, 7, 18)'`; 라디오(`getByRole('radio', { name: '일정' })`)의 `accent-color` = `'rgb(55, 136, 216)'`(다크 `--fc-forma-primary` `#3788d8`)
  - `다크에서 밀린 배지와 오류 토스트가 바탕과 구분된다`: 밀린 할 일(2026-11-20, task) seed → `.overdue-badge` `color`가 body `background-color`와 다르고 `'rgb(214, 69, 69)'`(라이트 값)가 아님; 기존 오류 토스트 유발 방식(캘린더 삭제 후 저장)으로 `getByRole('alert')` `background-color` ≠ body 배경, `color` ≠ 토스트 배경
  - 기존 라이트 테스트의 `html`에는 이제 `data-color-scheme="light"`가 붙어 있어야 한다: `앱 색이 Forma 기준이다`에 `expect(await page.locator('html').getAttribute('data-color-scheme')).toBe('light')` 추가

- [ ] **Step 2: 실패 확인 (test-writer)**
  Run: `cd frontend && pnpm exec vitest run src/lib/theme.test.ts && pnpm exec playwright test e2e/theme.spec.ts`
  Expected: 단위는 모듈 없음으로 FAIL, e2e 신규 3개와 `light` 속성 단언 FAIL

- [ ] **Step 3: `src/lib/theme.ts` 구현** (Interfaces 그대로)

- [ ] **Step 4: `index.html`** — `<html lang="ko">`, `<head>` 맨 위에 인라인 `<script>`: `simple-cal:theme`을 try/catch로 읽어 `'dark'`면 `dark`, 아니면 `light`를 `document.documentElement`의 `data-color-scheme`에 설정. `main.tsx`는 렌더 전에 `applyTheme(initialTheme())` 호출(스크립트가 막혀도 동작)

- [ ] **Step 5: CSS** — `index.css`: `:root[data-color-scheme=dark] { color-scheme: dark }`, 그 외 `color-scheme: light`; `:root { accent-color: var(--primary) }`; `--danger`/`--danger-bg`/`--on-danger`를 라이트(`#d64545`/`#b91c1c`/`#fff`)와 다크(바탕 `#030712` 대비가 충분한 값 — 빌더 판단, 예: 글자 `#f87171`, 토스트 바탕 `#7f1d1d`)로. `Toast.css` 바탕·글자 → `var(--danger-bg)`/`var(--on-danger)`, `CalendarView.css` `.overdue-badge` → `var(--danger)`

- [ ] **Step 6: 통과 확인 (test-writer)**
  Run: `cd frontend && pnpm test && pnpm test:e2e && pnpm build`
  Expected: 단위 95 PASS(88 + 7), e2e 25 PASS(22 + 3), 빌드 성공

- [ ] **Step 7: 커밋**
  ```bash
  git add frontend/index.html frontend/src frontend/e2e
  git commit -m "feat(frontend): theme storage, pre-render apply and dark-ready colors"
  ```

---

### Task 2: 사이드바 토글과 달력 연결

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`, `frontend/src/components/Sidebar.css`, `frontend/src/App.tsx`
- Test: `frontend/src/components/Sidebar.test.tsx`, `frontend/e2e/theme.spec.ts`

**Interfaces:**
- Consumes: Task 1의 `Theme`, `initialTheme()`, `saveTheme()`, `applyTheme()`
- Produces: `Sidebar` Props에 `theme: Theme`, `onThemeChange(theme: Theme): void` 추가. App은 `const [theme, setTheme] = useState(initialTheme)`; 바뀌면 `applyTheme` + `saveTheme`; `<CalendarView colorScheme={theme} …>`

- [ ] **Step 1: 실패하는 테스트 (test-writer)**
  `Sidebar.test.tsx` (setup에 `theme`/`onThemeChange` 인자 추가, 기본 `'light'`):
  - `테마 토글은 다크 테마 스위치`: `getByRole('switch', { name: '다크 테마' })`의 `aria-checked` = `'false'`
  - `토글을 누르면 dark로 바꾸라고 알린다`: 클릭 → `onThemeChange` `toHaveBeenCalledWith('dark')`
  - `다크일 때는 켜짐으로 보이고 누르면 light`: `theme='dark'`로 렌더 → `aria-checked` `'true'`, 클릭 → `'light'`
  `e2e/theme.spec.ts`:
  - `토글로 다크로 바꾸면 화면과 달력이 함께 바뀌고 새로고침 후에도 유지`: `openApp` → `getByRole('switch', { name: '다크 테마' })` 클릭 → `html` `data-color-scheme` = `'dark'`, `.sc-view`를 감싼 달력 루트(`[data-color-scheme]` 중 `html`이 아닌 첫 요소)도 `'dark'`, body 배경 `'rgb(3, 7, 18)'`; `page.reload()` 후 스위치 `aria-checked` `'true'`, `html` `'dark'`; 다시 클릭 → `'light'`, 새로고침 후 `'light'`, `localStorage['simple-cal:theme']` = `'light'`
  - `키보드로 토글`: 스위치 `.focus()` → `Space` → `aria-checked` `'true'`
  - `localStorage가 막혀도 열리고 토글은 동작한다`: `addInitScript`로 `Storage.prototype.getItem`/`setItem`이 throw하게 → `openApp` 성공, `html` `'light'`, 스위치 클릭 → `html` `'dark'`, 페이지 오류(`pageerror`) 0건

- [ ] **Step 2: 실패 확인 (test-writer)**
  Run: `cd frontend && pnpm exec vitest run src/components/Sidebar.test.tsx && pnpm exec playwright test e2e/theme.spec.ts`
  Expected: 스위치 없음으로 단위 3개·e2e 3개 FAIL

- [ ] **Step 3: 구현** — `Sidebar`: 사이드바 아래쪽(목록 아래 여백을 두고 바닥에 붙임, `margin-top: auto` 등)에 `<button type="button" role="switch" aria-checked={theme==='dark'} aria-label="다크 테마">` + 장식용 해/달(`aria-hidden`). 모양은 Forma 톤(얇은 테두리 트랙, 켜지면 `var(--primary)`), 포커스 외곽선. `App.tsx`: Interfaces대로 상태·저장·적용·`colorScheme` 연결

- [ ] **Step 4: 통과 확인 (test-writer)**
  Run: `cd frontend && pnpm test && pnpm test:e2e --repeat-each=2 && pnpm build`
  Expected: 단위 98 PASS, e2e 28×2 PASS, 빌드 성공

- [ ] **Step 5: 커밋**
  ```bash
  git add frontend/src frontend/e2e
  git commit -m "feat(frontend): light/dark toggle in the sidebar, remembered in localStorage"
  ```

---

## 마무리 (최종 리뷰 후)

- 라이트·다크 각각 주·월·목록 보기, 편집 대화상자를 같은 데이터로 스크린샷 → `docs/superpowers/screens/theme-toggle/*.png` 커밋. 밝은 캘린더 색(노랑 `#ca8a04` 등)이 다크에서 읽히는지 이때 확인하고, 문제면 조정 후 PR 본문에 기록
- `git push -u origin feat/theme-toggle` → `gh pr create --base main` (본문: 요약, 테스트 결과, 스크린샷 링크, 미룬 것). PR URL을 사용자에게 알리고 병합은 사용자 결정
