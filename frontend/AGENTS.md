# frontend/AGENTS.md

simple-cal 프론트엔드에서 작업할 때의 안내. 공통 규칙은 [루트 AGENTS.md](../AGENTS.md), 사람용 설명은 [README.md](README.md).

## 스택

React 19 + TypeScript + Vite, FullCalendar v7, TanStack Query, MSW, 패키지 매니저는 pnpm.

## 명령

```bash
pnpm dev        # 개발 서버 (MSW 가짜 API, 데이터는 localStorage)
pnpm test       # 단위 테스트 (Vitest)
pnpm build      # 타입 검사 + 프로덕션 빌드
pnpm lint       # oxlint
pnpm test:e2e   # Playwright e2e
```

`pnpm test:e2e`를 처음 돌리기 전에 `pnpm exec playwright install chromium`을 한 번 실행한다.

## 구조

```
src/
├── api/         fetch('/api/...') 클라이언트
├── calendar/    FullCalendar 화면과 어댑터
├── components/  사이드바, 다이얼로그, 토스트
├── hooks/       TanStack Query 훅
├── lib/         날짜, 항목 검증(MSW와 공유), 테마, 오류 버스
└── mocks/       MSW 핸들러 (백엔드와 같은 계약)
e2e/             Playwright 테스트
```

## 규칙

### 날짜와 시간

- 날짜는 `YYYY-MM-DD`, 시각은 `HH:mm` 문자열로 다룬다. 시간대 변환은 하지 않는다.
- `Date`를 문자열로 바꿀 때는 `lib/dates.ts`의 로컬 기준 함수(`toLocalDate`, `toLocalTime`, `todayLocal`)만 쓴다. `toISOString()`은 쓰지 않는다. UTC로 바뀌어 날짜가 하루 밀린다.
- 날짜 범위는 양 끝을 포함한다. `endDate`는 마지막 날 자체다. FullCalendar의 "끝 다음 날" 표기와 바꾸는 일은 `calendar/adapter.ts`에서만 한다.

### API와 MSW

- 서버 호출은 `api/client.ts`의 `apiRequest`를 거친다. 오류는 `ApiError`로 오고, `status`, Problem Details의 `type`, `detail`을 담은 `message`가 있다.
- 화면은 서버 데이터를 `hooks/`의 TanStack Query 훅으로 읽고 쓴다. 컴포넌트에서 `fetch`를 직접 부르지 않는다.
- MSW 핸들러(`mocks/handlers.ts`)는 백엔드와 같은 계약을 지킨다. 입력 검증은 `lib/validateItem.ts`를 함께 쓰고, 오류 응답은 `mocks/problems.ts`의 `problem()`으로 만든다.
- MSW는 개발 모드에서 `VITE_MOCK`이 `off`가 아닐 때만 켜진다. 프로덕션 빌드에는 들어가지 않는다.

### FullCalendar v7

- v7은 `.fc-*` 의미 클래스를 붙이지 않는다. 스타일과 테스트는 다음 기준으로 요소를 고른다.
  - 우리가 class 옵션으로 붙이는 `sc-*` 훅 클래스
  - v7이 붙이는 `data-date`, `data-time` 속성
  - ARIA 역할과 이름
- 항목 모양용 클래스(`item-task`, `is-done`, `is-overdue`, `task-*`)도 class 옵션(`eventClass` 등)으로 붙인다.
- 일정과 할 일을 FullCalendar 이벤트로 바꾸는 일은 `calendar/adapter.ts`가 맡는다.

### 테마와 스타일

- 색은 `index.css`의 앱 변수(`--bg`, `--panel`, `--text`, `--muted`, `--line`, `--primary`, `--danger` 등)로만 쓴다. 색 값을 직접 쓰지 않는다. 캘린더 색 팔레트는 사용자 데이터라 예외다.
- 앱 변수는 Forma 팔레트 변수(`--fc-forma-*`)를 가리킨다. Forma CSS는 `main.tsx`에서 불러온다.
- 테마는 `<html data-color-scheme="light|dark">`로 적용한다. `index.html`의 인라인 스크립트와 `lib/theme.ts`는 같은 규칙(저장 키 `simple-cal:theme`)을 지켜야 한다.
- 화면을 바꾸면 라이트와 다크를 모두 확인한다.

### 화면 문구와 접근성

- 화면에 보이는 문구는 모두 한국어다.
- 테스트는 역할과 한국어 이름(예: 체크박스 "내 캘린더", 스위치 "다크 테마")으로 요소를 찾는다. 라벨을 바꾸면 테스트도 함께 고친다.

## 테스트

- 단위 테스트는 대상 파일 옆에 `*.test.ts(x)`로 둔다. Vitest와 Testing Library를 쓴다.
- e2e는 `e2e/`에 둔다. "오늘"은 `e2e/helpers.ts`의 `TODAY`(2026-11-25 수요일)로 고정되고, 테스트마다 빈 가짜 DB로 시작한다.
- 작업을 마치기 전에 `pnpm test`, `pnpm lint`, `pnpm build`를 돌린다. 화면 동작을 바꿨으면 `pnpm test:e2e`도 돌린다.
