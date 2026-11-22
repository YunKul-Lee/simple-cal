# simple-cal 백엔드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프론트엔드의 MSW 가짜 API와 똑같이 동작하는 스프링부트 + PostgreSQL 백엔드를 만들어, `VITE_MOCK=off npm run dev`로 화면이 실제 백엔드에서 모두 동작하게 한다.

**Architecture:** `backend/`에 스프링부트 앱 하나. 기능별 패키지(`calendar`, `item`, `common`)에 엔티티·저장소·서비스·컨트롤러를 둔다. API JSON의 날짜·시간은 DTO에서 **문자열**로 주고받아(`YYYY-MM-DD`, `HH:mm`) 직렬화 모양을 고정하고, 검증은 MSW의 `validateItem`을 옮긴 순수 클래스 `ItemValidator` 한 곳에서 한다. PATCH는 Jackson `JsonNode`로 받아 "필드 없음"과 `null`을 구분해 기존 값에 합친 뒤 전체를 다시 검증한다. 스키마와 기본 캘린더는 Flyway.

**Tech Stack:** Spring Boot 4.2.0, Java 25, Gradle(Kotlin DSL, wrapper), Spring Web MVC, Spring Data JPA, Flyway(+ `flyway-database-postgresql`), PostgreSQL 18(이미지 `postgres:18`), Spring Boot Docker Compose 지원, Testcontainers(PostgreSQL) + JUnit 5 + AssertJ. Jackson은 Boot 4 기본인 Jackson 3(`tools.jackson.*`).

**Spec:** `docs/superpowers/specs/2026-11-22-simple-cal-backend-design.md` (그리고 API 계약이 있는 `docs/superpowers/specs/2026-11-22-simple-cal-design.md` 3.2·3.4) — 각 태스크 시작 전 함께 읽을 것.

## Global Constraints

- 모든 백엔드 코드는 `simple-cal/backend/`. 브랜치 `feat/backend`. 프론트 코드는 고치지 않는다(문서 제외).
- 기본 패키지 `com.simplecal`, 앱 클래스 `com.simplecal.SimpleCalApplication`. 포트 8080.
- API 계약·필드명은 선행 설계서 3.4 그대로(camelCase). Item JSON 필드: `id, calendarId, type, title, memo, date, startTime, endDate, endTime, done`. Calendar: `id, name, color, visible`. 응답에서 값 없는 필드는 생략하지 않고 `null`로 쓴다.
- 날짜는 `"YYYY-MM-DD"`, 시간은 `"HH:mm"`(초 없음) 문자열. 시간대 변환 없음.
- 상태 코드: POST 201, DELETE 204(본문 없음), 나머지 성공 200. 오류는 항상 `{ "message": string }` JSON.
- 오류 문구(정확히): `제목을 입력해 주세요` · `날짜 형식이 올바르지 않습니다` · `시간 형식이 올바르지 않습니다` · `할 일에는 종료를 지정할 수 없습니다` · `종료 시간을 입력해 주세요` · `시작 시간을 입력해 주세요` · `종료가 시작보다 빠를 수 없습니다` · `캘린더를 찾을 수 없습니다` · `이름을 입력해 주세요` · `찾을 수 없습니다`(404) · `from, to가 필요합니다` · `today가 필요합니다`. 이 계획이 추가하는 문구: `종류가 올바르지 않습니다` · `색 형식이 올바르지 않습니다` · `완료 여부가 올바르지 않습니다` · `요청 형식이 올바르지 않습니다` · `서버 오류가 발생했습니다`(500).
- id는 서버가 만드는 UUID. 경로·본문의 id는 **문자열로 받고**, UUID로 해석되지 않으면 "없는 것"으로 취급(경로 → 404, 본문 `calendarId` → 400 `캘린더를 찾을 수 없습니다`).
- 기본 캘린더: 이름 `내 캘린더`, 색 `#4a7bd8`, visible `true` — Flyway 마이그레이션으로 한 번만.
- 비밀값 커밋 금지. 단 `compose.yaml`의 로컬 개발용 기본 비밀번호는 예외(설계서).
- 테스트는 `test-writer` 서브에이전트가 쓰고(write → 실패 확인), 구현·커밋은 메인 세션(verify는 test-writer).

