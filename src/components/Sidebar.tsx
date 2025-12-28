
import React from 'react';
import { Screen, Session } from '../types';
import FoxyLogo from '../assets/Foxy.png';
import { MessageSquare, Mic, Settings, Trash2, Menu, Plus, Home } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  currentScreen: Screen;
  sessions: Session[];
  currentSessionId: string | null;
  onToggle: (open: boolean) => void;
  onNavigate: (screen: Screen) => void;
  onSwitchSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: (mode: 'chat' | 'jarvis') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  currentScreen,
  sessions,
  currentSessionId,
  onToggle,
  onNavigate,
  onSwitchSession,
  onDeleteSession,
  onNewSession
}) => {
  return (
    <div 
      className={`fixed top-0 left-0 h-full w-72 bg-[var(--sidebar-bg)] backdrop-blur-xl z-50 transform transition-transform duration-300 ease-in-out border-r border-gray-800/10 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`} 
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-800/10">
        <h2 className="text-xl font-bold text-cyan-500 flex items-center gap-3">
          <img src={FoxyLogo} alt="Foxy AI" className="w-8 h-8 object-contain" />
          Foxy AI
        </h2>
        <button 
          onClick={() => onToggle(false)} 
          className="p-2 text-gray-400 hover:text-[var(--text-main)]"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="p-4 space-y-2 border-b border-gray-800/10">
        <button
          onClick={() => onNavigate(Screen.WELCOME)}
          className={`flex items-center w-full p-3 rounded-lg transition-colors ${
            currentScreen === Screen.WELCOME ? 'bg-cyan-500/10 text-cyan-500' : 'text-gray-400 hover:bg-gray-800/5'
          }`}
        >
          <Home size={20} className="mr-3" />
          Home
        </button>
        <button
          onClick={() => onNavigate(Screen.CHAT_MODE)}
          className={`flex items-center w-full p-3 rounded-lg transition-colors ${
            currentScreen === Screen.CHAT_MODE ? 'bg-cyan-500/10 text-cyan-500' : 'text-gray-400 hover:bg-gray-800/5'
          }`}
        >
          <MessageSquare size={20} className="mr-3" />
          Chat Mode
        </button>
        <button
          onClick={() => onNavigate(Screen.JARVIS_MODE)}
          className={`flex items-center w-full p-3 rounded-lg transition-colors ${
            currentScreen === Screen.JARVIS_MODE ? 'bg-indigo-500/10 text-indigo-500' : 'text-gray-400 hover:bg-gray-800/5'
          }`}
        >
          <Mic size={20} className="mr-3" />
          Jarvis Mode
        </button>
        <button
          onClick={() => onNavigate(Screen.SETTINGS)}
          className={`flex items-center w-full p-3 rounded-lg transition-colors ${
            currentScreen === Screen.SETTINGS ? 'bg-gray-800/10 text-[var(--text-main)]' : 'text-gray-400 hover:bg-gray-800/5'
          }`}
        >
          <Settings size={20} className="mr-3" />
          Settings
        </button>
      </div>

      <div className="p-4 flex-grow overflow-hidden flex flex-col">
          <button 
            onClick={() => onNewSession('chat')}
            className="flex items-center justify-center w-full p-2 mb-4 bg-cyan-600/10 text-cyan-500 border border-cyan-500/20 rounded-lg hover:bg-cyan-600/20 transition-all font-black uppercase text-[10px] tracking-widest"
          >
            <Plus size={16} className="mr-2"/> New Session
          </button>
          
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">History</h3>
          <div className="space-y-1 overflow-y-auto flex-grow custom-scrollbar pr-1">
            {sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => onSwitchSession(session.id)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                  session.id === currentSessionId 
                    ? 'bg-gray-800/10 border-gray-700/20 text-[var(--text-main)]' 
                    : 'border-transparent text-gray-400 hover:bg-gray-800/5'
                }`}
              >
                <div className="flex items-center truncate max-w-[180px]">
                  {session.mode === 'jarvis' ? <Mic size={14} className="mr-2 shrink-0"/> : <MessageSquare size={14} className="mr-2 shrink-0"/>}
                  <span className="text-sm truncate font-medium">{session.title}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/10 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
                <p className="text-gray-500 text-[10px] text-center py-8 uppercase tracking-widest font-black opacity-30 italic">Nexus Empty</p>
            )}
          </div>
      </div>
    </div>
  );
};
