# simple-cal 프론트엔드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캘린더별로 일정과 할 일을 함께 담아 주간 격자에 섞어 보여주는 개인용 일정 웹앱 프론트엔드를, 개발 모드에서 MSW 가짜 API로 동작하게 만든다.

**Architecture:** 화면은 처음부터 `fetch('/api/...')`로 REST API를 호출하고, 개발 모드에서는 MSW 핸들러가 `localStorage` 기반 가짜 DB로 응답한다. 서버 상태는 TanStack Query가 캐싱하며 수정은 낙관적으로 반영하고 실패 시 되돌린다. Item ↔ FullCalendar 이벤트 변환(배타적 끝 날짜, 밀린 할 일 재배치, 드래그 결과 → PATCH)은 순수 함수 어댑터 한 곳에 모아 집중적으로 테스트한다.

**Tech Stack:** React + TypeScript + Vite, FullCalendar v6 (`@fullcalendar/react`, `daygrid`, `timegrid`, `list`, `interaction`, `core/locales/ko`), MSW v2, @tanstack/react-query v5, Vitest + @testing-library/react + jsdom, 일반 CSS(컴포넌트별 `.css` 파일).

**Spec:** `docs/superpowers/specs/2026-11-22-simple-cal-design.md` — 각 태스크 시작 전 함께 읽을 것.

## Global Constraints

- 모든 코드는 `simple-cal/frontend/` 안에. git 저장소 루트는 `simple-cal/`. 작업은 `main`이 아닌 `feat/frontend` 브랜치에서.
- 모든 사용자 노출 문구는 한국어.
- 날짜는 `YYYY-MM-DD`, 시간은 `HH:mm` 문자열. 시간대 변환 없음 — 로컬 벽시계 시각. `Date` → 문자열 변환은 반드시 `lib/dates.ts`의 로컬 기준 함수로(절대 `toISOString()` 사용 금지 — UTC로 날짜가 밀림).
- 날짜 범위는 모두 포함(inclusive). `endDate`는 마지막 날 자체. FullCalendar 배타적 끝과의 변환은 `src/calendar/adapter.ts`에서만.
- 해당 타입에 쓰지 않는 필드는 `null` (이벤트의 `done`은 `false`; 할 일의 `endDate`/`endTime`은 `null`).
- PATCH: 빠진 필드 = 그대로, `null` = 비움.
- 오류 응답: 4xx/5xx + `{ "message": string }`.
- 일정 기본 길이 1시간, 시간 있는 할 일 표시 높이 30분.
- MSW는 `import.meta.env.DEV`일 때만 시작. 데이터 이전 기능 없음.
- 비목표(만들지 말 것): 연간/사용자 지정 기간 보기, 로그인, 반복, 알림, 외부 캘린더 동기화.

## Review Focus

1. 여러 날 하루 종일 일정(예: 11-27~11-29)이 마지막 날(29일) 칸까지 보이고 30일엔 안 보여야 한다 — 배타적 끝 변환 오류가 가장 흔한 버그. (Task 4 테스트)
2. 23:30에 시작하는 일정을 새로 만들거나 하루 종일 줄에서 23:30으로 끌어오면 끝은 다음 날 00:30(`endDate`=다음 날)이어야 한다, 같은 날 00:30이 아니라. (Task 1, Task 4 테스트)
3. 밀린 할 일을 오늘 줄에서 체크하면 오늘 줄에서 사라지고 원래 날짜에 완료 상태로 나타나야 하며, 숨긴 캘린더의 밀린 할 일은 오늘 줄에도 나오면 안 된다. (Task 4 테스트)
4. 캘린더가 하나도 없거나 모두 숨겨진 상태에서 빈 칸을 클릭해도 깨지지 않아야 한다 — 빠른 입력 창은 캘린더 선택지가 비면 "먼저 캘린더를 만들어 주세요"를 보여주고 저장을 막는다. 숨긴 캘린더도 선택지에는 포함. (Task 7 테스트)
5. 끝이 시작보다 이른 일정(편집 창에서 종료 시간을 앞으로 당김)은 저장되면 안 된다 — 편집 창이 메시지를 보이고 API도 400. (Task 1, 2, 7 테스트)

---

## File Structure