## Review Focus

1. **시간 JSON 모양**: `startTime: "10:00"`으로 만들면 응답도 `"10:00"`이어야 한다(`"10:00:00"`이 아니라). 화면은 문자열을 그대로 비교·저장하므로 초가 붙으면 다음 PATCH 검증과 표시가 깨진다. (Task 4 `시간은_HH_mm으로_돌려준다`)
2. **PATCH 빠짐 vs null**: 드래그로 하루 종일 줄에 놓으면 `{startTime:null, endTime:null}`만 오고 나머지는 유지돼야 하며, `{title:"x"}`만 보내면 시간이 지워지면 안 된다. (Task 4)
3. **기간 겹침 경계**: `from` 이전에 시작해 `from`에 끝나는 여러 날 일정은 포함, `to` 당일 시작 포함, `from` 전날 끝나는 것·`to` 다음 날 시작하는 것 제외. (Task 5)
4. **이상한 입력이 500이 아니라 JSON 400/404로**: UUID 아닌 경로 id, 깨진 JSON 본문, 모르는 `type` 값, `done: null`. (Task 3, Task 4)
5. **자정 넘김**: `date 2026-11-23 23:30 ~ endDate 2026-11-24 00:30` 일정은 유효하고, PATCH로 `endDate`만 `null`로 지우면(같은 날 00:30 < 23:30) 400 `종료가 시작보다 빠를 수 없습니다`이며 저장값은 그대로. (Task 2, Task 4)

---

## File Structure

```
backend/
├── build.gradle.kts, settings.gradle.kts, gradlew, gradlew.bat, gradle/wrapper/   (start.spring.io 생성)
├── compose.yaml                       로컬 개발 DB (postgres:18, 5432)
├── README.md                          실행 방법
└── src/
    ├── main/java/com/simplecal/
    │   ├── SimpleCalApplication.java
    │   ├── common/
    │   │   ├── ApiException.java           상태 코드 + 메시지를 가진 런타임 예외
    │   │   ├── ErrorResponse.java          record ErrorResponse(String message)
    │   │   ├── GlobalExceptionHandler.java 모든 예외 → {message} JSON
    │   │   └── Ids.java                    문자열 → Optional<UUID>
    │   ├── calendar/
    │   │   ├── CalendarEntity.java, CalendarRepository.java
    │   │   ├── CalendarDto.java            record (응답)
    │   │   ├── CalendarService.java, CalendarController.java
    │   └── item/
    │       ├── ItemEntity.java, ItemRepository.java
    │       ├── ItemDto.java                record (요청 겸 응답 모양, 문자열 날짜·시간)
    │       ├── ItemValidator.java          순수 검증 (validateItem 이식)
    │       ├── ItemService.java, ItemController.java
    ├── main/resources/
    │   ├── application.yaml
    │   └── db/migration/V1__init.sql      테이블 + 기본 캘린더
    └── test/java/com/simplecal/
        ├── TestcontainersConfiguration.java (start.spring.io 생성)
        ├── ApiTestBase.java               HTTP 헬퍼 + 매 테스트 DB 비우기
        ├── MigrationTest.java
        ├── calendar/CalendarApiTest.java
        ├── item/ItemValidatorTest.java
        ├── item/ItemApiTest.java
        └── item/ItemQueryApiTest.java
```

---

### Task 1: 프로젝트 골격, DB 스키마, 테스트 기반

**Files:**
- Create: `backend/` 전체 골격(start.spring.io), `backend/compose.yaml`, `backend/src/main/resources/application.yaml`, `backend/src/main/resources/db/migration/V1__init.sql`
- Create (test): `backend/src/test/java/com/simplecal/ApiTestBase.java`, `backend/src/test/java/com/simplecal/MigrationTest.java`
- Modify: `.claude/agents/test-writer.md` (백엔드도 맡도록)

