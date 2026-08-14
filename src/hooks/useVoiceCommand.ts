import { useState, useEffect } from 'react';
import { voiceEngine } from '../lib/VoiceEngine';
import type { VoiceState, VoiceLog } from '../lib/VoiceEngine';

export const useVoiceCommand = () => {
  const [state, setState] = useState<VoiceState>(voiceEngine.state);
  const [history, setHistory] = useState<VoiceLog[]>(voiceEngine.history);

  useEffect(() => {
    // Auto-init on load if supported
    if (voiceEngine.state === 'OFF') voiceEngine.toggle(true);
    
    const unsubscribe = voiceEngine.subscribe(() => {
      setState(voiceEngine.state);
      setHistory([...voiceEngine.history]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
        e.preventDefault();
        voiceEngine.toggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { state, history, toggleVoice: (f?: boolean) => voiceEngine.toggle(f) };
};