# Forma 테마 화면 전체 적용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 이 프로젝트의 분담: 테스트 작성·실행은 `test-writer` 서브에이전트, 제품 코드 구현과 커밋은 메인 세션(executing-plans).

**Goal:** 달력을 FullCalendar v7 Forma 테마(파랑)로 바꾸고, 할 일을 "막대 없음 + 캘린더 색 체크박스"로, 나머지 화면(사이드바·버튼·입력칸·대화상자·팝오버·토스트)을 Forma 색 기준으로 맞춘다.

**Architecture:** Forma 스타일시트(skeleton·theme·palette)를 앱 진입점에서 불러와 `--fc-forma-*` 변수를 앱 전체가 쓰게 한다. `index.css`의 앱 변수(`--bg`, `--text` …)는 값 대신 Forma 변수를 가리키므로, 나중에 `<html data-color-scheme="dark">`만으로 화면 전체가 바뀐다. 할 일 체크박스는 네이티브 checkbox에 `appearance: none`으로 모양만 입힌다.

**Tech Stack:** React 19, Vite, `@fullcalendar/react` 7.1.5 (`themes/forma`), Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-11-23-forma-theme-design.md`

## Global Constraints

- 테마: `@fullcalendar/react/themes/forma` 플러그인 + `forma/theme.css` + `forma/palettes/blue.css` (Classic 제거)
- 원칙: 진한 색은 작은 표시에만, 넓은 면은 옅게. 일정 블록은 Forma 기본(옅은 바탕 + 왼쪽 막대) 그대로
- 앱 강조색 `--primary` = `var(--fc-forma-primary)` (`#0F6CBD`). 캘린더 색(데이터, 기본 `#4a7bd8`)은 바꾸지 않음
- 모서리 반경 4px로 통일(버튼·입력칸·대화상자·팝오버·토스트)
- light 고정 유지: `CalendarView` `colorScheme` 기본 `'light'`, html에 `data-color-scheme` 붙이지 않음(테마 기능은 이후)
- 체크박스 접근성 유지: `role=checkbox`, 이름 `"<제목> 완료"`, 키보드 포커스 표시(`:focus-visible` 외곽선)
- 바꾸지 않는 것: `sc-*` 훅 클래스, 한국어 라벨, 레이아웃·기능. 기존 단위 88 + e2e 10은 확인 내용 그대로 통과

## Review Focus

1. **키보드로 할 일 체크** — 체크박스에 포커스 후 Space를 누르면 완료만 토글되고 편집 대화상자는 열리지 않아야 한다(이벤트 요소가 role=button이라 키 입력을 가로챌 수 있음) → Task 1 e2e
2. **월 보기의 완료한 할 일** — 체크된 체크박스가 캘린더 색으로 채워져 보여야 한다 → Task 1 e2e
3. **대화상자·팝오버 바탕** — 변수 교체 후에도 투명해지지 않고 흰 바탕이어야 한다 → Task 2 e2e
4. **다크 준비** — `<html data-color-scheme="dark">`를 붙이면 앱 바탕·글자색이 Forma 다크 값으로 바뀌어야 한다(테마 기능의 토대) → Task 2 e2e
5. **오류 토스트** — 바탕과 구분되는 눈에 띄는 색이어야 한다(넓은 면이 아니므로 빨강 유지) → Task 2 e2e

---

### Task 1: 달력에 Forma 테마와 할 일 색 체크박스

**Files:**
- Modify: `frontend/src/main.tsx` (Forma 스타일시트 import 추가 — skeleton → theme → palette → `index.css` 순)
- Modify: `frontend/src/calendar/CalendarView.tsx` (테마 플러그인 `classic` → `forma`, CSS import 3줄 제거)
- Modify: `frontend/src/calendar/CalendarView.css`
- Test: `frontend/e2e/theme.spec.ts` (새 파일)

**Interfaces:**
- Consumes: 없음
- Produces: `--fc-forma-*` 변수가 `:root`에 정의됨(Task 2가 사용). 할 일 체크박스 클래스 `task-check` 그대로