**Interfaces:**
- Produces:
  - 테이블 `calendar(id uuid pk, name text not null, color text not null, visible boolean not null, seq bigserial)`, `item(id uuid pk, calendar_id uuid not null references calendar(id) on delete cascade, type text not null check (type in ('event','task')), title text not null, memo text, date date not null, start_time time, end_date date, end_time time, done boolean not null, seq bigserial)`. 목록 순서는 `seq` 오름차순(만든 순서).
  - `abstract class ApiTestBase` — `@SpringBootTest(webEnvironment = RANDOM_PORT)`, `@Import(TestcontainersConfiguration.class)`. 메서드:
    - `record Res(int status, JsonNode json)` (본문 없으면 `json`은 `null`)
    - `Res send(String method, String path, Object body)` — `java.net.http.HttpClient`로 `http://localhost:{port}{path}`, body는 Jackson으로 직렬화(`Map`/`String` 원문 모두 허용: `String`이면 그대로 보냄 — 깨진 JSON 테스트용)
    - `String createCalendar(String name)` → POST `/api/calendars` `{name, color:"#e08a2c"}` 후 id
    - `JsonNode createItem(Map<String,Object> input)` → POST `/api/items`, 201 단언 후 본문
    - `Map<String,Object> eventInput(String calId)` = `{calendarId, type:"event", title:"회의", memo:null, date:"2026-11-23", startTime:"10:00", endDate:null, endTime:"11:00", done:false}`, `taskInput(String calId)` = 같은 값에서 `type:"task", endTime:null` (둘 다 수정 가능한 `HashMap` 반환)
    - `@BeforeEach` `delete from item; delete from calendar` (JdbcTemplate)

- [ ] **Step 1: 골격 생성**

```bash
cd /Users/yklee/workspace/simple-cal
curl -s https://start.spring.io/starter.zip \
  -d type=gradle-project-kotlin -d language=java -d bootVersion=4.2.0 -d javaVersion=25 \
  -d groupId=com.simplecal -d artifactId=backend -d name=simple-cal -d packageName=com.simplecal \
  -d dependencies=web,data-jpa,flyway,postgresql,docker-compose,testcontainers \
  -o /tmp/simple-cal-backend.zip && unzip -q /tmp/simple-cal-backend.zip -d .
```

(zip 안에 `backend/` 폴더가 들어 있으므로 저장소 루트에 푼다. 풀고 나서 `backend/backend`가 생기지 않았는지 확인.)

생성된 앱 클래스 이름을 `SimpleCalApplication`으로 맞춘다. 생성된 `compose.yaml`은 아래 Step 2 내용으로 바꾼다. `build.gradle.kts`에 `flyway-database-postgresql`이 없으면 `implementation("org.flywaydb:flyway-database-postgresql")` 추가.

- [ ] **Step 2: `compose.yaml`·`application.yaml`·`V1__init.sql`**

`compose.yaml`: 서비스 `postgres`, 이미지 `postgres:18`, 포트 `5432:5432`, `POSTGRES_DB=simplecal`, `POSTGRES_USER=simplecal`, `POSTGRES_PASSWORD=simplecal`(로컬 전용). `application.yaml`: `spring.jpa.hibernate.ddl-auto: validate`, `spring.jpa.open-in-view: false`, `server.port: 8080`. `V1__init.sql`: 위 Interfaces의 두 테이블 + `insert into calendar (id, name, color, visible) values (gen_random_uuid(), '내 캘린더', '#4a7bd8', true)`.

- [ ] **Step 3: test-writer 에이전트 확장**

`.claude/agents/test-writer.md`의 description과 본문에 백엔드를 추가: 백엔드 계획은 `docs/superpowers/plans/2026-11-22-simple-cal-backend.md`, 스펙은 `docs/superpowers/specs/2026-11-22-simple-cal-backend-design.md`. 백엔드 테스트는 `backend/src/test/java/...`, 실행은 `cd backend && ./gradlew test --tests '<클래스>'`, verify는 `./gradlew test`. 제품 코드(`src/main`) 수정 금지 규칙은 동일.

- [ ] **Step 4: (test-writer write) `ApiTestBase`와 `MigrationTest`**

`MigrationTest`는 `@SpringBootTest` + `@Import(TestcontainersConfiguration.class)` + `@TestPropertySource(properties = "spring.application.name=migration-test")`(별도 컨텍스트 → 새 컨테이너 → 비우기 전 DB). `ApiTestBase`를 상속하지 않는다.

