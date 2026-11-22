package com.simplecal.item;

import com.simplecal.calendar.CalendarService;
import com.simplecal.common.ApiException;
import com.simplecal.common.Ids;
import com.simplecal.common.ProblemType;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

@Service
public class ItemService {

	private final ItemRepository items;
	private final CalendarService calendars;

	public ItemService(ItemRepository items, CalendarService calendars) {
		this.items = items;
		this.calendars = calendars;
	}

	@Transactional
	public ItemDto create(JsonNode body) {
		requireObject(body);
		ItemDto empty = new ItemDto(null, null, null, null, null, null, null, null, null, false);
		ItemDto input = merge(empty, body);
		check(input);
		ItemEntity entity = new ItemEntity(UUID.randomUUID());
		entity.apply(input);
		return items.save(entity).toDto();
	}

	/** 빠진 필드는 그대로, null은 비움. 합친 결과 전체를 다시 검사하고, 실패하면 저장하지 않는다. */
	@Transactional
	public ItemDto update(String id, JsonNode patch) {
		ItemEntity entity = find(id);
		requireObject(patch);
		ItemDto merged = merge(entity.toDto(), patch);
		check(merged);
		entity.apply(merged);
		return entity.toDto();
	}

	@Transactional
	public void delete(String id) {
		items.delete(find(id));
	}

	private ItemEntity find(String id) {
		return Ids.parse(id).flatMap(items::findById).orElseThrow(() -> new ApiException(ProblemType.NOT_FOUND));
	}

	/** MSW와 같은 순서: 캘린더 존재 → 필드 검증. */
	private void check(ItemDto in) {
		boolean calendarExists = Ids.parse(in.calendarId()).map(calendars::exists).orElse(false);
		if (!calendarExists) throw new ApiException(ProblemType.CALENDAR_NOT_FOUND);
		ItemValidator.validate(in).ifPresent(type -> {
			throw new ApiException(type);
		});
	}

	private static void requireObject(JsonNode node) {
		if (node == null || !node.isObject()) throw new ApiException(ProblemType.MALFORMED_REQUEST);
	}

	/** base에 node의 "있는 필드만" 덮어쓴다. id는 무시. JSON 타입이 틀리면 MALFORMED_REQUEST. */
	private static ItemDto merge(ItemDto base, JsonNode node) {
		return new ItemDto(
				base.id(),
				str(node, "calendarId", base.calendarId()),
				str(node, "type", base.type()),
				str(node, "title", base.title()),
				str(node, "memo", base.memo()),
				str(node, "date", base.date()),
				str(node, "startTime", base.startTime()),
				str(node, "endDate", base.endDate()),
				str(node, "endTime", base.endTime()),
				bool(node, "done", base.done()));
	}

	private static String str(JsonNode node, String field, String current) {
		if (!node.has(field)) return current;
		JsonNode v = node.get(field);
		if (v.isNull()) return null;
		if (!v.isString()) throw new ApiException(ProblemType.MALFORMED_REQUEST);
		return v.stringValue();
	}

	private static Boolean bool(JsonNode node, String field, Boolean current) {
		if (!node.has(field)) return current;
		JsonNode v = node.get(field);
		if (v.isNull()) return null;
		if (!v.isBoolean()) throw new ApiException(ProblemType.MALFORMED_REQUEST);
		return v.booleanValue();
	}
}
