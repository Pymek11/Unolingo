package com.example.assistant;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList; // Potrzebny import
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

    private static final String SYSTEM_PROMPT = "Jesteś 'Unolingo', przyjaznym i pomocnym asystentem do nauki języka angielskiego. Twoim zadaniem jest prowadzenie naturalnej konwersacji. Jeśli użytkownik popełni błąd gramatyczny, popraw go i krótko wyjaśnij, dlaczego. Zawsze odpowiadaj w języku angielskim, chyba że użytkownik wyraźnie prosi o tłumaczenie.";

    public String askGrok(String userMessage) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        // Tworzymy dynamiczną listę wiadomości, aby dodać prompt systemowy
        List<Map<String, Object>> messages = new ArrayList<>();

        // 1. Dodajemy nasz stały prompt systemowy (instrukcje dla AI)
        messages.add(Map.of(
                "role", "system",
                "content", SYSTEM_PROMPT
        ));

        // 2. Dodajemy właściwą wiadomość od użytkownika
        messages.add(Map.of(
                "role", "user",
                "content", userMessage
        ));

        // Treść zapytania do Groka (teraz zawiera 2 wiadomości)
        Map<String, Object> body = Map.of(
                "model", "llama-3.3-70b-versatile",
                "messages", messages // Przekazujemy zmodyfikowaną listę
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

            if (!response.getStatusCode().is2xxSuccessful()) {
                return "Błąd API Groka: " + response.getStatusCode();
            }

            // Twój kod do parsowania jest poprawny i nie wymaga zmian
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