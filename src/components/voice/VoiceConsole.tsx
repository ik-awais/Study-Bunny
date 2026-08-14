import { useState } from 'react';
import { X, Mic, Settings } from 'lucide-react';
import { useVoiceCommand } from '../../hooks/useVoiceCommand';
import { Card, Button } from '../ui/SharedUI';

export const VoiceConsole = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { state, history, toggleVoice } = useVoiceCommand();
  const [tab, setTab] = useState<'history'|'commands'>('history');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-bunny-card border-l border-bunny-border shadow-2xl z-[9999] flex flex-col animate-in slide-in-from-right">
      <div className="p-4 border-b border-bunny-border flex justify-between items-center bg-bunny-cream">
        <h2 className="font-bold flex items-center gap-2">
          <Mic className={`w-5 h-5 ${state === 'LISTENING' ? 'text-green-500 animate-pulse' : 'text-bunny-muted'}`} /> 
          Voice Console
        </h2>
        <button onClick={onClose} className="p-1 text-bunny-muted hover:text-bunny-text"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex border-b border-bunny-border bg-white">
        <button onClick={() => setTab('history')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'history' ? 'text-bunny-primary border-b-2 border-bunny-primary' : 'text-bunny-muted'}`}>History</button>
        <button onClick={() => setTab('commands')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'commands' ? 'text-bunny-primary border-b-2 border-bunny-primary' : 'text-bunny-muted'}`}>Custom</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-bunny-cream/50 space-y-3">
        {tab === 'history' ? (
          history.length === 0 ? <p className="text-center text-bunny-muted text-sm mt-10">No voice activity yet.</p> :
          history.map(log => (
            <Card key={log.id} className="p-3 text-sm">
              <p className="text-bunny-muted text-xs mb-1">"{log.transcript}"</p>
              <div className="flex justify-between items-center font-bold">
                <span className="text-bunny-primary text-xs bg-bunny-primary/10 px-2 py-0.5 rounded">{log.intent}</span>
                <span className="text-[10px] text-green-600">{log.action}</span>
              </div>
            </Card>
          ))
        ) : (
           <div className="text-center text-bunny-muted text-sm mt-10">
             <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
             <p>Custom command management coming soon.</p>
           </div>
        )}
      </div>

      <div className="p-4 border-t border-bunny-border bg-white">
        <Button onClick={() => toggleVoice()} className={`w-full ${state === 'LISTENING' ? 'bg-bunny-error hover:bg-red-600' : 'bg-bunny-primary'}`}>
          {state === 'LISTENING' ? 'Deactivate Voice' : 'Activate Voice'}
        </Button>
      </div>
    </div>
  );
};