- [ ] **Step 1: 실패하는 e2e 작성 (test-writer)** — `frontend/e2e/theme.spec.ts`, `helpers.ts`의 `openApp`/`seedItem` 사용. 기본 캘린더 색 `#4a7bd8` = `rgb(74, 123, 216)`.
  - `test('Forma 테마가 적용된다')`: `getComputedStyle(document.documentElement).getPropertyValue('--fc-forma-primary').trim()`이 `'#0F6CBD'`, `--fc-classic-primary`는 `''`
  - `test('할 일은 막대 없이 캘린더 색 체크박스')`: 하루 종일 할 일 '보고서'(2026-11-25) seed → 주 보기 `.item-task`의 `border-left-width`가 `'0px'`; 체크박스 '보고서 완료'의 `border-top-color`가 `'rgb(74, 123, 216)'`; 클릭해 체크 후 `background-color`가 `'rgb(74, 123, 216)'`
  - `test('일정은 왼쪽 막대가 있다')`: 시간 있는 일정 '회의'(2026-11-25 10:00~11:00) seed → `.item-event`의 `border-left-width`가 `'0px'`이 아님 (Forma 기본 막대 — 이미 통과할 수 있음, 회귀 방지)
  - `test('키보드 Space로 할 일을 완료해도 편집 창이 열리지 않는다')`: '보고서' seed → 체크박스 `.focus()` → `page.keyboard.press('Space')` → checked, `getByRole('dialog')` 0개, 포커스된 체크박스의 `outline-style`이 `'none'`이 아님
  - `test('월 보기에서 완료한 할 일은 캘린더 색으로 채워진다')`: done=true 할 일 '장보기' seed → '월' 탭 → 체크박스 `background-color`가 `'rgb(74, 123, 216)'`

- [ ] **Step 2: 실패 확인 (test-writer)**
  Run: `cd frontend && pnpm exec playwright test e2e/theme.spec.ts`
  Expected: `Forma 테마`(`--fc-forma-primary` 빈 값), `막대 없이`(border 3px), `월 보기 채움`(네이티브 체크박스 배경) FAIL. 일정 막대·키보드 테스트는 통과할 수 있음(회귀 방지)

- [ ] **Step 3: Forma 적용** — `main.tsx`에 `@fullcalendar/react/skeleton.css`, `themes/forma/theme.css`, `themes/forma/palettes/blue.css`를 `./index.css`보다 먼저 import. `CalendarView.tsx`는 `formaTheme from '@fullcalendar/react/themes/forma'`를 plugins에, CSS import 3줄 삭제. `CalendarView.css`에서 `--fc-classic-today` 줄 삭제.

- [ ] **Step 4: 할 일 체크박스 CSS** — `CalendarView.css`:
  - `.sc-view:not(.sc-view-listWeek) .item-task.item-task`: `border-width: 0`, 바탕 투명, 글자색 `var(--text)` (왼쪽 막대 제거)
  - `.task-check`: `appearance: none`, 13×13px, `border: 1.5px solid var(--fc-event-color)`, `border-radius: 3px`, 흰 바탕(`var(--bg)`), `:checked`는 바탕 `var(--fc-event-color)` + 흰 체크 표시(`::after`), `:focus-visible`은 `outline: 2px solid var(--primary)`, `outline-offset: 1px`
  - 목록 보기 행 규칙은 지난 작업 그대로(테마 기본 행)

- [ ] **Step 5: 통과 확인 (test-writer)**
  Run: `cd frontend && pnpm test && pnpm test:e2e && pnpm build`
  Expected: 단위 88 PASS, e2e 15 PASS(기존 10 + 신규 5), 빌드 성공

- [ ] **Step 6: 커밋**
  ```bash
  git add frontend/src/main.tsx frontend/src/calendar frontend/e2e/theme.spec.ts
  git commit -m "feat(frontend): Forma theme for the calendar, tasks as calendar-colored checkboxes"
  ```

---

### Task 2: 앱 변수를 Forma에 연결하고 나머지 화면 맞추기

**Files:**
- Modify: `frontend/src/index.css`, `frontend/src/App.css`, `frontend/src/components/Sidebar.css`, `frontend/src/components/QuickCreatePopover.css`, `frontend/src/components/Toast.css`
- Test: `frontend/e2e/theme.spec.ts`