```java
@Test void 기본_캘린더가_하나_있다() {
  // select name, color, visible from calendar
  assertThat(rows).singleElement().satisfies(r -> {
    assertThat(r.get("name")).isEqualTo("내 캘린더");
    assertThat(r.get("color")).isEqualTo("#4a7bd8");
    assertThat(r.get("visible")).isEqualTo(true);
  });
}
@Test void 캘린더를_지우면_항목도_지워진다() {
  // insert calendar + item 직접 SQL, delete from calendar where id=?, then
  assertThat(count("item")).isZero();
}
```

- [ ] **Step 5: 실행해 확인**

Run: `cd backend && ./gradlew test --tests 'com.simplecal.MigrationTest'`
Expected: PASS (이 태스크는 스키마가 곧 구현이라 Step 2 후 바로 통과해야 정상. 실패하면 마이그레이션을 고친다). Testcontainers가 Docker를 못 찾으면 `DOCKER_HOST=unix:///Users/yklee/.docker/run/docker.sock`을 설정해 다시 실행하고, 그 방법을 Task 6 README에 적는다.

- [ ] **Step 6: 커밋**

```bash
git add backend .claude/agents/test-writer.md
git commit -m "feat(backend): scaffold Spring Boot app with schema, seed calendar and test base"
```

---

### Task 2: ItemValidator (순수 검증)

**Files:**
- Create: `backend/src/main/java/com/simplecal/item/ItemDto.java`, `backend/src/main/java/com/simplecal/item/ItemValidator.java`
- Test: `backend/src/test/java/com/simplecal/item/ItemValidatorTest.java`

**Interfaces:**
- Produces:
  - `record ItemDto(String id, String calendarId, String type, String title, String memo, String date, String startTime, String endDate, String endTime, Boolean done)` — 요청·응답 공용. 응답 시 `done`은 항상 non-null.
  - `final class ItemValidator { static Optional<String> validate(ItemDto in) }` — 오류 문구 또는 빈 값. 캘린더 존재 여부는 보지 않는다(서비스 몫).

규칙(이 순서로 첫 오류 반환, `frontend/src/lib/validateItem.ts`와 같음):
1. `type`이 `"event"`/`"task"`가 아니면 `종류가 올바르지 않습니다`
2. `done == null` → `완료 여부가 올바르지 않습니다`
3. `title`이 null이거나 공백뿐 → `제목을 입력해 주세요`
4. `date`(필수)·`endDate`(있으면)가 `\d{4}-\d{2}-\d{2}`가 아니거나 `LocalDate.parse` 실패 → `날짜 형식이 올바르지 않습니다`
5. `startTime`·`endTime`(있으면)이 `\d{2}:\d{2}`가 아니거나 `LocalTime.parse` 실패 → `시간 형식이 올바르지 않습니다`
6. task: `endDate` 또는 `endTime`이 있으면 `할 일에는 종료를 지정할 수 없습니다`, 아니면 통과
7. event: 시작만 있으면 `종료 시간을 입력해 주세요`, 종료만 있으면 `시작 시간을 입력해 주세요`
8. event: `(endDate ?? date, endTime ?? 00:00) < (date, startTime ?? 00:00)` → `종료가 시작보다 빠를 수 없습니다`

- [ ] **Step 1: (test-writer write) `ItemValidatorTest`** — 기준값 `base = event("회의", date "2026-11-23", 10:00~11:00, done false)`, `baseTask = base에서 type task, endTime null`.