```
frontend/
├── index.html, package.json, vite.config.ts, tsconfig*.json
├── public/mockServiceWorker.js          (npx msw init 생성물)
└── src/
    ├── main.tsx                         개발 모드면 MSW 시작 후 렌더
    ├── App.tsx / App.css                레이아웃·상태 조합
    ├── types.ts                         Calendar, Item 및 입력/패치 타입
    ├── lib/dates.ts                     로컬 날짜·시간 계산
    ├── lib/validateItem.ts              Item 유효성 검사 (MSW·편집 창 공용)
    ├── lib/errorBus.ts                  전역 오류 알림 pub/sub
    ├── mocks/db.ts                      localStorage 가짜 DB
    ├── mocks/handlers.ts                MSW REST 핸들러
    ├── mocks/browser.ts                 setupWorker
    ├── api/client.ts                    fetch 래퍼, ApiError
    ├── api/calendars.ts, api/items.ts   엔드포인트 함수
    ├── hooks/useCalendars.ts, hooks/useItems.ts   TanStack Query 훅
    ├── calendar/adapter.ts              Item ↔ FullCalendar 변환
    ├── calendar/CalendarView.tsx/.css   FullCalendar 래퍼
    └── components/
        ├── Sidebar.tsx/.css
        ├── CalendarFormDialog.tsx
        ├── QuickCreatePopover.tsx/.css
        ├── ItemEditDialog.tsx/.css
        └── Toast.tsx/.css
```

테스트는 대상 파일 옆에 `*.test.ts(x)`.

---

### Task 1: 프로젝트 골격, 타입, 날짜 유틸, 유효성 검사

**Files:**
- Create: `frontend/` (Vite react-ts 템플릿), `frontend/vitest.setup.ts`
- Create: `frontend/src/types.ts`, `frontend/src/lib/dates.ts`, `frontend/src/lib/validateItem.ts`
- Test: `frontend/src/lib/dates.test.ts`, `frontend/src/lib/validateItem.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type ItemType = 'event' | 'task';
  export interface Calendar { id: string; name: string; color: string; visible: boolean }
  export interface Item {
    id: string; calendarId: string; type: ItemType; title: string;
    memo: string | null; date: string; startTime: string | null;
    endDate: string | null; endTime: string | null; done: boolean;
  }
  export type ItemInput = Omit<Item, 'id'>;
  export type ItemPatch = Partial<ItemInput>;          // null = 비움
  export type CalendarInput = Pick<Calendar, 'name' | 'color'>;
  export type CalendarPatch = Partial<Omit<Calendar, 'id'>>;
  ```
- Produces (`lib/dates.ts`):
  - `todayLocal(now?: Date): string`
  - `toLocalDate(d: Date): string`, `toLocalTime(d: Date): string`
  - `addDays(date: string, n: number): string`
  - `addMinutes(date: string, time: string, minutes: number): { date: string; time: string }` — 자정을 넘으면 날짜도 넘어감
  - `compareDateTime(aDate: string, aTime: string | null, bDate: string, bTime: string | null): number` — 음수/0/양수, 시간 null은 `00:00`
- Produces (`lib/validateItem.ts`): `validateItem(input: ItemInput): string | null` — 오류 메시지(한국어) 또는 null

- [ ] **Step 1: 골격 생성** — 루트에서 `git checkout -b feat/frontend`, `npm create vite@latest frontend -- --template react-ts`, `cd frontend && npm i`, `npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`. `vite.config.ts`에 `test: { environment: 'jsdom', setupFiles: ['./vitest.setup.ts'], globals: true }`, setup 파일은 `import '@testing-library/jest-dom/vitest'`. `package.json`에 `"test": "vitest run"`. 템플릿 데모 코드(App 카운터, 로고 자산)는 지운다.

- [ ] **Step 2: 실패하는 테스트 작성** — `dates.test.ts`:
  ```ts
  test('todayLocal은 로컬 날짜', () => expect(todayLocal(new Date(2026, 10, 22, 23, 59))).toBe('2026-11-22'));
  test('addDays는 월/연 경계를 넘는다', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-12-01', -1)).toBe('2026-11-30');
  });
  test('addMinutes는 자정을 넘으면 날짜도 넘긴다', () =>
    expect(addMinutes('2026-11-22', '23:30', 60)).toEqual({ date: '2026-11-23', time: '00:30' }));
  test('toLocalDate/Time', () => {
    const d = new Date(2026, 0, 5, 9, 7);
    expect(toLocalDate(d)).toBe('2026-01-05'); expect(toLocalTime(d)).toBe('09:07');
  });
  test('compareDateTime', () => {
    expect(compareDateTime('2026-11-22', '10:00', '2026-11-22', '09:00')).toBeGreaterThan(0);
    expect(compareDateTime('2026-11-22', null, '2026-11-22', '00:00')).toBe(0);
  });
  ```
  `validateItem.test.ts` — 기준 이벤트 `{calendarId:'c1', type:'event', title:'회의', memo:null, date:'2026-11-23', startTime:'10:00', endDate:null, endTime:'11:00', done:false}`:
  - 기준 이벤트 → `null`
  - `title: '  '` → `'제목을 입력해 주세요'`
  - `date: '2026/11/23'` → `'날짜 형식이 올바르지 않습니다'`
  - 이벤트 `startTime` 있음 + `endTime: null` → `'종료 시간을 입력해 주세요'`
  - 이벤트 `startTime: null, endTime: '11:00'` → `'시작 시간을 입력해 주세요'`
  - 이벤트 `endTime: '09:00'` (같은 날) → `'종료가 시작보다 빠를 수 없습니다'`
  - 이벤트 `endDate: '2026-11-22'` → `'종료가 시작보다 빠를 수 없습니다'`
  - 이벤트 `startTime:'23:30', endDate:'2026-11-24', endTime:'00:30'` → `null`
  - 할 일 `endTime: '11:00'` 또는 `endDate` 비-null → `'할 일에는 종료를 지정할 수 없습니다'`
  - 하루 종일 이벤트(시작·종료 시간 null, `endDate: '2026-11-25'`) → `null`

