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

function Sidebar({prompts, onSelect, selectedIndex, onStartNewWithSelected}){
  const selected = prompts[selectedIndex];
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">Unolingo</div>
        <button className="start-btn" onClick={() => onStartNewWithSelected && onStartNewWithSelected(selected)}>Rozpocznij nową naukę</button>
  </div>
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

function ChatArea({messages, forceScrollTrigger}){
  const bottomRef = useRef();
  const messagesRef = useRef();

  useEffect(()=>{
    const container = messagesRef.current;
    if(!container) return;
    // if user was near bottom or new user message, scroll
    const isNearBottom = (container.scrollHeight - (container.scrollTop + container.clientHeight)) < 160;
    const lastRole = messages.length ? messages[messages.length-1].role : null;
    if(isNearBottom || lastRole === 'user'){
      try{ container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }); }
      catch(e){ bottomRef.current?.scrollIntoView({behavior: 'smooth'}); }
    }
  }, [messages]);

  useEffect(()=>{
    const container = messagesRef.current;
    if(!container) return;
    try{ container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }); }
    catch(e){ bottomRef.current?.scrollIntoView({behavior: 'smooth'}); }
  }, [forceScrollTrigger]);

  return (
    <div className="chat-area">
      <div className="chat-header"> </div>
      <div className="messages" ref={messagesRef}>
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

function Composer({value, onChange, onSend, onMic, onImage, isSending}){
  const handleSubmit = (e) =>{
    e.preventDefault();
    // debug: log submit origin and guard state
    try{ console.log('Composer submit event', { type: e.type, native: e.nativeEvent?.type, time: Date.now(), isSending }); }catch(e){}
    if(isSending) {
      try{ console.log('Composer submit ignored: isSending=true'); }catch(e){}
      return;
    }
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
        <button type="button" className="icon-btn" onClick={onMic} title="Microphone">🎙️</button>
        <button type="button" className="icon-btn" onClick={onImage} title="Image">🖼️</button>
        <button type="submit" className="send-btn" disabled={!value.trim() || isSending}>{isSending? 'Wysyłanie...':'Wyślij'}</button>
      </div>
    </form>
  );
}

const App = () => {
  const [selectedChatIndex, setSelectedChatIndex] = useState(-1);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const sendCooldownRef = useRef(0);
  const [scrollTrigger, setScrollTrigger] = useState(0);

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

  // Overwrite top chat or create with given prompt (used by Rozpocznij button)
  function sendMessageText(text){
    const now = Date.now();
    // cooldown: ignore rapid repeated triggers
    if(now - sendCooldownRef.current < 800){ try{ console.log('sendMessageText ignored due to cooldown', {since: now - sendCooldownRef.current}); }catch(e){}; return; }
    sendCooldownRef.current = now;
    if(isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);

    const t = (text || '').trim();
    if(!t){ isSendingRef.current = false; setIsSending(false); return; }

    const reply = {role: 'llm', text: 'To jest przykładowa odpowiedź. (Jeszcze nie podłączono modelu)'};
    setRecentChats((prev) => {
      const copy = prev.slice();
      if(copy.length > 0){
        const chat = {...copy[0]};
        chat.title = t;
        chat.messages = [{role:'user', text: t}, reply];
        copy[0] = chat;
        return copy;
      }
      const newChat = { id: Date.now(), title: t, messages: [{role:'user', text: t}, reply] };
      return [newChat, ...copy].slice(0,10);
    });
    setSelectedChatIndex(0);
    setTimeout(()=>{ isSendingRef.current = false; setIsSending(false); }, 200);
    setTimeout(()=> setScrollTrigger(s => s + 1), 80);
  }

  // Create a new chat (do not overwrite existing) from a prompt selected in the sidebar
  function startNewWithSelected(text){
    const now = Date.now();
    if(now - sendCooldownRef.current < 800){ try{ console.log('startNewWithSelected ignored due to cooldown', {since: now - sendCooldownRef.current}); }catch(e){}; return; }
    sendCooldownRef.current = now;

    if(isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);

    const t = (text || '').trim();
    if(!t){ isSendingRef.current = false; setIsSending(false); return; }

    const reply = {role: 'llm', text: 'To jest przykładowa odpowiedź. (Jeszcze nie podłączono modelu)'};
    const newChat = { id: Date.now(), title: t, messages: [{role:'user', text: t}, reply] };
    setRecentChats((prev) => [newChat, ...prev].slice(0,10));
    setSelectedChatIndex(0);

    setTimeout(()=>{ isSendingRef.current = false; setIsSending(false); }, 200);
    setTimeout(()=> setScrollTrigger(s => s + 1), 80);
  }

  function handleSend(){
    // guard: ignore if already sending
    const now = Date.now();
    // cooldown guard to catch multiple near-simultaneous submits
    if(now - sendCooldownRef.current < 800){ try{ console.log('handleSend ignored due to cooldown', {since: now - sendCooldownRef.current}); }catch(e){}; return; }
    sendCooldownRef.current = now;
    if(isSendingRef.current){ try{ console.log('handleSend ignored (already sending)', {time: Date.now()}); }catch(e){}; return; }
    isSendingRef.current = true;
    setIsSending(true);
    try{ console.count('handleSend called'); console.log('handleSend start', {time: Date.now()}); }catch(e){}

    const text = input.trim();
    if(!text){ isSendingRef.current = false; setIsSending(false); return; }
    setInput('');

    const reply = {role: 'llm', text: 'To jest przykładowa odpowiedź. (Jeszcze nie podłączono modelu)'};

    if(selectedChatIndex >= 0 && recentChats[selectedChatIndex]){
      setRecentChats((prev) => {
        const copy = prev.slice();
        const chat = copy.splice(selectedChatIndex,1)[0];
        const last = chat.messages[chat.messages.length-1];
        if(!(last && last.role === 'user' && last.text === text)){
          chat.messages = [...chat.messages, {role:'user', text}, reply];
        }
        const next = [chat, ...copy].slice(0,10);
        return next;
      });
      setSelectedChatIndex(0);
    } else {
      const newChat = { id: Date.now(), title: text.slice(0,80), messages: [{role:'user', text}, reply] };
      setRecentChats((prev) => {
        const first = prev[0];
        if(first && first.messages && first.messages.length){
          const last = first.messages[first.messages.length-1];
          if(last && last.role === 'user' && last.text === text){
            return prev;
          }
        }
        return [newChat, ...prev].slice(0,10);
      });
      setSelectedChatIndex(0);
    }

    setTimeout(()=>{ isSendingRef.current = false; setIsSending(false); }, 200);
    setTimeout(()=> setScrollTrigger(t => t + 1), 60);
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
  <Sidebar prompts={recentChats.map(c => c.title)} onSelect={setSelectedChatIndex} selectedIndex={selectedChatIndex} onStartNewWithSelected={startNewWithSelected} />
        <main className="main-area">
          <ChatArea messages={currentMessages} forceScrollTrigger={scrollTrigger} />
          <Composer value={input} onChange={setInput} onSend={handleSend} onMic={handleMic} onImage={handleImage} isSending={isSending} />
        </main>
      </div>
    </div>
  );
};

export default App;
