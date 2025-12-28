
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
  title: string; source: string; description: string; url: string; publishedAt: string;
}

const AIResponseBubble = ({ text }: { text: string }) => {
  if (!text) return null;
  return (
    <div className="w-full flex justify-start animate-fade-in py-4">
      <div className="w-full max-w-[75ch] glass-panel bg-white/[0.03] border-white/10 p-6 md:p-8 shadow-sm">
        <div className="markdown-content text-[var(--text-main)] leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {text}
          </ReactMarkdown>
        </div>
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
        storageService.setUser({ ...profile, isGuest: false });
        setUser({ ...profile, isGuest: false });
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
      if (response.ok) setNews(await response.json());
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

  const stopAllMedia = () => {
    speechService.stopSpeaking();
    speechService.stopListening();
    setIsSpeaking(false);
    setIsListening(false);
  };

  // helper to remove empty sessions from history
  const cleanupSessions = (activeId: string | null) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.messages.length > 0 || s.id === activeId);
      storageService.saveSessions(filtered.filter(s => s.messages.length > 0));
      return filtered;
    });
  };

  const handleSendMessage = async (text: string) => {
    if (user?.isGuest && guestCount >= 20) return;
    if ((!text.trim() && !selectedImage) || isProcessing) return;
    
    let currentSession = sessions.find(s => s.id === currentSessionId);
    if (!currentSession) { 
        currentSession = { id: crypto.randomUUID(), title: 'Conversation', mode: screen === Screen.JARVIS_MODE ? 'jarvis' : 'chat', messages: [], createdAt: Date.now() };
        setSessions([currentSession, ...sessions]);
        setCurrentSessionId(currentSession.id);
    }
    
    setIsProcessing(true);
    if (isVisionActive) setVisionStatus('responding');
    
    const currentImg = selectedImage;
    setInputValue('');
    setSelectedImage(null);

    const fullQuery = isVisionActive ? `[CONTEXT: Screen capture text: ${visionOCRText.substring(0, 800)}]\n\nUser Question: ${text}` : text;
    const userMsg: Message = { id: crypto.randomUUID(), sender: 'user', text, imageData: currentImg || undefined, timestamp: new Date().toISOString() };
    const loadingMsg: Message = { id: crypto.randomUUID(), sender: 'foxy', text: 'Synthesizing...', timestamp: new Date().toISOString(), isLoading: true };
    
    if (!isVisionActive) updateSessionMessages(currentSession.id, [...currentSession.messages, userMsg, loadingMsg]);

    try {
      if (user?.isGuest) setGuestCount(storageService.incrementGuestCount());
      const response = await fetchAIResponse(currentSession, fullQuery, config.userName || 'User', currentImg);
      
      if (response.isCommand && response.command === 'OPEN_APP') {
          desktopService.openApp(response.appName || '');
      }

      const aiMsg: Message = { id: crypto.randomUUID(), sender: 'foxy', text: response.text, timestamp: new Date().toISOString() };
      
      if (isVisionActive) {
        setVisionOverlayText(response.text);
      } else {
        updateSessionMessages(currentSession.id, [...currentSession.messages, userMsg, aiMsg], response.generatedTitle);
      }

      setIsSpeaking(true);
      speechService.speak(response.greeting || response.text, undefined, () => {
          setIsSpeaking(false);
          if (screen === Screen.JARVIS_MODE) startListening();
      });
    } catch (e) { 
        if (!isVisionActive) updateSessionMessages(currentSession.id, [...currentSession.messages, userMsg, { id: 'err', sender: 'foxy', text: "Connection disrupted. 🦊", timestamp: '' }]);
    } finally { 
      setIsProcessing(false); 
      setVisionStatus('idle');
    }
  };

  const updateSessionMessages = (id: string, msgs: Message[], title?: string) => {
    setSessions(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, messages: msgs, title: title || s.title } : s);
      const persist = updated.filter(s => s.messages.length > 0);
      storageService.saveSessions(persist);
      return updated;
    });
  };

  const createSession = (mode: 'chat' | 'jarvis') => {
    stopAllMedia();
    setCurrentSessionId(null);
    setScreen(mode === 'chat' ? Screen.CHAT_MODE : Screen.JARVIS_MODE);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const startVision = async () => {
    const stream = await visionService.startScreenCapture();
    if (stream) {
      setIsVisionActive(true);
      setVisionOverlayText("Vision active. I'm watching your screen.");
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
    if ((window as any)._visionInterval) clearInterval((window as any)._visionInterval);
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
         <div className="max-w-4xl w-full flex flex-col items-center space-y-12 py-20">
            <div className="text-center space-y-4">
              <img src="Foxy.png" alt="Foxy" className="w-20 h-20 mx-auto mb-4" />
              <div className="space-y-1">
                <h1 className="text-4xl font-black">Welcome, {config.userName}</h1>
                <p className="text-[var(--text-muted)] text-lg font-medium">Your premium tutor and assistant.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                <button onClick={() => createSession('jarvis')} className="group glass-panel p-8 border-white/10 hover:border-indigo-500/50 transition-all active:scale-[0.98] bg-white/[0.01]">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-500/10 rounded-2xl group-hover:scale-105 transition-transform">
                            <Mic size={28} className="text-indigo-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-black uppercase">Jarvis</h3>
                            <p className="text-xs text-gray-400 font-medium">Voice & Vision interface.</p>
                        </div>
                    </div>
                </button>

                <button onClick={() => createSession('chat')} className="group glass-panel p-8 border-white/10 hover:border-cyan-500/50 transition-all active:scale-[0.98] bg-white/[0.01]">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-cyan-500/10 rounded-2xl group-hover:scale-105 transition-transform">
                            <MessageSquare size={28} className="text-cyan-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-black uppercase">Chat</h3>
                            <p className="text-xs text-gray-400 font-medium">Educational text chat.</p>
                        </div>
                    </div>
                </button>
            </div>

            <div className="w-full glass-panel p-8 border-white/5 space-y-4 bg-black/20 max-w-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="text-cyan-500" size={16} />
                  <h2 className="text-xs font-black uppercase tracking-widest">Neural Intel Feed</h2>
                </div>
                <button onClick={fetchNews} className="text-[10px] font-black uppercase text-gray-500 hover:text-cyan-400">Sync</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {isLoadingNews ? (
                  <div className="col-span-full py-4 text-center opacity-40"><Loader className="animate-spin mx-auto" size={16}/></div>
                ) : news.length > 0 ? (
                  news.slice(0, 3).map((item, idx) => (
                    <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/5 rounded-lg transition-all border border-transparent hover:border-white/5">
                      <h3 className="text-[10px] font-bold line-clamp-2 leading-tight">{item.title}</h3>
                      <p className="text-[8px] uppercase font-black text-gray-600 mt-2">{item.source}</p>
                    </a>
                  ))
                ) : (
                  <div className="col-span-full text-center py-4 text-gray-600 text-[10px] uppercase font-black">Sync Offline</div>
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
        <div className="flex-grow overflow-y-auto px-6 space-y-12 pb-64 pt-24 w-full">
          <div className="max-w-[85ch] mx-auto w-full space-y-12">
            {session?.messages.map(m => (
              <div key={m.id} className={`flex w-full ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start w-full'}`}>
                  {m.imageData && <img src={m.imageData} className="max-w-[350px] rounded-2xl mb-4 shadow-2xl border border-gray-700" alt="Context" />}
                  <div className={`${m.sender === 'user' ? 'max-w-[85%] bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)] px-5 py-3 rounded-[24px] shadow-sm border border-white/10 text-sm font-medium' : 'w-full'}`}>
                    {m.isLoading ? (
                      <div className="py-4 flex items-center gap-3">
                          <Loader className="animate-spin text-cyan-500" size={18}/>
                          <span className="text-[10px] text-cyan-500/80 font-black uppercase tracking-widest">Synthesizing...</span>
                      </div>
                    ) : (
                      m.sender === 'user' ? m.text : <AIResponseBubble text={m.text}/>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div ref={chatEndRef} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-8 bg-transparent z-40">
          <div className={`max-w-3xl mx-auto glass-panel p-3 flex flex-col gap-2 shadow-2xl transition-all border-white/10 ${isSidebarOpen ? 'lg:ml-[calc(18rem+auto)]' : ''}`}>
            {selectedImage && (
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl animate-fade-in">
                <img src={selectedImage} className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex-grow italic">Visual Link Active</span>
                <button onClick={() => setSelectedImage(null)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"><X size={16}/></button>
              </div>
            )}
            <div className="flex gap-2 items-end px-2">
              <button onClick={() => fileInputRef.current?.click()} className="p-2 mb-1.5 text-gray-500 hover:text-cyan-400 transition-colors"><Paperclip size={20}/></button>
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
                placeholder="Type your query..."
                className="flex-grow bg-transparent p-3 outline-none text-base font-medium text-[var(--text-main)] placeholder:text-gray-600 max-h-48 overflow-y-auto resize-none scrollbar-none"
              />
              <button onClick={() => handleSendMessage(inputValue)} className="p-3 mb-1 bg-cyan-600 rounded-2xl text-white hover:bg-cyan-500 transition-all shadow-xl active:scale-95"><Send size={18}/></button>
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
      <div className="glass-panel p-10 md:p-14 max-w-md w-full text-center space-y-12 animate-fade-scale shadow-[0_0_60px_rgba(6,182,212,0.1)] relative z-10 bg-black/40 border-white/10">
          <div className="space-y-4">
            <img src="Foxy.png" className="w-20 h-20 mx-auto mb-4" />
            <div className="space-y-1">
              <h1 className="text-4xl font-black uppercase text-white">Foxy AI</h1>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">NOMIX Edition</p>
            </div>
          </div>
          <div className="space-y-4">
            <button onClick={() => window.location.href = '/.netlify/functions/google-login'} className="w-full flex items-center justify-center gap-4 bg-white text-black py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all text-sm uppercase hover:bg-gray-100">
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" /> Sign in with Google
            </button>
            <button onClick={() => { setUser({id: 'guest', email:'', name: 'Guest', isGuest: true}); setScreen(Screen.ONBOARDING_NAME); }} className="w-full py-4 text-gray-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
              Guest Access
            </button>
          </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-transparent text-[var(--text-main)] overflow-hidden font-sans selection:bg-cyan-500/30">
      {!isVisionActive && (
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="fixed top-8 left-8 z-[60] p-4 glass-panel text-gray-500 hover:text-[var(--text-main)] transition-all shadow-2xl active:scale-90 border-white/10">
          <Menu size={24}/>
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
          <div className="flex flex-col items-center gap-12">
            <div 
              onClick={() => {
                if (isSpeaking || isListening) stopAllMedia();
                else startListening();
              }} 
              className={`w-64 h-64 rounded-full glass-panel flex items-center justify-center cursor-pointer transition-all duration-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 ${isListening ? 'animate-listening-pulse border-emerald-500' : isSpeaking ? 'animate-orb-pulse border-cyan-500' : 'border-white/10 hover:border-cyan-500/50'}`}
            >
              <div className="relative">
                  {isProcessing ? <Loader className="animate-spin text-white" size={64}/> : <Mic size={64} className={isListening ? 'text-emerald-400' : 'text-gray-600'}/>}
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-6 animate-fade-in text-center">
              <div>
                <h2 className="text-3xl font-black mb-1 uppercase tracking-widest">{isListening ? 'Listening' : isVisionActive ? 'Vision Neural' : 'Jarvis Mode'}</h2>
                <p className="text-[var(--text-muted)] font-black text-[11px] uppercase tracking-[0.3em]">Link Synchronized</p>
              </div>

              {!isVisionActive && (
                <button onClick={startVision} className="flex items-center gap-3 px-8 py-3 rounded-full border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all group">
                   <Eye size={18} className="text-cyan-400"/>
                   <span className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400">Engage Foxy Vision</span>
                </button>
              )}
            </div>
          </div>
          {isVisionActive && (
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-2xl animate-slide-up">
              <div className="glass-panel p-8 shadow-3xl border-cyan-500/30 bg-gray-950/90 flex flex-col gap-5 backdrop-blur-3xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                     <Scan className="text-cyan-500 animate-pulse" size={20}/>
                     <span className="text-xs font-black uppercase tracking-widest text-cyan-500">Vision Stream Active</span>
                  </div>
                  <button onClick={stopVision} className="p-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"><X size={20}/></button>
                </div>
                <div className="max-h-56 overflow-y-auto text-sm font-medium pr-2 text-center text-gray-200 leading-relaxed custom-scrollbar">
                  {visionOverlayText || "Synchronizing with your visual workspace..."}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {screen === Screen.SETTINGS && (
        <div className={`flex flex-col h-screen p-8 overflow-y-auto transition-all ${isSidebarOpen ? 'lg:ml-72' : ''}`}>
          <div className="max-w-xl mx-auto w-full space-y-10 mt-20 pb-20">
            <h1 className="text-3xl font-black uppercase tracking-widest">Neural Config</h1>
            <div className="glass-panel p-10 space-y-10 shadow-2xl border-white/10">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Biological Signature</label>
                <input type="text" value={config.userName || ''} onChange={(e) => { const n = {...config, userName: e.target.value}; setConfig(n); storageService.saveConfig(n); }} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 outline-none focus:border-cyan-500 transition-all font-black text-xl text-white uppercase" />
              </div>
            </div>
            <button onClick={() => { storageService.setUser(null); setScreen(Screen.AUTH); }} className="w-full flex items-center justify-center gap-4 p-6 text-red-500/80 border border-red-500/10 rounded-2xl hover:bg-red-500/5 font-black uppercase text-xs tracking-[0.3em] shadow-lg transition-all active:scale-95">
              <LogOut size={18}/> Terminate Neural Link
            </button>
          </div>
        </div>
      )}
      
      {screen === Screen.ONBOARDING_NAME && (
        <div className="h-screen flex items-center justify-center p-6 bg-black">
           <div className="glass-panel p-12 md:p-16 max-w-sm w-full text-center space-y-10 animate-fade-scale border-white/10 bg-black/40">
              <div className="space-y-3 text-center">
                <h2 className="text-3xl font-black uppercase text-white tracking-wider italic">Foxy</h2>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Identity Verification</p>
              </div>
              <input 
                  type="text" 
                  placeholder="USER_NAME" 
                  className="w-full p-5 bg-white/[0.04] rounded-2xl outline-none focus:border-cyan-500 border border-white/10 font-black text-center text-xl text-white uppercase tracking-widest placeholder:text-gray-800" 
                  onChange={(e)=>setConfig({...config, userName: e.target.value})} 
              />
              <button onClick={()=>{ storageService.saveConfig(config); setScreen(Screen.WELCOME); }} className="w-full bg-cyan-600 py-5 rounded-2xl font-black text-xs shadow-2xl active:scale-95 transition-all uppercase tracking-[0.3em] text-white hover:bg-cyan-500">
                Begin Sync
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