- [ ] **Step 3: 실행해 실패 확인** — `npm test` → 모듈 없음으로 FAIL.
- [ ] **Step 4: `types.ts`, `dates.ts`, `validateItem.ts` 구현** — 날짜 계산은 `new Date(y, m-1, d)` 로컬 생성자로; 형식 검사는 `/^\d{4}-\d{2}-\d{2}$/`, `/^\d{2}:\d{2}$/`.
- [ ] **Step 5: 통과 확인** — `npm test` → PASS. `npm run build` 성공.
- [ ] **Step 6: Commit** — `git add frontend && git commit -m "feat(frontend): scaffold Vite app with types, date utils, item validation"`

---

### Task 2: 가짜 DB와 MSW 핸들러

**Files:**
- Create: `frontend/src/mocks/db.ts`, `frontend/src/mocks/handlers.ts`, `frontend/src/mocks/browser.ts`
- Test: `frontend/src/mocks/handlers.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `validateItem`
- Produces:
  - `createDb(storage: Storage, genId?: () => string): Db` — `Db`는 `listCalendars()`, `createCalendar(CalendarInput)`, `updateCalendar(id, CalendarPatch)`, `deleteCalendar(id)`, `listItems(from, to)`, `listOverdue(today)`, `getItem(id)`, `createItem(ItemInput)`, `updateItem(id, ItemPatch)`, `deleteItem(id)`. 존재하지 않는 id는 `undefined`/`false` 반환. 기본 `genId`는 `crypto.randomUUID`.
  - 저장 키 `'simple-cal:db'`, 값 `{ calendars: Calendar[], items: Item[] }`. 키가 없으면 `{name:'내 캘린더', color:'#4a7bd8', visible:true}` 하나로 시드(키가 있으면 빈 목록이어도 시드 안 함).
  - `createHandlers(db: Db): HttpHandler[]` — 스펙 3.4의 9개 엔드포인트. 성공: GET/PATCH 200, POST 201, DELETE 204. 없는 id 404 `{message:'찾을 수 없습니다'}`. 유효성 실패 400 `{message}`.
  - `browser.ts`: `export const worker = setupWorker(...createHandlers(createDb(localStorage)))`

- [ ] **Step 1: 설치** — `npm i -D msw`, `npx msw init public --save`.
- [ ] **Step 2: 실패하는 테스트 작성** — `msw/node`의 `setupServer(...createHandlers(createDb(memoryStorage(), seqId)))`로 `fetch('http://localhost/api/...')` 호출. `memoryStorage()`는 테스트 파일 안의 간단한 `Storage` 구현. 테스트:
  - `첫 실행이면 '내 캘린더'를 시드한다` — GET `/api/calendars` → 길이 1, name `'내 캘린더'`
  - `캘린더 생성·수정` — POST `{name:'회사', color:'#e08a2c'}` → 201, `visible: true`; PATCH `{visible:false}` → name 유지, visible false
  - `캘린더 삭제는 소속 항목도 지운다` — 항목 생성 후 DELETE 캘린더 → 204, 이후 `GET /api/items?from=2026-01-01&to=2026-12-31`에 해당 항목 없음
  - `기간 조회는 겹치는 항목을 포함한다` — `date:'2026-11-20', endDate:'2026-11-24'` 이벤트, `date:'2026-11-30'` 할 일, `date:'2026-11-29'` 할 일. `from=2026-11-23&to=2026-11-29` → 첫째·셋째만
  - `밀린 할 일 조회` — 11-20 미완료 할 일, 11-20 완료 할 일, 11-20 이벤트, 11-22 미완료 할 일; `overdue?today=2026-11-22` → 첫째만
  - `PATCH는 빠진 필드를 유지하고 null은 비운다` — 메모 `'a'`, 시간 있는 할 일에 `{startTime:null}` PATCH → `startTime` null, `memo` `'a'` 유지
  - `PATCH 결과가 유효하지 않으면 400` — 이벤트에 `{endTime:'09:00'}`(시작 10:00) → 400, body.message `'종료가 시작보다 빠를 수 없습니다'`, 저장값 변경 없음
  - `없는 캘린더로 생성하면 400` — `calendarId:'nope'` → 400 `'캘린더를 찾을 수 없습니다'`
  - `없는 항목 PATCH는 404`
  - `새로 만든 db는 localStorage에서 복원된다` — 같은 storage로 `createDb`를 두 번, 두 번째에서 첫 번째가 만든 캘린더가 보임
- [ ] **Step 3: 실패 확인** — `npm test -- handlers` → FAIL.
- [ ] **Step 4: `db.ts`, `handlers.ts`, `browser.ts` 구현** — 모든 변경 후 storage에 저장. PATCH는 `{...existing, ...patch}` 병합 후 `validateItem`(`id` 제외)으로 검사.
- [ ] **Step 5: 통과 확인** — `npm test` → PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(frontend): add localStorage mock DB and MSW REST handlers"`

