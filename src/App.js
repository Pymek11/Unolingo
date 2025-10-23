import React, { useState } from "react";
import "./App.css"; // Import the CSS file

const App = () => {
  // State for input and chat history
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([
    {
      role: "llm",
      content: "Hello! I'm a simple LLM interface. Ask me anything!",
    },
  ]);

  // Handle sending a message
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() === "") return;

    const userMessage = { role: "user", content: input.trim() };

    // 1. Add user message
    setHistory((prevHistory) => [...prevHistory, userMessage]);
    setInput("");

    // 2. Simulate LLM response after 1 second
    setTimeout(() => {
      const llmResponse = {
        role: "llm",
        content: `Acknowledged: "${input.trim()}". This is a simulated response from the LLM backbone. `,
      };
      setHistory((prevHistory) => [...prevHistory, llmResponse]);
    }, 1000);
  };

  return (
    <div className="llm-ui-container">
      <h2>Simple Chat Demo</h2>

      {/* --- Chat History Display Area --- */}
      <div className="chat-history">
        {history.map((message, index) => (
          <div key={index} className={`message-bubble ${message.role}`}>
            <div className="role-tag">
              {message.role === "user" ? "👤 User" : "🤖 LLM"}
            </div>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
      </div>

      {/* --- Input Form Area --- */}
      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Start typing your prompt..."
          rows="3"
        />
        <button type="submit" disabled={input.trim() === ""}>
          Send
        </button>
      </form>
    </div>
  );
};

export default App;
