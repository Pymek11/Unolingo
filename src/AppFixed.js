import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const SAMPLE_PROMPTS = [
  "Jak powiedzieć smacznego po angielsku?",
  "Popraw gramatykę w zdaniu: She go to school everyday.",
  "Co oznacza słowo ubiquitous?",
  "Nagraj moją wymowę słowa thorough.",
  "Opisz ten obrazek (użytkownik przesłał zdjęcie psa) po angielsku.",
  "Przetłumacz: Czy mógłbyś mi pomóc znaleźć drogę?",
  "Stwórz krótką historię o podróży w kosmosie, używając czasu Past Simple.",
  "Wyjaśnij różnicę między affect a effect.",
  "Daj mi 5 przykładów zdań z idiomem break a leg.",
  "Rozpocznij konwersację na temat moich ulubionych hobby."
];

function Sidebar({ prompts, onSelect, selectedId, onStartWithSelected }) {
  const selected = prompts.find((p) => p.id === selectedId);
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">Unolingo</div>
        <button
          className="start-btn"
          onClick={() => onStartWithSelected && onStartWithSelected(selected?.title)}
        >
          Rozpocznij
        </button>
      </div>
      <div className="sidebar-title">Rozpocznij nową naukę</div>
      <ul className="prompts-list">
        {prompts.map((p) => (
          <li
            key={p.id}
            className={"prompt-item " + (p.id === selectedId ? "active" : "")}
            onClick={() => onSelect(p.id)}
          >
            {p.title}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function ChatArea({ messages, forceScrollTrigger }) {
  const bottomRef = useRef();
  const messagesRef = useRef();

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight) < 160;
    const lastRole = messages.length ? messages[messages.length - 1].role : null;
    if (isNearBottom || lastRole === "user") {
      try {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      } catch (e) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    try {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } catch (e) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [forceScrollTrigger]);

  return (
    <div className="chat-area">
      <div className="chat-header"> </div>
      <div className="messages" ref={messagesRef}>
        {messages.map((m, i) => (
          <div key={i} className={`message-bubble ${m.role}`}>
            <div className="role-tag">{m.role === "user" ? "Ty" : "Unolingo"}</div>
            <div className="message-text">{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function Composer({ value, onChange, onSend, onMic, onImage, isSending }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSending) return;
    onSend();
  };

  return (
    <form className="composer" onSubmit={handleSubmit} aria-busy={isSending}>
      <div className="composer-input">
        <input
          aria-label="message"
          placeholder="O czym chcesz się nauczyć?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="composer-actions">
        <button type="button" className="icon-btn" onClick={onMic} title="Microphone">
          🎙️
        </button>
        <button type="button" className="icon-btn" onClick={onImage} title="Image">
          🖼️
        </button>
        <button type="submit" className="send-btn" disabled={!value.trim() || isSending}>
          {isSending ? "Wysyłanie..." : "Wyślij"}
        </button>
      </div>
    </form>
  );
}

const App = () => {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const [scrollTrigger, setScrollTrigger] = useState(0);

  const [recentChats, setRecentChats] = useState(() => {
    try {
      const raw = localStorage.getItem("recentChats");
      if (raw) return JSON.parse(raw);
      return SAMPLE_PROMPTS.slice(0, 10).map((p, i) => ({
        id: Date.now() + i,
        title: p,
        messages: [
          { role: "user", text: p },
          { role: "llm", text: `Przykładowa odpowiedź dla: "${p}"` },
        ],
      }));
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    if (selectedChatId === null && recentChats.length > 0) {
      setSelectedChatId(recentChats[0].id);
    }
  }, [selectedChatId, recentChats]);

  useEffect(() => {
    try {
      localStorage.setItem("recentChats", JSON.stringify(recentChats));
    } catch (e) {}
  }, [recentChats]);

  function sendMessageText(text) {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);

    const t = (text || "").trim();
    if (!t) {
      isSendingRef.current = false;
      setIsSending(false);
      return;
    }

    const reply = { role: "llm", text: "To jest przykładowa odpowiedź. (Jeszcze nie podłączono modelu)" };

    setRecentChats((prev) => {
      const copy = prev.slice();
      if (copy.length > 0) {
        const chat = { ...copy[0] };
        chat.title = t;
        chat.messages = [{ role: "user", text: t }, reply];
        copy[0] = chat;
        return copy;
      }
      const newChat = { id: Date.now(), title: t, messages: [{ role: "user", text: t }, reply] };
      return [newChat, ...copy].slice(0, 10);
    });

    setTimeout(() => {
      isSendingRef.current = false;
      setIsSending(false);
    }, 200);
    setTimeout(() => setScrollTrigger((s) => s + 1), 80);
  }

  function handleSend() {
    if (isSendingRef.current) return;
    const text = input.trim();
    if (!text) return;

    isSendingRef.current = true;
    setIsSending(true);
    setInput("");

    const reply = { role: "llm", text: "To jest przykładowa odpowiedź. (Jeszcze nie podłączono modelu)" };

    if (selectedChatId !== null) {
      setRecentChats((prev) => {
        const copy = prev.slice();
        const idx = copy.findIndex((c) => c.id === selectedChatId);
        if (idx !== -1) {
          const chat = copy.splice(idx, 1)[0];
          const last = chat.messages[chat.messages.length - 1];
          if (!(last && last.role === "user" && last.text === text)) {
            chat.messages = [...chat.messages, { role: "user", text }, reply];
          }
          const next = [chat, ...copy].slice(0, 10);
          return next;
        }
        const newChat = { id: Date.now(), title: text.slice(0, 80), messages: [{ role: "user", text }, reply] };
        return [newChat, ...copy].slice(0, 10);
      });
    } else {
      const newChat = { id: Date.now(), title: text.slice(0, 80), messages: [{ role: "user", text }, reply] };
      setRecentChats((prev) => [newChat, ...prev].slice(0, 10));
      setSelectedChatId(newChat.id);
    }

    setTimeout(() => {
      isSendingRef.current = false;
      setIsSending(false);
    }, 200);
    setTimeout(() => setScrollTrigger((t) => t + 1), 60);
  }

  function handleMic() {
    alert("Microphone action (not implemented)");
  }

  function handleImage() {
    alert("Image upload action (not implemented)");
  }

  const currentChat = recentChats.find((c) => c.id === selectedChatId);
  const currentMessages = currentChat
    ? currentChat.messages
    : [{ role: "llm", text: "Witaj! Napisz swoją wiadomość do asystenta ai!." }];

  return (
    <div className="llm-ui-root">
      <div className="llm-ui-container">
        <Sidebar
          prompts={recentChats.map((c) => ({ id: c.id, title: c.title }))}
          onSelect={setSelectedChatId}
          selectedId={selectedChatId}
          onStartWithSelected={(title) => sendMessageText(title)}
        />
        <main className="main-area">
          <ChatArea messages={currentMessages} forceScrollTrigger={scrollTrigger} />
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onMic={handleMic}
            onImage={handleImage}
            isSending={isSending}
          />
        </main>
      </div>
    </div>
  );
};

+export default App;
*** End Patch