---

### Task 3: API 클라이언트, 쿼리 훅, 오류 알림 버스

**Files:**
- Create: `frontend/src/api/client.ts`, `frontend/src/api/calendars.ts`, `frontend/src/api/items.ts`, `frontend/src/lib/errorBus.ts`, `frontend/src/hooks/useCalendars.ts`, `frontend/src/hooks/useItems.ts`
- Test: `frontend/src/api/client.test.ts`, `frontend/src/hooks/useItems.test.tsx`

**Interfaces:**
- Consumes: `types.ts`, `createDb`/`createHandlers` (테스트용)
- Produces:
  - `class ApiError extends Error { status: number }`; `apiRequest<T>(method: 'GET'|'POST'|'PATCH'|'DELETE', path: string, body?: unknown): Promise<T>` — `API_BASE = import.meta.env.VITE_API_BASE ?? ''`를 앞에 붙임; 비-2xx면 응답 `message`(없으면 `'요청에 실패했습니다'`)로 `ApiError`; 204는 `undefined`.
  - `api/calendars.ts`: `fetchCalendars()`, `createCalendar(input)`, `updateCalendar(id, patch)`, `deleteCalendar(id)`
  - `api/items.ts`: `fetchItems(from, to)`, `fetchOverdue(today)`, `createItem(input)`, `updateItem(id, patch)`, `deleteItem(id)`
  - `errorBus.ts`: `reportError(message: string): void`, `subscribeErrors(fn: (message: string) => void): () => void`
  - `useCalendars(): UseQueryResult<Calendar[]>` (key `['calendars']`), `useCalendarMutations(): { create, update, remove }` — 각각 `mutateAsync` 형태의 함수 `(input) / (id, patch) / (id) => Promise`
  - `useItems(from: string, to: string)` (key `['items', from, to]`), `useOverdue(today: string)` (key `['overdue', today]`), `useItemMutations(): { create, update, remove }`
  - 낙관적 갱신: `update`(항목·캘린더 모두)는 `onMutate`에서 해당 id를 모든 `['items']`/`['overdue']`(또는 `['calendars']`) 캐시에 패치 적용, `onError`에서 스냅샷 복원 + `reportError(err.message)`, `onSettled`에서 `['items']`, `['overdue']` 무효화(캘린더 삭제 시에도). `create`/`remove`는 비낙관적, 실패 시 `reportError`.
  - `createQueryClient(): QueryClient` (`hooks/useItems.ts`에서 export, `retry: false` for mutations)

- [ ] **Step 1: 설치** — `npm i @tanstack/react-query`.
- [ ] **Step 2: 실패하는 테스트 작성** —
  - `client.test.ts`: MSW node 서버에 임시 핸들러. `400 {message:'x'}` → `ApiError` with `status 400`, `message 'x'`; 본문 없는 500 → `message '요청에 실패했습니다'`; 204 → `undefined`.
  - `useItems.test.tsx` (Task 2 핸들러를 쓰는 MSW 서버 + `QueryClientProvider` 래퍼, `renderHook`):
    - `update는 서버 응답 전에 캐시에 반영된다` — 서버 핸들러를 지연(`delay(50)`)시키고 `update(id, {done:true})` 호출 직후 `useItems` 결과의 해당 항목 `done === true`
    - `update 실패 시 원래 값으로 되돌리고 오류를 알린다` — PATCH가 500 `{message:'서버 오류'}`를 주도록 `server.use` 재정의; 완료 후 `done === false`, `subscribeErrors` 리스너가 `'서버 오류'`를 받음
    - `밀린 할 일 완료 후 overdue 쿼리가 다시 조회된다` — 완료 후 `useOverdue('2026-11-22')` 결과에서 사라짐
- [ ] **Step 3: 실패 확인** — `npm test` → FAIL.
- [ ] **Step 4: 구현**
- [ ] **Step 5: 통과 확인** — `npm test` → PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(frontend): add API client, query hooks with optimistic updates, error bus"`

---

### Task 4: FullCalendar 어댑터 (순수 함수)

