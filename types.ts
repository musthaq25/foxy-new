
export enum Screen {
  LOADING = 'loading',
  AUTH = 'auth',
  ONBOARDING_NAME = 'onboarding_name',
  WELCOME = 'welcome',
  JARVIS_MODE = 'jarvis_mode',
  CHAT_MODE = 'chat_mode',
  SETTINGS = 'settings',
}

export enum Theme {
  DARK = 'dark',
  LIQUID_GLASS = 'liquid_glass',
  WHITE = 'white',
  SOFT = 'soft'
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  isGuest: boolean;
}

export interface Message {
  id: string;
  sender: 'user' | 'foxy';
  text: string;
  timestamp: string;
  imageData?: string; // Base64 string for images
  isLoading?: boolean;
}

export interface Session {
  id: string;
  title: string;
  mode: 'chat' | 'jarvis';
  messages: Message[];
  createdAt: number;
}

export interface AppConfig {
  userName: string | null;
  theme: Theme;
  accentColor: string;
  studyMode: boolean;
}

export interface AIResponse {
  text: string;
  isCommand: boolean;
  generatedTitle?: string;
  command?: string;
  appName?: string;
  greeting?: string;
}
