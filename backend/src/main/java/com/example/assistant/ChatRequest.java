package com.example.assistant;

import lombok.Data;

@Data // Adnotacja Lombok dla getterów, setterów, toString itp.
public class ChatRequest {
    private String prompt;
    // W przyszłości możesz dodać tu np. historię konwersacji
    // private List<Message> history;
}