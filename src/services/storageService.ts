import { Session, AppConfig, User } from '../types';
import { STORAGE_KEYS, DEFAULT_CONFIG } from '../constants';

const USER_KEY = 'foxy_user_profile';
const GUEST_STATS_KEY = 'foxy_guest_stats';

interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

const getElectron = (): ElectronAPI | undefined => {
  return (window as any).electron;
};

export const storageService = {
  // User Profile Persistence
  getUser: (): User | null => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },
  setUser: (user: User | null) => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  },

  // Guest Usage Tracking (Daily Reset)
  getGuestStats: () => {
    const stored = localStorage.getItem(GUEST_STATS_KEY);
    const today = new Date().toDateString();
    
    if (!stored) {
      const initial = { count: 0, lastDate: today };
      localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(initial));
      return initial;
    }
    
    const stats = JSON.parse(stored);
    if (stats.lastDate !== today) {
      const reset = { count: 0, lastDate: today };
      localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(reset));
      return reset;
    }
    return stats;
  },

  incrementGuestCount: () => {
    const stats = storageService.getGuestStats();
    stats.count += 1;
    localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(stats));
    return stats.count;
  },

  loadConfig: async (): Promise<AppConfig> => {
    const electron = getElectron();
    if (electron) {
       try {
         const data = await electron.invoke('storage:get', STORAGE_KEYS.CONFIG);
         return data ? data : { ...DEFAULT_CONFIG };
       } catch (error) {
         return { ...DEFAULT_CONFIG };
       }
    }
    const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return stored ? JSON.parse(stored) : { ...DEFAULT_CONFIG };
  },

  saveConfig: async (config: AppConfig): Promise<void> => {
    const electron = getElectron();
    if (electron) {
      try { await electron.invoke('storage:set', STORAGE_KEYS.CONFIG, config); } catch (e) {}
      return;
    }
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },

  loadSessions: async (): Promise<Session[]> => {
    const electron = getElectron();
    if (electron) {
       try {
         const data = await electron.invoke('storage:get', STORAGE_KEYS.SESSIONS);
         return Array.isArray(data) ? data : [];
       } catch (e) { return []; }
    }
    const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return stored ? JSON.parse(stored) : [];
  },

  saveSessions: async (sessions: Session[]): Promise<void> => {
    const electron = getElectron();
    if (electron) {
      try { await electron.invoke('storage:set', STORAGE_KEYS.SESSIONS, sessions); } catch (e) {}
      return;
    }
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },

  loadLastScreen: async (): Promise<string | null> => {
    const electron = getElectron();
    if (electron) {
       try { return await electron.invoke('storage:get', STORAGE_KEYS.LAST_SCREEN); } catch (e) { return null; }
    }
    return localStorage.getItem(STORAGE_KEYS.LAST_SCREEN);
  },

  saveLastScreen: async (screen: string): Promise<void> => {
    const electron = getElectron();
    if (electron) {
       try { await electron.invoke('storage:set', STORAGE_KEYS.LAST_SCREEN, screen); } catch (e) {}
       return;
    }
    localStorage.setItem(STORAGE_KEYS.LAST_SCREEN, screen);
  }
};