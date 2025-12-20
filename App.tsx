import React, { useState, useEffect, useRef } from 'react';
import { Screen, Theme, Session, AppConfig, Message, User } from './types';
import { STORAGE_KEYS, DEFAULT_CONFIG } from './constants';
import { Sidebar } from './components/Sidebar';
import { storageService } from './services/storageService';
import { speechService } from './services/speechService';
import { desktopService } from './services/desktopService';
import { fetchAIResponse } from './services/apiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Menu, Send, Mic, Square, Loader, Paperclip, X, LogOut, LogIn } from 'lucide-react';
import Tesseract from 'tesseract.js';

const AnimatedResponse = ({ text }: { text: string }) => {
  if (!text) return null;
  const blocks = text.split(/\n\n+/).filter(b => b.trim().length > 0);
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <div 
          key={i} 
          className="animate-fade-in opacity-0"
          style={{ animationDelay: `${i * 0.8}s`, animationFillMode: 'forwards' }}
        >
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {block}
          </ReactMarkdown>
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  // Authentication & Limitation State
  const [screen, setScreen] = useState<Screen>(Screen.LOADING);
  const [user, setUser] = useState<User | null>(null);
  const [guestCount, setGuestCount] = useState(0);

  // App State
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // UI State
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isManualStopRef = useRef(false);
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Initialization ---
  useEffect(() => {
    // Check URL for OAuth callback data
    const params = new URLSearchParams(window.location.search);
    const authData = params.get('auth_data');
    if (authData) {
      try {
        const profile = JSON.parse(decodeURIComponent(authData));
        const loggedUser: User = { ...profile, isGuest: false };
        storageService.setUser(loggedUser);
        setUser(loggedUser);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) { console.error("Auth callback parse error", e); }
    }

    try {
        const audio = new Audio('Welcome.mp3');
        audio.volume = 0.7;
        welcomeAudioRef.current = audio;
    } catch (e) { console.warn("Audio initialization failed:", e); }

    const init = async () => {
      const loadedUser = storageService.getUser();
      const loadedConfig = await storageService.loadConfig();
      const loadedSessions = await storageService.loadSessions();
      const stats = storageService.getGuestStats();
      
      setUser(loadedUser);
      setGuestCount(stats.count);
      setConfig(loadedConfig);
      setSessions(loadedSessions);
      
      if (window.innerWidth >= 640) setSidebarOpen(true);

      if (!loadedUser) {
        setScreen(Screen.AUTH);
      } else if (!loadedConfig.userName || loadedConfig.userName.trim() === '') {
        setScreen(Screen.ONBOARDING_NAME);
      } else {
        const last = await storageService.loadLastScreen() as Screen;
        setScreen(last && last !== Screen.LOADING ? last : Screen.WELCOME);
      }
    };
    init();
  }, []);

  // --- Auth Actions ---
  const handleLogin = () => {
    // Updated to the corrected google-login endpoint
    window.location.href = '/.netlify/functions/google-login';
  };

  const handleContinueAsGuest = () => {
    const guestUser: User = { id: 'guest', email: '', name: 'Guest', isGuest: true };
    setUser(guestUser);
    storageService.setUser(guestUser);
    setScreen(Screen.ONBOARDING_NAME);
  };

  const handleLogout = () => {
    storageService.setUser(null);
    setUser(null);
    setScreen(Screen.AUTH);
  };

  // --- Theme & Persistence ---
  useEffect(() => {
    if (config.theme === Theme.LIQUID_GLASS) document.body.classList.add('theme-liquid-glass');
    else document.body.classList.remove('theme-liquid-glass');
    document.documentElement.style.setProperty('--accent-color', config.accentColor);
  }, [config.theme, config.accentColor]);

  useEffect(() => {
    if (screen !== Screen.LOADING && screen !== Screen.ONBOARDING_NAME && screen !== Screen.AUTH) {
      storageService.saveLastScreen(screen);
    }
    if (screen !== Screen.JARVIS_MODE) {
        stopListening(true);
        speechService.stopSpeaking();
    }
  }, [screen]);

  // --- Message Actions ---
  const handleSendMessage = async (text: string) => {
    // Guard: Guest Limit reached
    if (user?.isGuest && guestCount >= 5) {
      setErrorMessage("Guest limit reached. Please sign in with Google.");
      return;
    }

    if (isSpeaking) { speechService.stopSpeaking(); setIsSpeaking(false); }
    setErrorMessage(null);
    if ((!text.trim() && !selectedImage) || isProcessing || ocrProcessing) return;
    
    const session = getCurrentSession();
    if (!session) { createSession(screen === Screen.JARVIS_MODE ? 'jarvis' : 'chat'); return; }
    
    setIsProcessing(true);
    let currentImage = selectedImage;
    setInputValue('');
    setSelectedImage(null); 

    // Guard & Increment Limit
    if (user?.isGuest) {
      const newCount = storageService.incrementGuestCount();
      setGuestCount(newCount);
    }

    let extractedText = "";
    if (currentImage) {
        setOcrProcessing(true);
        try {
            const result = await Tesseract.recognize(currentImage, 'eng');
            extractedText = result.data.text;
        } catch (e) { extractedText = "Error scanning image."; }
        finally { setOcrProcessing(false); }
    }

    const finalQuery = extractedText ? `${text}\n\n[Scan]:\n${extractedText}` : text;
    const userMsg: Message = {
      id: crypto.randomUUID(), sender: 'user', text: text || (currentImage ? "Analyzed image." : ""), imageData: currentImage || undefined, timestamp: new Date().toISOString()
    };
    
    const foxyLoadingMsg: Message = { id: crypto.randomUUID(), sender: 'foxy', text: 'Thinking...', timestamp: new Date().toISOString(), isLoading: true };
    const updatedMessages = [...session.messages, userMsg, foxyLoadingMsg];
    updateSessionMessages(session.id, updatedMessages);

    try {
      const response = await fetchAIResponse(session, finalQuery, config.userName || 'User', null);
      
      let systemFeedback = "";
      if (response.isCommand && response.command === 'OPEN_APP' && response.appName) {
          const success = await desktopService.openApp(response.appName);
          systemFeedback = success ? `\n\n[System] Opening ${response.appName}...` : `\n\n[System] App not found.`;
      }

      const aiMsg: Message = { id: crypto.randomUUID(), sender: 'foxy', text: response.text + systemFeedback, timestamp: new Date().toISOString() };
      updateSessionMessages(session.id, [...session.messages, userMsg, aiMsg], response.generatedTitle);

      if (screen === Screen.JARVIS_MODE || isListening) {
        setIsSpeaking(true);
        stopListening(true); 
        speechService.speak(response.greeting || response.text, () => setIsSpeaking(true), () => {
            setIsSpeaking(false);
            if (screen === Screen.JARVIS_MODE) {
                 isManualStopRef.current = false;
                 setTimeout(() => startListening(), 800);
            }
        });
      }
    } catch (e) { setIsProcessing(false); }
    finally { setIsProcessing(false); }
  };

  const createSession = (mode: 'chat' | 'jarvis') => {
    const newSession: Session = { id: crypto.randomUUID(), title: 'New', mode, messages: [], createdAt: Date.now() };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    storageService.saveSessions([newSession, ...sessions]);
    setScreen(mode === 'chat' ? Screen.CHAT_MODE : Screen.JARVIS_MODE);
  };

  const updateSessionMessages = (sessionId: string, newMessages: Message[], newTitle?: string) => {
    const updated = sessions.map(s => s.id === sessionId ? { ...s, messages: newMessages, title: newTitle || s.title } : s);
    setSessions(updated);
    storageService.saveSessions(updated);
  };

  const scrollToBottom = () => setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);

  const startListening = () => {
    // Block listening if guest limit is reached
    if (user?.isGuest && guestCount >= 5) {
      setErrorMessage("Guest limit reached. Please sign in with Google.");
      return;
    }

    if (isListening || isSpeaking || isProcessing) return; 
    setErrorMessage(null);
    isManualStopRef.current = false;
    setIsListening(true);
    speechService.startListening(
      (t) => { setIsListening(false); handleSendMessage(t); },
      () => { 
        setIsListening(false); 
        if (!isManualStopRef.current && screen === Screen.JARVIS_MODE && !isProcessing && !isSpeaking) {
             setTimeout(() => startListening(), 800);
        }
      },
      (err) => { 
        setIsListening(false); 
        if (err !== 'no-speech' && !isManualStopRef.current && screen === Screen.JARVIS_MODE) {
          setTimeout(() => startListening(), 1000);
        }
      }
    );
  };

  const stopListening = (manual = true) => {
    if (manual) isManualStopRef.current = true;
    speechService.stopListening();
    setIsListening(false);
  };

  // --- Screens ---

  const renderAuth = () => (
    <div className="flex flex-col items-center justify-center h-screen p-6 bg-transparent animate-fade-in">
      <div className="glass-panel p-12 max-w-md w-full text-center">
        <img src="Foxy.png" alt="Foxy" className="w-24 h-24 mx-auto mb-6 drop-shadow-lg" />
        <h1 className="text-3xl font-bold text-white mb-2">Foxy AI</h1>
        <p className="text-gray-400 mb-10">Sign in to sync your history and get unlimited access.</p>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-4 rounded-xl hover:bg-gray-100 transition-all active:scale-95 shadow-lg"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>

          <button 
            onClick={handleContinueAsGuest}
            className="w-full py-4 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition-all font-medium"
          >
            Continue as Guest
          </button>
        </div>
        
        <p className="mt-8 text-xs text-gray-500 uppercase tracking-widest">
            Guest accounts: 5 messages per day.
        </p>
      </div>
    </div>
  );

  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center h-screen p-4 animate-fade-in relative">
         <div className="absolute top-4 left-4 flex gap-2">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 bg-gray-900/50 rounded-full hover:bg-gray-800 transition-colors"><Menu/></button>
         </div>
         <div className="absolute top-4 right-4 flex items-center gap-3">
            <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-white">{user?.name}</span>
                {user?.isGuest && <span className="text-[10px] text-orange-400">Guest: {guestCount}/5 used</span>}
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 bg-gray-900/50 rounded-full hover:text-red-400 transition-colors" title="Logout"><LogOut size={20}/></button>
         </div>
         <div className="glass-panel p-10 max-w-2xl w-full text-center flex flex-col items-center">
            <img src="Foxy.png" alt="Foxy" className="w-32 h-32 mb-6 drop-shadow-xl" />
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">Foxy AI</h1>
            <p className="text-xl text-gray-300 mb-10">Welcome back, <span className="text-cyan-400 font-semibold">{config.userName}</span>.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <button onClick={() => createSession('chat')} className="p-8 rounded-2xl bg-gray-800/40 border border-cyan-900/50 hover:border-cyan-500/50 transition-all active:scale-95 group">
                    <Send size={32} className="mx-auto mb-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-bold text-white">Chat Mode</h3>
                </button>
                <button onClick={() => createSession('jarvis')} className="p-8 rounded-2xl bg-gray-800/40 border border-indigo-900/50 hover:border-indigo-500/50 transition-all active:scale-95 group">
                    <Mic size={32} className="mx-auto mb-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg font-bold text-white">Jarvis Mode</h3>
                </button>
            </div>
         </div>
    </div>
  );

  const renderJarvis = () => {
    const session = getCurrentSession();
    const isLimitReached = user?.isGuest && guestCount >= 5;

    return (
        <div className="flex flex-col h-screen bg-transparent overflow-hidden relative animate-fade-in">
            <div className={`absolute top-0 left-0 right-0 p-4 z-40 flex items-center justify-between transition-all duration-300 ${isSidebarOpen ? 'sm:ml-72' : ''}`}>
                <div className="flex items-center">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 mr-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"><Menu/></button>
                    <h1 className="text-xl font-bold text-indigo-400">{session?.title || 'Jarvis'}</h1>
                </div>
            </div>

            <div className={`flex-grow flex flex-col items-center justify-center p-6 transition-all duration-300 ${isSidebarOpen ? 'sm:ml-72' : ''}`}>
                <div 
                    onClick={() => !isLimitReached && (isListening ? stopListening(true) : startListening())}
                    className={`w-64 h-64 rounded-full glass-panel flex items-center justify-center cursor-pointer transition-all duration-500
                        ${isListening ? 'animate-listening-pulse' : ''}
                        ${isSpeaking ? 'animate-orb-pulse border-cyan-500' : ''}
                        ${isProcessing ? 'animate-pulse' : ''}
                        ${isLimitReached ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                    `}
                >
                    {isProcessing ? <Loader size={64} className="text-white animate-spin" /> : <Mic size={64} className={isListening ? 'text-emerald-400' : 'text-gray-400'} />}
                </div>

                <div className="mt-12 text-center max-w-md">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      {isLimitReached ? "Limit Reached" : isListening ? "Listening..." : isProcessing ? "Thinking..." : "Jarvis Online"}
                    </h2>
                    <p className="text-gray-400">
                      {isLimitReached 
                        ? "Guest limit reached. Please sign in with Google." 
                        : isListening ? "I'm listening for your command..." : "Tap the orb to speak."}
                    </p>
                    {isLimitReached && (
                      <button 
                        onClick={handleLogin}
                        className="mt-6 px-6 py-2 bg-indigo-600 rounded-lg text-white font-bold hover:bg-indigo-500 transition-all flex items-center gap-2 mx-auto"
                      >
                        <LogIn size={18} /> Sign in
                      </button>
                    )}
                </div>
            </div>
        </div>
    );
  };

  const renderChat = () => {
    const session = getCurrentSession();
    const isLimitReached = user?.isGuest && guestCount >= 5;

    return (
        <div className="flex flex-col h-screen bg-transparent animate-fade-in">
             <div className={`p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/90 backdrop-blur z-20 transition-all duration-300 ${isSidebarOpen ? 'sm:ml-72' : ''}`}>
                <div className="flex items-center">
                  <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 mr-2 hover:bg-gray-800 rounded transition-colors"><Menu/></button>
                  <h1 className="text-xl font-bold text-cyan-400 truncate">{session?.title || 'Chat'}</h1>
                </div>
                {user?.isGuest && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded bg-gray-800 uppercase tracking-widest ${guestCount >= 4 ? 'text-orange-400' : 'text-gray-500'}`}>
                    Limit: {guestCount}/5
                  </span>
                )}
             </div>

             <div className={`flex-grow overflow-y-auto p-4 pb-32 space-y-6 transition-all duration-300 ${isSidebarOpen ? 'sm:ml-72' : ''}`}>
                {session?.messages.map(msg => (
                    <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-gray-800 border border-gray-700 text-gray-100' : 'glass-panel text-gray-200'}`}>
                            {msg.isLoading ? <Loader size={16} className="animate-spin text-cyan-400" /> : <AnimatedResponse text={msg.text} />}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
             </div>

             <div className={`fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur border-t border-gray-800 p-4 z-30 transition-all duration-300 ${isSidebarOpen ? 'sm:left-72' : ''}`}>
                <div className="max-w-4xl mx-auto">
                    {isLimitReached ? (
                      <div className="glass-panel p-6 flex flex-col items-center text-center bg-orange-900/20 border-orange-500/30 animate-fade-scale">
                        <p className="text-orange-400 font-bold mb-4 uppercase tracking-widest text-sm">Guest limit reached. Please sign in with Google.</p>
                        <button onClick={handleLogin} className="bg-cyan-600 px-8 py-3 rounded-xl text-white font-bold hover:bg-cyan-500 transition-all active:scale-95 shadow-lg">
                          Sign in with Google
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                            placeholder="Type a message..."
                            disabled={isProcessing}
                            className="flex-grow bg-gray-800 border border-gray-700 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                        />
                        <button 
                          onClick={() => handleSendMessage(inputValue)} 
                          className="p-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 transition-all active:scale-95 disabled:opacity-50"
                          disabled={isProcessing}
                        >
                          <Send size={20} />
                        </button>
                      </div>
                    )}
                </div>
             </div>
        </div>
    );
  };

  const renderOnboarding = () => (
    <div className="flex flex-col items-center justify-center h-screen p-6 animate-fade-scale">
      <div className="glass-panel p-10 max-w-lg w-full text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Profile Setup</h1>
        <p className="text-gray-400 mb-8">What should Foxy call you?</p>
        <input 
          type="text" 
          value={config.userName || ''}
          placeholder="Your Name"
          className="w-full p-4 mb-6 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:border-cyan-400 outline-none text-center"
          onChange={(e) => setConfig({ ...config, userName: e.target.value })}
        />
        <button 
          onClick={() => {
              if (config.userName?.trim()) {
                  storageService.saveConfig(config);
                  setScreen(Screen.WELCOME);
              }
          }}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
        >
          Confirm Profile
        </button>
      </div>
    </div>
  );

  if (screen === Screen.LOADING) return <div className="h-screen w-screen flex items-center justify-center text-cyan-500"><Loader size={48} className="animate-spin" /></div>;
  if (screen === Screen.AUTH) return renderAuth();
  if (screen === Screen.ONBOARDING_NAME) return renderOnboarding();

  return (
    <div className="h-screen w-screen bg-transparent text-white overflow-hidden font-sans">
        <Sidebar 
            isOpen={isSidebarOpen} currentScreen={screen} sessions={sessions} currentSessionId={currentSessionId}
            onToggle={setSidebarOpen}
            onNavigate={(s) => { setScreen(s); if (window.innerWidth < 640) setSidebarOpen(false); }}
            onSwitchSession={(id) => { 
              setCurrentSessionId(id); 
              const s = sessions.find(x => x.id === id);
              if (s) setScreen(s.mode === 'jarvis' ? Screen.JARVIS_MODE : Screen.CHAT_MODE);
              if (window.innerWidth < 640) setSidebarOpen(false); 
            }}
            onDeleteSession={(id) => {
                const updated = sessions.filter(s => s.id !== id);
                setSessions(updated); storageService.saveSessions(updated);
                if (currentSessionId === id) { setCurrentSessionId(null); setScreen(Screen.WELCOME); }
            }}
            onNewSession={(mode) => createSession(mode)}
        />
        {screen === Screen.WELCOME && renderWelcome()}
        {screen === Screen.CHAT_MODE && renderChat()}
        {screen === Screen.JARVIS_MODE && renderJarvis()}
    </div>
  );
};

export default App;