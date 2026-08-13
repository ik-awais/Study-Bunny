import { useState, useCallback } from 'react';
import { useTimerStore } from '../store/useTimerStore';
import { useToastStore } from '../store/useToastStore';

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const useVoiceCommand = () => {
  const [isSupported] = useState('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const { start, stop, pause, resume, setMode } = useTimerStore();
  const { addToast } = useToastStore();

  const handleCommand = useCallback((transcript: string) => {
    const text = transcript.toLowerCase();
    
    if (text.includes('start') || text.includes('set')) {
      const durationMatch = text.match(/(\d+)\s*(minute|min|hour|hr)/);
      if (durationMatch) {
        const num = parseInt(durationMatch[1]);
        const unit = durationMatch[2];
        const mins = unit.startsWith('hour') || unit.startsWith('hr') ? num * 60 : num;
        setMode('countdown');
        start(mins, { title: 'Voice Session', subject: 'General' });
        addToast(`Started a ${mins} minute timer`, 'success');
      } else if (text.includes('timer') || text.includes('session')) {
        start();
        addToast('Timer started', 'success');
      }
    } else if (text.includes('stop') || text.includes('cancel')) {
      stop(false);
      addToast('Timer stopped', 'info');
    } else if (text.includes('pause')) {
      pause();
      addToast('Timer paused', 'info');
    } else if (text.includes('resume')) {
      resume();
      addToast('Timer resumed', 'info');
    } else if (text.includes('reset')) {
      stop(false);
      addToast('Timer reset', 'info');
    }
  }, [start, stop, pause, resume, setMode, addToast]);

  const toggleListening = useCallback(() => {
    if (!isSupported) {
      addToast('Voice commands are not supported in this browser.', 'error');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setHasPermission(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setHasPermission(false);
        addToast('Microphone permission denied.', 'error');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Speech recognition error:", e);
      setIsListening(false);
    }
  }, [isSupported, isListening, handleCommand, addToast]);

  return { isSupported, isListening, hasPermission, toggleListening };
};