```java
기준_이벤트는_유효            validate(base) → empty
제목이_공백뿐이면_오류        title "  " → "제목을 입력해 주세요"
날짜_형식이_틀리면_오류       date "2026/11/23" → "날짜 형식이 올바르지 않습니다"
없는_날짜면_오류             date "2026-02-30" → "날짜 형식이 올바르지 않습니다"
시간_형식이_틀리면_오류       startTime "25:00" → "시간 형식이 올바르지 않습니다"
시작만_있으면_종료_필요       endTime null → "종료 시간을 입력해 주세요"
종료만_있으면_시작_필요       startTime null → "시작 시간을 입력해 주세요"
같은_날_종료가_이르면_오류    endTime "09:00" → "종료가 시작보다 빠를 수 없습니다"
종료_날짜가_이르면_오류       endDate "2026-11-22" → "종료가 시작보다 빠를 수 없습니다"
자정을_넘기는_이벤트는_유효   startTime "23:30", endDate "2026-11-24", endTime "00:30" → empty
자정_넘김에서_종료날짜를_지우면_오류  위 값에서 endDate null → "종료가 시작보다 빠를 수 없습니다"
할_일에는_종료를_지정할_수_없다  baseTask+endTime "11:00", baseTask+endDate "2026-11-24" 둘 다 → "할 일에는 종료를 지정할 수 없습니다"
여러_날_하루_종일_이벤트는_유효  startTime/endTime null, endDate "2026-11-25" → empty
모르는_종류면_오류            type "meeting" → "종류가 올바르지 않습니다"
완료여부가_null이면_오류      done null → "완료 여부가 올바르지 않습니다"
```

- [ ] **Step 2: 실패 확인** — Run: `cd backend && ./gradlew test --tests 'com.simplecal.item.ItemValidatorTest'` / Expected: 컴파일 실패(`ItemValidator` 없음)
- [ ] **Step 3: `ItemDto`, `ItemValidator.validate` 구현** — 시작/끝 비교는 `LocalDateTime.of(date, time ?? MIDNIGHT)` 비교.
- [ ] **Step 4: 통과 확인** — 같은 명령, Expected: 15 tests PASS
- [ ] **Step 5: 커밋** — `git commit -m "feat(backend): port item validation rules from the frontend"`

---

### Task 3: 오류 처리 + 캘린더 API

**Files:**
- Create: `common/ApiException.java`, `common/ErrorResponse.java`, `common/GlobalExceptionHandler.java`, `common/Ids.java`, `calendar/CalendarEntity.java`, `calendar/CalendarRepository.java`, `calendar/CalendarDto.java`, `calendar/CalendarService.java`, `calendar/CalendarController.java` (모두 `backend/src/main/java/com/simplecal/` 아래)
- Test: `backend/src/test/java/com/simplecal/calendar/CalendarApiTest.java`

**Interfaces:**
- Consumes: `ApiTestBase` (Task 1)
- Produces:
  - `class ApiException extends RuntimeException { ApiException(HttpStatus status, String message); static ApiException badRequest(String m); static ApiException notFound() /* "찾을 수 없습니다" */ }`
  - `final class Ids { static Optional<UUID> parse(String s) }`
  - `record CalendarDto(String id, String name, String color, boolean visible)`
  - `CalendarService`: `List<CalendarDto> list()`, `CalendarDto create(JsonNode body)`, `CalendarDto update(String id, JsonNode patch)`, `void delete(String id)`, `boolean exists(UUID id)` (Item 쪽에서 사용)
  - `GlobalExceptionHandler` 매핑: `ApiException` → 그 상태·메시지 / 본문 JSON 파싱 실패(`HttpMessageNotReadableException`) → 400 `요청 형식이 올바르지 않습니다` / 없는 경로(`NoResourceFoundException`)·허용 안 된 메서드 → 404 `찾을 수 없습니다` / 그 외 → 500 `서버 오류가 발생했습니다`(로그 남김)

규칙: POST·PATCH 본문은 `JsonNode`로 받는다. `name`: 문자열이고 trim 후 비어 있지 않아야(아니면 `이름을 입력해 주세요`). `color`: `^#[0-9a-fA-F]{6}$`(아니면 `색 형식이 올바르지 않습니다`). PATCH의 `visible`: 있으면 boolean이어야(아니면 `요청 형식이 올바르지 않습니다`). PATCH에서 `name`/`color`가 **있으면** 같은 규칙, 없으면 유지. 저장 이름은 받은 그대로(trim하지 않음 — MSW와 같음).

- [ ] **Step 1: (test-writer write) `CalendarApiTest extends ApiTestBase`**

