// This service handles Text-to-Speech (TTS) and Speech-to-Text (STT).
// For the desktop application requirement, this isolates the speech logic.
// In a full Electron app, this would bridge to native modules like 'node-stt' or SAPI via IPC.

let recognition: SpeechRecognition | null = null;

// Type definition for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: any) => void;
  onend: (event: any) => void;
  onerror: (event: any) => void;
}

// Polyfill check for browser environment
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const speechService = {
  isSupported: (): boolean => {
    return !!SpeechRecognition && !!window.speechSynthesis;
  },

  speak: (text: string, onStart?: () => void, onEnd?: () => void) => {
    if (!window.speechSynthesis) return;
    
    // Cancel any currently playing audio to prevent overlap
    window.speechSynthesis.cancel(); 

    // Helper to actually trigger the speech
    const doSpeak = () => {
        // Clean text for speaking (remove markdown symbols)
        const cleanText = text.replace(/(\*\*|__|#|`|\[.*?\])/g, '').trim();
        if (!cleanText) {
            if (onEnd) onEnd();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        // Select a preferred voice (Robust selection for Electron/Chrome)
        const voices = window.speechSynthesis.getVoices();
        
        // 1. Try to find a high-quality "Google" voice (common in Electron/Chrome)
        // 2. Fallback to any English voice
        const preferredVoice = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) || 
                               voices.find(v => v.lang === 'en-US' && v.localService) || 
                               voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) utterance.voice = preferredVoice;

        if (onStart) utterance.onstart = onStart;
        
        // Robust onEnd handler
        utterance.onend = () => {
            if (onEnd) onEnd();
        };
        
        utterance.onerror = (e) => {
            console.error("TTS Error Event:", e);
            // Even if error, trigger onEnd to release the lock in App.tsx
            if (onEnd) onEnd();
        };

        try {
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error("TTS Speak Exception:", err);
            if (onEnd) onEnd();
        }
    };

    // Chrome/Electron loads voices asynchronously.
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null; // Remove listener
            doSpeak();
        };
    } else {
        doSpeak();
    }
  },

  stopSpeaking: () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  },

  startListening: (onResult: (text: string) => void, onEnd: () => void, onError: (error: string) => void) => {
    if (!SpeechRecognition) {
      onError("Speech recognition not supported");
      return;
    }

    // Abort existing instances to prevent conflicts
    if (recognition) {
      try { recognition.abort(); } catch(e) {}
    }

    recognition = new SpeechRecognition();
    // In Electron, continuous often works better false, and we restart it manually in onEnd
    recognition!.continuous = false; 
    recognition!.interimResults = false;
    recognition!.lang = 'en-US';

    recognition!.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && transcript.trim().length > 0) {
          onResult(transcript);
      }
    };

    recognition!.onend = () => {
      onEnd();
    };

    recognition!.onerror = (event: any) => {
      // "no-speech" is common and shouldn't be treated as a fatal error
      if (event.error === 'no-speech') {
        // We let onEnd handle the restart logic
        return;
      }
      onError(event.error);
    };

    try {
      recognition!.start();
    } catch (e) {
      console.error("Failed to start recognition", e);
      // If start fails (e.g. already started), trigger onEnd to reset state
      onEnd();
    }
  },

  stopListening: () => {
    if (recognition) {
      try { recognition.stop(); } catch(e) {}
    }
  }
};