package com.simplecal.common;

/** 설계서 3.4의 오류 하나. detail을 주지 않으면 ProblemType의 기본 문구. */
public class ApiException extends RuntimeException {

	private final ProblemType type;
	private final String detail;

	public ApiException(ProblemType type) {
		this(type, type.detail());
	}

	public ApiException(ProblemType type, String detail) {
		super(detail);
		this.type = type;
		this.detail = detail;
	}

	public ProblemType type() {
		return type;
	}

	public String detail() {
		return detail;
	}
}
