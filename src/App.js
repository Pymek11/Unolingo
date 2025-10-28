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

// ZMIEŃ PORT, JEŚLI TRZEBA
const API_URL = "http://localhost:8081/api/chat";

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
                messages: [],
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

    // =================================================================
    // ZAKTUALIZOWANA FUNKCJA (POPRAWKA IMMUTABILITY)
    // =================================================================
    async function sendMessageText(text) {
        if (isSendingRef.current) return;
        const t = (text || "").trim();
        if (!t) return;

        isSendingRef.current = true;
        setIsSending(true);

        const newChatId = Date.now();
        const userMessage = { role: "user", text: t };

        // 1. Utwórz nowy czat i dodaj wiadomość użytkownika (Immutable)
        const newChat = { id: newChatId, title: t, messages: [userMessage] };
        setRecentChats((prev) => [newChat, ...prev.slice(0, 9)]); // Bezpieczne dodanie
        setSelectedChatId(newChatId);
        setTimeout(() => setScrollTrigger((s) => s + 1), 80);

        let llmMessage;

        try {
            // 2. Wywołaj API
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: t,
                    sessionId: String(newChatId),
                }),
            });

            if (!response.ok) {
                throw new Error(`Błąd HTTP: ${response.status}`);
            }

            const llmResponseText = await response.text();
            llmMessage = { role: "llm", text: llmResponseText };

        } catch (error) {
            console.error("Błąd podczas wysyłania wiadomości:", error);
            llmMessage = {
                role: "llm",
                text: `Wystąpił błąd: ${error.message}. Upewnij się, że serwer backend działa.`,
            };
        }

        // 3. Dodaj odpowiedź LLM (lub błąd) do stanu (Immutable)
        setRecentChats((prev) =>
            prev.map(chat =>
                chat.id === newChatId
                    ? { ...chat, messages: [...chat.messages, llmMessage] }
                    : chat
            )
        );

        // 4. Zakończ wysyłanie
        isSendingRef.current = false;
        setIsSending(false);
        setTimeout(() => setScrollTrigger((s) => s + 1), 80);
    }

    // =================================================================
    // ZAKTUALIZOWANA FUNKCJA (POPRAWKA IMMUTABILITY)
    // =================================================================
    async function handleSend() {
        if (isSendingRef.current) return;
        const text = input.trim();
        if (!text) return;

        isSendingRef.current = true;
        setIsSending(true);
        setInput("");

        let chatId = selectedChatId;
        let isNewChat = false;

        if (chatId === null) {
            chatId = Date.now();
            isNewChat = true;
        }

        const userMessage = { role: "user", text };

        // 1. Natychmiast dodaj wiadomość użytkownika do UI (Immutable)
        setRecentChats((prev) => {
            if (isNewChat) {
                const newChat = { id: chatId, title: text.slice(0, 80), messages: [userMessage] };
                return [newChat, ...prev.slice(0, 9)];
            }

            // Znajdź czat, stwórz jego kopię z nową wiadomością i przesuń na górę
            const chatIndex = prev.findIndex(c => c.id === chatId);
            if (chatIndex === -1) { // Fallback, gdyby czat zniknął
                const newChat = { id: chatId, title: text.slice(0, 80), messages: [userMessage] };
                return [newChat, ...prev.slice(0, 9)];
            }

            const existingChat = prev[chatIndex];
            const updatedChat = {
                ...existingChat,
                messages: [...existingChat.messages, userMessage],
            };

            const otherChats = prev.filter(c => c.id !== chatId);
            return [updatedChat, ...otherChats];
        });

        if (isNewChat) {
            setSelectedChatId(chatId);
        }

        setTimeout(() => setScrollTrigger((t) => t + 1), 60);

        let llmMessage;

        try {
            // 2. Wywołaj API
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    sessionId: String(chatId),
                }),
            });

            if (!response.ok) {
                throw new Error(`Błąd HTTP: ${response.status}`);
            }

            const llmResponseText = await response.text();
            llmMessage = { role: "llm", text: llmResponseText };

        } catch (error) {
            console.error("Błąd podczas wysyłania wiadomości:", error);
            llmMessage = {
                role: "llm",
                text: `Wystąpił błąd: ${error.message}. Upewnij się, że serwer backend działa.`,
            };
        }

        // 3. Dodaj odpowiedź LLM do stanu (Immutable)
        setRecentChats((prev) =>
            prev.map(chat =>
                chat.id === chatId
                    ? { ...chat, messages: [...chat.messages, llmMessage] }
                    : chat
            )
        );

        // 4. Zakończ wysyłanie
        isSendingRef.current = false;
        setIsSending(false);
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

export default App;