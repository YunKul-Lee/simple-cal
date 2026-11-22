package com.simplecal.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

import com.simplecal.ApiTestBase;

class ErrorResponseApiTest extends ApiTestBase {

	@Test
	void 깨진_JSON은_400() {
		Res res = send("POST", "/api/calendars", "{");

		assertProblem(res, 400, "malformed-request", "요청 형식이 올바르지 않습니다");
	}

	@Test
	void 없는_경로는_404() {
		Res res = send("GET", "/api/nothing", null);

		assertProblem(res, 404, "not-found", "찾을 수 없습니다");
	}

	@Test
	void 허용_안_된_메서드는_405() {
		Res res = send("PUT", "/api/calendars", Map.of());

		assertProblem(res, 405, "method-not-allowed", "허용되지 않는 요청입니다");
	}

	@Test
	void JSON이_아닌_본문은_415() {
		Res res = sendRaw("POST", "/api/calendars", "text/plain", "x");

		assertProblem(res, 415, "unsupported-media-type", "지원하지 않는 형식입니다");
	}

	@Test
	void title은_상태_표준_이름() {
		Res notFound = send("GET", "/api/nothing", null);
		assertThat(notFound.json()).isNotNull();
		assertThat(notFound.json().path("title").asString()).isEqualTo("Not Found");

		Res unprocessable = send("POST", "/api/calendars", Map.of("name", "  ", "color", "#e08a2c"));
		assertThat(unprocessable.json()).isNotNull();
		assertThat(unprocessable.json().path("title").asString()).isEqualTo("Unprocessable Content");
	}
}
