# FullCalendar v7 업그레이드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 이 프로젝트의 분담: 테스트 작성·실행은 `test-writer` 서브에이전트, 제품 코드 구현과 커밋은 메인 세션.

**Goal:** `@fullcalendar/*` 6.1.22를 `@fullcalendar/react` 7.1.5(Classic 테마)로 올리되, 화면과 동작은 지금과 같게 유지한다.

**Architecture:** FullCalendar를 직접 만지는 곳은 `src/calendar/`(CalendarView·adapter·CSS)와 e2e뿐이다. Task 1에서 의존성·옵션·어댑터를 v7 API로 옮겨 단위 테스트를 통과시키고, Task 2에서 v7이 없앤 `.fc-*` 클래스 대신 우리가 v7 class 옵션으로 붙이는 `sc-*` 훅 클래스를 기준으로 e2e를 다시 쓴다.

**Tech Stack:** React 19, TypeScript, Vite, pnpm, `@fullcalendar/react` 7.1.5, `temporal-polyfill`, Vitest + Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-11-23-fullcalendar-v7-upgrade-design.md`

## Global Constraints

- 버전: `@fullcalendar/react` **7.1.5** 고정(`^` 없이), peer `temporal-polyfill` `^1.0.7`. `@fullcalendar/core`·`daygrid`·`timegrid`·`list`·`interaction`은 `package.json`에서 제거 (v7에서 `@fullcalendar/react`가 core를 직접 의존)
- 테마: Classic — `@fullcalendar/react/themes/classic` 플러그인 + `@fullcalendar/react/skeleton.css` + `themes/classic/theme.css` + `themes/classic/palette.css`
- import 경로: `@fullcalendar/react/daygrid`, `/timegrid`, `/list`, `/interaction`, 로케일 `@fullcalendar/react/locales/ko`, 타입은 `@fullcalendar/react`에서
- 한국어 표시 유지: 버튼 `오늘`·`주`·`월`·`목록`, 종일 줄 `하루 종일`, 월요일 시작(`firstDay: 1`)
- 우리 스타일 훅 클래스 이름 유지: `item-event`, `item-task`, `is-done`, `is-overdue`, `task-content`, `task-check`, `task-time`, `task-title`, `overdue-badge`
- 사이드바·대화상자·API·백엔드는 건드리지 않는다
- 테스트를 통과시키려고 검증 내용을 약하게 만들지 않는다 (선택자만 바꾸고 확인하는 사실은 그대로)

## Review Focus

1. **OS가 다크 모드일 때** — v7 테마는 다크 모드를 지원하지만 앱의 나머지는 밝은 색뿐이다. 달력도 밝게 남아야 한다 → `colorScheme="light"` 명시, Task 1 단위 테스트로 고정
2. **한국어 라벨이 v7 옵션 변경으로 영어/대문자로 바뀌는 경우** (`buttonText` 제거, `allDayText` 대문자화) → Task 1 단위 테스트로 버튼 4개와 `하루 종일` 확인
3. **목록 보기의 할 일** — v7에서 목록 보기 `eventContent`가 그려지는 위치가 바뀌었다. 목록 보기에서도 할 일 체크박스가 보이고 눌러야 한다 → Task 2 e2e에 추가
4. **시간 있는 할 일 크기 조절** — `durationEditable: false`가 v7에서도 지켜져 할 일은 30분 블록 그대로여야 한다 → Task 1 adapter 테스트에서 값 확인(기존), Task 2 e2e는 기존 범위 유지
5. **드래그 실패 시 되돌림** — 저장이 실패하면 `info.revert()`로 원위치. v7 `EventChangeInfo.revert`가 그대로 있으므로 코드 경로 유지, 기존 단위 테스트 범위 유지

---

### Task 1: 의존성·옵션·어댑터를 v7으로 옮기기 (Classic 테마)

**Files:**
- Modify: `frontend/package.json`, `frontend/pnpm-lock.yaml`
- Modify: `frontend/src/calendar/CalendarView.tsx`
- Modify: `frontend/src/calendar/adapter.ts`
- Modify: `frontend/src/calendar/CalendarView.css`
- Test: `frontend/src/calendar/adapter.test.ts`, `frontend/src/calendar/CalendarView.test.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `itemsToEvents()`가 내는 `EventInput`의 모양이 바뀐다 — 색은 `color: string`(일정·할 일 모두 캘린더 색), 클래스는 `className: string`(공백 구분, 예: `'item-task is-done'`). `backgroundColor`·`borderColor`·`classNames`는 더 이상 없다. `CalendarView`의 Props는 그대로.

- [ ] **Step 1: 실패하는 테스트로 바꾸기 (test-writer)**

`adapter.test.ts`의 기존 단언 5곳을 새 필드로 바꾼다.
- `expect(e.backgroundColor).toBe('#4a7bd8')` → `expect(e.color).toBe('#4a7bd8')`
- `expect(e.classNames).toContain('item-task')` 류 → `expect(e.className?.split(' ')).toContain('item-task')` (`is-done`, `is-overdue`도 같은 방식)
- 할 일 이벤트에는 `backgroundColor`가 없어야 한다: `expect(e).not.toHaveProperty('backgroundColor')`

