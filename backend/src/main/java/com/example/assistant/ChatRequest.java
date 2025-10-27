package com.example.assistant;

public class ChatRequest {
    private String message;
    private String sessionId; // <-- DODANA ZMIENNA

    // gettery i settery
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    // GETTER I SETTER DLA SESSION ID
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
}