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

## 컨테이너 이미지

```bash
TAG=$(date +%Y%m%d-%H%M%S)
docker build -t simple-cal-backend:$TAG -t simple-cal-backend:latest .
```

`Dockerfile`이 두 단계로 만든다. JDK 25 단계에서 `./gradlew bootJar`로 jar를 만들고(Gradle 캐시는 BuildKit 캐시 마운트로 재사용), JRE 25 단계가 비루트 사용자로 실행한다. 로컬에 JDK가 없어도 된다. 태그는 빌드 시각(예: `20261123-095210`, 빌드한 컴퓨터의 현지 시각)이고 프론트엔드와 같은 형식이다.

- 이미지 빌드에서는 테스트를 건너뛴다(`-x test`). Testcontainers가 빌드 컨테이너 안에서는 Docker를 쓸 수 없으므로 테스트는 밖에서 `./gradlew test`로 돌린다.
- 힙은 `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=75`로 컨테이너 메모리 제한의 75%까지 쓴다. 바꾸려면 실행할 때 `-e JAVA_TOOL_OPTIONS=...`.
- 다른 방법으로 `./gradlew bootBuildImage`도 남아 있다. Dockerfile 없이 Cloud Native Buildpacks로 같은 이름·태그(`simple-cal-backend:<빌드 시각>`, `:latest`)의 이미지를 만든다(로컬 JDK 25 필요, JVM 메모리는 자동 조정).

이미지에는 Docker Compose 지원이 없으므로 DB 접속 정보는 환경 변수로 준다.

```bash
docker run --rm -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/simplecal \
  -e SPRING_DATASOURCE_USERNAME=simplecal -e SPRING_DATASOURCE_PASSWORD=simplecal \
  simple-cal-backend:latest
```

## 오류 응답

모든 오류는 RFC 9457 Problem Details(`application/problem+json`)로 나간다. 읽을 수 없는 요청 400, 규칙 위반 422, 대상 없음 404. 오류 종류(`type`)와 한국어 문구(`detail`)는 설계서 3.4 표와 `common/ProblemType.java`가 기준이다.

```json
{ "type": "/problems/end-before-start", "title": "Unprocessable Content", "status": 422,
  "detail": "종료가 시작보다 빠를 수 없습니다", "instance": "/api/items/…" }
```
