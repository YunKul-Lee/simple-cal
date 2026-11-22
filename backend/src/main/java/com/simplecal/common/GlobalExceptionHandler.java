package com.simplecal.common;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** 모든 오류를 설계서 3.4의 Problem Details로. 스프링 기본 영어 detail은 남기지 않는다. */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ApiException.class)
	ResponseEntity<Object> handleApi(ApiException ex, HttpServletRequest request) {
		return problem(ex.type(), ex.detail(), request.getRequestURI(), HttpHeaders.EMPTY);
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<Object> handleUnexpected(Exception ex, HttpServletRequest request) {
		log.error("Unexpected error on {} {}", request.getMethod(), request.getRequestURI(), ex);
		return problem(ProblemType.INTERNAL_ERROR, ProblemType.INTERNAL_ERROR.detail(), request.getRequestURI(),
				HttpHeaders.EMPTY);
	}

	/** ResponseEntityExceptionHandler가 처리하는 스프링 MVC 예외 전부가 여기로 모인다. */
	@Override
	protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
			HttpStatusCode statusCode, WebRequest request) {
		ProblemType type = typeFor(ex, statusCode);
		if (type == ProblemType.INTERNAL_ERROR) {
			log.error("Unexpected MVC error", ex);
		}
		String path = request instanceof ServletWebRequest swr ? swr.getRequest().getRequestURI() : null;
		return problem(type, type.detail(), path, headers);
	}

	private static ProblemType typeFor(Exception ex, HttpStatusCode statusCode) {
		if (ex instanceof HttpRequestMethodNotSupportedException) return ProblemType.METHOD_NOT_ALLOWED;
		if (ex instanceof HttpMediaTypeNotSupportedException) return ProblemType.UNSUPPORTED_MEDIA_TYPE;
		if (ex instanceof HttpMessageNotReadableException) return ProblemType.MALFORMED_REQUEST;
		if (ex instanceof NoResourceFoundException) return ProblemType.NOT_FOUND;
		if (statusCode.value() == 404) return ProblemType.NOT_FOUND;
		if (statusCode.is4xxClientError()) return ProblemType.MALFORMED_REQUEST;
		return ProblemType.INTERNAL_ERROR;
	}

	private static ResponseEntity<Object> problem(ProblemType type, String detail, String path, HttpHeaders headers) {
		ProblemDetail body = ProblemDetail.forStatusAndDetail(type.status(), detail);
		body.setType(URI.create(type.typeUri()));
		body.setTitle(type.status().getReasonPhrase());
		if (path != null) body.setInstance(URI.create(path));
		return ResponseEntity.status(type.status()).headers(headers).body(body);
	}
}
