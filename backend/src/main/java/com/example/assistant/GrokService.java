package com.example.assistant;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class GrokService {

    @Value("${grok.api.key}")
    private String apiKey;

    @Value("${grok.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    public String askGrok(String message) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        // Treść zapytania do Groka (zgodna z API xAI)
        Map<String, Object> body = Map.of(
                "model", "llama-3.3-70b-versatile",
                "messages", List.of(
                        Map.of("role", "user", "content", message)
                )
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    apiUrl,
                    HttpMethod.POST,
                    request,
                    String.class
            );

            System.out.println("=== GROK API RESPONSE ===");
            System.out.println("Status: " + response.getStatusCode());
            System.out.println("Body: " + response.getBody());
            System.out.println("=========================");

            // Sprawdź, czy odpowiedź jest poprawna
            if (!response.getStatusCode().is2xxSuccessful()) {
                return "Błąd API Groka: " + response.getStatusCode();
            }

            // Parsuj JSON tylko, jeśli odpowiedź jest w formacie JSON
            Map<String, Object> responseBody = mapper.readValue(response.getBody(), Map.class);

            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
            if (choices == null || choices.isEmpty()) {
                return "Brak wyników od Groka.";
            }

            Map<String, Object> messageData = (Map<String, Object>) choices.get(0).get("message");
            return (String) messageData.get("content");

        } catch (Exception e) {
            System.err.println("Błąd podczas komunikacji z API Groka:");
            e.printStackTrace();
            return "Wystąpił błąd podczas zapytania: " + e.getMessage();
        }
    }
}