**Files:**
- Create: `frontend/src/calendar/adapter.ts`
- Test: `frontend/src/calendar/adapter.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `lib/dates.ts`
- Produces:
  - `type ItemEventProps = { item: Item; overdueFrom: string | null }`
  - `itemsToEvents(items: Item[], overdue: Item[], calendars: Calendar[], today: string): EventInput[]`
    - 보이는(`visible`) 캘린더 항목만. `id`는 item.id, `extendedProps: ItemEventProps`.
    - 이벤트: 시간 있음 → `start: '${date}T${startTime}'`, `end: '${endDate ?? date}T${endTime}'`, `allDay:false`; 하루 종일 → `start: date`, `end: addDays(endDate ?? date, 1)`, `allDay:true`. `backgroundColor`/`borderColor` = 캘린더 색. `classNames: ['item-event']`.
    - 할 일: 시간 있음 → `start` 위와 같고 `end` = +30분(`addMinutes`), `durationEditable:false`; 없음 → `allDay:true`, `start: date`. `backgroundColor:'transparent'`, `borderColor` = 캘린더 색, `classNames: ['item-task', done ? 'is-done' : null]`(null 제외).
    - 밀린 할 일: `items` 안의 `type==='task' && !done && date < today` 항목은 원래 자리에서 빼고, `overdue` 목록(보이는 캘린더만)을 `start: today, allDay:true, overdueFrom: item.date, classNames에 'is-overdue'`로 추가. 같은 id가 둘 다에 있어도 한 번만.
  - `changeToPatch(item: Item, change: { start: Date; end: Date | null; allDay: boolean }): ItemPatch`
    - `allDay:true` → `date = toLocalDate(start)`, `startTime:null`, `endTime:null`; 이벤트면 `endDate = end ? addDays(toLocalDate(end), -1) : null`, 결과가 `date`와 같으면 `null`.
    - `allDay:false` → `date`, `startTime = toLocalTime(start)`; 할 일이면 `endDate:null, endTime:null`; 이벤트면 끝 = `item.startTime === null || end === null ? addMinutes(date, startTime, 60) : end`의 로컬 날짜·시간, `endDate`는 `date`와 같으면 `null`.
    - 밀린 할 일을 끌어 옮긴 경우도 같은 규칙(새 날짜가 그대로 `date`).
  - `convertTypePatch(item: Item, to: ItemType): ItemPatch` — 같은 타입이면 `{}`. → task: `{type:'task', endDate:null, endTime:null, done:false}`. → event: 시간 있으면 `{type:'event', done:false, ...addMinutes(...)를 endDate(같은 날이면 null)/endTime로}`, 없으면 `{type:'event', done:false, endDate:null, endTime:null}`.

- [ ] **Step 1: 실패하는 테스트 작성** — 캘린더 `c1`(#4a7bd8, visible), `c2`(hidden), today `'2026-11-25'`:
  - `시간 있는 일정 변환` → `start '2026-11-23T10:00'`, `end '2026-11-23T11:00'`, `allDay false`, `backgroundColor '#4a7bd8'`
  - `여러 날 하루 종일 일정은 마지막 날 다음 날을 end로 준다` — `date 11-27, endDate 11-29` → `end '2026-11-30'`
  - `자정 넘는 일정` — `date 11-23 23:30, endDate 11-24, endTime 00:30` → `end '2026-11-24T00:30'`
  - `시간 있는 할 일은 30분 블록, 길이 조절 불가` → `end '...T15:30'`, `durationEditable false`, classNames에 `'item-task'`
  - `완료한 할 일은 is-done 클래스`
  - `숨긴 캘린더 항목은 제외` — c2 항목 → 결과 없음
  - `밀린 할 일은 오늘 하루 종일 줄로 옮긴다` — items에 `date 11-20` 미완료 할 일, overdue에도 같은 항목 → 결과 1개, `start '2026-11-25'`, `allDay true`, `extendedProps.overdueFrom '2026-11-20'`, classNames에 `'is-overdue'`
  - `완료한 지난 할 일은 원래 날짜에 그대로` — `date 11-20, done true` → `start '2026-11-20'`, `overdueFrom null`
  - `숨긴 캘린더의 밀린 할 일은 오늘 줄에도 없다`
  - `changeToPatch: 시간 격자 이동` — 10:00–11:00 이벤트를 `start 2026-11-24 14:00, end 15:00`로 → `{date:'2026-11-24', startTime:'14:00', endDate:null, endTime:'15:00'}`
  - `changeToPatch: 시간 격자 → 하루 종일 줄은 시간을 지운다` → `startTime null, endTime null, endDate null`
  - `changeToPatch: 하루 종일 → 23:30 시간 칸은 다음 날 00:30까지` — 하루 종일 이벤트를 `start 2026-11-24 23:30, end null, allDay false` → `{date:'2026-11-24', startTime:'23:30', endDate:'2026-11-25', endTime:'00:30'}`
  - `changeToPatch: 여러 날 하루 종일 일정 길이 조절` — `start 11-27, end 11-30 (배타적), allDay` → `endDate '2026-11-29'`
  - `changeToPatch: 할 일은 종료를 갖지 않는다` — 하루 종일 할 일을 10:00 칸으로 → `{startTime:'10:00', endDate:null, endTime:null}`
  - `convertTypePatch` — 이벤트→할 일 `{type:'task', endDate:null, endTime:null, done:false}`; 시간 있는 할 일(15:00)→이벤트 `endTime '16:00', endDate null`; 하루 종일 할 일→이벤트 `endTime null`
- [ ] **Step 2: 실패 확인** — `npm test -- adapter` → FAIL.
- [ ] **Step 3: `adapter.ts` 구현** — `npm i @fullcalendar/core`(타입 `EventInput`용).
- [ ] **Step 4: 통과 확인** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(frontend): add FullCalendar adapter for items, drags and type conversion"`

