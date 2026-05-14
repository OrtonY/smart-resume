package com.smartresume;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.smartresume")
public class SmartResumeBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(SmartResumeBackendApplication.class, args);
	}

}
