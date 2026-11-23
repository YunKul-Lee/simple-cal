# simple-cal

혼자 쓰는 개인용 일정 관리 웹앱. **캘린더마다 일정(event)과 할 일(task)을 함께 담아** 나눠 관리한다.

구글 캘린더는 할 일을 캘린더와 별개인 "할 일 목록"에 두기 때문에, "회사" 캘린더에 회사 일정과 회사 할 일을 같이 둘 수 없다. simple-cal에서는 캘린더가 일정과 할 일을 모두 갖고, 둘은 같은 주간 격자 안에 섞여 보인다.

## 기능

- 캘린더 여러 개 만들기(이름·색 지정), 켜고 끄기
- 일정과 할 일을 한 화면에 함께 보기
- 주간 보기(기본) · 월간 · 목록 보기 전환
- 빈 칸 클릭으로 바로 만들기, 드래그로 옮기기
- 기한이 지난 할 일 모아 보기

## 구성

```
simple-cal/
├── frontend/   React + TypeScript + Vite, FullCalendar, TanStack Query, MSW
├── backend/    Spring Boot + PostgreSQL (JPA, Flyway)
└── docs/       설계 문서와 구현 계획
```

프론트엔드는 처음부터 `fetch('/api/...')`로 호출한다. 개발 모드에서는 MSW가 그 요청에 응답하므로 백엔드 없이도 화면을 확인할 수 있다. 백엔드를 붙일 때는 MSW만 끄면 된다.

## 빠르게 실행하기

### 화면만 (백엔드 없이)

```bash
cd frontend
pnpm install
pnpm dev
```

MSW 가짜 API가 켜지고 데이터는 브라우저 `localStorage`에 저장된다.

### 백엔드와 함께

요구 사항: JDK 25, Docker

```bash
# 터미널 1 — PostgreSQL 컨테이너가 자동으로 뜨고 서버는 localhost:8080
cd backend
./gradlew bootRun

# 터미널 2 — /api 요청이 Vite 프록시를 거쳐 백엔드로 간다
cd frontend
VITE_MOCK=off pnpm dev
```

## 테스트

```bash
cd frontend && pnpm test           # 단위 테스트 (Vitest)
cd frontend && pnpm test:e2e   # 브라우저 e2e (Playwright) — 처음엔 pnpm exec playwright install chromium
cd backend  && ./gradlew test     # 백엔드 테스트 (Testcontainers, Docker 필요)
```

## 더 보기

- [frontend/README.md](frontend/README.md) — 프론트엔드 실행·테스트 상세
- [backend/README.md](backend/README.md) — 백엔드 실행, 테스트, 오류 응답 형식
- [설계 문서](docs/superpowers/specs/2026-11-22-simple-cal-design.md) — 데이터 모델과 REST API 계약(3.4절)
- [백엔드 설계 문서](docs/superpowers/specs/2026-11-22-simple-cal-backend-design.md) — 오류 응답(RFC 9457 Problem Details)