```java
캘린더_목록은_만든_순서        create "A","B" → GET /api/calendars 200, names == ["A","B"]
캘린더_생성                    POST {name:"회사", color:"#e08a2c"} → 201, json {name:"회사", color:"#e08a2c", visible:true}, id는 UUID
이름이_비면_400                POST {name:"  ", color:"#e08a2c"} → 400 message "이름을 입력해 주세요"
색이_틀리면_400                POST {name:"회사", color:"red"} → 400 "색 형식이 올바르지 않습니다"
PATCH는_보낸_필드만_바꾼다      PATCH {visible:false} → 200, name "회사" 유지, visible false; 다시 GET해도 false
없는_캘린더_PATCH는_404         PATCH /api/calendars/{랜덤UUID} {visible:false} → 404 "찾을 수 없습니다"
UUID가_아닌_id는_404            PATCH /api/calendars/nope → 404 "찾을 수 없습니다"; DELETE /api/calendars/nope → 404
캘린더_삭제                    DELETE → 204, 본문 없음; GET 목록에 없음
깨진_JSON은_400                 POST 본문 문자열 "{" → 400 "요청 형식이 올바르지 않습니다"
없는_경로는_JSON_404            GET /api/nothing → 404, json.message "찾을 수 없습니다"
```

- [ ] **Step 2: 실패 확인** — Run: `cd backend && ./gradlew test --tests 'com.simplecal.calendar.CalendarApiTest'` / Expected: FAIL (404 또는 컴파일 오류)
- [ ] **Step 3: 구현** — 위 Interfaces대로. 컨트롤러 경로 `/api/calendars`, `/api/calendars/{id}`.
- [ ] **Step 4: 통과 확인** — 같은 명령, Expected: 10 tests PASS
- [ ] **Step 5: 커밋** — `git commit -m "feat(backend): calendar API with JSON error handling"`

---

### Task 4: 항목 생성·수정·삭제

**Files:**
- Create: `item/ItemEntity.java`, `item/ItemRepository.java`, `item/ItemService.java`, `item/ItemController.java`
- Test: `backend/src/test/java/com/simplecal/item/ItemApiTest.java`

**Interfaces:**
- Consumes: `ItemDto`, `ItemValidator.validate` (Task 2), `CalendarService.exists`, `Ids.parse`, `ApiException` (Task 3), `ApiTestBase` (Task 1)
- Produces:
  - `ItemService`: `ItemDto create(JsonNode body)`, `ItemDto update(String id, JsonNode patch)`, `void delete(String id)`
  - 엔티티 ↔ `ItemDto` 변환: 날짜 `LocalDate.toString()`, 시간 `DateTimeFormatter.ofPattern("HH:mm")`

규칙:
- POST: 본문을 `ItemDto`로 읽되 `memo`가 없으면 `null`, `done`이 없으면 `false`. 본문의 `id`는 무시. 순서: `calendarId`가 UUID가 아니거나 없는 캘린더 → 400 `캘린더를 찾을 수 없습니다`, 그다음 `ItemValidator`.
- PATCH: 기존 항목을 `ItemDto`로 바꾼 뒤, 본문 `JsonNode`의 **있는 필드만** 덮어쓴다(값이 `null`이면 `null`로). `id` 필드는 무시. 합친 결과에 POST와 같은 검사(캘린더 → 검증). 실패하면 저장하지 않는다. 필드 값의 JSON 타입이 틀리면(예: `title: 3`, `done: "yes"`) 400 `요청 형식이 올바르지 않습니다`.
- DELETE: 204. 없는 id·UUID 아닌 id → 404.

- [ ] **Step 1: (test-writer write) `ItemApiTest extends ApiTestBase`** — 각 테스트는 `createCalendar("기본")`로 시작.