`CalendarView.test.tsx`: 타입 import를 `import type { EventInput } from '@fullcalendar/react'`로 바꾸고, 테스트 3개 추가.
- `test('한국어 툴바 버튼')`: `getByRole('button', { name: '오늘' })`, `'주'`, `'월'`, `'목록'`이 각각 존재 (`exact: true`)
- `test('종일 줄 라벨은 하루 종일')`: `await screen.findByText('하루 종일')` 존재
- `test('OS 다크 모드여도 밝은 색 테마')`: 렌더한 컨테이너 안에 `[data-color-scheme="light"]` 요소가 있다

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && pnpm test src/calendar`
Expected: FAIL — adapter 단언(`color` undefined), 다크 모드 테스트(속성 없음). 한국어 라벨 테스트는 v6에서도 통과할 수 있다(회귀 방지용).

- [ ] **Step 3: 의존성 교체**

Run: `cd frontend && pnpm remove @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/list @fullcalendar/interaction && pnpm add -E @fullcalendar/react@7.1.5 && pnpm add temporal-polyfill@^1.0.7`
Expected: `package.json`의 dependencies에 `@fullcalendar/react: "7.1.5"`, `temporal-polyfill` 만 남음

- [ ] **Step 4: `adapter.ts`를 v7 EventInput으로**

`EventInput` 타입을 `@fullcalendar/react`에서 import. 모든 분기에서 `backgroundColor`/`borderColor` → `color: <캘린더 색>`, `classNames: [...]` → `className: '...'`. 할 일의 "투명 배경 + 왼쪽 색 테두리"는 이제 CSS가 `--fc-event-color`로 그린다(Step 6). 분기 로직·`sortRank`·`durationEditable: false`는 그대로.

- [ ] **Step 5: `CalendarView.tsx`를 v7 옵션으로**

- import: `FullCalendar from '@fullcalendar/react'`, 플러그인 4개는 `@fullcalendar/react/{daygrid,timegrid,list,interaction}`, `classicTheme from '@fullcalendar/react/themes/classic'`, `koLocale from '@fullcalendar/react/locales/ko'`, CSS 3개(skeleton → theme → palette 순서, 그다음 `./CalendarView.css`)
- 타입: `EventClickInfo`, `EventChangeInfo`, `EventDisplayInfo`(eventContent 인자), `DateClickInfo`, `EventInput` — 모두 `@fullcalendar/react`
- `plugins`에 `classicTheme` 추가
- `headerToolbar={{ start: 'prev,next today', center: 'title', end: 'timeGridWeek,dayGridMonth,listWeek' }}`
- `buttonText` 삭제 → `todayText="오늘"` + `buttons={{ timeGridWeek: { text: '주' }, dayGridMonth: { text: '월' }, listWeek: { text: '목록' } }}`
- `allDayText="하루 종일"` 유지; 대문자화·줄바꿈 처리로 바뀌어 보이면 `allDayHeaderContent={() => '하루 종일'}`로 고정
- `colorScheme="light"` 추가
- `eventContent`의 `return true`(일정 기본 표시)가 v7에서 빈 칸이 되면 `undefined` 반환으로 바꾼다 — 일정 제목이 보이는지는 Step 7에서 확인
- `nowIndicator`, `editable`, `selectable={false}`, `eventOrder`, `height="100%"`, `firstDay={1}`, 콜백 연결은 그대로

- [ ] **Step 6: `CalendarView.css`에서 `.fc` 선택자 없애기**

`.fc .item-task …` → `.item-task …`처럼 우리 클래스만으로 쓴다. 할 일: 배경 투명, 왼쪽 3px 테두리 색 `var(--fc-event-color)`, 글자색 `var(--text)`. `.fc-event-main`·`.fc-list` 선택자는 v7에 없으니 제거하고, 목록 보기 패딩 차이가 생기면 Task 2에서 `listItemEventClass` 등으로 처리. 오늘 칸 배경은 `--fc-classic-today` 계열 변수로 지금 값(`rgb(74 123 216 / 0.06)`) 유지.

- [ ] **Step 7: 통과 확인 (test-writer)**

Run: `cd frontend && pnpm test && pnpm build`
Expected: 단위 테스트 전부 PASS(기존 78 + 신규 3), 타입 체크·빌드 성공. e2e는 Task 2 전이라 실패해도 된다.

- [ ] **Step 8: 커밋**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/src/calendar
git commit -m "chore(frontend): upgrade FullCalendar to v7 with the classic theme"
```

---

### Task 2: e2e를 테마와 무관한 훅 클래스로 다시 쓰기

