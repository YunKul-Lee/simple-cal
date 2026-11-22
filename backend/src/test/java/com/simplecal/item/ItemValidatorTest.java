package com.simplecal.item;

import static org.assertj.core.api.Assertions.assertThat;

import com.simplecal.common.ProblemType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ItemValidatorTest {

    private static final ItemDto base = new ItemDto(
            null, "cal-1", "event", "회의", null,
            "2026-11-23", "10:00", null, "11:00", false);

    private static final ItemDto baseTask = new ItemDto(
            base.id(), base.calendarId(), "task", base.title(), base.memo(),
            base.date(), base.startTime(), base.endDate(), null, base.done());

    private static ItemDto with(ItemDto b, String type, String title, String date,
                                String startTime, String endDate, String endTime, Boolean done) {
        return new ItemDto(b.id(), b.calendarId(), type, title, b.memo(),
                date, startTime, endDate, endTime, done);
    }

    private static ItemDto withType(ItemDto b, String type) {
        return with(b, type, b.title(), b.date(), b.startTime(), b.endDate(), b.endTime(), b.done());
    }

    private static ItemDto withTitle(ItemDto b, String title) {
        return with(b, b.type(), title, b.date(), b.startTime(), b.endDate(), b.endTime(), b.done());
    }

    private static ItemDto withDate(ItemDto b, String date) {
        return with(b, b.type(), b.title(), date, b.startTime(), b.endDate(), b.endTime(), b.done());
    }

    private static ItemDto withStartTime(ItemDto b, String startTime) {
        return with(b, b.type(), b.title(), b.date(), startTime, b.endDate(), b.endTime(), b.done());
    }

    private static ItemDto withEndDate(ItemDto b, String endDate) {
        return with(b, b.type(), b.title(), b.date(), b.startTime(), endDate, b.endTime(), b.done());
    }

    private static ItemDto withEndTime(ItemDto b, String endTime) {
        return with(b, b.type(), b.title(), b.date(), b.startTime(), b.endDate(), endTime, b.done());
    }

    private static ItemDto withDone(ItemDto b, Boolean done) {
        return with(b, b.type(), b.title(), b.date(), b.startTime(), b.endDate(), b.endTime(), done);
    }

    @Test
    void 기준_이벤트는_유효() {
        assertThat(ItemValidator.validate(base)).isEmpty();
    }

    @Test
    void 제목이_공백뿐이면_오류() {
        assertThat(ItemValidator.validate(withTitle(base, "  ")))
                .contains(ProblemType.TITLE_REQUIRED);
    }

    @Test
    void 날짜_형식이_틀리면_오류() {
        assertThat(ItemValidator.validate(withDate(base, "2026/11/23")))
                .contains(ProblemType.INVALID_DATE);
    }

    @Test
    void 없는_날짜면_오류() {
        assertThat(ItemValidator.validate(withDate(base, "2026-02-30")))
                .contains(ProblemType.INVALID_DATE);
    }

    @Test
    void 시간_형식이_틀리면_오류() {
        assertThat(ItemValidator.validate(withStartTime(base, "25:00")))
                .contains(ProblemType.INVALID_TIME);
    }

    @Test
    void 시작만_있으면_종료_필요() {
        assertThat(ItemValidator.validate(withEndTime(base, null)))
                .contains(ProblemType.END_TIME_REQUIRED);
    }

    @Test
    void 종료만_있으면_시작_필요() {
        assertThat(ItemValidator.validate(withStartTime(base, null)))
                .contains(ProblemType.START_TIME_REQUIRED);
    }

    @Test
    void 같은_날_종료가_이르면_오류() {
        assertThat(ItemValidator.validate(withEndTime(base, "09:00")))
                .contains(ProblemType.END_BEFORE_START);
    }

    @Test
    void 종료_날짜가_이르면_오류() {
        assertThat(ItemValidator.validate(withEndDate(base, "2026-11-22")))
                .contains(ProblemType.END_BEFORE_START);
    }

    @Test
    void 자정을_넘기는_이벤트는_유효() {
        ItemDto overnight = with(base, "event", "회의", "2026-11-23",
                "23:30", "2026-11-24", "00:30", false);
        assertThat(ItemValidator.validate(overnight)).isEmpty();
    }

    @Test
    void 자정_넘김에서_종료날짜를_지우면_오류() {
        ItemDto overnight = with(base, "event", "회의", "2026-11-23",
                "23:30", "2026-11-24", "00:30", false);
        assertThat(ItemValidator.validate(withEndDate(overnight, null)))
                .contains(ProblemType.END_BEFORE_START);
    }

    @Test
    void 할_일에는_종료를_지정할_수_없다() {
        assertThat(ItemValidator.validate(withEndTime(baseTask, "11:00")))
                .contains(ProblemType.TASK_HAS_END);
        assertThat(ItemValidator.validate(withEndDate(baseTask, "2026-11-24")))
                .contains(ProblemType.TASK_HAS_END);
    }

    @Test
    void 여러_날_하루_종일_이벤트는_유효() {
        ItemDto allDay = with(base, "event", "회의", "2026-11-23",
                null, "2026-11-25", null, false);
        assertThat(ItemValidator.validate(allDay)).isEmpty();
    }

    @Test
    void 모르는_종류면_오류() {
        assertThat(ItemValidator.validate(withType(base, "meeting")))
                .contains(ProblemType.INVALID_TYPE);
    }

    @Test
    void 완료여부가_null이면_오류() {
        assertThat(ItemValidator.validate(withDone(base, null)))
                .contains(ProblemType.INVALID_DONE);
    }

    @Test
    void 문구는_설계서와_같다() {
        assertThat(ProblemType.TITLE_REQUIRED.detail()).isEqualTo("제목을 입력해 주세요");
        assertThat(ProblemType.END_BEFORE_START.typeUri()).isEqualTo("/problems/end-before-start");
        assertThat(ProblemType.END_BEFORE_START.status()).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT);
        assertThat(ProblemType.CALENDAR_NOT_FOUND.detail()).isEqualTo("캘린더를 찾을 수 없습니다");
    }
}