```java
일정_생성                     POST eventInput → 201, json == eventInput + id(UUID 문자열), done false
시간은_HH_mm으로_돌려준다       위 응답 startTime "10:00", endTime "11:00" (정확히 문자열 일치)
memo와_done이_없으면_기본값     eventInput에서 memo·done 키 제거 → 201, memo null, done false
없는_캘린더로_생성하면_400      calendarId 랜덤UUID → 400 "캘린더를 찾을 수 없습니다"; calendarId "nope" → 같은 결과
검증_오류는_400                 endTime "09:00" → 400 "종료가 시작보다 빠를 수 없습니다"
모르는_종류는_400               type "meeting" → 400 "종류가 올바르지 않습니다"
PATCH는_빠진_필드를_유지하고_null은_비운다  task(memo "a", startTime "09:00") PATCH {startTime:null} → 200, startTime null, memo "a"
제목만_바꾸면_시간은_유지       event PATCH {title:"바꿈"} → title "바꿈", startTime "10:00", endTime "11:00"
하루_종일로_바꾸기              event PATCH {startTime:null, endTime:null} → 200, 둘 다 null, date 유지
PATCH_결과가_유효하지_않으면_400_저장_안_함  event PATCH {endTime:"09:00"} → 400 "종료가 시작보다 빠를 수 없습니다"; 이후 GET /api/items?from=2026-11-23&to=2026-11-23 의 그 항목 endTime "11:00"
자정_넘김에서_endDate를_지우면_400  event(23:30, endDate 2026-11-24, 00:30) PATCH {endDate:null} → 400 "종료가 시작보다 빠를 수 없습니다"
done_null은_400                 task PATCH {done:null} → 400 "완료 여부가 올바르지 않습니다"
타입이_틀린_값은_400            task PATCH {done:"yes"} → 400 "요청 형식이 올바르지 않습니다"
본문_id는_무시                  PATCH {id:"other", title:"x"} → 200, json.id == 원래 id
없는_항목_PATCH는_404           PATCH /api/items/nope {title:"바꿈"} → 404 "찾을 수 없습니다"
삭제                            DELETE → 204; 다시 DELETE → 404
```

(`GET /api/items` 단언은 Task 5 전에는 실패하므로, 이 태스크에서는 `PATCH_결과가…` 테스트의 "저장 안 함" 확인을 `JdbcTemplate`로 `select end_time from item where id=?` == `11:00`으로 한다.)

- [ ] **Step 2: 실패 확인** — Run: `cd backend && ./gradlew test --tests 'com.simplecal.item.ItemApiTest'` / Expected: FAIL
- [ ] **Step 3: 구현** — 경로 `POST /api/items`, `PATCH /api/items/{id}`, `DELETE /api/items/{id}`.
- [ ] **Step 4: 통과 확인** — 같은 명령, Expected: 16 tests PASS
- [ ] **Step 5: 커밋** — `git commit -m "feat(backend): item create, patch with absent-vs-null merge, delete"`

---

### Task 5: 기간 조회와 밀린 할 일

**Files:**
- Modify: `item/ItemRepository.java`, `item/ItemService.java`, `item/ItemController.java`
- Test: `backend/src/test/java/com/simplecal/item/ItemQueryApiTest.java`

**Interfaces:**
- Consumes: Task 4의 `ItemService`·엔티티↔`ItemDto` 변환, `ApiTestBase`
- Produces:
  - `ItemService`: `List<ItemDto> listRange(LocalDate from, LocalDate to)`, `List<ItemDto> listOverdue(LocalDate today)`
  - `GET /api/items?from=&to=` — 둘 중 하나라도 없으면 400 `from, to가 필요합니다`, 형식이 틀리면 400 `날짜 형식이 올바르지 않습니다`. 조건 `date <= to AND coalesce(end_date, date) >= from`, `seq` 순.
  - `GET /api/items/overdue?today=` — 없으면 400 `today가 필요합니다`, 형식 틀리면 400 `날짜 형식이 올바르지 않습니다`. 조건 `type = 'task' AND done = false AND date < today`, `seq` 순.
  - 쿼리 파라미터는 `@RequestParam(required = false) String`으로 받아 직접 검사(문구를 맞추기 위해). `/api/items/overdue`가 `{id}` 경로와 겹치지 않게 GET에는 `{id}` 매핑을 만들지 않는다.

- [ ] **Step 1: (test-writer write) `ItemQueryApiTest extends ApiTestBase`**

