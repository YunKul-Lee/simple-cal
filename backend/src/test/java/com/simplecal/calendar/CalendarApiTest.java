package com.simplecal.calendar;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.simplecal.ApiTestBase;

import tools.jackson.databind.JsonNode;

class CalendarApiTest extends ApiTestBase {

	private List<String> names(JsonNode array) {
		List<String> names = new ArrayList<>();
		for (JsonNode n : array) {
			names.add(n.path("name").asString());
		}
		return names;
	}

	private List<String> ids(JsonNode array) {
		List<String> ids = new ArrayList<>();
		for (JsonNode n : array) {
			ids.add(n.path("id").asString());
		}
		return ids;
	}

	@Test
	void 캘린더_목록은_만든_순서() {
		createCalendar("A");
		createCalendar("B");

		Res res = send("GET", "/api/calendars", null);

		assertThat(res.status()).isEqualTo(200);
		assertThat(res.json()).isNotNull();
		assertThat(res.json().isArray()).isTrue();
		assertThat(names(res.json())).containsExactly("A", "B");
	}

	@Test
	void 캘린더_생성() {
		Res res = send("POST", "/api/calendars", Map.of("name", "회사", "color", "#e08a2c"));

		assertThat(res.status()).isEqualTo(201);
		JsonNode json = res.json();
		assertThat(json).isNotNull();
		assertThat(json.path("name").asString()).isEqualTo("회사");
		assertThat(json.path("color").asString()).isEqualTo("#e08a2c");
		assertThat(json.path("visible").isBoolean()).isTrue();
		assertThat(json.path("visible").asBoolean()).isTrue();
		String id = json.path("id").asString();
		assertThatCode(() -> UUID.fromString(id)).doesNotThrowAnyException();
	}

	@Test
	void 이름이_비면_422() {
		Res res = send("POST", "/api/calendars", Map.of("name", "  ", "color", "#e08a2c"));

		assertProblem(res, 422, "name-required", "이름을 입력해 주세요");
	}

	@Test
	void 색이_틀리면_422() {
		Res res = send("POST", "/api/calendars", Map.of("name", "회사", "color", "red"));

		assertProblem(res, 422, "invalid-color", "색 형식이 올바르지 않습니다");
	}

	@Test
	void 이름_타입이_틀리면_400() {
		Res res = send("POST", "/api/calendars", Map.of("name", 5, "color", "#e08a2c"));

		assertProblem(res, 400, "malformed-request", "요청 형식이 올바르지 않습니다");
	}

	@Test
	void 색_타입이_틀리면_400() {
		Res res = send("POST", "/api/calendars", Map.of("name", "회사", "color", 5));

		assertProblem(res, 400, "malformed-request", "요청 형식이 올바르지 않습니다");
	}

	@Test
	void 객체가_아닌_본문은_400() {
		Res post = send("POST", "/api/calendars", "[]");
		assertProblem(post, 400, "malformed-request", "요청 형식이 올바르지 않습니다");

		String id = createCalendar("회사");
		Res patch = send("PATCH", "/api/calendars/" + id, "[]");
		assertProblem(patch, 400, "malformed-request", "요청 형식이 올바르지 않습니다");

		Res list = send("GET", "/api/calendars", null);
		assertThat(list.status()).isEqualTo(200);
		JsonNode found = null;
		for (JsonNode n : list.json()) {
			if (id.equals(n.path("id").asString())) {
				found = n;
			}
		}
		assertThat(found).as("목록에 그 캘린더").isNotNull();
		assertThat(found.path("name").asString()).isEqualTo("회사");
	}

	@Test
	void PATCH는_보낸_필드만_바꾼다() {
		String id = createCalendar("회사");

		Res res = send("PATCH", "/api/calendars/" + id, Map.of("visible", false));

		assertThat(res.status()).isEqualTo(200);
		assertThat(res.json().path("name").asString()).isEqualTo("회사");
		assertThat(res.json().path("color").asString()).isEqualTo("#e08a2c");
		assertThat(res.json().path("visible").isBoolean()).isTrue();
		assertThat(res.json().path("visible").asBoolean()).isFalse();

		Res list = send("GET", "/api/calendars", null);
		assertThat(list.status()).isEqualTo(200);
		JsonNode found = null;
		for (JsonNode n : list.json()) {
			if (id.equals(n.path("id").asString())) {
				found = n;
			}
		}
		assertThat(found).as("목록에 수정한 캘린더").isNotNull();
		assertThat(found.path("name").asString()).isEqualTo("회사");
		assertThat(found.path("visible").asBoolean()).isFalse();
	}

	@Test
	void PATCH_visible_타입이_틀리면_400() {
		String id = createCalendar("회사");

		Res res = send("PATCH", "/api/calendars/" + id, Map.of("visible", "no"));

		assertProblem(res, 400, "malformed-request", "요청 형식이 올바르지 않습니다");
	}

	@Test
	void 없는_캘린더_PATCH는_404() {
		UUID missing = UUID.randomUUID();

		Res res = send("PATCH", "/api/calendars/" + missing, Map.of("visible", false));

		assertProblem(res, 404, "not-found", "찾을 수 없습니다");
		assertThat(res.json().path("instance").asString()).isEqualTo("/api/calendars/" + missing);
	}

	@Test
	void UUID가_아닌_id는_404() {
		Res patch = send("PATCH", "/api/calendars/nope", Map.of("visible", false));
		assertProblem(patch, 404, "not-found", "찾을 수 없습니다");

		Res delete = send("DELETE", "/api/calendars/nope", null);
		assertProblem(delete, 404, "not-found", "찾을 수 없습니다");
	}

	@Test
	void 캘린더_삭제() {
		String id = createCalendar("회사");

		Res res = send("DELETE", "/api/calendars/" + id, null);

		assertThat(res.status()).isEqualTo(204);
		assertThat(res.json()).as("본문 없음").isNull();

		Res list = send("GET", "/api/calendars", null);
		assertThat(list.status()).isEqualTo(200);
		assertThat(ids(list.json())).doesNotContain(id);
	}
}
