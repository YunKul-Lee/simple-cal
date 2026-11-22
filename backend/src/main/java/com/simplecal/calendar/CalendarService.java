package com.simplecal.calendar;

import com.simplecal.common.ApiException;
import com.simplecal.common.Ids;
import com.simplecal.common.ProblemType;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

@Service
public class CalendarService {

	private static final Pattern COLOR_RE = Pattern.compile("^#[0-9a-fA-F]{6}$");

	private final CalendarRepository calendars;

	public CalendarService(CalendarRepository calendars) {
		this.calendars = calendars;
	}

	@Transactional(readOnly = true)
	public List<CalendarDto> list() {
		return calendars.findAllByOrderBySeqAsc().stream().map(CalendarEntity::toDto).toList();
	}

	@Transactional
	public CalendarDto create(JsonNode body) {
		String name = requireName(body.get("name"));
		String color = requireColor(body.get("color"));
		return calendars.save(new CalendarEntity(UUID.randomUUID(), name, color, true)).toDto();
	}

	@Transactional
	public CalendarDto update(String id, JsonNode patch) {
		CalendarEntity cal = find(id);
		if (patch.has("name")) cal.setName(requireName(patch.get("name")));
		if (patch.has("color")) cal.setColor(requireColor(patch.get("color")));
		if (patch.has("visible")) {
			JsonNode visible = patch.get("visible");
			if (!visible.isBoolean()) throw new ApiException(ProblemType.MALFORMED_REQUEST);
			cal.setVisible(visible.booleanValue());
		}
		return cal.toDto();
	}

	@Transactional
	public void delete(String id) {
		calendars.delete(find(id));
	}

	@Transactional(readOnly = true)
	public boolean exists(UUID id) {
		return calendars.existsById(id);
	}

	private CalendarEntity find(String id) {
		return Ids.parse(id).flatMap(calendars::findById).orElseThrow(() -> new ApiException(ProblemType.NOT_FOUND));
	}

	/** 저장 이름은 받은 그대로 — trim하지 않는다(MSW와 같음). */
	private static String requireName(JsonNode node) {
		if (node == null || !node.isString() || node.stringValue().isBlank()) {
			throw new ApiException(ProblemType.NAME_REQUIRED);
		}
		return node.stringValue();
	}

	private static String requireColor(JsonNode node) {
		if (node == null || !node.isString() || !COLOR_RE.matcher(node.stringValue()).matches()) {
			throw new ApiException(ProblemType.INVALID_COLOR);
		}
		return node.stringValue();
	}
}
