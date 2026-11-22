# simple-cal 백엔드 설계 문서

작성일: 2026-11-22
상태: 승인됨 (2026-11-22)
선행 문서: [2026-11-22-simple-cal-design.md](2026-11-22-simple-cal-design.md) — 데이터 모델·REST API 계약은 그 문서가 기준이다.

## 1. 무엇을, 왜

이미 만든 simple-cal 프론트엔드(React + Vite, 지금은 브라우저 안 가짜 API(MSW)로만 동작)에 진짜 백엔드와 DB를 붙인다. 화면에서 하는 모든 동작이 MSW 대신 스프링부트 + PostgreSQL로 똑같이 되게 하는 것이 목표다.

- 선행 설계서는 "백엔드는 사용자가 직접 스프링부트로 만든다"고 했으나, 이번에는 Claude가 만든다 (Claude 가정 — 사용자가 정정하지 않음).
- 처음엔 쿠버네티스 배포까지 함께 다뤘으나, 사용자가 범위를 **백엔드만**으로 줄였다 (사용자 결정). 배포는 나중 작업.

## 2. 목표 / 비목표 / 안티목표

**목표**
- 스프링부트 백엔드가 선행 설계서 3.4의 REST API 계약을 그대로 구현하고 PostgreSQL에 저장한다.
- 로컬에서 `VITE_MOCK=off npm run dev`로 화면을 띄우면 실제 백엔드로 모든 동작이 된다 (연결 자체에는 화면 코드 변경 없음 — Vite 프록시가 이미 `/api` → `localhost:8080`. 오류 형식만 3.4대로 화면·MSW를 함께 고친다).

**비목표**
- 쿠버네티스·컨테이너 이미지·배포 (사용자 결정: 지금은 신경 쓰지 않음)
- 로그인·여러 사용자
- MSW에 쌓인 브라우저 데이터를 백엔드로 옮기기 (선행 설계서 결정)
- 프론트 e2e를 실제 백엔드로 돌리기 (e2e는 MSW 기준 유지)

**안티목표 (이렇게 되면 실패)**
- 화면 코드나 API 계약을 백엔드에 맞춰 바꾸는 것 — 백엔드가 계약에 맞춘다. **예외: 오류 응답 형식**은 사용자 결정으로 계약 자체를 바꾸며(3.4), 화면(`client.ts`)과 MSW도 같은 형식으로 함께 바꾼다.
- MSW와 실제 백엔드의 동작이 달라서, 개발 모드에서 되던 것이 백엔드 연결 시 깨지는 것.
- 비밀번호 등 비밀값이 git에 커밋되는 것 (로컬 개발용 기본값은 예외).

## 3. 결정된 사항

### 3.1 스택·위치 (Claude 결정)
- 위치: `backend/` (선행 설계서 폴더 구성대로). 브랜치 `feat/backend`.
- 스프링부트 최신 안정 버전, Java 25(로컬 설치된 Temurin 25), Gradle(Kotlin DSL, wrapper 포함), Spring Web MVC, Spring Data JPA, Flyway, PostgreSQL 드라이버, Bean 검증은 쓰지 않고 MSW와 같은 규칙을 서비스 코드로 직접 구현(문구까지 맞추기 위해).
- DB: PostgreSQL (사용자 결정은 "DB를 둔다"까지, 종류는 Claude 결정 — 스프링부트와 가장 흔한 조합). 로컬 개발용은 `backend/compose.yaml`의 PostgreSQL 컨테이너(5432, 로컬 전용 기본 비밀번호). 스프링부트 docker compose 지원으로 `./gradlew bootRun` 시 자동 기동해도 된다(빌더 판단).
- 서버 포트 8080 (Vite 프록시 기본값과 일치).

### 3.2 데이터
- 스키마는 Flyway 마이그레이션으로 만든다. `id`는 UUID(서버 생성). 날짜는 `date`, 시간은 `time`(분 단위) 컬럼 — 시간대 변환 없음(선행 설계서: 벽시계 시각). JSON으로는 `YYYY-MM-DD`, `HH:mm` 문자열 그대로 주고받는다(초 없음).
- 첫 실행 시 기본 캘린더 `내 캘린더`(`#4a7bd8`, visible) 하나를 마이그레이션으로 넣는다. MSW도 "저장소가 처음 비어 있을 때 한 번만" 만들므로, 사용자가 다 지우면 다시 생기지 않는 점까지 같다.
- 캘린더 삭제 시 소속 항목도 삭제 (DB `ON DELETE CASCADE`).

