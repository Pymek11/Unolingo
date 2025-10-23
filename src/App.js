import React, {useState, useRef, useEffect} from "react";
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

function Sidebar({prompts, onSelect, selectedIndex}){
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">Unolingo</div>
      </div>
      <div className="sidebar-title">Rozpocznij nową naukę</div>
      <ul className="prompts-list">
        {prompts.map((p, i) => (
          <li key={i} className={"prompt-item " + (i===selectedIndex? 'active':'')} onClick={() => onSelect(i)}>
            {p}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function ChatArea({messages}){
  const bottomRef = useRef();
  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  return (
    <div className="chat-area">
      <div className="chat-header"> </div>
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`message-bubble ${m.role}`}>
            <div className="role-tag">{m.role === 'user' ? 'Ty' : 'Unolingo'}</div>
            <div className="message-text">{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function Composer({value, onChange, onSend, onMic, onImage}){
  return (
    <div className="composer">
      <div className="composer-input">
        <input
          aria-label="message"
          placeholder="O czym chcesz się nauczyć?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="composer-actions">
        <button className="icon-btn" onClick={onMic} title="Microphone">🎙️</button>
        <button className="icon-btn" onClick={onImage} title="Image">🖼️</button>
        <button className="send-btn" onClick={onSend} disabled={!value.trim()}>Wyślij</button>
      </div>
    </div>
  );
}

const App = () => {
  const [selectedChatIndex, setSelectedChatIndex] = useState(-1);
  const [input, setInput] = useState('');

  // A chat object: { id, title, messages: [{role:'user'|'llm', text}] }
  const [recentChats, setRecentChats] = useState(() => {
    try {
      const raw = localStorage.getItem('recentChats');
      if(raw) return JSON.parse(raw);
      // Build initial sample chats from SAMPLE_PROMPTS
      return SAMPLE_PROMPTS.slice(0,10).map((p, i) => ({
        id: Date.now() + i,
        title: p,
        messages: [
          {role: 'user', text: p},
          {role: 'llm', text: `Przykładowa odpowiedź dla: "${p}"`}]
      }));
    } catch (e) { return []; }
  });

  useEffect(()=>{
    // If nothing selected yet, pick the most recent chat
    if(selectedChatIndex === -1 && recentChats.length > 0){
      setSelectedChatIndex(0);
    }
  }, [selectedChatIndex, recentChats]);

  // Persist recentChats whenever they change
  useEffect(()=>{
    try{ localStorage.setItem('recentChats', JSON.stringify(recentChats)); }catch(e){}
  }, [recentChats]);

  function handleSend(){
    const text = input.trim();
    if(!text) return;
    setInput('');

    const reply = {role: 'llm', text: 'To jest przykładowa odpowiedź. (Jeszcze nie podłączono modelu)'};

    if(selectedChatIndex >= 0 && recentChats[selectedChatIndex]){
      // move selected chat to top and append messages
      setRecentChats((prev) => {
        const copy = prev.slice();
        const chat = copy.splice(selectedChatIndex,1)[0];
        chat.messages = [...chat.messages, {role:'user', text}, reply];
        const next = [chat, ...copy].slice(0,10);
        return next;
      });
      setSelectedChatIndex(0);
    } else {
      // create a new chat thread
      const newChat = { id: Date.now(), title: text.slice(0,80), messages: [{role:'user', text}, reply] };
      setRecentChats((prev) => [newChat, ...prev].slice(0,10));
      setSelectedChatIndex(0);
    }
  }

  function handleMic(){
    // minimal feedback
    alert('Microphone action (not implemented)');
  }

  function handleImage(){
    alert('Image upload action (not implemented)');
  }

  const currentMessages = (selectedChatIndex >= 0 && recentChats[selectedChatIndex]) ? recentChats[selectedChatIndex].messages : [{role:'llm', text:'Witaj! Napisz swoją wiadomość do asystenta ai!.'}];

  return (
    <div className="llm-ui-root">
      <div className="llm-ui-container">
        <Sidebar prompts={recentChats.map(c => c.title)} onSelect={setSelectedChatIndex} selectedIndex={selectedChatIndex} />
        <main className="main-area">
          <ChatArea messages={currentMessages} />
          <Composer value={input} onChange={setInput} onSend={handleSend} onMic={handleMic} onImage={handleImage} />
        </main>
      </div>
    </div>
  );
};

export default App;
