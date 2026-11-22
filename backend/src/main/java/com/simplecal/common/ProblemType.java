package com.simplecal.common;

import org.springframework.http.HttpStatus;

/** 오류 종류 — 백엔드 설계서 3.4 표가 기준. type URI는 /problems/{name}. */
public enum ProblemType {
	MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "malformed-request", "요청 형식이 올바르지 않습니다"),
	/** detail은 호출하는 쪽이 지정한다 ("from, to가 필요합니다" 등) */
	MISSING_PARAMETER(HttpStatus.BAD_REQUEST, "missing-parameter", null),
	INVALID_PARAMETER(HttpStatus.BAD_REQUEST, "invalid-parameter", "날짜 형식이 올바르지 않습니다"),
	INVALID_TYPE(HttpStatus.UNPROCESSABLE_CONTENT, "invalid-type", "종류가 올바르지 않습니다"),
	INVALID_DONE(HttpStatus.UNPROCESSABLE_CONTENT, "invalid-done", "완료 여부가 올바르지 않습니다"),
	TITLE_REQUIRED(HttpStatus.UNPROCESSABLE_CONTENT, "title-required", "제목을 입력해 주세요"),
	INVALID_DATE(HttpStatus.UNPROCESSABLE_CONTENT, "invalid-date", "날짜 형식이 올바르지 않습니다"),
	INVALID_TIME(HttpStatus.UNPROCESSABLE_CONTENT, "invalid-time", "시간 형식이 올바르지 않습니다"),
	TASK_HAS_END(HttpStatus.UNPROCESSABLE_CONTENT, "task-has-end", "할 일에는 종료를 지정할 수 없습니다"),
	END_TIME_REQUIRED(HttpStatus.UNPROCESSABLE_CONTENT, "end-time-required", "종료 시간을 입력해 주세요"),
	START_TIME_REQUIRED(HttpStatus.UNPROCESSABLE_CONTENT, "start-time-required", "시작 시간을 입력해 주세요"),
	END_BEFORE_START(HttpStatus.UNPROCESSABLE_CONTENT, "end-before-start", "종료가 시작보다 빠를 수 없습니다"),
	CALENDAR_NOT_FOUND(HttpStatus.UNPROCESSABLE_CONTENT, "calendar-not-found", "캘린더를 찾을 수 없습니다"),
	NAME_REQUIRED(HttpStatus.UNPROCESSABLE_CONTENT, "name-required", "이름을 입력해 주세요"),
	INVALID_COLOR(HttpStatus.UNPROCESSABLE_CONTENT, "invalid-color", "색 형식이 올바르지 않습니다"),
	NOT_FOUND(HttpStatus.NOT_FOUND, "not-found", "찾을 수 없습니다"),
	METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "method-not-allowed", "허용되지 않는 요청입니다"),
	UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported-media-type", "지원하지 않는 형식입니다"),
	INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "internal-error", "서버 오류가 발생했습니다");

	private final HttpStatus status;
	private final String name;
	private final String detail;

	ProblemType(HttpStatus status, String name, String detail) {
		this.status = status;
		this.name = name;
		this.detail = detail;
	}

	public HttpStatus status() {
		return status;
	}

	public String typeUri() {
		return "/problems/" + name;
	}

	public String detail() {
		return detail;
	}
}
