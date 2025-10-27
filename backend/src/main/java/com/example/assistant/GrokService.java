package com.example.assistant;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap; // DODANY IMPORT
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap; // DODANY IMPORT

@Service
public class GrokService {

    @Value("${grok.api.key}")
    private String apiKey;

    @Value("${grok.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    // MAPA DO PRZECHOWYWANIA HISTORII KONWERSACJI (PAMIĘĆ)
    // Klucz: sessionId (String), Wartość: Lista wiadomości w tej sesji
    private final Map<String, List<Map<String, Object>>> conversationHistory = new ConcurrentHashMap<>();

    private static final String SYSTEM_PROMPT = "Jesteś 'Unolingo', przyjaznym i pomocnym asystentem do nauki języka angielskiego. Twoim zadaniem jest prowadzenie naturalnej konwersacji. Jeśli użytkownik popełni błąd gramatyczny, popraw go i krótko wyjaśnij, dlaczego. Zawsze odpowiadaj w języku angielskim, chyba że użytkownik wyraźnie prosi o tłumaczenie.";

    // Zmieniamy sygnaturę metody, aby przyjmowała ID sesji
    public String askGrok(String userMessage, String sessionId) {

        // 1. POBIERZ AKTUALNĄ HISTORIĘ
        // Używamy computeIfAbsent, aby stworzyć nową listę, jeśli sesja nie istnieje
        List<Map<String, Object>> currentHistory = conversationHistory.computeIfAbsent(
                sessionId, k -> new ArrayList<>()
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        // Tworzymy listę wiadomości do wysłania do Groka
        List<Map<String, Object>> messagesToSend = new ArrayList<>();

        // 1. Dodajemy nasz stały prompt systemowy (Zawsze pierwszy!)
        messagesToSend.add(Map.of(
                "role", "system",
                "content", SYSTEM_PROMPT
        ));

        // 2. Dodajemy CAŁĄ zapisaną historię
        messagesToSend.addAll(currentHistory);

        // Wiadomość użytkownika do zapisania i wysłania
        Map<String, Object> userMsgMap = Map.of(
                "role", "user",
                "content", userMessage
        );

        // 3. Dodajemy właściwą, aktualną wiadomość od użytkownika (Zawsze ostatnia!)
        messagesToSend.add(userMsgMap);

        // Treść zapytania do Groka (teraz zawiera SYSTEM + HISTORIĘ + USER)
        Map<String, Object> body = Map.of(
                "model", "llama-3.3-70b-versatile",
                "messages", messagesToSend // Przekazujemy pełny kontekst
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    apiUrl,
                    HttpMethod.POST,
                    request,
                    String.class
            );

            // ... (logowanie odpowiedzi pominięte dla zwięzłości) ...

            if (!response.getStatusCode().is2xxSuccessful()) {
                return "Błąd API Groka: " + response.getStatusCode();
            }

            Map<String, Object> responseBody = mapper.readValue(response.getBody(), Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");

            if (choices == null || choices.isEmpty()) {
                return "Brak wyników od Groka.";
            }

            Map<String, Object> messageData = (Map<String, Object>) choices.get(0).get("message");
            String grokResponseContent = (String) messageData.get("content");

            // 4. ZAPISZ WIADOMOŚCI W HISTORII
            // A. Zapisz wiadomość użytkownika
            currentHistory.add(userMsgMap);

            // B. Zapisz odpowiedź asystenta
            // UWAGA: messageData zawiera już "role":"assistant", więc możemy użyć całego obiektu
            currentHistory.add(messageData);

            return grokResponseContent;

        } catch (Exception e) {
            System.err.println("Błąd podczas komunikacji z API Groka:");
            e.printStackTrace();
            return "Wystąpił błąd podczas zapytania: " + e.getMessage();
        }
    }

    // Metoda pomocnicza, którą frontend może wywołać, aby pobrać historię na start
    public List<Map<String, Object>> getHistory(String sessionId) {
        return conversationHistory.getOrDefault(sessionId, List.of());
    }

    // Metoda do czyszczenia historii (np. gdy użytkownik zaczyna nową konwersację)
    public void clearHistory(String sessionId) {
        conversationHistory.remove(sessionId);
    }
}