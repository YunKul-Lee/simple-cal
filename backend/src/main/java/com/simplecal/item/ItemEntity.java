package com.simplecal.item;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Entity
@Table(name = "item")
public class ItemEntity {

	private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

	@Id
	private UUID id;

	@Column(name = "calendar_id", nullable = false)
	private UUID calendarId;

	@Column(nullable = false)
	private String type;

	@Column(nullable = false)
	private String title;

	private String memo;

	@Column(nullable = false)
	private LocalDate date;

	@Column(name = "start_time")
	private LocalTime startTime;

	@Column(name = "end_date")
	private LocalDate endDate;

	@Column(name = "end_time")
	private LocalTime endTime;

	@Column(nullable = false)
	private boolean done;

	/** 만든 순서. DB(bigserial)가 채운다. */
	@Column(insertable = false, updatable = false)
	private Long seq;

	protected ItemEntity() {
	}

	public ItemEntity(UUID id) {
		this.id = id;
	}

	/** 검증을 통과한 dto의 값으로 덮어쓴다(id 제외). */
	public void apply(ItemDto dto) {
		this.calendarId = UUID.fromString(dto.calendarId());
		this.type = dto.type();
		this.title = dto.title();
		this.memo = dto.memo();
		this.date = LocalDate.parse(dto.date());
		this.startTime = dto.startTime() == null ? null : LocalTime.parse(dto.startTime());
		this.endDate = dto.endDate() == null ? null : LocalDate.parse(dto.endDate());
		this.endTime = dto.endTime() == null ? null : LocalTime.parse(dto.endTime());
		this.done = dto.done();
	}

	public ItemDto toDto() {
		return new ItemDto(id.toString(), calendarId.toString(), type, title, memo, date.toString(),
				startTime == null ? null : startTime.format(HH_MM),
				endDate == null ? null : endDate.toString(),
				endTime == null ? null : endTime.format(HH_MM),
				done);
	}
}
