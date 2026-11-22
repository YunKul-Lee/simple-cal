package com.simplecal;

import org.springframework.boot.SpringApplication;

public class TestSimpleCalApplication {

	public static void main(String[] args) {
		SpringApplication.from(SimpleCalApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
