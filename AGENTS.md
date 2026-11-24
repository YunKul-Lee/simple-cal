# AGENTS.md

simple-cal 저장소에서 일하는 AI 코딩 에이전트를 위한 안내. 사람용 설명은 [README.md](README.md).
하위 디렉토리에서 작업할 때는 그 디렉토리의 `AGENTS.md`도 함께 따른다.

- [frontend/AGENTS.md](frontend/AGENTS.md)
- [backend/AGENTS.md](backend/AGENTS.md)

## 프로젝트 개요

혼자 쓰는 개인용 일정 관리 웹앱. 캘린더마다 일정(event)과 할 일(task)을 함께 담는다.

```
simple-cal/
├── frontend/   React + TypeScript + Vite, FullCalendar, TanStack Query, MSW
├── backend/    Spring Boot + PostgreSQL (JPA, Flyway)
└── docs/       설계 문서(specs)와 구현 계획(plans)
```

<!-- TODO: 비목표(로그인·여러 사용자 없음 등) 요약 -->

## 문서 위치

- 설계: `docs/superpowers/specs/YYYY-MM-DD-<주제>-design.md`
- 구현 계획: `docs/superpowers/plans/YYYY-MM-DD-<주제>.md`
- API 계약: [simple-cal 설계 3.4절](docs/superpowers/specs/2026-11-22-simple-cal-design.md)
- 오류 응답: [백엔드 설계 3.4절](docs/superpowers/specs/2026-11-22-simple-cal-backend-design.md)
## 자주 쓰는 명령

디렉토리별 명령은 [frontend/AGENTS.md](frontend/AGENTS.md)와 [backend/AGENTS.md](backend/AGENTS.md)에 있다. 자세한 실행 방법은 [README.md](README.md).

```bash
# 화면만 (MSW 가짜 API, 백엔드 없이)
cd frontend && pnpm install && pnpm dev

# 백엔드와 함께 — 터미널 두 개
cd backend && ./gradlew bootRun          # PostgreSQL 자동 기동, localhost:8080
cd frontend && VITE_MOCK=off pnpm dev    # /api를 Vite 프록시로 백엔드에 보낸다

# 전체를 컨테이너로 (저장소 루트에서) — http://localhost:8081
docker compose up -d --build
docker compose down                      # 데이터까지 지우려면 -v

# 테스트
cd frontend && pnpm test && pnpm lint && pnpm build
cd frontend && pnpm test:e2e
cd backend && ./gradlew test             # Docker 필요
```

- 루트 `compose.yaml`은 전체 실행용이고, `backend/compose.yaml`은 `./gradlew bootRun`이 DB만 띄울 때 쓴다. `docker compose` 명령은 저장소 루트에서 실행한다.
- 두 compose가 모두 DB 포트 5432를 쓴다. 동시에 띄우려면 `DB_PORT=15432 docker compose up -d`.

## 공통 규칙

### API 계약과 데이터

- **API를 바꾸면 세 곳을 함께 고친다.** 설계서 3.4절, 백엔드(`backend/`), 프론트 가짜 API(`frontend/src/mocks/`). 개발 모드(MSW)와 실제 백엔드의 동작이 달라지면 실패로 본다. 상태 코드, 오류 `type`, 입력 검증까지 같아야 한다.
- **날짜·시간은 시간대 없는 값으로 다룬다.** 날짜는 `YYYY-MM-DD`, 시각은 `HH:mm`인 "벽시계 시각"이다. "오늘"은 클라이언트가 정해서 요청에 담아 보내고, 서버는 현재 시각을 쓰지 않는다.
- **오류 응답은 RFC 9457 Problem Details(`application/problem+json`) 하나로 통일한다.** 오류 종류(`type`)와 한국어 문구(`detail`)는 [백엔드 설계 3.4절](docs/superpowers/specs/2026-11-22-simple-cal-backend-design.md) 표가 기준이다. 새 오류를 추가하면 그 표부터 고친다.

### 작업 방식

- **새 기능은 설계 → 계획 → 구현 순서로 진행한다.** 설계는 `docs/superpowers/specs/`, 계획은 `docs/superpowers/plans/`에 쓰고 커밋한다. 작은 버그 수정은 바로 고쳐도 된다.
- **테스트를 먼저 쓰고, 실패하는 것을 확인한 뒤 구현한다.**
- **끝났다고 말하기 전에 테스트를 직접 돌려 결과를 확인한다.** 명령은 각 디렉토리의 `AGENTS.md`에 있다. 백엔드 통합 테스트는 Docker가 필요하다. Docker가 없어서 실패한 것은 코드 결함이 아니므로, 확인하지 못했다고 그대로 보고한다.
- **요청받은 범위만 고친다.** 관련 없는 리팩터링, 이름 바꾸기, 포맷 변경을 섞지 않는다. 눈에 띈 다른 문제는 고치지 말고 보고한다.
- **새 의존성을 추가하거나 메이저 버전을 올리기 전에 먼저 묻는다.**

### 언어와 문서

- **한국어로 쓰는 것:** 문서, 주석, 화면 문구, 오류 메시지(`detail`), 백엔드 테스트 메서드 이름.
- **영어로 쓰는 것:** 커밋 메시지, 코드 식별자(클래스·함수·변수), 브랜치 이름.
- **실행 방법이나 명령이 바뀌면 해당 README도 같은 커밋에서 고친다.**

## 커밋과 브랜치

- 커밋 메시지는 영어, Conventional Commits 형식에 범위를 붙인다: `feat(frontend): ...`, `fix(backend): ...`, `docs: ...`
- `main`에 직접 커밋하지 않는다. 작업마다 브랜치를 만들고 PR로 `main`에 병합한다.
- 브랜치 이름은 `<종류>/<주제>` 형식의 영어 kebab-case다(예: `feat/theme-toggle`, `chore/fullcalendar-v7`, `docs/agents-md`).
- PR 본문에는 변경 요약과 테스트 결과를 적는다. 화면이 바뀌면 스크린샷을 `docs/superpowers/screens/<주제>/`에 커밋하고 본문에서 링크한다.
