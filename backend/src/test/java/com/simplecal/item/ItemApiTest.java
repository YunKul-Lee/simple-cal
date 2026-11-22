package com.simplecal.item;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.simplecal.ApiTestBase;

import tools.jackson.databind.JsonNode;

class ItemApiTest extends ApiTestBase {

	private static Map<String, Object> body(Object... kv) {
		Map<String, Object> m = new HashMap<>();
		for (int i = 0; i < kv.length; i += 2) {
			m.put((String) kv[i], kv[i + 1]);
		}
		return m;
	}

	@Test
	void 일정_생성() {
		String calId = createCalendar("기본");
		Map<String, Object> input = eventInput(calId);

		Res res = send("POST", "/api/items", input);

		assertThat(res.status()).isEqualTo(201);
		JsonNode json = res.json();
		assertThat(json).isNotNull();
		String id = json.path("id").asString();
		assertThatCode(() -> UUID.fromString(id)).doesNotThrowAnyException();
		assertThat(json.path("calendarId").asString()).isEqualTo(calId);
		assertThat(json.path("type").asString()).isEqualTo("event");
		assertThat(json.path("title").asString()).isEqualTo("회의");
		assertThat(json.has("memo")).isTrue();
		assertThat(json.get("memo").isNull()).isTrue();
		assertThat(json.path("date").asString()).isEqualTo("2026-11-23");
		assertThat(json.path("startTime").asString()).isEqualTo("10:00");
		assertThat(json.has("endDate")).isTrue();
		assertThat(json.get("endDate").isNull()).isTrue();
		assertThat(json.path("endTime").asString()).isEqualTo("11:00");
		assertThat(json.path("done").isBoolean()).isTrue();
		assertThat(json.path("done").asBoolean()).isFalse();
	}

	@Test
	void 시간은_HH_mm으로_돌려준다() {
		String calId = createCalendar("기본");

		Res res = send("POST", "/api/items", eventInput(calId));

		assertThat(res.status()).isEqualTo(201);
		assertThat(res.json().path("startTime").isString()).isTrue();
		assertThat(res.json().path("startTime").asString()).isEqualTo("10:00");
		assertThat(res.json().path("endTime").isString()).isTrue();
		assertThat(res.json().path("endTime").asString()).isEqualTo("11:00");
	}

	@Test
	void memo와_done이_없으면_기본값() {
		String calId = createCalendar("기본");
		Map<String, Object> input = eventInput(calId);
		input.remove("memo");
		input.remove("done");

		Res res = send("POST", "/api/items", input);

		assertThat(res.status()).isEqualTo(201);
		assertThat(res.json().has("memo")).isTrue();
		assertThat(res.json().get("memo").isNull()).isTrue();
		assertThat(res.json().path("done").isBoolean()).isTrue();
		assertThat(res.json().path("done").asBoolean()).isFalse();
	}

	@Test
	void 없는_캘린더로_생성하면_422() {
		createCalendar("기본");

		Res random = send("POST", "/api/items", eventInput(UUID.randomUUID().toString()));
		assertProblem(random, 422, "calendar-not-found", "캘린더를 찾을 수 없습니다");

		Res nope = send("POST", "/api/items", eventInput("nope"));
		assertProblem(nope, 422, "calendar-not-found", "캘린더를 찾을 수 없습니다");
	}

	@Test
	void 검증_오류는_422() {
		String calId = createCalendar("기본");
		Map<String, Object> input = eventInput(calId);
		input.put("endTime", "09:00");

		Res res = send("POST", "/api/items", input);

		assertProblem(res, 422, "end-before-start", "종료가 시작보다 빠를 수 없습니다");
	}

	@Test
	void 모르는_종류는_422() {
		String calId = createCalendar("기본");
		Map<String, Object> input = eventInput(calId);
		input.put("type", "meeting");

		Res res = send("POST", "/api/items", input);

		assertProblem(res, 422, "invalid-type", "종류가 올바르지 않습니다");
	}

	@Test
	void PATCH는_빠진_필드를_유지하고_null은_비운다() {
		String calId = createCalendar("기본");
		Map<String, Object> input = taskInput(calId);
		input.put("memo", "a");
		input.put("startTime", "09:00");
		String id = createItem(input).path("id").asString();

		Res res = send("PATCH", "/api/items/" + id, body("startTime", null));

		assertThat(res.status()).isEqualTo(200);
		assertThat(res.json().has("startTime")).isTrue();
		assertThat(res.json().get("startTime").isNull()).isTrue();
		assertThat(res.json().path("memo").asString()).isEqualTo("a");
	}

