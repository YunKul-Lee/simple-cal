package com.simplecal.item;

import com.simplecal.common.ApiException;
import com.simplecal.common.ProblemType;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/items")
public class ItemController {

	private final ItemService service;

	public ItemController(ItemService service) {
		this.service = service;
	}

	/** 쿼리는 직접 검사한다 — 설계서 3.4의 문구를 그대로 내기 위해. */
	@GetMapping
	List<ItemDto> listRange(@RequestParam(required = false) String from, @RequestParam(required = false) String to) {
		if (from == null || to == null) throw new ApiException(ProblemType.MISSING_PARAMETER, "from, to가 필요합니다");
		return service.listRange(queryDate(from), queryDate(to));
	}

	@GetMapping("/overdue")
	List<ItemDto> listOverdue(@RequestParam(required = false) String today) {
		if (today == null) throw new ApiException(ProblemType.MISSING_PARAMETER, "today가 필요합니다");
		return service.listOverdue(queryDate(today));
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	ItemDto create(@RequestBody JsonNode body) {
		return service.create(body);
	}

	@PatchMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	ItemDto update(@PathVariable String id, @RequestBody JsonNode patch) {
		return service.update(id, patch);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@PathVariable String id) {
		service.delete(id);
	}

	private static LocalDate queryDate(String s) {
		LocalDate date = ItemValidator.parseDate(s);
		if (date == null) throw new ApiException(ProblemType.INVALID_PARAMETER);
		return date;
	}
}
