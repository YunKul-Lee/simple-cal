package com.simplecal.item;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.simplecal.ApiTestBase;

import tools.jackson.databind.JsonNode;

class ItemQueryApiTest extends ApiTestBase {

	private static List<String> ids(Res res) {
		assertThat(res.status()).as("status").isEqualTo(200);
		assertThat(res.json()).as("body").isNotNull();
		assertThat(res.json().isArray()).as("배열 응답").isTrue();
		List<String> out = new ArrayList<>();
		for (JsonNode n : res.json()) {
			out.add(n.path("id").asString());
		}
		return out;
	}

	/** 하루 종일 여러 날 일정: 시간 없음, endDate 지정. */
	private Map<String, Object> allDayEvent(String calId, String date, String endDate) {
		Map<String, Object> m = eventInput(calId);
		m.put("date", date);
		m.put("startTime", null);
		m.put("endDate", endDate);
		m.put("endTime", null);
		return m;
	}

	private Map<String, Object> task(String calId, String date) {
		Map<String, Object> m = taskInput(calId);
		m.put("date", date);
		return m;
	}

	@Test
	void 기간_조회는_겹치는_항목을_포함한다() {
		String calId = createCalendar("기본");
		String multiDay = createItem(allDayEvent(calId, "2026-11-20", "2026-11-24")).path("id").asString();
		String after = createItem(task(calId, "2026-11-30")).path("id").asString();
		String lastDay = createItem(task(calId, "2026-11-29")).path("id").asString();

		Res res = send("GET", "/api/items?from=2026-11-23&to=2026-11-29", null);

		assertThat(ids(res)).containsExactly(multiDay, lastDay).doesNotContain(after);
	}

	@Test
	void 기간_경계() {
		String calId = createCalendar("기본");
		String endsOnFrom = createItem(allDayEvent(calId, "2026-11-20", "2026-11-23")).path("id").asString();
		String startsOnTo = createItem(task(calId, "2026-11-29")).path("id").asString();
		String endsBefore = createItem(allDayEvent(calId, "2026-11-20", "2026-11-22")).path("id").asString();
		String startsAfter = createItem(task(calId, "2026-11-30")).path("id").asString();

		Res res = send("GET", "/api/items?from=2026-11-23&to=2026-11-29", null);

		assertThat(ids(res)).containsExactly(endsOnFrom, startsOnTo).doesNotContain(endsBefore, startsAfter);
	}

	@Test
	void 숨긴_캘린더의_항목도_돌려준다() {
		String calId = createCalendar("숨김");
		String itemId = createItem(eventInput(calId)).path("id").asString();
		Res patch = send("PATCH", "/api/calendars/" + calId, Map.of("visible", false));
		assertThat(patch.status()).as("캘린더 PATCH status").isEqualTo(200);
		assertThat(patch.json().path("visible").asBoolean()).isFalse();

		Res res = send("GET", "/api/items?from=2026-11-23&to=2026-11-29", null);

		assertThat(ids(res)).contains(itemId);
	}

	@Test
	void from_to가_없으면_400() {
		Res res = send("GET", "/api/items?from=2026-11-23", null);

		assertProblem(res, 400, "missing-parameter", "from, to가 필요합니다");
		assertThat(res.json().path("instance").asString()).isEqualTo("/api/items");
	}

	@Test
	void 날짜_형식이_틀리면_400() {
		Res res = send("GET", "/api/items?from=2026-11-23&to=x", null);

		assertProblem(res, 400, "invalid-parameter", "날짜 형식이 올바르지 않습니다");
	}

	@Test
	void 밀린_할_일_조회() {
		String calId = createCalendar("기본");
		String overdue = createItem(task(calId, "2026-11-20")).path("id").asString();
		Map<String, Object> doneTask = task(calId, "2026-11-20");
		doneTask.put("done", true);
		createItem(doneTask);
		Map<String, Object> event = eventInput(calId);
		event.put("date", "2026-11-20");
		createItem(event);
		createItem(task(calId, "2026-11-22"));

		Res res = send("GET", "/api/items/overdue?today=2026-11-22", null);

		assertThat(ids(res)).containsExactly(overdue);
	}

	@Test
	void today가_없으면_400() {
		Res res = send("GET", "/api/items/overdue", null);

		assertProblem(res, 400, "missing-parameter", "today가 필요합니다");
	}

	@Test
	void 캘린더_삭제는_소속_항목도_지운다() {
		String calId = createCalendar("기본");
		String itemId = createItem(eventInput(calId)).path("id").asString();

		Res del = send("DELETE", "/api/calendars/" + calId, null);
		assertThat(del.status()).as("캘린더 DELETE status").isEqualTo(204);

		Res res = send("GET", "/api/items?from=2026-01-01&to=2026-12-31", null);

		assertThat(ids(res)).doesNotContain(itemId);
	}
}
