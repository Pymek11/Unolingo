package com.example.assistant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.SpringApplication;
import jakarta.annotation.PostConstruct;

@SpringBootApplication
public class AssistantApplication {

	@Value("${grok.api.key:NOT_FOUND}")
	private String grokKey;

	@PostConstruct
	public void init() {
		System.out.println(">>> GROK API KEY: " + grokKey);
	}

	public static void main(String[] args) {
		SpringApplication.run(AssistantApplication.class, args);
	}
}