```java
기간_조회는_겹치는_항목을_포함한다   // MSW 테스트 이식
  multiDay = event date 2026-11-20, endDate 2026-11-24, 시간 null
  after    = task date 2026-11-30
  lastDay  = task date 2026-11-29
  GET from=2026-11-23&to=2026-11-29 → ids == [multiDay, lastDay] (이 순서)
기간_경계                              // Review Focus 3
  endsOnFrom   = event 2026-11-20 ~ endDate 2026-11-23 (하루 종일)  → 포함
  startsOnTo   = task 2026-11-29                                    → 포함
  endsBefore   = event 2026-11-20 ~ endDate 2026-11-22              → 제외
  startsAfter  = task 2026-11-30                                    → 제외
  GET from=2026-11-23&to=2026-11-29 → ids 정확히 [endsOnFrom, startsOnTo]
숨긴_캘린더의_항목도_돌려준다          캘린더 PATCH visible false 후에도 그 항목 포함
from_to가_없으면_400                   GET /api/items?from=2026-11-23 → 400 "from, to가 필요합니다"
날짜_형식이_틀리면_400                  GET /api/items?from=2026-11-23&to=x → 400 "날짜 형식이 올바르지 않습니다"
밀린_할_일_조회                         // MSW 테스트 이식
  overdue = task 2026-11-20; 완료된 task 2026-11-20; event 2026-11-20; task 2026-11-22
  GET /api/items/overdue?today=2026-11-22 → ids == [overdue]
today가_없으면_400                       GET /api/items/overdue → 400 "today가 필요합니다"
캘린더_삭제는_소속_항목도_지운다         item 생성 → DELETE 캘린더 204 → GET from=2026-01-01&to=2026-12-31 에 그 id 없음
```

- [ ] **Step 2: 실패 확인** — Run: `cd backend && ./gradlew test --tests 'com.simplecal.item.ItemQueryApiTest'` / Expected: FAIL
- [ ] **Step 3: 구현** — 저장소 쿼리는 JPQL `where i.date <= :to and coalesce(i.endDate, i.date) >= :from order by i.seq` 등.
- [ ] **Step 4: 통과 확인** — 같은 명령 후 전체: `cd backend && ./gradlew test`, Expected: 전체 PASS (MigrationTest 2 + Validator 15 + Calendar 10 + Item 16 + Query 8)
- [ ] **Step 5: 커밋** — `git commit -m "feat(backend): range and overdue item queries"`

---

### Task 6: 화면과 연결해 확인, README

**Files:**
- Create: `backend/README.md`
- Modify: `frontend/README.md` (백엔드 연결 실행법 한 단락)

**Interfaces:**
- Consumes: 완성된 백엔드 전체

- [ ] **Step 1: 백엔드 실행** — `cd backend && ./gradlew bootRun` (Docker Compose 지원이 `compose.yaml`의 PostgreSQL을 자동 기동). 확인: `curl -s localhost:8080/api/calendars` → `[{"id":"…","name":"내 캘린더","color":"#4a7bd8","visible":true}]`
- [ ] **Step 2: 화면 실행** — `cd frontend && VITE_MOCK=off npm run dev`
- [ ] **Step 3: 브라우저 확인 (Playwright MCP)** — 설계서 3.5 목록: 캘린더 만들기·숨기기·삭제, 빠른 생성(시간 칸·하루 종일 줄), 편집 창(일정↔할 일 전환, 삭제), 드래그 이동·길이 조절·시간 칸↔하루 종일 줄, 할 일 체크, 새로고침 후 유지, 밀린 할 일 오늘 표시. 각 동작 후 `curl`이나 DB로 저장값 확인, 브라우저 콘솔·백엔드 로그에 오류 없음.
- [ ] **Step 4: 프론트 회귀** — `cd frontend && npm test && npm run test:e2e` → 78 + 8 PASS (MSW 기준 그대로)
- [ ] **Step 5: README** — `backend/README.md`: 요구사항(JDK 25, Docker), `./gradlew bootRun`, `./gradlew test`(Testcontainers가 Docker 필요), DB 접속 정보(로컬 전용), 화면 연결 방법. `frontend/README.md`에 "실제 백엔드로: 백엔드 실행 후 `VITE_MOCK=off npm run dev`" 추가.
- [ ] **Step 6: 커밋** — `git commit -m "docs: how to run the backend and connect the frontend"`
