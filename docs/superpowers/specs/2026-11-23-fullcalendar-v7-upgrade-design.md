# FullCalendar v7 업그레이드 설계

작성일: 2026-11-23 · 범위: `frontend/` · 크기: 작은 변경(짧은 설계)

## 의도

달력 화면이 밋밋하고 촌스러워서 전체 분위기를 바꾸고 싶다. FullCalendar v7은 기본 테마 5종(Monarch·Forma·Breezy·Pulse·Classic, MIT, 다크 모드 지원)을 `@fullcalendar/react` 안에 담고 있어 v6보다 적은 디자인 작업으로 세련된 화면을 얻을 수 있다. 그 전 단계로 **라이브러리만 v7으로 올린다.** 테마 선택과 디자인 개선은 다음 단계에서 따로 한다.

## 목표

- `@fullcalendar/*` 6.1.22 → `@fullcalendar/react` 7.1.5(+ peer `temporal-polyfill`)
- v7 **Classic 테마**로 지금과 같은 모양·동작 유지
- 단위 테스트(Vitest)와 e2e(Playwright)가 모두 통과

## 비목표

- 새 테마 적용, 색·글꼴·여백 변경, 사이드바·대화상자 스타일 변경 (다음 단계)
- 기능 추가나 동작 변경
- 라이트/다크 테마 기능 — 사용자가 이후에 넣을 예정. 이번에는 `CalendarView`에 `colorScheme` prop(기본 `'light'`)만 열어 두고, 테스트(단위·e2e)는 `light`로 돌린다 (사용자 결정)

## 실패로 보는 것 (반목표)

- 사용자가 보기에 동작이 달라짐: 빈 칸 클릭 생성, 드래그로 옮기기·늘리기, 할 일 체크박스 클릭(편집 대화상자가 열리지 않고 완료만 토글), 밀린 할 일이 오늘 칸 맨 위에 배지와 함께 표시, 주/월/목록 전환, 한국어 표시(오늘/주/월/목록, 하루 종일, 월요일 시작)
- e2e를 통과시키려고 검증 내용을 약하게 만드는 것

## 접근 방식

| 방식 | 내용 | 판단 |
|---|---|---|
| **A. Classic 테마로 모양 그대로 업그레이드** | 화면·동작 동일, 기존 테스트가 회귀 검사 | **선택.** 업그레이드 문제와 디자인 변경이 섞이지 않는다. 테마는 다음 단계에서 테마 플러그인·CSS import만 바꾸면 된다 |
| B. 업그레이드하면서 임시 테마 적용 | 한 번에 끝남 | 제외. 모양이 달라져 e2e가 깨질 때 원인을 가려내기 어렵다 |

사용자가 A를 골랐다.

## 결정 사항

- 작업 브랜치 `chore/fullcalendar-v7`, 완료 후 main에 병합 (Claude 결정)
- **e2e 선택자 기준**: v7은 기본 DOM에 `.fc-*` 클래스를 붙이지 않으므로, 실제 v7 DOM을 확인해 **테마와 무관한 기준**(날짜·시간 data 속성, ARIA role/label, 또는 우리가 class 옵션으로 붙이는 클래스)으로 다시 쓴다. 다음 단계에서 테마를 바꿔도 테스트를 고치지 않기 위함 (Claude 결정)
- 우리 쪽 스타일 훅(`item-task`, `is-done`, `is-overdue`, `task-*`)은 유지하고, v7의 class 옵션(`eventClass` 등)으로 붙인다. `CalendarView.css`의 `.fc …` 선택자는 이 클래스 기준으로 바꾼다 (Claude 결정)
- `adapter.ts`: `backgroundColor`/`borderColor` → `color`, `classNames` 배열 → 문자열. 일정/할 일 분기 로직은 그대로

## 영향 범위

`frontend/package.json`, `src/calendar/CalendarView.tsx`, `src/calendar/adapter.ts`, `src/calendar/CalendarView.css`, `src/calendar/adapter.test.ts`, `src/calendar/CalendarView.test.tsx`, `e2e/helpers.ts`, `e2e/calendar.spec.ts`. 사이드바·대화상자·API·백엔드는 건드리지 않는다.

## 위험

- 할 일 체크박스 클릭을 `eventClick` 안에서 가려내는 처리(`.task-check` 확인 후 `preventDefault`)가 v7에서도 같은 순서로 동작하는지
- v7 옵션 변경: `headerToolbar` 기본 꺼짐·형식 변경, `buttonText` 제거(`buttons`), `allDayText` 대문자화·줄바꿈 처리, `nowIndicator` 세분화, 콜백 타입 이름 변경(`*Arg` → `*Info`), ko 로케일 객체 형식 변경
- `eventOrder`의 확장 속성(`sortRank`) 정렬이 v7에서도 지원되는지 확인 필요

## 빌더에게 맡기는 것

- v7 DOM을 보고 고를 구체적인 e2e 선택자
- v7 공식 마이그레이션 문서(https://fullcalendar.io/docs/upgrading-from-v6-js)를 기준으로 한 옵션별 대응
