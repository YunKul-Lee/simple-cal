package com.simplecal.item;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ItemRepository extends JpaRepository<ItemEntity, UUID> {

	/** 기간과 겹치는 항목 — 양 끝 포함. 기간 이전에 시작한 여러 날 일정도 포함. */
	@Query("select i from ItemEntity i where i.date <= :to and coalesce(i.endDate, i.date) >= :from order by i.seq")
	List<ItemEntity> findOverlapping(@Param("from") LocalDate from, @Param("to") LocalDate to);

	@Query("select i from ItemEntity i where i.type = 'task' and i.done = false and i.date < :today order by i.seq")
	List<ItemEntity> findOverdue(@Param("today") LocalDate today);
}