### 3.3 MSW 동작을 그대로 옮길 것
현재 기준 구현: `frontend/src/mocks/handlers.ts`, `frontend/src/mocks/db.ts`, `frontend/src/lib/validateItem.ts`. 테스트 기준: `frontend/src/mocks/handlers.test.ts`, `frontend/src/lib/validateItem.test.ts`.

- 검증 규칙과 오류 문구(한국어) 그대로. 예: 제목 비면 `제목을 입력해 주세요`, 날짜·시간 형식 오류, 할 일에 종료 지정 시 `할 일에는 종료를 지정할 수 없습니다`, 시작/종료 시간 한쪽만 있을 때, 종료<시작이면 `종료가 시작보다 빠를 수 없습니다`, 없는 캘린더면 `캘린더를 찾을 수 없습니다`, 캘린더 이름 비면 `이름을 입력해 주세요`.
- 오류 응답 형식·상태 코드는 아래 3.4 (MSW의 `{message}`·400에서 바뀜).
- 성공 상태 코드: POST 201, DELETE 204, 나머지 200.
- `GET /api/items` 겹침 조건: `date <= to AND coalesce(endDate, date) >= from`. `from`/`to` 없으면 400 `from, to가 필요합니다`.
- `GET /api/items/overdue?today=`: `type='task' AND done=false AND date < today`. `today` 없으면 400 `today가 필요합니다`.
- PATCH: 빠진 필드는 그대로, `null`은 비움. 기존 값에 합친 **결과 전체**를 다시 검증한다. 본문의 `id`는 무시.
- 새 캘린더의 `visible`은 `true`.
- 목록 순서: MSW는 만든 순서 그대로 돌려준다. 화면이 정렬을 직접 하므로 순서는 계약이 아니다 — 백엔드는 캘린더를 만든 순서로 돌려준다(사이드바 순서 유지).

### 3.4 오류 응답 (사용자 결정: Problem Details + 세분화한 상태 코드, 화면·MSW도 함께 변경)

형식: RFC 9457 Problem Details, `Content-Type: application/problem+json`.
```json
{ "type": "/problems/end-before-start", "title": "Unprocessable Content", "status": 422,
  "detail": "종료가 시작보다 빠를 수 없습니다", "instance": "/api/items/3f2…" }
```
- `type`: 오류 종류마다 고유한 상대 URI `/problems/<이름>` — 테스트와 화면이 종류를 구분하는 값. `title`: 상태 코드의 표준 이름(영어). `detail`: 한국어 문구(사용자에게 보이는 값). `instance`: 요청 경로.
- 화면(`client.ts`)은 `detail`을 읽고, 없으면 `message`, 둘 다 없으면 `요청에 실패했습니다`. MSW도 아래 표와 같은 상태·`type`·`detail`로 응답한다(개발 모드와 실제 백엔드가 같게).

| 상태 | `type` | `detail` | 언제 |
|---|---|---|---|
| 400 | `/problems/malformed-request` | `요청 형식이 올바르지 않습니다` | 깨진 JSON, 필드 값의 JSON 타입이 틀림 |
| 400 | `/problems/missing-parameter` | `from, to가 필요합니다` / `today가 필요합니다` | 필수 쿼리 없음 |
| 400 | `/problems/invalid-parameter` | `날짜 형식이 올바르지 않습니다` | 쿼리 날짜 형식 틀림 |
| 422 | `/problems/invalid-type` | `종류가 올바르지 않습니다` | `type`이 event/task 아님 |
| 422 | `/problems/invalid-done` | `완료 여부가 올바르지 않습니다` | `done`이 `null` |
| 422 | `/problems/title-required` | `제목을 입력해 주세요` | |
| 422 | `/problems/invalid-date` | `날짜 형식이 올바르지 않습니다` | 본문 날짜 |
| 422 | `/problems/invalid-time` | `시간 형식이 올바르지 않습니다` | 본문 시간 |
| 422 | `/problems/task-has-end` | `할 일에는 종료를 지정할 수 없습니다` | |
| 422 | `/problems/end-time-required` | `종료 시간을 입력해 주세요` | |
| 422 | `/problems/start-time-required` | `시작 시간을 입력해 주세요` | |
| 422 | `/problems/end-before-start` | `종료가 시작보다 빠를 수 없습니다` | |
| 422 | `/problems/calendar-not-found` | `캘린더를 찾을 수 없습니다` | 본문 `calendarId`가 없는 캘린더(UUID 아님 포함) |
| 422 | `/problems/name-required` | `이름을 입력해 주세요` | 캘린더 이름 |
| 422 | `/problems/invalid-color` | `색 형식이 올바르지 않습니다` | 캘린더 색 `#RRGGBB` 아님 |
| 404 | `/problems/not-found` | `찾을 수 없습니다` | 경로의 대상 없음(UUID 아님 포함), 없는 경로 |
| 405 | `/problems/method-not-allowed` | `허용되지 않는 요청입니다` | |
| 415 | `/problems/unsupported-media-type` | `지원하지 않는 형식입니다` | 본문이 JSON 아님 |
| 500 | `/problems/internal-error` | `서버 오류가 발생했습니다` | 예상 못 한 예외(로그 남김) |

