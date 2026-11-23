# Forma 테마로 화면 분위기 개선 설계

작성일: 2026-11-23 · 범위: `frontend/` · 크기: 작은 변경(짧은 설계)

## 의도

화면이 밋밋하고 촌스러워서 분위기를 바꾼다. 사용자는 FullCalendar v7 기본 테마 네 가지(Monarch·Forma·Breezy·Pulse)를 같은 데이터로 비교해 보고 **Forma**를 골랐다. 이유: 캘린더 색은 왼쪽 막대로만 보이고 내용은 옅은 색이라 **눈의 피로가 적다.** 이 기준 — *진한 색은 작은 표시에만, 넓은 면은 옅게* — 을 달력뿐 아니라 화면 전체에 적용한다.

## 목표

- 달력에 Forma 테마(파랑 팔레트) 적용 (Classic 대체)
- 할 일 표시를 "왼쪽 막대 없음 + 캘린더 색 체크박스"로 (사용자 선택 B). 체크하면 캘린더 색으로 채움. 일정은 Forma 기본(옅은 바탕 + 왼쪽 막대)
- 사이드바·버튼·입력칸·편집 대화상자·빠른 생성 팝오버·토스트를 Forma와 같은 색·테두리·모서리 기준으로 맞춤 (사용자 선택 2)
- 앱 색을 CSS 변수 한곳(`index.css`의 `:root`)에서 Forma 변수(`--fc-forma-*`)를 참조하게 정리 → 이후 라이트/다크 테마 기능은 `data-color-scheme`만 바꾸면 화면 전체가 따라가도록

## 비목표

- 라이트/다크 전환 기능 자체 (이후 단계. 이번에는 light 고정 유지)
- 레이아웃·기능 변경 (사이드바 미니 달력 등은 별도 주제)
- 캘린더 색 팔레트·기본 캘린더 색(`#4a7bd8`) 변경 — 사용자가 고른 데이터 색이라 그대로

## 반목표 (실패로 보는 것)

- 넓은 면에 진한 색을 칠해 눈이 피로해지는 것 (예: 일정 블록 진한 색 채움, 진한 사이드바 배경)
- 일정과 할 일이 다시 헷갈리는 것 — 하루 종일 줄에서 섞여 있어도 막대(일정) / 색 체크박스(할 일)로 바로 구분돼야 함
- 체크박스를 직접 그리면서 키보드·스크린리더로 쓸 수 없게 되는 것 (지금처럼 `role=checkbox`, 이름 `"<제목> 완료"` 유지)
- 기존 동작 회귀 (단위 88 + e2e 10 그대로 통과, 확인하는 사실을 약하게 만들지 않음)

## 접근 방식

| 방식 | 내용 | 판단 |
|---|---|---|
| 1. 달력만 Forma | 테마와 할 일 B만 적용 | 제외 — 사이드바·대화상자가 예전 모양이라 화면 분위기가 둘로 갈림 |
| **2. 화면 전체를 Forma 기준으로** | 앱 CSS 변수를 Forma 변수에 연결, 각 컴포넌트 CSS 정리 | **선택(사용자).** 목적(눈이 편한 화면)을 화면 전체에서 달성하고 테마 기능의 토대가 됨 |
| 3. 사이드바 구성 재설계 | 미니 달력 등 | 제외 — 분위기 개선을 넘는 기능 추가 |

## 결정 사항

- 테마: `@fullcalendar/react/themes/forma` + `forma/theme.css` + `forma/palettes/blue.css` (사용자)
- 할 일 체크박스: 네이티브 `<input type="checkbox">`를 유지한 채 CSS(`appearance: none`)로 모양만 바꾼다 — 테두리·체크 채움은 이벤트의 `--fc-event-color`. 포커스 표시(`:focus-visible` 외곽선) 유지 (Claude 결정)
- 할 일 왼쪽 막대 제거, 바탕 투명 유지. 목록 보기는 Forma 기본 행 모양 유지(지난 작업과 같음) (사용자 B + Claude)
- 앱 강조색(`--primary`, 버튼·선택 상태)은 Forma 파랑 `#0F6CBD`(`--fc-forma-primary`)로. 캘린더 색은 그대로 (사용자 동의)
- 앱 변수 매핑 (Claude 결정): `--bg`→`--fc-forma-background`, `--panel`→`--fc-forma-faint` 위의 흰 바탕 계열, `--line`→`--fc-forma-border`, `--text`→`--fc-forma-foreground`, `--muted`→`--fc-forma-muted-foreground`, `--primary`→`--fc-forma-primary`. 모서리 반경은 Forma와 같은 4px 계열로 통일(대화상자·팝오버 포함). 흰색 하드코딩(`#fff`)은 `--bg` 등 변수로 바꿈
- Forma 팔레트 CSS를 앱 전체에서 쓰게 되므로 import 위치는 `CalendarView`가 아니라 앱 진입점(`main.tsx`)으로 옮기는 것을 검토 (빌더 판단)
- 지난 작업의 `--fc-classic-today` 덮어쓰기는 제거하고 Forma 기본 오늘 표시를 쓴다
- 테스트·e2e가 기대는 `sc-*` 훅 클래스, 체크박스 역할·이름, 한국어 라벨은 그대로

## 영향 범위

`frontend/src/index.css`, `App.css`, `components/Sidebar.css`, `components/QuickCreatePopover.css`, `components/ItemEditDialog.css`, `components/Toast.css`, `calendar/CalendarView.tsx`, `calendar/CalendarView.css`, (필요 시) `main.tsx`. 테스트: 체크박스 모양(캘린더 색 테두리·채움, 막대 없음)과 테마 적용 확인.

## 빌더에게 맡기는 것

- 변수별 정확한 값 대응과 컴포넌트별 세부 여백·글자 크기 (Forma 화면과 나란히 놓고 맞춤)
- 오류 토스트 색: 빨강 계열은 유지하되 넓은 진한 면이 되지 않도록 조정 여부
- 바뀐 화면을 스크린샷으로 확인해 사용자에게 보여 주기
