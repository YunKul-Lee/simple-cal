package com.simplecal.calendar;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarRepository extends JpaRepository<CalendarEntity, UUID> {

	List<CalendarEntity> findAllByOrderBySeqAsc();
}