**Files:**
- Modify: `frontend/src/calendar/CalendarView.tsx` (class 옵션 추가)
- Modify: `frontend/e2e/helpers.ts`, `frontend/e2e/calendar.spec.ts`
- Test: `frontend/src/calendar/CalendarView.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `className` 규칙 (`item-event`, `item-task`, `is-done`, `is-overdue`)
- Produces: e2e가 기대는 훅 클래스 — 다음 단계(테마 교체)에서도 그대로 유지돼야 한다
  - 보기 루트: `sc-view sc-view-<view.type>` (예: `sc-view-timeGridWeek`, `sc-view-dayGridMonth`, `sc-view-listWeek`) — `viewClass`
  - 주 보기 열 머리글: `sc-day-header` — `dayHeaderClass`
  - 날짜 칸(월 보기 칸, 주 보기 하루 종일 줄): `sc-day-cell` — `dayCellClass`
  - 시간 줄: `sc-slot` — `slotLaneClass`
  - 날짜·시간은 v7이 그 요소에 붙이는 `data-date="YYYY-MM-DD"` / `data-time="HH:mm:ss"`로 고른다. 어떤 요소에 속성이 없으면 그 훅 클래스에 `sc-date-YYYY-MM-DD` / `sc-time-HHmm`를 함께 붙여 대신 쓴다(DOM 확인 후 결정, helpers 주석에 기록)

- [ ] **Step 1: v7 DOM 확인**

Run: `cd frontend && pnpm dev` 후 Playwright MCP 또는 개발자 도구로 주 보기의 열 머리글·하루 종일 칸·시간 줄·이벤트 요소를 열어, 위 훅 클래스가 붙을 요소와 `data-date`/`data-time` 유무를 확인한다.
Expected: 각 훅이 붙을 요소와 날짜·시간을 고르는 방법이 정해짐

- [ ] **Step 2: 실패하는 테스트로 바꾸기 (test-writer)**

`CalendarView.test.tsx`에 `test('보기 루트에 훅 클래스')`: 렌더 후 `container.querySelector('.sc-view-timeGridWeek')`가 존재.

`helpers.ts` 선택자 교체:
- `waitForApp`: `.fc-timegrid` → `.sc-view-timeGridWeek`
- `columnCenterX`: `th.fc-col-header-cell[data-date=…]` → `.sc-day-header[data-date="${date}"]`
- `allDayCell`: `.fc-timegrid .fc-daygrid-day[data-date=…]` → `.sc-view-timeGridWeek .sc-day-cell[data-date="${date}"]`

`calendar.spec.ts` 선택자 교체 (확인하는 사실은 그대로):
- `.fc-timegrid-event` → `.sc-view-timeGridWeek .item-event`, 할 일이면 `.item-task`
- `td.fc-timegrid-slot-lane[data-time="14:00:00"]` → `.sc-slot[data-time="14:00:00"]`
- `.fc-dayGridMonth-view` / `.fc-list` / `.fc-timeGridWeek-view` → `.sc-view-dayGridMonth` / `.sc-view-listWeek` / `.sc-view-timeGridWeek`
- `.fc` (숨김 테스트 범위) → `.sc-view`
- `.fc-time`, `.fc-day` 사용처도 같은 원칙으로 훅 클래스 기준
- 새 테스트 `test('목록 보기에서도 할 일 체크박스로 완료한다')`: 할 일을 seed → `목록` 버튼 → `getByRole('checkbox', { name: '<제목> 완료' })` 클릭 → 새로고침 후에도 checked, 편집 대화상자(`getByRole('dialog')`)는 열리지 않음

- [ ] **Step 3: 실패 확인**

Run: `cd frontend && pnpm test src/calendar && pnpm test:e2e`
Expected: 단위 `보기 루트에 훅 클래스` FAIL, e2e는 훅 클래스가 없어 전부 FAIL

- [ ] **Step 4: `CalendarView.tsx`에 class 옵션 추가**

`viewClass={(i) => \`sc-view sc-view-${i.view.type}\`}`, `dayHeaderClass="sc-day-header"`, `dayCellClass="sc-day-cell"`, `slotLaneClass="sc-slot"` (Step 1 결과에 따라 날짜·시간 클래스 덧붙임). 목록 보기에서 할 일 내용의 정렬·패딩이 v6와 다르면 여기서 `listItemEventClass` 등으로 맞춘다.

- [ ] **Step 5: 통과 확인 (test-writer)**

Run: `cd frontend && pnpm test && pnpm test:e2e && pnpm build`
Expected: 단위 전부 PASS(82), e2e 전부 PASS(기존 8 + 신규 1), 빌드 성공

- [ ] **Step 6: 겉모습 비교**

v6(main)과 이 브랜치에서 주·월·목록 보기를 같은 데이터로 스크린샷 찍어 비교한다(Playwright MCP, 오늘 2026-11-25 고정). 버튼 색·격자선·오늘 칸·일정/할 일/밀린 배지 모양이 사실상 같아야 한다. 차이가 있으면 `CalendarView.css` 또는 `--fc-classic-*` 변수로 맞추고 남는 차이는 PR/보고에 적는다.

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/calendar frontend/e2e
git commit -m "test(frontend): select calendar elements by our own hook classes for v7"
```
