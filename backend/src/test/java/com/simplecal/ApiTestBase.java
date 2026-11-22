package com.simplecal;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
public abstract class ApiTestBase {

	protected static final JsonMapper MAPPER = JsonMapper.builder().build();

	private static final HttpClient HTTP = HttpClient.newHttpClient();

	@Value("${local.server.port}")
	protected int port;

	@Autowired
	protected JdbcTemplate jdbc;

	/** 응답. 본문이 없으면 json은 null. */
	public record Res(int status, String contentType, JsonNode json) {
	}

	@BeforeEach
	void clearDatabase() {
		jdbc.update("delete from item");
		jdbc.update("delete from calendar");
	}

	/** body가 String이면 그대로 보내고(깨진 JSON 테스트용), 아니면 JSON으로 직렬화한다. null이면 본문 없음. */
	protected Res send(String method, String path, Object body) {
		String raw = null;
		if (body instanceof String s) {
			raw = s;
		} else if (body != null) {
			raw = MAPPER.writeValueAsString(body);
		}
		return sendRaw(method, path, "application/json", raw);
	}

	protected Res sendRaw(String method, String path, String contentType, String body) {
		HttpRequest.BodyPublisher publisher = body == null
				? HttpRequest.BodyPublishers.noBody()
				: HttpRequest.BodyPublishers.ofString(body);
		HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
				.method(method, publisher);
		if (contentType != null) {
			builder.header("Content-Type", contentType);
		}
		try {
			HttpResponse<String> response = HTTP.send(builder.build(), HttpResponse.BodyHandlers.ofString());
			String ct = response.headers().firstValue("Content-Type").orElse(null);
			String text = response.body();
			JsonNode json = (text == null || text.isBlank()) ? null : MAPPER.readTree(text);
			return new Res(response.statusCode(), ct, json);
		} catch (IOException e) {
			throw new RuntimeException(e);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new RuntimeException(e);
		}
	}

	protected void assertProblem(Res res, int status, String typeName, String detail) {
		assertThat(res.status()).as("status").isEqualTo(status);
		assertThat(res.contentType()).as("Content-Type").startsWith("application/problem+json");
		assertThat(res.json()).as("body").isNotNull();
		assertThat(res.json().path("type").asString()).as("type").isEqualTo("/problems/" + typeName);
		assertThat(res.json().path("detail").asString()).as("detail").isEqualTo(detail);
		assertThat(res.json().path("status").asInt()).as("json.status").isEqualTo(status);
		assertThat(res.json().hasNonNull("title")).as("title 존재").isTrue();
		assertThat(res.json().hasNonNull("instance")).as("instance 존재").isTrue();
	}

	protected String createCalendar(String name) {
		Res res = send("POST", "/api/calendars", Map.of("name", name, "color", "#e08a2c"));
		assertThat(res.status()).as("캘린더 생성 status").isEqualTo(201);
		return res.json().get("id").asString();
	}

	protected JsonNode createItem(Map<String, Object> input) {
		Res res = send("POST", "/api/items", input);
		assertThat(res.status()).as("항목 생성 status").isEqualTo(201);
		return res.json();
	}

	protected Map<String, Object> eventInput(String calId) {
		Map<String, Object> m = new HashMap<>();
		m.put("calendarId", calId);
		m.put("type", "event");
		m.put("title", "회의");
		m.put("memo", null);
		m.put("date", "2026-11-23");
		m.put("startTime", "10:00");
		m.put("endDate", null);
		m.put("endTime", "11:00");
		m.put("done", false);
		return m;
	}

	protected Map<String, Object> taskInput(String calId) {
		Map<String, Object> m = eventInput(calId);
		m.put("type", "task");
		m.put("endTime", null);
		return m;
	}
}
