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

### Docker로 전체 실행 (k8s 없이)

요구 사항: Docker (JDK·Node는 이미지 빌드 단계 안에서 쓰므로 로컬에 없어도 된다)

k8s 매니페스트와 같은 구성(PostgreSQL · 백엔드 · nginx 프론트엔드)을 Docker 네트워크 하나에 띄운다. 컨테이너 이름이 곧 호스트 이름이라 k8s 서비스 이름(`postgres`, `simple-cal-backend`)을 그대로 쓰므로, 프론트엔드 이미지의 기본 `BACKEND_URL`을 바꿀 필요가 없다.

#### Docker Compose로 (권장)

루트의 [`compose.yaml`](compose.yaml)이 `backend/Dockerfile`·`frontend/Dockerfile`로 이미지를 빌드하고 세 서비스를 한 번에 띄운다.

```bash
docker compose up -d --build
```

http://localhost:8081 로 접속한다. 다른 포트를 쓰려면 `PORT=8082 docker compose up -d`.

- DB가 준비(`pg_isready`)된 뒤 백엔드가, 백엔드 컨테이너가 생긴 뒤 프론트엔드가 뜬다. 백엔드 앱이 완전히 올라오기까지 몇 초간은 `/api` 요청이 502일 수 있다.
- 외부 DB 툴은 `localhost:5432`, DB·사용자·비밀번호 모두 `simplecal`(로컬 전용)로 접속한다. 포트는 이 컴퓨터에서만 열린다. `./gradlew bootRun`의 DB(`backend/compose.yaml`, 역시 5432)와 동시에 쓰려면 `DB_PORT=15432 docker compose up -d`.
- 로그: `docker compose logs -f simple-cal-backend`, 상태: `docker compose ps`
- 코드를 바꾼 뒤 `docker compose up -d --build`를 다시 하면 바뀐 이미지의 컨테이너만 교체된다.
- 데이터는 `simple-cal_db` 볼륨에 남는다. 멈추기만 할 때는 `docker compose down`, 데이터까지 지우려면 `docker compose down -v`.
- `backend/compose.yaml`은 `./gradlew bootRun`이 DB만 띄울 때 쓰는 별개 파일이다.

#### compose 없이 `docker run`으로

```bash
# 1. 이미지 빌드 (이미 있으면 생략)
docker build -t simple-cal-backend:latest backend
docker build -t simple-cal-frontend:latest frontend

# 2. 네트워크와 DB 볼륨
docker network create simple-cal
docker volume create simple-cal-db

# 3. PostgreSQL — 준비될 때까지 기다린다
docker run -d --name postgres --network simple-cal \
  -e POSTGRES_DB=simplecal -e POSTGRES_USER=simplecal -e POSTGRES_PASSWORD=simplecal \
  -v simple-cal-db:/var/lib/postgresql postgres:18
until docker exec postgres pg_isready -U simplecal -d simplecal; do sleep 1; done

# 4. 백엔드 — 외부에 포트를 열지 않는다(프론트엔드 nginx만 접근)
docker run -d --name simple-cal-backend --network simple-cal \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/simplecal \
  -e SPRING_DATASOURCE_USERNAME=simplecal -e SPRING_DATASOURCE_PASSWORD=simplecal \
  simple-cal-backend:latest

# 5. 프론트엔드 — 백엔드 컨테이너가 있어야 nginx가 뜬다
docker run -d --name simple-cal-frontend --network simple-cal -p 8081:8080 \
  simple-cal-frontend:latest
```

http://localhost:8081 로 접속한다. 백엔드는 시작에 몇 초 걸리므로 처음 몇 초간 `/api` 요청이 502일 수 있다(`docker logs -f simple-cal-backend`로 확인).

- 순서가 중요하다: 백엔드는 DB에, nginx는 시작할 때 `simple-cal-backend` 이름 해석에 의존한다. 프론트엔드가 먼저 죽었다면 백엔드를 띄운 뒤 `docker start simple-cal-frontend`.
- 새 이미지로 바꿀 때는 해당 컨테이너만 `docker rm -f <이름>` 후 같은 명령으로 다시 띄운다. 데이터는 `simple-cal-db` 볼륨에 남는다.
- 8081이 이미 쓰이고 있으면(예: k8s port-forward) `-p 8082:8080`처럼 호스트 쪽 포트만 바꾼다.

정리:

```bash
docker rm -f simple-cal-frontend simple-cal-backend postgres
docker network rm simple-cal
docker volume rm simple-cal-db   # 데이터까지 지울 때만
```

k8s에 배포하는 방법은 [frontend/README.md](frontend/README.md)의 "컨테이너 이미지" 절.

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
