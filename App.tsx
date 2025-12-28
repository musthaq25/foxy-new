
import React, { useState, useEffect, useRef } from 'react';
import { Screen, Theme, Session, AppConfig, Message, User } from './types';
import { STORAGE_KEYS, DEFAULT_CONFIG, ACCENT_COLORS } from './constants';
import { Sidebar } from './components/Sidebar';
import { storageService } from './services/storageService';
import { speechService } from './services/speechService';
import { desktopService } from './services/desktopService';
import { fetchAIResponse } from './services/apiService';
import { visionService } from './services/visionService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Menu, Send, Mic, Loader, Paperclip, X, LogOut, Moon, Sun, Monitor, Sparkles, Heart, ExternalLink, Globe, Eye, Scan, Info, Cpu, MessageSquare } from 'lucide-react';

interface NewsItem {
  title: string;
  source: string;
  description: string;
  url: string;
  publishedAt: string;
}

const AIResponseBubble = ({ text }: { text: string }) => {
  if (!text) return null;
  return (
    <div className="w-full text-left animate-fade-in py-2">
      <div className="max-w-[70ch] leading-relaxed markdown-content bg-white/5 border border-white/10 rounded-2xl p-6 shadow-sm">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>(Screen.LOADING);
  const [user, setUser] = useState<User | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  const [isVisionActive, setIsVisionActive] = useState(false);
  const [visionOCRText, setVisionOCRText] = useState('');
  const [visionOverlayText, setVisionOverlayText] = useState('');
  const [visionStatus, setVisionStatus] = useState<'idle' | 'analyzing' | 'responding'>('idle');
  const visionVideoRef = useRef<HTMLVideoElement | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authData = params.get('auth_data');
    if (authData) {
      try {
        const profile = JSON.parse(decodeURIComponent(authData));
        const loggedUser: User = { ...profile, isGuest: false };
        storageService.setUser(loggedUser);
        setUser(loggedUser);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) { console.error("Auth error", e); }
    }

    const init = async () => {
      const loadedUser = storageService.getUser();
      const loadedConfig = await storageService.loadConfig();
      const loadedSessions = await storageService.loadSessions();
      setUser(loadedUser);
      setGuestCount(storageService.getGuestStats().count);
      setConfig(loadedConfig);
      setSessions(loadedSessions);
      if (window.innerWidth >= 1024) setSidebarOpen(true);
      
      if (!loadedUser) setScreen(Screen.AUTH);
      else if (!loadedConfig.userName) setScreen(Screen.ONBOARDING_NAME);
      else setScreen(Screen.WELCOME);
    };
    init();
  }, []);

  useEffect(() => {
    if (screen === Screen.WELCOME) fetchNews();
    if (screen !== Screen.JARVIS_MODE) stopVision();
  }, [screen]);

  // Adjust textarea height for "expand and scroll inside" behavior
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputValue]);

  const fetchNews = async () => {
    setIsLoadingNews(true);
    try {
      const response = await fetch('/.netlify/functions/news');
      if (response.ok) {
        const data = await response.json();
        setNews(data);
      }
    } catch (e) { console.error("News fetch failed", e); }
    finally { setIsLoadingNews(false); }
  };

  useEffect(() => {
    document.body.className = config.theme === Theme.WHITE ? 'theme-white' : 
                             config.theme === Theme.LIQUID_GLASS ? 'theme-liquid-glass' : '';
    document.documentElement.style.setProperty('--accent-color', config.accentColor);
  }, [config.theme, config.accentColor]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, isProcessing]);

  const cleanupSessions = (activeId: string | null) => {
    setSessions(prev => {
      const cleaned = prev.filter(s => s.id === activeId || s.messages.length > 0);
      storageService.saveSessions(cleaned);
      return cleaned;
    });
  };

  const handleSendMessage = async (text: string) => {
    if (user?.isGuest && guestCount >= 10) return;
    if ((!text.trim() && !selectedImage) || isProcessing) return;
    
    let currentSession = sessions.find(s => s.id === currentSessionId);
    if (!currentSession) { 
        currentSession = { id: crypto.randomUUID(), title: 'New Conversation', mode: screen === Screen.JARVIS_MODE ? 'jarvis' : 'chat', messages: [], createdAt: Date.now() };
        setSessions([currentSession, ...sessions]);
        setCurrentSessionId(currentSession.id);
    }
    
    setIsProcessing(true);
    if (isVisionActive) setVisionStatus('responding');
    
    const currentImg = selectedImage;
    setInputValue('');
    setSelectedImage(null);

    const userMsg: Message = { id: crypto.randomUUID(), sender: 'user', text, imageData: currentImg || undefined, timestamp: new Date().toISOString() };
    const loadingMsg: Message = { id: crypto.randomUUID(), sender: 'foxy', text: 'Synthesizing...', timestamp: new Date().toISOString(), isLoading: true };
    
    if (!isVisionActive) updateSessionMessages(currentSession.id, [...currentSession.messages, userMsg, loadingMsg]);

    try {
      if (user?.isGuest) setGuestCount(storageService.incrementGuestCount());
      const response = await fetchAIResponse(currentSession, text, config.userName || 'User', currentImg);
      
      const aiMsg: Message = { id: crypto.randomUUID(), sender: 'foxy', text: response.text, timestamp: new Date().toISOString() };
      
      if (isVisionActive) {
        setVisionOverlayText(response.text);
      } else {
        updateSessionMessages(currentSession.id, [...currentSession.messages, userMsg, aiMsg], response.generatedTitle);
      }

      if (screen === Screen.JARVIS_MODE || isListening) {
        setIsSpeaking(true);
        speechService.speak(response.greeting || response.text, undefined, () => {
          setIsSpeaking(false);
          if (screen === Screen.JARVIS_MODE) startListening();
        });
      }
    } catch (e) { 
        if (!isVisionActive) updateSessionMessages(currentSession.id, [...currentSession.messages, userMsg, { id: 'err', sender: 'foxy', text: "Neural link disrupted. Check connection. 🦊", timestamp: '' }]);
    } finally { 
      setIsProcessing(false); 
      setVisionStatus('idle');
    }
  };

  const updateSessionMessages = (id: string, msgs: Message[], title?: string) => {
    setSessions(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, messages: msgs, title: title || s.title } : s);
      const persistSessions = updated.filter(s => s.messages.length > 0);
      storageService.saveSessions(persistSessions);
      return updated;
    });
  };

  const createSession = (mode: 'chat' | 'jarvis') => {
    cleanupSessions(null);
    setCurrentSessionId(null);
    setScreen(mode === 'chat' ? Screen.CHAT_MODE : Screen.JARVIS_MODE);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const startVision = async () => {
    const stream = await visionService.startScreenCapture();
    if (stream) {
      setIsVisionActive(true);
      setVisionOverlayText("Vision interface synchronized.");
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      visionVideoRef.current = video;
      
      const interval = window.setInterval(async () => {
        if (!isVisionActive || !visionVideoRef.current) return;
        setVisionStatus('analyzing');
        const result = await visionService.performOCR(visionVideoRef.current);
        setVisionOCRText(result.text);
        setVisionStatus('idle');
      }, 5000);
      (window as any)._visionInterval = interval;
    }
  };

  const stopVision = () => {
    visionService.stopScreenCapture();
    setIsVisionActive(false);
    setVisionOverlayText('');
    setVisionOCRText('');
    if ((window as any)._visionInterval) {
      clearInterval((window as any)._visionInterval);
    }
  };

  const startListening = () => {
    if (isListening || isSpeaking || isProcessing) return;
    setIsListening(true);
    speechService.startListening(
      (t) => { setIsListening(false); handleSendMessage(t); },
      () => setIsListening(false),
      () => setIsListening(false)
    );
  };

  const renderWelcome = () => (
    <div className={`flex flex-col items-center justify-start min-h-screen p-6 overflow-y-auto animate-fade-in relative transition-all ${isSidebarOpen ? 'lg:ml-72' : ''}`}>
         <div className="max-w-4xl w-full flex flex-col items-center space-y-10 py-16">
            <div className="text-center space-y-2">
              <img src="Foxy.png" alt="Foxy" className="w-16 h-16 mx-auto mb-4" />
              <div className="space-y-0.5">
                <h1 className="text-3xl font-black">Hi, {config.userName}</h1>
                <p className="text-[var(--text-muted)] text-base font-medium">What would you like to learn today?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                <button onClick={() => createSession('jarvis')} className="group glass-panel p-6 border-white/10 hover:border-indigo-500/50 transition-all active:scale-[0.98] bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-xl group-hover:scale-105 transition-transform">
                            <Mic size={24} className="text-indigo-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-black uppercase">Jarvis Mode</h3>
                            <p className="text-[10px] text-gray-400 font-medium">Voice and vision interface.</p>
                        </div>
                    </div>
                </button>

                <button onClick={() => createSession('chat')} className="group glass-panel p-6 border-white/10 hover:border-cyan-500/50 transition-all active:scale-[0.98] bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:scale-105 transition-transform">
                            <MessageSquare size={24} className="text-cyan-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-black uppercase">Chat Mode</h3>
                            <p className="text-[10px] text-gray-400 font-medium">Direct educational chat.</p>
                        </div>
                    </div>
                </button>
            </div>

            <div className="w-full glass-panel p-6 border-white/5 space-y-4 bg-black/20 max-w-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="text-cyan-500" size={12} />
                  <h2 className="text-[9px] font-black uppercase">Recent Intelligence</h2>
                </div>
                <button onClick={fetchNews} className="text-[8px] font-black uppercase text-gray-500 hover:text-cyan-400">Sync</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {isLoadingNews ? (
                  <div className="col-span-full py-2 text-center opacity-40"><Loader className="animate-spin mx-auto" size={14}/></div>
                ) : news.length > 0 ? (
                  news.slice(0, 3).map((item, idx) => (
                    <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/5 rounded-lg transition-all">
                      <h3 className="text-[9px] font-bold line-clamp-2 leading-tight">{item.title}</h3>
                      <p className="text-[8px] uppercase font-black text-gray-600 mt-1">{item.source}</p>
                    </a>
                  ))
                ) : (
                  <div className="col-span-full text-center py-2 text-gray-600 text-[9px]">Neural sync offline.</div>
                )}
              </div>
            </div>
         </div>
    </div>
  );

  const renderChat = () => {
    const session = sessions.find(s => s.id === currentSessionId);
    return (
      <div className={`flex flex-col h-screen relative animate-fade-in transition-all ${isSidebarOpen ? 'lg:ml-72' : ''}`}>
        <div className="flex-grow overflow-y-auto px-4 md:px-0 space-y-12 pb-64 pt-24 max-w-4xl mx-auto w-full">
          {session?.messages.map(m => (
            <div key={m.id} className={`flex w-full ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start w-full'}`}>
                {m.imageData && <img src={m.imageData} className="max-w-[300px] rounded-2xl mb-4 shadow-xl border border-gray-700" alt="Uploaded" />}
                <div className={`${m.sender === 'user' ? 'max-w-[80%] bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)] px-4 py-3 rounded-[20px] shadow-sm border border-white/10' : 'w-full'}`}>
                  {m.isLoading ? (
                    <div className="py-4 flex items-center gap-3">
                        <Loader className="animate-spin text-cyan-500" size={16}/>
                        <span className="text-xs text-cyan-500/70 font-bold uppercase">Synthesizing...</span>
                    </div>
                  ) : (
                    <div className={m.sender === 'user' ? 'text-right text-sm font-medium' : ''}>
                      {m.sender === 'user' ? m.text : <AIResponseBubble text={m.text}/>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-transparent z-40">
          <div className={`max-w-3xl mx-auto glass-panel p-3 flex flex-col gap-2 shadow-2xl transition-all border-white/10 ${isSidebarOpen ? 'lg:ml-[calc(18rem+auto)]' : ''}`}>
            {selectedImage && (
              <div className="flex items-center gap-2 p-2 bg-gray-800/10 rounded-xl animate-fade-in">
                <img src={selectedImage} className="w-10 h-10 rounded-lg object-cover" />
                <span className="text-[10px] font-bold text-gray-500 flex-grow italic">Visual Context Synchronized</span>
                <button onClick={() => setSelectedImage(null)} className="p-1 text-red-400 hover:bg-red-400/10 rounded-full"><X size={14}/></button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <button onClick={() => fileInputRef.current?.click()} className="p-2 mb-1 text-gray-500 hover:text-cyan-400"><Paperclip size={18}/></button>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setSelectedImage(reader.result as string);
                  reader.readAsDataURL(file);
                }
              }} />
              <textarea 
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }
                }}
                rows={1}
                placeholder="Message Foxy..."
                className="flex-grow bg-transparent p-2 outline-none text-base font-medium text-[var(--text-main)] placeholder:text-gray-600 max-h-48 overflow-y-auto resize-none scrollbar-thin"
              />
              <button onClick={() => handleSendMessage(inputValue)} className="p-3 mb-1 bg-cyan-600 rounded-2xl text-white hover:bg-cyan-500 transition-all shadow-xl active:scale-95"><Send size={16}/></button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (screen === Screen.LOADING) return <div className="h-screen w-screen flex flex-col gap-4 items-center justify-center text-cyan-500 bg-black"><Loader size={40} className="animate-spin" /></div>;
  
  if (screen === Screen.AUTH) return (
    <div className="flex flex-col items-center justify-center h-screen bg-black font-sans relative overflow-hidden px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-black to-black"></div>
      <div className="glass-panel p-10 md:p-14 max-w-md w-full text-center space-y-10 animate-fade-scale shadow-[0_0_60px_rgba(6,182,212,0.1)] relative z-10 bg-black/40 border-white/10">
          <div className="space-y-4">
            <img src="Foxy.png" className="w-16 h-16 mx-auto mb-4" />
            <div className="space-y-0.5">
              <h1 className="text-3xl font-black uppercase text-white">Foxy AI</h1>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">NOMIX</p>
            </div>
          </div>
          <div className="space-y-3">
            <button onClick={() => window.location.href = '/.netlify/functions/google-login'} className="w-full flex items-center justify-center gap-4 bg-white text-black py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all text-sm uppercase hover:bg-gray-200">
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" /> Google Sign In
            </button>
            <button onClick={() => { setUser({id: 'guest', email:'', name: 'Guest', isGuest: true}); setScreen(Screen.ONBOARDING_NAME); }} className="w-full py-4 text-gray-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest">
              Guest Access
            </button>
          </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-transparent text-[var(--text-main)] overflow-hidden font-sans selection:bg-cyan-500/30">
      {!isVisionActive && (
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="fixed top-8 left-8 z-[60] p-3.5 glass-panel text-gray-500 hover:text-[var(--text-main)] transition-all shadow-2xl active:scale-90 border-white/10">
          <Menu size={22}/>
        </button>
      )}

      <Sidebar 
        isOpen={isSidebarOpen} 
        currentScreen={screen} 
        sessions={sessions.filter(s => s.messages.length > 0)} 
        currentSessionId={currentSessionId}
        onToggle={setSidebarOpen} 
        onNavigate={(s) => { cleanupSessions(currentSessionId); setScreen(s); if(window.innerWidth < 1024) setSidebarOpen(false); }}
        onSwitchSession={(id) => { cleanupSessions(id); setCurrentSessionId(id); setScreen(sessions.find(s=>s.id===id)?.mode==='jarvis'?Screen.JARVIS_MODE:Screen.CHAT_MODE); if(window.innerWidth < 1024) setSidebarOpen(false); }}
        onDeleteSession={(id) => { setSessions(prev => prev.filter(s=>s.id!==id)); if (id===currentSessionId) setScreen(Screen.WELCOME); }}
        onNewSession={createSession}
      />

      {screen === Screen.WELCOME && renderWelcome()}
      {screen === Screen.CHAT_MODE && renderChat()}
      {screen === Screen.JARVIS_MODE && (
        <div className={`flex flex-col items-center justify-center h-screen transition-all ${isSidebarOpen ? 'lg:ml-72' : ''}`}>
          <div className="flex flex-col items-center gap-10">
            <div onClick={() => isListening ? speechService.stopListening() : startListening()} className={`w-60 h-60 rounded-full glass-panel flex items-center justify-center cursor-pointer transition-all duration-700 shadow-3xl ${isListening ? 'animate-listening-pulse border-emerald-500/50' : isSpeaking ? 'animate-orb-pulse border-cyan-500/50' : 'border-white/5'}`}>
              <div className="relative">
                  {isProcessing ? <Loader className="animate-spin text-white" size={48}/> : <Mic size={48} className={isListening ? 'text-emerald-400' : 'text-gray-500'}/>}
              </div>
            </div>
            <div className="flex flex-col items-center gap-6 animate-fade-in text-center">
              <div>
                <h2 className="text-2xl font-black mb-1 uppercase tracking-wider">{isListening ? 'Listening' : isVisionActive ? 'Vision Interface' : 'Jarvis Hub'}</h2>
                <p className="text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-widest">Neural Link Sync</p>
              </div>
              {!isVisionActive && (
                <button onClick={startVision} className="flex items-center gap-3 px-6 py-2.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all group">
                   <Eye size={16} className="text-cyan-400"/>
                   <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Engage Vision</span>
                </button>
              )}
            </div>
          </div>
          {isVisionActive && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xl animate-slide-up">
              <div className="glass-panel p-6 shadow-3xl border-cyan-500/20 bg-gray-900/90 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">Vision Stream</span>
                  <button onClick={stopVision} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg"><X size={16}/></button>
                </div>
                <div className="max-h-40 overflow-y-auto text-sm font-medium pr-2 text-center text-gray-300">
                  {visionOverlayText || "Analyzing visual input..."}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {screen === Screen.SETTINGS && (
        <div className={`flex flex-col h-screen p-6 overflow-y-auto transition-all ${isSidebarOpen ? 'lg:ml-72' : ''}`}>
          <div className="max-w-xl mx-auto w-full space-y-8 mt-20 pb-20">
            <h1 className="text-2xl font-black uppercase tracking-widest">Neural Config</h1>
            <div className="glass-panel p-8 space-y-8 shadow-2xl border-white/5">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">User Signature</label>
                <input type="text" value={config.userName || ''} onChange={(e) => { const n = {...config, userName: e.target.value}; setConfig(n); storageService.saveConfig(n); }} className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 outline-none focus:border-cyan-500 transition-all font-bold text-lg" />
              </div>
            </div>
            <button onClick={() => { storageService.setUser(null); setScreen(Screen.AUTH); }} className="w-full flex items-center justify-center gap-3 p-5 text-red-500/80 border border-red-500/10 rounded-2xl hover:bg-red-500/5 font-black uppercase text-[10px] tracking-widest">
              <LogOut size={16}/> Disconnect Link
            </button>
          </div>
        </div>
      )}
      
      {screen === Screen.ONBOARDING_NAME && (
        <div className="h-screen flex items-center justify-center p-6 bg-black">
           <div className="glass-panel p-10 md:p-14 max-w-sm w-full text-center space-y-8 animate-fade-scale border-white/10 bg-black/40">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black uppercase text-white tracking-wider">I am Foxy.</h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Identify yourself.</p>
              </div>
              <input 
                  type="text" 
                  placeholder="USER_NAME" 
                  className="w-full p-4 bg-white/[0.03] rounded-2xl outline-none focus:border-cyan-500 border border-white/10 font-black text-center text-xl text-white uppercase tracking-widest" 
                  onChange={(e)=>setConfig({...config, userName: e.target.value})} 
              />
              <button onClick={()=>{ storageService.saveConfig(config); setScreen(Screen.WELCOME); }} className="w-full bg-cyan-600 py-4 rounded-2xl font-black text-[11px] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-white hover:bg-cyan-500">
                Initialize Link
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
