# 라이트/다크 테마 토글 설계

작성일: 2026-11-23 · 범위: `frontend/` · 크기: 작은 변경(짧은 설계) · 진행: 브랜치 `feat/theme-toggle` → GitHub PR

## 의도

사용자가 화면에서 **토글로 직접** 라이트/다크를 바꾸고 싶어 한다. 직전 작업에서 앱 색을 Forma 변수(`--fc-forma-*`)에 연결해 두었으므로, `<html data-color-scheme="dark">` 하나로 화면 전체가 바뀌는 토대가 이미 있다. Forma를 고른 이유("진한 색은 작은 표시에만, 넓은 면은 옅게" — 눈 피로)는 다크에서도 유지한다.

## 목표

- 사이드바 아래쪽에 **두 단계 토글(라이트 ↔ 다크)** (사용자 선택 A)
- 처음(저장값 없음)은 **라이트** (사용자)
- 선택을 **브라우저 localStorage**에 저장, 새로고침 후 유지 (사용자)
- 다크에서 사이드바·달력·대화상자·팝오버·토스트·브라우저 기본 컨트롤(라디오·select·날짜/시간 입력·스크롤바)이 모두 어둡게
- 지난 리뷰에서 다크 작업으로 미룬 항목 정리(아래 결정 사항)
- 마무리는 GitHub PR (사용자). 병합은 사용자가 PR을 보고 결정

## 비목표

- 운영체제 설정 자동 추종("자동" 단계) — 사용자가 두 단계를 고름
- 서버·계정 단위 저장, 여러 기기 동기화
- 전역 `button:disabled` 반투명이 FullCalendar '오늘' 버튼에 걸리는 문제 (테마와 무관, 이번 범위 밖)

## 반목표 (실패로 보는 것)

- 다크로 저장한 뒤 새로고침할 때 흰 화면이 번쩍이는 것
- localStorage를 쓸 수 없는 환경(사생활 보호 모드, 차단)에서 앱이 깨지는 것 — 이때는 라이트로 동작하고 토글은 그 세션 동안만 적용
- 다크에서 읽기 어려운 곳이 남는 것: 할 일 글자, 체크박스, 밀린 배지, 오류 토스트, 네이티브 입력칸
- 달력만 밝거나 달력만 어두운 상태(전체와 어긋남)
- 토글이 키보드·스크린리더로 쓸 수 없는 것

## 접근 방식

| 방식 | 판단 |
|---|---|
| **`<html data-color-scheme>` 전환 + 기존 CSS 변수** | **선택.** 직전 작업에서 깔아 둔 구조 그대로, 바뀌는 곳이 적다 |
| 테마별 CSS 파일 교체 | 제외 — 변수 구조를 버리고 같은 색을 두 벌 관리 |
| React 상태로 색을 내려보내기 | 제외 — 모든 컴포넌트가 바뀌고 FullCalendar 테마와도 따로 놂 |

방법이 사실상 하나라 사용자에게 이 방향으로 확인받음.

## 결정 사항

- 테마 상태 모듈(Claude): 저장 키 `simple-cal:theme`, 값 `'light' | 'dark'`. 읽기·쓰기는 try/catch로 감싸고 실패 시 `'light'`. 적용은 `document.documentElement`의 `data-color-scheme` 속성(라이트일 때도 `light`를 명시)
- 첫 화면 깜빡임 방지(Claude): `index.html` `<head>`의 작은 인라인 스크립트가 렌더 전에 저장값을 읽어 `<html>`에 적용. React 쪽 상태는 이 값으로 시작
- 토글 UI(Claude): 사이드바 아래쪽, `role="switch"` + `aria-checked`, 이름 "다크 테마". 해/달 표시는 장식. 키보드 Space/Enter로 전환
- 달력 일치(Claude): `CalendarView`의 `colorScheme`을 App이 테마 상태로 채운다 — 달력 루트와 `<html>`이 항상 같은 값
- 네이티브 컨트롤(Claude): `[data-color-scheme=dark] { color-scheme: dark }`, 라이트는 `color-scheme: light`; `accent-color: var(--primary)`
- 빨강(Claude): `--danger`(글자·테두리용)와 토스트 바탕용 변수를 라이트/다크 각각 정의. 하드코딩된 `#b91c1c`(Toast.css)·`#d64545`(밀린 배지) 제거. 캘린더 색 팔레트(CalendarFormDialog)는 데이터라 그대로
- 다크에서 할 일 글자·체크박스 바탕은 앱 변수(`--text`, `--bg`)를 따른다 — `<html>`과 달력이 같은 값을 가지므로 어긋나지 않음
- 밝은 캘린더 색 대비: 다크 스크린샷으로 확인 후 문제가 보이면 조정(빌더 판단, PR에 기록)
- PR(Claude): 커밋 후 `gh pr create`로 main 대상. 본문에 변경 요약·테스트 결과·라이트/다크 스크린샷. 스크린샷은 브랜치의 `docs/superpowers/screens/theme-toggle/`에 PNG로 커밋하고 본문에서 링크

## 영향 범위

`frontend/index.html`, `src/theme.ts`(새 모듈, 이름은 빌더 판단), `src/App.tsx`, `src/components/Sidebar.tsx`/`.css`(토글), `src/index.css`, `src/components/Toast.css`, `src/calendar/CalendarView.css`, 테스트(`theme.ts` 단위, e2e 토글·저장·깜빡임·다크 가독성)

## 빌더에게 맡기는 것

- 토글의 정확한 모양(Forma 톤: 얇은 테두리, 켜지면 `--primary`)과 사이드바 아래 배치 방식
- 다크 빨강의 구체적 값(바탕 대비 확인)
- PR 본문 문구
