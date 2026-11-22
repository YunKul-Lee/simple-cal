package com.simplecal.item;

/** 요청·응답 공용. 날짜 "YYYY-MM-DD", 시간 "HH:mm" 문자열 그대로 주고받는다. */
public record ItemDto(
		String id,
		String calendarId,
		String type,
		String title,
		String memo,
		String date,
		String startTime,
		String endDate,
		String endTime,
		Boolean done) {
}