---

### Task 5: 앱 골격 — MSW 개발 모드 시작, 사이드바, 캘린더 관리, 오류 토스트

**Files:**
- Create: `frontend/src/components/Sidebar.tsx/.css`, `frontend/src/components/CalendarFormDialog.tsx`, `frontend/src/components/Toast.tsx/.css`
- Modify: `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/App.css`, `frontend/vite.config.ts`
- Test: `frontend/src/components/Sidebar.test.tsx`, `frontend/src/components/CalendarFormDialog.test.tsx`, `frontend/src/components/Toast.test.tsx`

**Interfaces:**
- Consumes: `useCalendars`, `useCalendarMutations`, `createQueryClient`, `subscribeErrors`, `worker`
- Produces:
  - `Sidebar({ calendars, onToggle(id: string, visible: boolean), onCreate(), onEdit(calendar: Calendar) })` — 제목 `'내 캘린더'`, `＋` 버튼(`aria-label="캘린더 추가"`), 각 행: 체크박스(`aria-label` = 캘린더 이름), 색 사각형, 이름, `⋯` 버튼(`aria-label="{이름} 편집"`).
  - `CalendarFormDialog({ initial?: Calendar, onSubmit(input: CalendarInput), onDelete?(): void, onClose() })` — 이름 입력, 색은 팔레트 16색(`#4a7bd8 #3aa66a #e08a2c #d64545 #8e5bd8 #2a9d9d #c2569b #6b7280 #1e40af #15803d #ca8a04 #9f1239 #5b21b6 #0891b2 #db2777 #92400e` — 모두 흰 글자가 읽히는 진하기, 4열×4행 배치) + `<input type="color">`. 빈 이름이면 `'이름을 입력해 주세요'`, 저장 막음. 삭제는 `window.confirm('캘린더와 안의 일정·할 일이 모두 삭제됩니다. 삭제할까요?')` 확인 후 `onDelete`.
  - `Toast()` — `subscribeErrors`로 받은 메시지를 `role="alert"`로 4초 표시.
  - `App` — 2단 레이아웃(사이드바 220px + 본문). 이 태스크에서는 본문 자리 비워 둠(Task 6이 채움).
  - `main.tsx`: `if (import.meta.env.DEV && import.meta.env.VITE_MOCK !== 'off') { const { worker } = await import('./mocks/browser'); await worker.start({ onUnhandledRequest: 'bypass' }); }` 후 `QueryClientProvider`로 렌더.
  - `vite.config.ts`: `server.proxy['/api'] = process.env.VITE_API_TARGET ?? 'http://localhost:8080'` (MSW가 켜져 있으면 가로채므로 무해; 백엔드 연결 대비).

- [ ] **Step 1: 실패하는 테스트 작성** —
  - `Sidebar`: 두 캘린더 렌더 → 체크박스 `'회사'` 클릭 시 `onToggle('c1', false)`; `'캘린더 추가'` 클릭 시 `onCreate`; `'회사 편집'` 클릭 시 `onEdit(cal)`
  - `CalendarFormDialog`: 이름 비우고 저장 → `'이름을 입력해 주세요'` 보이고 `onSubmit` 호출 안 됨; 이름 `'운동'` + 팔레트 `#3aa66a` 선택 후 저장 → `onSubmit({name:'운동', color:'#3aa66a'})`; `confirm`을 `vi.spyOn(window,'confirm').mockReturnValue(true)` 후 삭제 → `onDelete` 호출, `false`면 호출 안 됨
  - `Toast`: `reportError('저장 실패')` → `role="alert"`에 `'저장 실패'`; `vi.useFakeTimers()`로 4초 후 사라짐
- [ ] **Step 2: 실패 확인** — FAIL.
- [ ] **Step 3: 구현** — App에서 사이드바 토글은 `update(id, {visible})`.
- [ ] **Step 4: 통과 확인 + 수동 확인** — `npm test` PASS. `npm run dev` → 사이드바에 `'내 캘린더'`, 캘린더 추가/이름·색 변경/숨김이 새로고침 후에도 유지. 개발자 도구 콘솔에 `[MSW] Mocking enabled.`
- [ ] **Step 5: Commit** — `git commit -m "feat(frontend): app shell with MSW dev mode, sidebar, calendar management, error toast"`