- 400과 422 구분: 요청을 **읽을 수 없으면** 400, 읽었지만 **규칙 위반**이면 422. 없는 캘린더 참조는 409가 아니라 422(충돌이 아니라 잘못된 참조).
- MSW는 지금 표에서 MSW가 다루는 경우(422 검증, 404, 400 쿼리)만 같게 맞추면 된다. 405/415/500/깨진 JSON은 백엔드에만.

### 3.5 테스트
- Testcontainers(PostgreSQL)로 API 계약 테스트: 엔드포인트별 정상·오류 경우(상태·`type`·`detail`·`Content-Type`), PATCH 빠짐/null 구분, 겹침 조건 경계(기간 이전에 시작한 여러 날 일정 포함), 연쇄 삭제, 기본 캘린더 존재.
- MSW 핸들러 테스트(`handlers.test.ts`)에 있는 경우는 모두 백엔드 테스트에도 있어야 한다.
- 테스트는 프론트 때와 같이 테스트 전담 서브에이전트(`test-writer`)가 쓰고, 구현은 메인이 한다.

### 3.6 완료 확인
- 백엔드 테스트 통과.
- `docker compose` DB + `./gradlew bootRun` + `VITE_MOCK=off npm run dev`로 브라우저 확인: 캘린더 만들기·숨기기·삭제, 빠른 생성, 편집 창, 드래그 이동·길이 조절, 할 일 체크, 새로고침 후 유지, 밀린 할 일 오늘 표시.
- 프론트 단위·e2e 테스트는 MSW 기준으로 통과(오류 형식 관련 테스트는 새 형식으로 고친 뒤).
- 브라우저에서 오류 알림이 `detail` 문구로 뜨는지 한 번 확인(예: 편집 창을 거치지 않는 API 오류).
- `backend/README.md`에 실행 방법 정리.

## 4. 검토한 방식

1. **스프링부트 + JPA + Flyway + PostgreSQL** — 선택 (사용자 결정). 선행 설계서가 스프링부트를 정했고, JPA는 단순한 CRUD 두 테이블에 가장 흔한 선택, Flyway로 스키마와 기본 캘린더를 버전 관리. 대가: PATCH의 빠짐/null 구분은 JPA가 도와주지 않으므로 직접 합쳐야 한다.
2. 스프링부트 + JdbcClient(SQL 직접) — 쿼리가 눈에 다 보이고 가볍지만, 매핑 코드를 손으로 쓴다. 규모가 작아 둘 다 무리 없으나 흔한 쪽을 택했다.
3. 개발 DB를 H2(메모리)로 — 설치가 필요 없지만 PostgreSQL과 SQL·타입 동작이 달라 연결 시 문제가 늦게 드러난다. 로컬에 docker가 있으니 처음부터 PostgreSQL.

## 5. 빌더에게 맡기는 것
- 스프링부트·PostgreSQL 정확한 버전
- 패키지 구조, PATCH 빠짐/null 구분 구현 방식(`JsonNode`, `Map` 등)
- Flyway 스키마 세부(컬럼 이름, 인덱스)
- compose 자동 기동 사용 여부, README 구성
