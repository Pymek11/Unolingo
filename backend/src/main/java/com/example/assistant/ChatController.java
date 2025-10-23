package com.example.assistant;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final GrokService grokService;

    public ChatController(GrokService grokService) {
        this.grokService = grokService;
    }

    @PostMapping
    public String chat(@RequestBody ChatRequest request) {
        return grokService.askGrok(request.getMessage());
    }
}