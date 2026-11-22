package com.simplecal.common;

import java.util.Optional;
import java.util.UUID;

/** 경로·본문의 id는 문자열로 받는다. UUID가 아니면 "없는 것"으로 취급하기 위해 빈 값. */
public final class Ids {

	private Ids() {
	}

	public static Optional<UUID> parse(String s) {
		if (s == null) return Optional.empty();
		try {
			return Optional.of(UUID.fromString(s));
		} catch (IllegalArgumentException e) {
			return Optional.empty();
		}
	}
}
