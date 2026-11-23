# simple-cal backend

simple-cal의 스프링부트 + PostgreSQL 백엔드. 설계는 [`../docs/superpowers/specs/2026-11-22-simple-cal-backend-design.md`](../docs/superpowers/specs/2026-11-22-simple-cal-backend-design.md), API 계약은 [`../docs/superpowers/specs/2026-11-22-simple-cal-design.md`](../docs/superpowers/specs/2026-11-22-simple-cal-design.md) 3.4.

## 요구 사항

- JDK 25
- Docker (로컬 DB와 테스트용 PostgreSQL 컨테이너)

## 실행

```bash
./gradlew bootRun
```

- 스프링부트 Docker Compose 지원이 `compose.yaml`의 PostgreSQL 18을 자동으로 띄운다(포트 5432).
- 서버는 `http://localhost:8080`. 첫 실행 때 Flyway가 테이블과 기본 캘린더 `내 캘린더`를 만든다.
- DB 접속 정보(로컬 전용): DB `simplecal`, 사용자 `simplecal`, 비밀번호 `simplecal`.
- 데이터를 비우려면 `docker compose down -v`.

화면과 연결: 백엔드를 띄운 뒤 `../frontend`에서 `VITE_MOCK=off pnpm dev`.

## 테스트

```bash
./gradlew test
```

Testcontainers가 테스트마다 PostgreSQL 컨테이너를 띄우므로 Docker가 켜져 있어야 한다. Docker를 찾지 못하면 `DOCKER_HOST=unix://$HOME/.docker/run/docker.sock ./gradlew test`.

## 오류 응답

모든 오류는 RFC 9457 Problem Details(`application/problem+json`)로 나간다. 읽을 수 없는 요청 400, 규칙 위반 422, 대상 없음 404. 오류 종류(`type`)와 한국어 문구(`detail`)는 설계서 3.4 표와 `common/ProblemType.java`가 기준이다.

```json
{ "type": "/problems/end-before-start", "title": "Unprocessable Content", "status": 422,
  "detail": "종료가 시작보다 빠를 수 없습니다", "instance": "/api/items/…" }
```