---

### Task 6: 달력 화면 (FullCalendar)

**Files:**
- Create: `frontend/src/calendar/CalendarView.tsx`, `frontend/src/calendar/CalendarView.css`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/calendar/CalendarView.test.tsx`

**Interfaces:**
- Consumes: `itemsToEvents`, `changeToPatch`, `ItemEventProps`, `useItems`, `useOverdue`, `useItemMutations`, `todayLocal`, `toLocalDate`, `toLocalTime`, `addDays`
- Produces:
  - `type Slot = { date: string; startTime: string | null }`
  - `CalendarView({ events: EventInput[], initialDate?: string, onRangeChange(from: string, to: string), onSelectSlot(slot: Slot, anchor: { x: number; y: number }), onItemClick(item: Item), onToggleDone(item: Item), onItemChange(item: Item, change: { start: Date; end: Date | null; allDay: boolean }): Promise<void> })`
  - FullCalendar 설정: 플러그인 daygrid/timegrid/list/interaction, `locale: ko`, `initialView: 'timeGridWeek'`, `firstDay: 1`, `headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth,listWeek' }`, `buttonText: { today:'오늘', week:'주', month:'월', list:'목록' }`, `editable: true`, `selectable: false`, `dateClick`로 빈 칸 처리(`info.allDay`면 `startTime:null`, 아니면 `toLocalTime(info.date)`), `nowIndicator: true`, `height: '100%'`.
  - `datesSet` → `onRangeChange(toLocalDate(start), addDays(toLocalDate(end), -1))`.
  - `eventContent`: 할 일이면 `<input type="checkbox" aria-label="{title} 완료">` + 제목(+ 밀림이면 `<span class="overdue-badge">{M/D}부터</span>`); 체크박스 클릭은 `stopPropagation` 후 `onToggleDone`. 이벤트는 시간 + 제목 기본 형식.
  - `eventDrop`/`eventResize` → `onItemChange(...)`, reject 시 `info.revert()`.
  - CSS: `.item-task` 배경 투명·왼쪽 테두리 3px 캘린더 색·글자색 기본; `.is-done` 줄긋기 + 회색; `.is-overdue .overdue-badge` 작게 빨간색.
  - App: `range` 상태(기본 이번 주) → `useItems(range.from, range.to)`, `useOverdue(today)`, `itemsToEvents(...)`; `onToggleDone(item) = update(item.id, {done: !item.done})`; `onItemChange = update(item.id, changeToPatch(item, change))`. `onSelectSlot`/`onItemClick`은 Task 7 전까지 no-op.

- [ ] **Step 1: 설치** — `npm i @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/list @fullcalendar/interaction`.
- [ ] **Step 2: 실패하는 테스트 작성** — `initialDate="2026-11-25"`, 하루 종일 할 일 `'보고서'` 하나(`itemsToEvents`로 만든 이벤트):
  - `할 일은 체크박스와 함께 보인다` — `getByRole('checkbox', {name:'보고서 완료'})`
  - `체크박스 클릭은 완료 토글만 하고 편집을 열지 않는다` — 클릭 → `onToggleDone` 1회, `onItemClick` 0회
  - `제목 클릭은 편집을 연다` — `getByText('보고서')` 클릭 → `onItemClick(item)`
  - `밀린 할 일에는 원래 날짜 배지` — overdueFrom `'2026-11-20'` → `'11/20부터'` 텍스트
  - `처음 표시 범위를 알린다` — `onRangeChange('2026-11-23', '2026-11-29')`
  (jsdom에 `ResizeObserver`가 없으면 `vitest.setup.ts`에 빈 polyfill 추가.)
- [ ] **Step 3: 실패 확인** — FAIL.
- [ ] **Step 4: 구현**
- [ ] **Step 5: 통과 확인 + 수동 확인** — `npm test` PASS. `npm run dev`에서 (빠른 입력 창은 Task 7이므로) 브라우저 콘솔의 `fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...})})`로 일정·할 일·여러 날 일정·지난 미완료 할 일을 넣고 확인: 주간 기본, 주/월/목록 전환, 할 일 체크/줄긋기, 밀린 할 일이 오늘 줄에, 드래그 이동·길이 조절·하루 종일 줄↔시간 칸 이동 후 새로고침해도 유지, 캘린더 숨김 시 사라짐.
- [ ] **Step 6: Commit** — `git commit -m "feat(frontend): week/month/list calendar view with tasks, overdue and drag editing"`

---

### Task 7: 빠른 입력 창과 편집 창

