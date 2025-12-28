// This service handles Text-to-Speech (TTS) and Speech-to-Text (STT).
let recognition: any | null = null;

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const speechService = {
  isSupported: (): boolean => {
    return !!SpeechRecognition && !!window.speechSynthesis;
  },

  speak: (text: string, onStart?: () => void, onEnd?: () => void) => {
    if (!window.speechSynthesis) return;
    
    // Immediate stop to prevent overlapping or stale queues
    window.speechSynthesis.cancel(); 

    const doSpeak = () => {
        // Human-like clean text stripping
        const cleanText = text.replace(/(\*\*|__|#|`|\[.*?\]|###)/g, '').trim();
        if (!cleanText) {
            if (onEnd) onEnd();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.1; // Slightly dynamic rate for modern feel
        utterance.pitch = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        // Priority: Select highest quality English voices
        const preferredVoice = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en-GB")) || 
                               voices.find(v => v.name.includes("Google") && v.lang.startsWith("en-US")) || 
                               voices.find(v => v.name.includes("Premium") || v.name.includes("Natural")) ||
                               voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) utterance.voice = preferredVoice;

        if (onStart) utterance.onstart = onStart;
        utterance.onend = () => { if (onEnd) onEnd(); };
        utterance.onerror = (e) => { 
          console.error("Jarvis TTS Error:", e);
          if (onEnd) onEnd(); 
        };

        try {
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error("TTS Exception:", err);
            if (onEnd) onEnd();
        }
    };

    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null;
            doSpeak();
        };
    } else {
        doSpeak();
    }
  },

  stopSpeaking: () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  },

  startListening: (onResult: (text: string) => void, onEnd: () => void, onError: (error: string) => void) => {
    if (!SpeechRecognition) {
      onError("Speech recognition not supported in this environment");
      return;
    }

    if (recognition) {
      try { recognition.abort(); } catch(e) {}
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && transcript.trim().length > 0) {
          onResult(transcript);
      }
    };

    recognition.onend = () => { 
      onEnd(); 
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // Handled via onend to keep it quiet
        return;
      }
      console.error("STT Error:", event.error);
      onError(event.error);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Jarvis Microphone Startup Failed", e);
      onEnd();
    }
  },

  stopListening: () => {
    if (recognition) {
      try { recognition.stop(); } catch(e) {}
    }
  }
};