import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const SAMPLE_PROMPTS = [

];

// === ZMODYFIKOWANY KOMPONENT SIDEBAR ===
// Usunięto 'onStartWithSelected' i stary przycisk.
// Przycisk 'start-btn' wywołuje teraz 'onNewChat'.
function Sidebar({ prompts, onSelect, selectedId, onNewChat }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">Unolingo</div>
                <button
                    className="start-btn"
                    onClick={onNewChat} // <-- ZMIANA: Ten przycisk rozpoczyna nową rozmowę
                >
                    Rozpocznij
                </button>
            </div>

            {/* BIAŁY PRZYCISK "Rozpocznij nową naukę" ZOSTAŁ USUNIĘTY */}

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

function Composer({ value, onChange, onSend, onMic, onImage, isSending, isListening }) { // <--- NOWOŚĆ: isListening
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
                {/* Zmieniamy ikonę na podstawie stanu 'isListening' */}
                <button type="button" className="icon-btn" onClick={onMic} title="Microphone">
                    {isListening ? "🔴" : "🎙️"} {/* <--- ZMIANA */}
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

// Ustawiony poprawny port 8081
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
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    // Ten useEffect synchronizuje tekst z dyktowania ze stanem 'input'
    useEffect(() => {
        if (transcript) {
            setInput(transcript);
        }
    }, [transcript, setInput]);




    useEffect(() => {
        try {
            localStorage.setItem("recentChats", JSON.stringify(recentChats));
        } catch (e) {}
    }, [recentChats]);

    // Zakomentowany useEffect, aby nowa rozmowa była pusta
    // useEffect(() => {
    //   if (selectedChatId === null && recentChats.length > 0) {
    //     setSelectedChatId(recentChats[0].id);
    //   }
    // }, [selectedChatId, recentChats]);


    // FUNKCJA 'sendMessageText' ZOSTAŁA USUNIĘTA, GDYŻ NIE JEST JUŻ UŻYWANA


    /** Wysyła wiadomość z pola input (przycisk "Wyślij") */
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

        setRecentChats((prev) => {
            if (isNewChat) {
                const newChat = { id: chatId, title: text.slice(0, 80), messages: [userMessage] };
                return [newChat, ...prev.slice(0, 9)];
            }

            const chatIndex = prev.findIndex(c => c.id === chatId);
            if (chatIndex === -1) {
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
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, sessionId: String(chatId) }),
            });
            if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
            const llmResponseText = await response.text();
            llmMessage = { role: "llm", text: llmResponseText };
        } catch (error) {
            console.error("Błąd podczas wysyłania wiadomości:", error);
            llmMessage = {
                role: "llm",
                text: `Wystąpił błąd: ${error.message}. Upewnij się, że serwer backend działa.`,
            };
        }

        setRecentChats((prev) =>
            prev.map(chat =>
                chat.id === chatId
                    ? { ...chat, messages: [...chat.messages, llmMessage] }
                    : chat
            )
        );

        isSendingRef.current = false;
        setIsSending(false);
        setTimeout(() => setScrollTrigger((t) => t + 1), 60);
    }

    function handleMic() {
        if (!browserSupportsSpeechRecognition) {
            alert("Twoja przeglądarka nie wspiera dyktowania.");
            return;
        }

        if (listening) {
            SpeechRecognition.stopListening(); // Zatrzymaj nasłuchiwanie
        } else {
            resetTranscript(); // Zresetuj stary tekst
            // Używamy 'pl-PL' dla języka polskiego
            SpeechRecognition.startListening({ continuous: true, language: 'pl-PL' }); // Rozpocznij nasłuchiwanie
        }
    }

    function handleImage() {
        alert("Image upload action (not implemented)");
    }

    /** Czyści zaznaczenie, co resetuje czat do pustego widoku */
    function handleNewChat() {
        setSelectedChatId(null);
        setInput("");
        resetTranscript();
    }

    // Logika wyświetlania wiadomości
    const currentChat = recentChats.find((c) => c.id === selectedChatId);
    const currentMessages = currentChat
        ? currentChat.messages
        : []; // Pusta tablica dla nowej rozmowy

    return (
        <div className="llm-ui-root">
            <div className="llm-ui-container">
                {/* === ZMODYFIKOWANE WYWOŁANIE SIDEBAR === */}
                {/* Usunięto 'onStartWithSelected' */}
                <Sidebar
                    prompts={recentChats.map((c) => ({ id: c.id, title: c.title }))}
                    onSelect={setSelectedChatId}
                    selectedId={selectedChatId}
                    onNewChat={handleNewChat}
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
                        isListening={listening}
                    />
                </main>
            </div>
        </div>
    );
};

export default App;