**Files:**
- Create: `frontend/src/components/QuickCreatePopover.tsx/.css`, `frontend/src/components/ItemEditDialog.tsx/.css`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/components/QuickCreatePopover.test.tsx`, `frontend/src/components/ItemEditDialog.test.tsx`

**Interfaces:**
- Consumes: `Slot`, `validateItem`, `convertTypePatch`, `addMinutes`, `useItemMutations`
- Produces:
  - `QuickCreatePopover({ slot: Slot, anchor: {x,y}, calendars: Calendar[], onCreate(input: ItemInput): Promise<void>, onMore(draft: ItemInput), onClose() })`
    - 기본 타입: `slot.startTime`이 있으면 `'event'`, 없으면 `'task'` (내 판단). 기본 캘린더: 첫 번째 보이는 캘린더, 없으면 첫 캘린더. 선택지는 숨긴 것 포함 전체.
    - 초안: 이벤트 + 시간 있음 → `endTime`/`endDate`는 `addMinutes(date, startTime, 60)` (같은 날이면 `endDate:null`).
    - Enter 또는 `'저장'` → `onCreate`, `'자세히'` → `onMore(draft)`, Esc/바깥 클릭 → `onClose`. 캘린더가 0개면 `'먼저 캘린더를 만들어 주세요'`와 비활성 저장 버튼. 제목이 비면 저장 비활성.
  - `ItemEditDialog({ item: Item | null, draft: ItemInput, calendars, onSave(value: ItemInput): Promise<void>, onDelete?(): Promise<void>, onClose() })` — `item`이 null이면 새로 만들기. 필드: 제목, 일정/할 일 전환(전환 시 `convertTypePatch` 적용), 캘린더, 날짜, "하루 종일" 체크(켜면 시작·종료 시간 null, 끄면 09:00 / 이벤트면 10:00), 시작 시간, (이벤트만) 종료 날짜·시간, (할 일만) 완료, 메모. 저장 시 `validateItem` 오류면 메시지를 보이고 `onSave` 안 함. 삭제는 `window.confirm('삭제할까요?')`.
  - App: `onSelectSlot` → 팝오버, `onMore` → 팝오버 닫고 편집 창(draft), `onItemClick` → 편집 창(item); 저장은 새 항목이면 `create`, 기존이면 `update(id, value)`.

- [ ] **Step 1: 실패하는 테스트 작성** —
  - `QuickCreatePopover`:
    - `시간 칸에서는 1시간 일정으로 만든다` — slot `{date:'2026-11-24', startTime:'14:00'}`, 제목 `'1:1'` 입력 후 Enter → `onCreate`에 `{type:'event', calendarId:'c1', date:'2026-11-24', startTime:'14:00', endDate:null, endTime:'15:00', done:false, memo:null}`
    - `23:30 칸에서는 다음 날 00:30까지` → `endDate '2026-11-25', endTime '00:30'`
    - `하루 종일 줄에서는 할 일로 만든다` — `startTime:null` → `type 'task'`, `endTime null`
    - `숨긴 캘린더만 있어도 선택할 수 있다` — calendars 전부 hidden → 첫 캘린더 기본 선택, 저장 가능
    - `캘린더가 없으면 안내하고 저장을 막는다` — `'먼저 캘린더를 만들어 주세요'`, 저장 버튼 disabled
    - `자세히는 초안을 넘긴다` — `onMore`가 입력한 제목 포함 초안으로 호출
  - `ItemEditDialog`:
    - `종료가 시작보다 빠르면 저장하지 않는다` — 10:00–11:00 이벤트의 종료를 `09:00`으로 → `'종료가 시작보다 빠를 수 없습니다'`, `onSave` 0회
    - `일정을 할 일로 바꾸면 종료가 사라지고 완료 체크가 생긴다` — 전환 후 저장 → `onSave`에 `type 'task', endTime null, endDate null`; 종료 시간 입력란 없음
    - `하루 종일을 켜면 시간이 비워진다` → 저장값 `startTime null, endTime null`
    - `삭제 확인 후 onDelete`
- [ ] **Step 2: 실패 확인** — FAIL.
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인 + 수동 확인** — `npm test` PASS, `npm run build` 성공. `npm run dev`에서 빈 시간 칸/하루 종일 줄 클릭으로 일정·할 일 만들기, "자세히"→편집 창, 항목 클릭→수정·삭제·타입 전환, 캘린더 삭제 시 소속 항목 사라짐 확인.
- [ ] **Step 5: Commit** — `git commit -m "feat(frontend): quick create popover and item edit dialog"`

---

## 백엔드 연결 메모 (구현 대상 아님 — 사용자가 나중에 참고)

`frontend/README.md`를 Task 7 커밋에 포함: 스프링부트 연결 시 `VITE_MOCK=off VITE_API_TARGET=http://localhost:8080 npm run dev`로 MSW를 끄고 프록시를 쓴다는 것, API 계약은 스펙 3.4가 기준이라는 것, 첫 실행 시드("내 캘린더")는 백엔드에서도 같은 규칙으로 만들어야 한다는 것을 적는다.
