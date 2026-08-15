import { useEffect, useState } from 'react';
import { X, Mic, Settings, Sparkles, Clock, Command } from 'lucide-react';
import { useVoiceCommand } from '../../hooks/useVoiceCommand';
import { Card, Button } from '../ui/SharedUI';
import { CustomCommandsTab } from './CustomCommandsTab';
import { AIAssistantTab } from './AIAssistantTab';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceModal = ({ isOpen, onClose }: VoiceModalProps) => {
  const { state, toggleVoice } = useVoiceCommand();
  const [activeTab, setActiveTab] = useState<'status' | 'commands' | 'ai' | 'history'>('status');
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'status', label: 'Voice Status', icon: Mic },
    { id: 'commands', label: 'Bunny Commands', icon: Command },
    { id: 'ai', label: 'Bunny Assistant', icon: Sparkles },
    { id: 'history', label: 'Voice History', icon: Clock },
  ] as const;

  return (
    <div className={`fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in ${isMaximized ? 'p-0 sm:p-4' : 'p-4'}`} onClick={onClose}>
      
      {/* 🚀 MODAL SHELL - Enforces hard boundaries so the inner scrollbars work */}
      <div 
        className={`bg-bunny-cream w-full overflow-hidden flex flex-col shadow-2xl border border-bunny-border animate-in zoom-in-95 transition-all duration-300 ${
          isMaximized ? 'h-full max-w-7xl rounded-none sm:rounded-3xl' : 'h-[85vh] max-h-[800px] max-w-2xl rounded-3xl'
        }`} 
        onClick={e => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="voice-modal-title"
      >
        
        {/* Only show default tabs if NOT maximized */}
        {!isMaximized && (
          <>
            <div className="flex justify-between items-center p-5 border-b border-bunny-border bg-white flex-shrink-0">
              <h2 id="voice-modal-title" className="text-xl font-bold font-rounded flex items-center gap-2 text-bunny-text">
                <Settings className="w-5 h-5 text-bunny-primary" />
                Bunny Voice
              </h2>
              <button onClick={onClose} className="p-2 text-bunny-muted hover:text-bunny-error bg-bunny-cream hover:bg-red-50 rounded-full transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex overflow-x-auto border-b border-bunny-border bg-white px-2 hide-scrollbar flex-shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold tracking-wide whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === tab.id ? 'border-bunny-primary text-bunny-primary' : 'border-transparent text-bunny-muted hover:text-bunny-text hover:border-bunny-border'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 🚀 CONTENT WRAPPER - flex-1 min-h-0 is mandatory to prevent child blowout */}
        <div className={`flex-1 flex flex-col bg-bunny-cream/50 overflow-hidden ${isMaximized || activeTab === 'ai' ? 'p-0' : 'p-6 overflow-y-auto'}`}>
          
          {activeTab === 'status' && !isMaximized && (
            <div className="space-y-6 max-w-sm mx-auto my-auto py-6">
              <Card className="flex flex-col items-center justify-center text-center p-8 bg-white border-bunny-border shadow-sm">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 transition-colors ${state === 'LISTENING' ? 'bg-bunny-primary text-white animate-pulse shadow-lg shadow-bunny-primary/30' : state === 'DENIED' || state === 'ERROR' ? 'bg-bunny-error text-white' : 'bg-bunny-cream text-bunny-muted'}`}>
                  <Mic className="w-10 h-10" />
                </div>
                <h3 className="font-bold text-xl text-bunny-text mb-1">Bunny Voice</h3>
                <p className={`text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${state === 'LISTENING' ? 'text-green-500' : state === 'DENIED' || state === 'ERROR' ? 'text-bunny-error' : 'text-bunny-muted'}`}>
                  <span className="w-2 h-2 rounded-full bg-current"></span>{state}
                </p>
              </Card>
              <Button onClick={() => toggleVoice()} className={`w-full py-4 text-base shadow-sm ${state === 'LISTENING' ? 'bg-bunny-error hover:bg-red-600' : 'bg-bunny-primary hover:bg-bunny-primary/90'}`}>
                {state === 'LISTENING' ? 'Turn Voice Off' : 'Turn Voice On'}
              </Button>
            </div>
          )}

          {activeTab === 'commands' && !isMaximized && <CustomCommandsTab />}
          
          {/* 🚀 AI TAB WRAPPER */}
          {activeTab === 'ai' && (
             <div className="flex-1 min-h-0 flex flex-col w-full h-full">
               <AIAssistantTab isMaximized={isMaximized} setIsMaximized={setIsMaximized} onClose={onClose} />
             </div>
          )}

          {activeTab === 'history' && !isMaximized && (
            <div className="flex flex-col items-center justify-center text-center h-full p-8 text-bunny-muted animate-in fade-in my-auto">
              <Clock className="w-16 h-16 mb-4 opacity-20 text-bunny-primary" />
              <h3 className="text-xl font-bold text-bunny-text mb-2 font-rounded">Voice History</h3>
              <p className="text-sm max-w-xs leading-relaxed">Review a persistent log of your recent voice commands and transcriptions. Coming soon.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};