**Interfaces:**
- Consumes: Task 1의 `:root` `--fc-forma-*` 변수
- Produces: 앱 변수 `--bg`, `--panel`, `--line`, `--text`, `--muted`, `--primary`, `--danger`, `--radius`(4px). 이후 테마 기능은 `<html data-color-scheme>`만 바꾼다

- [ ] **Step 1: 실패하는 e2e 추가 (test-writer)** — `theme.spec.ts`에:
  - `test('앱 색이 Forma 기준이다')`: `openApp` 후 — `body`의 `color`가 `'rgb(3, 7, 18)'`(`#030712`), `.sidebar`의 `border-right-color`가 `'rgb(224, 224, 224)'`(`#E0E0E0`)
  - `test('주요 버튼은 Forma 파랑, 모서리 4px')`: 빈 하루 종일 칸 클릭으로 빠른 생성 팝오버 열기 → `getByRole('dialog', { name: '새 항목' })`의 `background-color` `'rgb(255, 255, 255)'`, `border-radius` `'4px'`; 그 안 저장 버튼(`button.primary`)의 `background-color` `'rgb(15, 108, 189)'`
  - `test('다크 표시를 붙이면 앱 색이 함께 바뀐다')`: `document.documentElement.setAttribute('data-color-scheme', 'dark')` 후 `body`의 `background-color`가 `'rgb(3, 7, 18)'`, `color`가 `'rgb(255, 255, 255)'`
  - `test('오류 토스트는 바탕과 구분된다')`: `page.route('**/api/items**', r => r.fulfill({ status: 500, contentType: 'application/problem+json', body: '{"status":500,"title":"Internal Server Error"}' }))` 후 항목 생성 시도 → `getByRole('alert')`의 `background-color`가 `body` 배경과 다르고 `border-radius` `'4px'`

- [ ] **Step 2: 실패 확인 (test-writer)**
  Run: `cd frontend && pnpm exec playwright test e2e/theme.spec.ts`
  Expected: Task 2 신규 4개 FAIL(현재 `--text #1f2328`, `--line #e3e3e6`, 반경 10px/6px, 다크 무반응), Task 1 테스트는 PASS

- [ ] **Step 3: `index.css` 변수 연결** — `:root`에서 `--bg: var(--fc-forma-background)`, `--panel: var(--fc-forma-faint)`, `--line: var(--fc-forma-border)`, `--text: var(--fc-forma-foreground)`, `--muted: var(--fc-forma-muted-foreground)`, `--primary: var(--fc-forma-primary)`, `--radius: 4px`, `--danger`는 `#d64545` 유지. `body`에 `background: var(--bg); color: var(--text)`. `button`·`input/select/textarea`의 `#fff` → `var(--bg)`, 반경 → `var(--radius)`, `button:hover` 바탕 `var(--fc-forma-faint)`, `button.primary:hover` `var(--fc-forma-primary-over)`. `.sidebar` 바탕 `--panel` 위에 `--bg` 대비가 옅게 유지되는지 확인.

- [ ] **Step 4: 컴포넌트 CSS** — `App.css` `.modal`, `QuickCreatePopover.css` `.popover`: 바탕 `var(--bg)`, 반경 `var(--radius)`, 그림자는 옅게. `.palette-swatch` 안쪽 테두리 `#fff` → `var(--bg)`. `Toast.css`: 반경 `var(--radius)`, 바탕 빨강 유지(`#b91c1c` → `var(--danger)` 계열로 통일 가능, 글자 흰색). `Sidebar.css`: 줄 높이·간격은 그대로, 선 색만 변수.

- [ ] **Step 5: 통과 확인 + 겉모습 확인 (test-writer + 메인)**
  Run: `cd frontend && pnpm test && pnpm test:e2e --repeat-each=2 && pnpm build`
  Expected: 단위 88 PASS, e2e 19×2 PASS, 빌드 성공. 메인이 주·월·목록 보기와 편집 대화상자·팝오버를 같은 데이터로 스크린샷 찍어 비교 화면(visual companion)으로 사용자에게 보여 준다.

- [ ] **Step 6: 커밋**
  ```bash
  git add frontend/src frontend/e2e/theme.spec.ts
  git commit -m "feat(frontend): app colors follow Forma variables across sidebar, dialogs and toasts"
  ```
