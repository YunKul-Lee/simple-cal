package com.simplecal.calendar;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "calendar")
public class CalendarEntity {

	@Id
	private UUID id;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String color;

	@Column(nullable = false)
	private boolean visible;

	/** 만든 순서. DB(bigserial)가 채운다. */
	@Column(insertable = false, updatable = false)
	private Long seq;

	protected CalendarEntity() {
	}

	public CalendarEntity(UUID id, String name, String color, boolean visible) {
		this.id = id;
		this.name = name;
		this.color = color;
		this.visible = visible;
	}

	public UUID getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getColor() {
		return color;
	}

	public void setColor(String color) {
		this.color = color;
	}

	public boolean isVisible() {
		return visible;
	}

	public void setVisible(boolean visible) {
		this.visible = visible;
	}

	public CalendarDto toDto() {
		return new CalendarDto(id.toString(), name, color, visible);
	}
}
