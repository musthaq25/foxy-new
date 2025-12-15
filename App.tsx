import React, { useState, useEffect, useRef } from 'react';
import { Screen, Theme, Session, AppConfig, Message } from './types';
import { STORAGE_KEYS, DEFAULT_CONFIG } from './constants';
import { Sidebar } from './components/Sidebar';
import { storageService } from './services/storageService';
import { speechService } from './services/speechService';
import { desktopService } from './services/desktopService';
import { fetchAIResponse } from './services/apiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
<<<<<<< HEAD
import { Menu, Send, Mic, Play, Square, Loader, Youtube } from 'lucide-react';

const AnimatedResponse = ({ text }: { text: string }) => {
  // Split text by double newlines to identify paragraphs/blocks
  // We filter out empty strings to avoid empty divs
=======
import { Menu, Send, Mic, Play, Square, Loader, Youtube, Paperclip, X, Image as ImageIcon, ScanEye, WifiOff } from 'lucide-react';
import Tesseract from 'tesseract.js';

const AnimatedResponse = ({ text }: { text: string }) => {
  // Ensure text is valid
  if (!text) return null;
  
>>>>>>> master
  const blocks = text.split(/\n\n+/).filter(b => b.trim().length > 0);
  
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <div 
          key={i} 
          className="animate-fade-in opacity-0"
          style={{ 
<<<<<<< HEAD
            animationDelay: `${i * 0.8}s`, // Slow, deliberate fade-in per paragraph
=======
            animationDelay: `${i * 0.8}s`, 
>>>>>>> master
            animationFillMode: 'forwards' 
          }}
        >
          <ReactMarkdown 
            remarkPlugins={[remarkMath]} 
            rehypePlugins={[rehypeKatex]}
          >
            {block}
          </ReactMarkdown>
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  // State
  const [screen, setScreen] = useState<Screen>(Screen.LOADING);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // UI State
  const [inputValue, setInputValue] = useState('');
<<<<<<< HEAD
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
=======
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
>>>>>>> master

  // Intro State
  const [introText, setIntroText] = useState('');

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
<<<<<<< HEAD

  // --- Initialization ---
  useEffect(() => {
=======
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasPlayedIntroRef = useRef(false);
  
  // Audio Refs - Keep instances alive
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Initialization ---
  useEffect(() => {
    // Pre-load audio
    welcomeAudioRef.current = new Audio('Welcome.mp3');
    welcomeAudioRef.current.volume = 0.7;

>>>>>>> master
    const init = async () => {
      const loadedConfig = await storageService.loadConfig();
      const loadedSessions = await storageService.loadSessions();
      
      setConfig(loadedConfig);
      setSessions(loadedSessions);
      
<<<<<<< HEAD
      // Determine initial sidebar state based on window width
=======
>>>>>>> master
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }

<<<<<<< HEAD
      // Route Logic
      // Check for null or empty string to ensure we prompt for name if it's missing
=======
>>>>>>> master
      if (!loadedConfig.userName || loadedConfig.userName.trim() === '') {
        setScreen(Screen.ONBOARDING_NAME);
      } else {
        const last = await storageService.loadLastScreen() as Screen;
        setScreen(last && last !== Screen.LOADING ? last : Screen.WELCOME);
      }
    };
    init();
  }, []);

  useEffect(() => {
<<<<<<< HEAD
    // Theme application
=======
>>>>>>> master
    if (config.theme === Theme.LIQUID_GLASS) {
      document.body.classList.add('theme-liquid-glass');
    } else {
      document.body.classList.remove('theme-liquid-glass');
    }
<<<<<<< HEAD
    // Update CSS variable for accent color
=======
>>>>>>> master
    document.documentElement.style.setProperty('--accent-color', config.accentColor);
  }, [config.theme, config.accentColor]);

  useEffect(() => {
    if (screen !== Screen.LOADING && screen !== Screen.ONBOARDING_NAME && screen !== Screen.INTRO_SEQUENCE) {
      storageService.saveLastScreen(screen);
    }
  }, [screen]);

  useEffect(() => {
    scrollToBottom();
<<<<<<< HEAD
  }, [currentSessionId, sessions, isProcessing]);

  // --- Intro Sequence Effect ---
  useEffect(() => {
    if (screen === Screen.INTRO_SEQUENCE) {
=======
  }, [currentSessionId, sessions, isProcessing, selectedImage, ocrProcessing]);

  // --- Intro / Welcome Audio Effect ---
  useEffect(() => {
    // This effect manages the typing animation. 
    // The actual audio trigger happens on button click (to satisfy autoplay) 
    // or if we land here programmatically.

    if (screen === Screen.INTRO_SEQUENCE) {
      hasPlayedIntroRef.current = true;
>>>>>>> master
      const fullText = "Welcome to Foxy, your powerful voice assistant.";
      let charIndex = 0;
      let typingInterval: any;

<<<<<<< HEAD
      // 1. Play Audio
      const audio = new Audio('Welcome.mp3');
      audio.volume = 0.7;
      audio.play().catch(e => console.log("Audio play failed (interaction needed?):", e));

      // 2. Start Typing Animation
=======
      // Ensure audio is playing if it wasn't triggered by click (fallback)
      if (welcomeAudioRef.current && welcomeAudioRef.current.paused) {
          welcomeAudioRef.current.play().catch(e => console.warn("Autoplay prevented:", e));
      }

>>>>>>> master
      typingInterval = setInterval(() => {
        if (charIndex < fullText.length) {
          setIntroText(fullText.substring(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typingInterval);
        }
<<<<<<< HEAD
      }, 50); // Speed of typing

      // 3. Transition after audio duration (approx 4s + buffer)
=======
      }, 50);

>>>>>>> master
      const transitionTimeout = setTimeout(() => {
        setScreen(Screen.WELCOME);
      }, 4500);

      return () => {
        clearInterval(typingInterval);
        clearTimeout(transitionTimeout);
<<<<<<< HEAD
        audio.pause();
      };
=======
        // We generally let the audio finish naturally, but stop if component unmounts unexpectedly
      };
    } else if (screen === Screen.WELCOME) {
      // If we land on Welcome screen directly (not from Intro)
      if (!hasPlayedIntroRef.current) {
        hasPlayedIntroRef.current = true;
        // Try to play if we just loaded app (might fail without interaction)
        if(welcomeAudioRef.current) {
             welcomeAudioRef.current.play().catch(e => console.log("Waiting for user interaction to play welcome sound"));
        }
      }
>>>>>>> master
    }
  }, [screen]);


  // --- Helpers ---
  const scrollToBottom = () => {
<<<<<<< HEAD
    // Small delay to allow render to calculate layout even if opacity is 0
=======
>>>>>>> master
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);

  const createSession = (mode: 'chat' | 'jarvis') => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      title: mode === 'jarvis' ? 'New Command' : 'New Chat',
      mode,
      messages: [],
      createdAt: Date.now()
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setCurrentSessionId(newSession.id);
    storageService.saveSessions(updated);
<<<<<<< HEAD
    
    // Auto-navigate
=======
>>>>>>> master
    setScreen(mode === 'chat' ? Screen.CHAT_MODE : Screen.JARVIS_MODE);
    setSidebarOpen(window.innerWidth >= 1024);
  };

  const updateSessionMessages = (sessionId: string, newMessages: Message[], newTitle?: string) => {
    const updatedSessions = sessions.map(s => {
      if (s.id === sessionId) {
        return { 
          ...s, 
          messages: newMessages,
          title: newTitle || s.title
        };
      }
      return s;
    });
    setSessions(updatedSessions);
    storageService.saveSessions(updatedSessions);
  };

<<<<<<< HEAD
  // --- Actions ---
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;
=======
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Actions ---
  const handleSendMessage = async (text: string) => {
    setErrorMessage(null);
    if ((!text.trim() && !selectedImage) || isProcessing || ocrProcessing) return;
>>>>>>> master
    
    const session = getCurrentSession();
    if (!session) {
        createSession(screen === Screen.JARVIS_MODE ? 'jarvis' : 'chat');
        return; 
    }
    
    setIsProcessing(true);
<<<<<<< HEAD
    setInputValue('');

    // Optimistic Update
    const userMsg: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: text,
      timestamp: new Date().toISOString()
    };
    
    const loadingMsg: Message = {
=======
    let currentImage = selectedImage;
    setInputValue('');
    setSelectedImage(null); 

    // --- MANUAL OCR LOGIC ---
    let extractedText = "";
    if (currentImage) {
        setOcrProcessing(true);
        try {
            // Visualize OCR processing
            const loadingMsg: Message = {
                id: crypto.randomUUID(),
                sender: 'foxy',
                text: 'Scanning image for text...',
                timestamp: new Date().toISOString(),
                isLoading: true
            };
            // Add temp message
            updateSessionMessages(session.id, [...session.messages, loadingMsg]);
            
            const result = await Tesseract.recognize(currentImage, 'eng');
            extractedText = result.data.text;
            
            // Remove temp message
            // We just rebuild messages in the next step
        } catch (e) {
            console.error("OCR Failed", e);
            extractedText = "Error extracting text from image.";
        } finally {
            setOcrProcessing(false);
        }
    }

    // Prepare final query (Original text + OCR results)
    const finalQuery = extractedText 
        ? `${text}\n\n[Attached Image Content Analysis]:\n${extractedText}` 
        : text;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: text || (currentImage ? "Analyzed attached image." : ""),
      imageData: currentImage || undefined,
      timestamp: new Date().toISOString()
    };
    
    const foxyLoadingMsg: Message = {
>>>>>>> master
      id: crypto.randomUUID(),
      sender: 'foxy',
      text: 'Thinking...',
      timestamp: new Date().toISOString(),
      isLoading: true
    };

<<<<<<< HEAD
    const updatedMessages = [...session.messages, userMsg, loadingMsg];
    updateSessionMessages(session.id, updatedMessages);

    try {
      // API Call - Send updated session including the new user message for context/memory
      const tempSession = { ...session, messages: [...session.messages, userMsg] };
      const response = await fetchAIResponse(tempSession, text, config.userName || 'User');
=======
    const updatedMessages = [...session.messages, userMsg, foxyLoadingMsg];
    updateSessionMessages(session.id, updatedMessages);

    try {
      const tempSession = { ...session, messages: [...session.messages, userMsg] };
      // Note: We pass `finalQuery` which contains OCR text to the backend
      const response = await fetchAIResponse(tempSession, finalQuery, config.userName || 'User', null); // image is null because we already processed it
>>>>>>> master

      // Handle Command Execution (Jarvis Mode)
      let systemFeedback = "";
      if (response.isCommand && response.command === 'OPEN_APP' && response.appName) {
          const success = await desktopService.openApp(response.appName);
          if (success) {
            systemFeedback = `\n\n[System] Opening ${response.appName}...`;
          } else {
<<<<<<< HEAD
             // Fallback message if not in Electron or failed
=======
>>>>>>> master
             if (!(window as any).electron) {
                 systemFeedback = `\n\n[Simulation] I would open "${response.appName}" if running in desktop mode.`;
             } else {
                 systemFeedback = `\n\n[System] Failed to open ${response.appName}. Check if installed.`;
             }
          }
      }

<<<<<<< HEAD
      // Handle Response
=======
>>>>>>> master
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        sender: 'foxy',
        text: response.text + systemFeedback,
        timestamp: new Date().toISOString(),
        isCommand: response.isCommand,
        commandData: response.command ? { command: response.command, appName: response.appName || '' } : undefined
      };

<<<<<<< HEAD
      // Remove loading, add real response
      const finalMessages = [...session.messages, userMsg, aiMsg];
      updateSessionMessages(session.id, finalMessages, response.generatedTitle);

      // Speech
=======
      const finalMessages = [...session.messages, userMsg, aiMsg];
      updateSessionMessages(session.id, finalMessages, response.generatedTitle);

>>>>>>> master
      if (screen === Screen.JARVIS_MODE || isListening) {
        setIsSpeaking(true);
        speechService.speak(response.greeting || response.text, 
            () => setIsSpeaking(true),
            () => {
                setIsSpeaking(false);
<<<<<<< HEAD
                if (screen === Screen.JARVIS_MODE && !response.isCommand) {
                     startListening();
=======
                // Restart listening only if in Jarvis mode and not processing a command that ended the flow
                if (screen === Screen.JARVIS_MODE) {
                     // Robust restart logic
                     setTimeout(() => startListening(), 500);
>>>>>>> master
                }
            }
        );
      }

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        sender: 'foxy',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
      updateSessionMessages(session.id, [...session.messages, userMsg, errorMsg]);
      if (screen === Screen.JARVIS_MODE) speechService.speak("I encountered an error.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = () => {
<<<<<<< HEAD
=======
    // If already listening, do nothing to avoid duplicate streams
    if (isListening) return; 
    
    setErrorMessage(null);
>>>>>>> master
    setIsListening(true);
    speechService.startListening(
      (text) => {
        setIsListening(false);
        handleSendMessage(text);
      },
<<<<<<< HEAD
      () => setIsListening(false),
      (err) => {
        setIsListening(false);
        console.error("Speech Error", err);
=======
      () => {
        // On end (silence detected), check mode. If Jarvis, restart.
        setIsListening(false);
        if (screen === Screen.JARVIS_MODE && !isProcessing && !isSpeaking) {
             // Use timeout to prevent rapid loops
             setTimeout(() => {
                 if (screen === Screen.JARVIS_MODE) startListening();
             }, 1000);
        }
      },
      (err) => {
        setIsListening(false);
        console.error("Speech Error", err);
        // User-friendly error mapping
        if (err === 'network') {
            setErrorMessage("Network error: Please check your internet connection.");
        } else if (err === 'not-allowed') {
            setErrorMessage("Microphone access denied.");
        } else if (err === 'no-speech') {
             // Ignore no-speech errors usually
        } else {
            setErrorMessage(`Speech Error: ${err}`);
        }
>>>>>>> master
      }
    );
  };

  const stopListening = () => {
    speechService.stopListening();
    setIsListening(false);
  };

  // --- Renderers ---

  const renderOnboarding = () => (
    <div className="flex flex-col items-center justify-center h-screen p-6 bg-transparent">
      <div className="glass-panel p-10 max-w-lg w-full text-center animate-fade-scale">
        <h1 className="text-4xl font-bold text-white mb-4">Welcome</h1>
        <p className="text-gray-400 mb-6">Let's set up your profile.</p>
        <input 
          type="text" 
          placeholder="Your Name"
          className="w-full p-3 mb-4 bg-gray-800/50 border border-gray-700 rounded text-white focus:border-cyan-400 outline-none transition-all duration-300"
          onChange={(e) => setConfig({ ...config, userName: e.target.value })}
        />
        <button 
          onClick={() => {
              if (config.userName && config.userName.trim() !== '') {
<<<<<<< HEAD
=======
                  // PLAY WELCOME AUDIO HERE on user interaction
                  if(welcomeAudioRef.current) {
                      welcomeAudioRef.current.currentTime = 0;
                      welcomeAudioRef.current.play().catch(e => console.error("Audio play failed", e));
                  }
                  
>>>>>>> master
                  const newConfig = { ...config, userName: config.userName.trim() };
                  setConfig(newConfig);
                  storageService.saveConfig(newConfig);
                  setScreen(Screen.INTRO_SEQUENCE);
              }
          }}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded transition-all active:scale-95"
        >
          Get Started
        </button>
      </div>
    </div>
  );

  const renderIntroSequence = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-transparent p-4">
        <div className="max-w-2xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 leading-tight min-h-[120px]">
                {introText}<span className="animate-pulse text-cyan-400">|</span>
            </h1>
        </div>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col h-screen bg-transparent animate-fade-in">
      <div className="p-4 border-b border-gray-800 flex items-center lg:ml-72 bg-gray-900/90 backdrop-blur">
         <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-400 mr-2 hover:bg-gray-800 rounded transition-colors"><Menu/></button>
         <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>
      
      <div className="flex-grow p-6 overflow-y-auto lg:ml-72 transition-all">
         <div className="max-w-2xl mx-auto space-y-6">
            <div className="glass-panel p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
                 <input 
                    type="text"
                    value={config.userName || ''}
                    placeholder="Your Name"
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded text-white focus:border-cyan-400 outline-none mb-2"
                    onChange={(e) => {
                        const newConfig = { ...config, userName: e.target.value };
                        setConfig(newConfig);
                        storageService.saveConfig(newConfig);
                    }}
                />
            </div>

            <div className="glass-panel p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Appearance</h2>
                <div className="flex gap-4">
                    <button 
                        onClick={() => {
                            const newConfig = { ...config, theme: Theme.DARK };
                            setConfig(newConfig);
                            storageService.saveConfig(newConfig);
                        }}
                        className={`p-4 rounded border transition-all duration-200 active:scale-95 ${config.theme === Theme.DARK ? 'border-cyan-400 bg-gray-800' : 'border-gray-700 bg-gray-900'} text-white w-full`}
                    >
                        Dark Mode
                    </button>
                    <button 
                        onClick={() => {
                             const newConfig = { ...config, theme: Theme.LIQUID_GLASS };
                             setConfig(newConfig);
                             storageService.saveConfig(newConfig);
                        }}
                        className={`p-4 rounded border transition-all duration-200 active:scale-95 ${config.theme === Theme.LIQUID_GLASS ? 'border-cyan-400 bg-gray-800' : 'border-gray-700 bg-gray-900'} text-white w-full`}
                    >
                        Liquid Glass
                    </button>
                </div>
            </div>

             <div className="glass-panel p-6 border-cyan-900/30">
                <h2 className="text-lg font-semibold text-cyan-400 mb-4">Updates & Community</h2>
                <a 
                    href="https://www.youtube.com/@Nomixofficial0" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-3 p-4 bg-gray-900 rounded-lg hover:bg-red-900/20 hover:text-white text-gray-300 transition-all group border border-gray-700 hover:border-red-500/50"
                >
                    <Youtube size={24} className="text-red-500 group-hover:scale-110 transition-transform" />
                    <div>
                        <p className="font-semibold">Subscribe to Nomix Official</p>
                        <p className="text-xs text-gray-500">Get the latest updates and tutorials</p>
                    </div>
                </a>
            </div>
<<<<<<< HEAD

            <div className="glass-panel p-6 border-red-900/30">
                <h2 className="text-lg font-semibold text-red-400 mb-4">Data Management</h2>
                <button 
                    onClick={() => {
                        if (confirm("Delete all history?")) {
                            setSessions([]);
                            storageService.saveSessions([]);
                            setCurrentSessionId(null);
                        }
                    }}
                    className="text-red-400 border border-red-900/50 p-2 rounded hover:bg-red-900/20 transition-colors"
                >
                    Clear All Chat History
                </button>
            </div>
=======
>>>>>>> master
         </div>
      </div>
    </div>
  );

  const renderJarvis = () => {
    const session = getCurrentSession();
    return (
        <div className="flex flex-col h-screen bg-transparent overflow-hidden relative animate-fade-in">
            <div className="absolute top-0 left-0 right-0 p-4 z-40 flex items-center justify-between lg:ml-72">
                <div className="flex items-center">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-400 mr-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"><Menu/></button>
                    <h1 className="text-xl font-bold text-indigo-400">{session?.title || 'Jarvis Mode'}</h1>
                </div>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center lg:ml-72 relative z-10 p-6">
                <div 
                    onClick={() => isListening ? stopListening() : startListening()}
                    className={`w-64 h-64 rounded-full glass-panel flex items-center justify-center cursor-pointer transition-all duration-500 hover:scale-105 active:scale-95
                        ${isListening ? 'animate-listening-pulse border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.4)]' : ''}
                        ${isSpeaking ? 'animate-orb-pulse border-cyan-500' : ''}
<<<<<<< HEAD
                        ${isProcessing ? 'animate-pulse border-gray-500' : ''}
                    `}
                >
                    {isProcessing ? (
                        <Loader size={64} className="text-white animate-spin" />
=======
                        ${(isProcessing || ocrProcessing) ? 'animate-pulse border-gray-500' : ''}
                        ${errorMessage ? 'border-red-500' : ''}
                    `}
                >
                    {(isProcessing || ocrProcessing) ? (
                        <div className="flex flex-col items-center">
                             <Loader size={64} className="text-white animate-spin mb-2" />
                             {ocrProcessing && <span className="text-xs text-cyan-400">Scanning...</span>}
                        </div>
>>>>>>> master
                    ) : isListening ? (
                        <Mic size={64} className="text-emerald-400" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                            <div className="w-48 h-48 rounded-full border border-white/10 flex items-center justify-center">
                                <div className="w-32 h-32 rounded-full bg-indigo-500/10 backdrop-blur-md" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center max-w-md">
<<<<<<< HEAD
                    <h2 className="text-3xl font-bold text-white mb-2">
                        {isListening ? "Listening..." : isProcessing ? "Processing..." : isSpeaking ? "Speaking..." : "Jarvis Online"}
                    </h2>
                    <p className="text-gray-400 text-lg min-h-[3rem] animate-fade-in">
                        {isListening ? "Speak your command clearly." : "Tap the orb to start."}
=======
                    <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                        {errorMessage && errorMessage.includes("Network") ? <WifiOff className="text-red-400" /> : null}
                        {errorMessage ? "Attention" : isListening ? "Listening..." : ocrProcessing ? "Reading Image..." : isProcessing ? "Processing..." : isSpeaking ? "Speaking..." : "Jarvis Online"}
                    </h2>
                    <p className={`${errorMessage ? 'text-red-400' : 'text-gray-400'} text-lg min-h-[3rem] animate-fade-in`}>
                        {errorMessage || (isListening ? "Say 'Open Notepad' or 'Scan this'" : "Tap the orb to start.")}
>>>>>>> master
                    </p>
                </div>

                {session && session.messages.length > 0 && (
                     <div className="mt-8 glass-panel p-4 max-w-2xl w-full max-h-48 overflow-y-auto animate-slide-in">
                        <p className="text-gray-300 text-center italic">
                            "{session.messages[session.messages.length - 1].text}"
                        </p>
                     </div>
                )}
            </div>
        </div>
    );
  };

  const renderChat = () => {
    const session = getCurrentSession();
    return (
        <div className="flex flex-col h-screen bg-transparent animate-fade-in">
             <div className="p-4 border-b border-gray-800 flex items-center lg:ml-72 bg-gray-900/90 backdrop-blur z-20 sticky top-0">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-400 mr-2 hover:bg-gray-800 rounded transition-colors"><Menu/></button>
                <h1 className="text-xl font-bold text-cyan-400 truncate">{session?.title || 'Chat'}</h1>
             </div>

             <div className="flex-grow overflow-y-auto lg:ml-72 p-4 pb-32 space-y-6">
                {!session || session.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 animate-fade-scale">
                        <div className="glass-panel p-8 text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Hello, {config.userName}</h2>
                            <p>Start a conversation below.</p>
                        </div>
                    </div>
                ) : (
                    session.messages.map(msg => (
                        <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] lg:max-w-[70%] p-4 rounded-2xl ${
                                msg.sender === 'user' 
                                    ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 text-gray-100 rounded-tr-sm animate-fade-in' 
                                    : 'glass-panel text-gray-200 rounded-tl-sm w-full'
                            }`}>
<<<<<<< HEAD
                                {msg.isLoading ? (
                                    <div className="flex items-center text-cyan-400 gap-2">
                                        <Loader size={16} className="animate-spin" /> Thinking...
=======
                                {msg.imageData && (
                                    <div className="mb-3 rounded-lg overflow-hidden border border-gray-700 relative group">
                                        <img src={msg.imageData} alt="Uploaded content" className="max-w-full h-auto max-h-64 object-contain" />
                                        <div className="absolute bottom-2 right-2 bg-black/70 text-xs text-white px-2 py-1 rounded flex items-center gap-1">
                                            <ScanEye size={12} /> Scanned
                                        </div>
                                    </div>
                                )}
                                {msg.isLoading ? (
                                    <div className="flex items-center text-cyan-400 gap-2">
                                        <Loader size={16} className="animate-spin" /> {ocrProcessing ? "Reading text..." : "Thinking..."}
>>>>>>> master
                                    </div>
                                ) : msg.sender === 'user' ? (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.text}</ReactMarkdown>
                                    </div>
                                ) : (
<<<<<<< HEAD
                                    // Use AnimatedResponse for Foxy to support paragraph staggered fading
=======
>>>>>>> master
                                    <div className="prose prose-invert prose-sm max-w-none">
                                       <AnimatedResponse text={msg.text} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div ref={chatEndRef} />
             </div>

             <div className="fixed bottom-0 left-0 right-0 lg:left-72 bg-gray-900/90 backdrop-blur border-t border-gray-800 p-4 z-30">
<<<<<<< HEAD
                <div className="max-w-4xl mx-auto flex gap-2">
                    <button 
                        onClick={() => isListening ? stopListening() : startListening()}
                        className={`p-3 rounded-xl transition-all duration-200 active:scale-95 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                    >
                        {isListening ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                    </button>
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                        placeholder={isProcessing ? "Processing..." : "Type a message..."}
                        disabled={isProcessing}
                        className="flex-grow bg-gray-800 border border-gray-700 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 transition-colors"
                    />
                    <button 
                        onClick={() => handleSendMessage(inputValue)}
                        disabled={!inputValue.trim() || isProcessing}
                        className="p-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 disabled:opacity-50 disabled:bg-gray-800 transition-all duration-200 active:scale-95"
                    >
                        <Send size={20} />
                    </button>
=======
                <div className="max-w-4xl mx-auto flex flex-col gap-2">
                    {/* Image Preview */}
                    {selectedImage && (
                        <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg w-fit animate-fade-in border border-cyan-500/50">
                            <img src={selectedImage} alt="Preview" className="h-12 w-12 object-cover rounded" />
                            <div className="flex flex-col">
                                <span className="text-xs text-cyan-400 font-semibold">Image Ready</span>
                                <span className="text-[10px] text-gray-400">Will be scanned for text</span>
                            </div>
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white ml-2"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => isListening ? stopListening() : startListening()}
                            className={`p-3 rounded-xl transition-all duration-200 active:scale-95 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        >
                            {isListening ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                        </button>
                        
                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden" 
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-3 rounded-xl transition-all duration-200 active:scale-95 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 ${selectedImage ? 'text-cyan-400 bg-cyan-900/20' : ''}`}
                            title="Upload Image for OCR"
                        >
                            <Paperclip size={20} />
                        </button>

                        <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                            placeholder={isProcessing ? "Processing..." : "Type a message..."}
                            disabled={isProcessing}
                            className="flex-grow bg-gray-800 border border-gray-700 rounded-xl px-4 text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 transition-colors"
                        />
                        <button 
                            onClick={() => handleSendMessage(inputValue)}
                            disabled={(!inputValue.trim() && !selectedImage) || isProcessing}
                            className="p-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 disabled:opacity-50 disabled:bg-gray-800 transition-all duration-200 active:scale-95"
                        >
                            <Send size={20} />
                        </button>
                    </div>
>>>>>>> master
                </div>
             </div>
        </div>
    );
  };

  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-transparent p-4 relative animate-fade-in">
         <div className="absolute top-4 left-4 lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors"><Menu/></button>
         </div>
         <div className="glass-panel p-10 max-w-2xl w-full text-center animate-fade-scale flex flex-col items-center">
<<<<<<< HEAD
            <img src="Foxy.png" alt="Foxy AI" className="w-24 h-24 mb-4 object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
=======
            {/* Logo Display with State Fallback */}
            <div className="mb-6 relative group cursor-pointer" onClick={() => {
                if(welcomeAudioRef.current) {
                    welcomeAudioRef.current.play().catch(console.error);
                }
            }}>
                {logoError ? (
                    <div className="text-cyan-400 text-6xl mb-6 animate-pulse">🦊</div>
                ) : (
                    <img 
                        src="Foxy.png" 
                        alt="Foxy AI" 
                        className="w-32 h-32 object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-transform duration-500 group-hover:scale-110" 
                        onError={() => setLogoError(true)}
                    />
                )}
            </div>
            
>>>>>>> master
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-6">
                Foxy AI
            </h1>
            <p className="text-xl text-gray-300 mb-8">
                Ready to assist you, <span className="text-cyan-400 font-semibold">{config.userName}</span>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <button 
                    onClick={() => createSession('chat')}
                    className="p-6 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border border-cyan-900/50 hover:border-cyan-500/50 transition-all duration-300 group active:scale-95"
                >
                    <div className="w-12 h-12 rounded-full bg-cyan-900/30 text-cyan-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Send size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Chat Mode</h3>
                    <p className="text-sm text-gray-400">Full conversation history with rich text support.</p>
                </button>

                <button 
                    onClick={() => createSession('jarvis')}
                    className="p-6 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border border-indigo-900/50 hover:border-indigo-500/50 transition-all duration-300 group active:scale-95"
                >
                    <div className="w-12 h-12 rounded-full bg-indigo-900/30 text-indigo-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Mic size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Jarvis Mode</h3>
                    <p className="text-sm text-gray-400">Voice-first command interface for hands-free tasks.</p>
                </button>
            </div>
         </div>
    </div>
  );

  // --- Main Render ---
  if (screen === Screen.LOADING) {
      return (
          <div className="h-screen w-screen bg-transparent flex items-center justify-center text-cyan-500">
              <Loader size={48} className="animate-spin" />
          </div>
      );
  }

  if (screen === Screen.ONBOARDING_NAME) {
      return renderOnboarding();
  }

  if (screen === Screen.INTRO_SEQUENCE) {
      return renderIntroSequence();
  }

  return (
    <div className="h-screen w-screen bg-transparent text-white overflow-hidden font-sans">
        <Sidebar 
            isOpen={isSidebarOpen}
            currentScreen={screen}
            sessions={sessions}
            currentSessionId={currentSessionId}
            onToggle={setSidebarOpen}
            onNavigate={(s) => {
                setScreen(s);
                if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            onSwitchSession={(id) => {
                setCurrentSessionId(id);
                const sess = sessions.find(s => s.id === id);
                if (sess) {
                    setScreen(sess.mode === 'jarvis' ? Screen.JARVIS_MODE : Screen.CHAT_MODE);
                }
                if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            onDeleteSession={(id) => {
                const newSessions = sessions.filter(s => s.id !== id);
                setSessions(newSessions);
                storageService.saveSessions(newSessions);
                if (currentSessionId === id) {
                    setCurrentSessionId(null);
                    setScreen(Screen.WELCOME);
                }
            }}
            onNewSession={(mode) => createSession(mode)}
        />
        
        {screen === Screen.SETTINGS && renderSettings()}
        {screen === Screen.WELCOME && renderWelcome()}
        {screen === Screen.CHAT_MODE && renderChat()}
        {screen === Screen.JARVIS_MODE && renderJarvis()}
    </div>
  );
};

export default App;