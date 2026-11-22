package com.simplecal.item;

import com.simplecal.common.ProblemType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import java.util.regex.Pattern;

/** frontend/src/lib/validateItem.ts 이식 — 첫 오류만 돌려준다. 캘린더 존재 여부는 보지 않는다. */
public final class ItemValidator {

	private static final Pattern DATE_RE = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");
	private static final Pattern TIME_RE = Pattern.compile("\\d{2}:\\d{2}");

	private ItemValidator() {
	}

	public static Optional<ProblemType> validate(ItemDto in) {
		boolean isTask = "task".equals(in.type());
		if (!isTask && !"event".equals(in.type())) return Optional.of(ProblemType.INVALID_TYPE);
		if (in.done() == null) return Optional.of(ProblemType.INVALID_DONE);
		if (in.title() == null || in.title().isBlank()) return Optional.of(ProblemType.TITLE_REQUIRED);

		LocalDate date = parseDate(in.date());
		if (date == null || (in.endDate() != null && parseDate(in.endDate()) == null)) {
			return Optional.of(ProblemType.INVALID_DATE);
		}
		if ((in.startTime() != null && parseTime(in.startTime()) == null)
				|| (in.endTime() != null && parseTime(in.endTime()) == null)) {
			return Optional.of(ProblemType.INVALID_TIME);
		}

		if (isTask) {
			return in.endDate() != null || in.endTime() != null
					? Optional.of(ProblemType.TASK_HAS_END)
					: Optional.empty();
		}

		if (in.startTime() != null && in.endTime() == null) return Optional.of(ProblemType.END_TIME_REQUIRED);
		if (in.startTime() == null && in.endTime() != null) return Optional.of(ProblemType.START_TIME_REQUIRED);

		LocalDateTime start = LocalDateTime.of(date, timeOrMidnight(in.startTime()));
		LocalDate endDate = in.endDate() != null ? parseDate(in.endDate()) : date;
		LocalDateTime end = LocalDateTime.of(endDate, timeOrMidnight(in.endTime()));
		return end.isBefore(start) ? Optional.of(ProblemType.END_BEFORE_START) : Optional.empty();
	}

	static LocalDate parseDate(String s) {
		if (s == null || !DATE_RE.matcher(s).matches()) return null;
		try {
			return LocalDate.parse(s);
		} catch (DateTimeParseException e) {
			return null;
		}
	}

	static LocalTime parseTime(String s) {
		if (s == null || !TIME_RE.matcher(s).matches()) return null;
		try {
			return LocalTime.parse(s);
		} catch (DateTimeParseException e) {
			return null;
		}
	}

	private static LocalTime timeOrMidnight(String s) {
		return s == null ? LocalTime.MIDNIGHT : parseTime(s);
	}
}
