package com.example.assistant;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
// W celu połączenia z Reactem, konieczne może być dodanie adnotacji CORS,
// jeśli Spring Boot i React będą działać na różnych portach.
@CrossOrigin(origins = "http://localhost:3000") // Przykładowa konfiguracja dla Reacta
public class ChatController {

    private final GrokService grokService;

    public ChatController(GrokService grokService) {
        this.grokService = grokService;
    }

    @PostMapping
    public String chat(@RequestBody ChatRequest request) {
        // Zmieniamy wywołanie serwisu, aby przekazać ID sesji
        return grokService.askGrok(request.getMessage(), request.getSessionId());
    }
}