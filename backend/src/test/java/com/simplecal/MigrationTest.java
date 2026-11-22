package com.simplecal;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

/** ApiTestBase를 상속하지 않는다: 별도 컨텍스트(새 컨테이너)에서 비우기 전 DB를 본다. */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "spring.application.name=migration-test")
class MigrationTest {

	@Autowired
	JdbcTemplate jdbc;

	private long count(String table) {
		Long n = jdbc.queryForObject("select count(*) from " + table, Long.class);
		return n == null ? 0 : n;
	}

	@Test
	void 기본_캘린더가_하나_있다() {
		List<Map<String, Object>> rows = jdbc.queryForList("select name, color, visible from calendar");
		assertThat(rows).singleElement().satisfies(r -> {
			assertThat(r.get("name")).isEqualTo("내 캘린더");
			assertThat(r.get("color")).isEqualTo("#4a7bd8");
			assertThat(r.get("visible")).isEqualTo(true);
		});
	}

	@Test
	void 캘린더를_지우면_항목도_지워진다() {
		UUID calId = UUID.randomUUID();
		jdbc.update("insert into calendar (id, name, color, visible) values (?, '삭제용', '#e08a2c', true)", calId);
		jdbc.update("""
				insert into item (id, calendar_id, type, title, memo, date, start_time, end_date, end_time, done)
				values (?, ?, 'task', '할 일', null, date '2026-11-23', null, null, null, false)
				""", UUID.randomUUID(), calId);
		assertThat(count("item")).isEqualTo(1);

		jdbc.update("delete from calendar where id = ?", calId);

		assertThat(count("item")).isZero();
	}
}
