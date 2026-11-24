# backend/AGENTS.md

simple-cal 백엔드에서 작업할 때의 안내. 공통 규칙은 [루트 AGENTS.md](../AGENTS.md), 사람용 설명은 [README.md](README.md).

## 스택

Spring Boot, Java 25, JPA, Flyway, PostgreSQL 18, Gradle(Kotlin DSL).

## 명령

```bash
./gradlew bootRun   # backend/compose.yaml의 PostgreSQL을 자동으로 띄우고 localhost:8080
./gradlew test      # Testcontainers 통합 테스트 — Docker 필요
```

- Docker를 찾지 못하면 `DOCKER_HOST=unix://$HOME/.docker/run/docker.sock ./gradlew test`로 돌린다.
- 이미지 빌드(`docker build`)는 테스트를 건너뛴다. 테스트는 반드시 밖에서 `./gradlew test`로 돌린다.

## 구조

```
src/main/java/com/simplecal/
├── calendar/   캘린더 Controller → Service → Repository
├── item/       일정·할 일 (calendar에 의존)
└── common/     오류 응답(ProblemType, GlobalExceptionHandler), 공용 유틸
src/main/resources/db/migration/   Flyway 마이그레이션
```

## 규칙

### 날짜와 시간

- DB 컬럼은 `date`, `time`이고, Java에서는 `LocalDate`, `LocalTime`으로 다룬다. 시간대가 붙은 타입(`Instant`, `ZonedDateTime`, `OffsetDateTime`)은 쓰지 않는다.
- 서버는 현재 시각을 읽지 않는다(`LocalDate.now()`, `Clock`, `ZoneId` 금지). "오늘"이 필요한 API는 클라이언트가 `today` 쿼리로 보낸다.
- JSON의 시각은 초 없이 `HH:mm`으로 돌려준다. `"10:00:00"`이 나가면 화면의 비교와 다음 PATCH 검증이 깨진다.

### API 계약

- 기준은 [simple-cal 설계 3.4절](../docs/superpowers/specs/2026-11-22-simple-cal-design.md)(엔드포인트, 필드)과 [백엔드 설계 3.3~3.4절](../docs/superpowers/specs/2026-11-22-simple-cal-backend-design.md)(MSW 동작, 오류 표)이다.
- JSON 필드는 camelCase로 쓴다. 값이 없는 필드도 생략하지 않고 `null`로 보낸다.
- 성공하면 POST는 201, DELETE는 204(본문 없음), 나머지는 200을 돌려준다.
- PATCH에서 빠진 필드는 그대로 두고, `null`인 필드는 비운다. 컨트롤러가 `JsonNode`로 받아 이 둘을 구분한다. 기존 값과 합친 결과 전체를 다시 검증한다.
- id는 서버가 만드는 UUID다. 경로와 본문의 id는 문자열로 받고, UUID로 해석되지 않으면 "없는 것"으로 본다. 경로 id면 404 `not-found`, 본문 `calendarId`면 422 `calendar-not-found`다.
- API 동작을 바꾸면 `frontend/src/mocks/`와 `frontend/src/lib/validateItem.ts`도 같이 바꾼다. `ItemValidator`는 `validateItem.ts`를 옮긴 것이라 두 파일의 규칙과 문구가 같아야 한다.

### 검증과 오류 응답

- 검증은 Bean Validation 없이 서비스 코드(`ItemValidator` 등)로 직접 한다. MSW와 문구까지 맞추기 위해서다.
- 모든 오류는 Problem Details(`application/problem+json`)로 나간다. 읽을 수 없는 요청은 400, 규칙 위반은 422, 경로 대상이 없으면 404다.
- 오류는 `ApiException`에 `ProblemType`을 담아 던진다. `GlobalExceptionHandler`가 응답으로 바꾼다.
- 새 오류를 추가할 때는 백엔드 설계 3.4절 표와 `common/ProblemType.java`를 같이 고친다. MSW가 다루는 경우라면 `frontend/src/mocks/problems.ts`도 고친다.
- Spring 기본 영어 오류나 HTML 오류 페이지가 응답으로 나가면 안 된다.

### 데이터베이스

- 스키마는 Flyway 마이그레이션(`src/main/resources/db/migration/V<n>__<설명>.sql`)으로만 바꾼다. JPA는 `ddl-auto: validate`라 스키마를 만들지 않는다.
- 이미 커밋된 마이그레이션 파일은 고치지 않는다. 변경은 새 버전 파일로 한다.
- 기본 캘린더(`내 캘린더`, `#4a7bd8`)는 `V1__init.sql`이 한 번만 넣는다. 캘린더를 지우면 소속 항목도 DB의 `ON DELETE CASCADE`로 같이 지워진다.

### 계층

- 기능별 패키지(`calendar`, `item`) 안에서 Controller → Service → Repository로 호출한다. 의존 방향은 `item` → `calendar`만 허용한다.
- 트랜잭션은 Service에 건다. 읽기 메서드는 `@Transactional(readOnly = true)`로 둔다.
- JSON 라이브러리는 Jackson 3(`tools.jackson.*` 패키지)이다. Jackson 2의 `com.fasterxml.jackson.databind`와 섞지 않는다.

## 테스트

- 테스트는 `src/test/java/com/simplecal/<패키지>/`에 JUnit 5와 AssertJ로 쓴다. 메서드 이름은 한국어로 쓴다(예: `시간은_HH_mm으로_돌려준다`).
- API 테스트는 `ApiTestBase`를 상속한다. 실제 HTTP로 상태 코드, `Content-Type`, `type`, `detail`, `instance`를 검사한다. DB는 `TestcontainersConfiguration`이 띄우는 PostgreSQL 18이다.
- `frontend/src/mocks/handlers.test.ts`에 있는 경우는 백엔드 테스트에도 있어야 한다.
- Docker 없이 돌릴 수 있는 테스트는 `ItemValidatorTest`뿐이다: `./gradlew test --tests 'com.simplecal.item.ItemValidatorTest'`.