	@Test
	void 제목만_바꾸면_시간은_유지() {
		String calId = createCalendar("기본");
		String id = createItem(eventInput(calId)).path("id").asString();

		Res res = send("PATCH", "/api/items/" + id, body("title", "바꿈"));

		assertThat(res.status()).isEqualTo(200);
		assertThat(res.json().path("title").asString()).isEqualTo("바꿈");
		assertThat(res.json().path("startTime").asString()).isEqualTo("10:00");
		assertThat(res.json().path("endTime").asString()).isEqualTo("11:00");
	}

	@Test
	void 하루_종일로_바꾸기() {
		String calId = createCalendar("기본");
		String id = createItem(eventInput(calId)).path("id").asString();

		Res res = send("PATCH", "/api/items/" + id, body("startTime", null, "endTime", null));

		assertThat(res.status()).isEqualTo(200);
		assertThat(res.json().has("startTime")).isTrue();
		assertThat(res.json().get("startTime").isNull()).isTrue();
		assertThat(res.json().has("endTime")).isTrue();
		assertThat(res.json().get("endTime").isNull()).isTrue();
		assertThat(res.json().path("date").asString()).isEqualTo("2026-11-23");
	}

	@Test
	void PATCH_결과가_유효하지_않으면_422_저장_안_함() {
		String calId = createCalendar("기본");
		String id = createItem(eventInput(calId)).path("id").asString();

		Res res = send("PATCH", "/api/items/" + id, body("endTime", "09:00"));

		assertProblem(res, 422, "end-before-start", "종료가 시작보다 빠를 수 없습니다");
		LocalTime saved = jdbc.queryForObject("select end_time from item where id = ?", LocalTime.class,
				UUID.fromString(id));
		assertThat(saved).isEqualTo(LocalTime.of(11, 0));
	}

	@Test
	void 자정_넘김에서_endDate를_지우면_422() {
		String calId = createCalendar("기본");
		Map<String, Object> input = eventInput(calId);
		input.put("startTime", "23:30");
		input.put("endDate", "2026-11-24");
		input.put("endTime", "00:30");
		String id = createItem(input).path("id").asString();

		Res res = send("PATCH", "/api/items/" + id, body("endDate", null));

		assertProblem(res, 422, "end-before-start", "종료가 시작보다 빠를 수 없습니다");
	}

	@Test
	void done_null은_422() {
		String calId = createCalendar("기본");
		String id = createItem(taskInput(calId)).path("id").asString();

		Res res = send("PATCH", "/api/items/" + id, body("done", null));

		assertProblem(res, 422, "invalid-done", "완료 여부가 올바르지 않습니다");
	}

	@Test
	void 타입이_틀린_값은_400() {
		String calId = createCalendar("기본");
		String id = createItem(taskInput(calId)).path("id").asString();

		Res res = send("PATCH", "/api/items/" + id, body("done", "yes"));

		assertProblem(res, 400, "malformed-request", "요청 형식이 올바르지 않습니다");
	}

	@Test
	void 본문_id는_무시() {
		String calId = createCalendar("기본");
		String id = createItem(eventInput(calId)).path("id").asString();

		Res res = send("PATCH", "/api/items/" + id, body("id", "other", "title", "x"));

		assertThat(res.status()).isEqualTo(200);
		assertThat(res.json().path("id").asString()).isEqualTo(id);
	}

	@Test
	void 없는_항목_PATCH는_404() {
		createCalendar("기본");

		Res res = send("PATCH", "/api/items/nope", body("title", "바꿈"));

		assertProblem(res, 404, "not-found", "찾을 수 없습니다");
	}

	@Test
	void 삭제() {
		String calId = createCalendar("기본");
		String id = createItem(eventInput(calId)).path("id").asString();

		Res first = send("DELETE", "/api/items/" + id, null);
		assertThat(first.status()).isEqualTo(204);
		assertThat(first.json()).isNull();

		Res again = send("DELETE", "/api/items/" + id, null);
		assertProblem(again, 404, "not-found", "찾을 수 없습니다");
	}
}
