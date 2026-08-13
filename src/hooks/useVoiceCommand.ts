import { useState, useCallback } from 'react';
import { useTimerStore } from '../store/useTimerStore';
import { useToastStore } from '../store/useToastStore';

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

export const useVoiceCommand = () => {
  const [isSupported] = useState('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const [isListening, setIsListening] = useState(false); // Mic is hot
  const [isAwake, setIsAwake] = useState(false);         // System is accepting commands
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const { start, stop, pause, resume, setMode } = useTimerStore();
  const { addToast } = useToastStore();

  // Layer 3: AI Interpretation Architecture Prep
  const interpretWithAIFallback = async (transcript: string) => {
    console.log("Passed to AI Interpretation Layer:", transcript);
    // TODO: Plug in Gemini/NVIDIA API here later.
    addToast("I didn't quite catch that. (AI fallback ready)", 'info');
  };

  const handleCommand = useCallback((transcript: string) => {
    const text = transcript.toLowerCase().trim();
    
    // Wake Word / Sleep Word Logic
    if (text.includes('activate study bunny') || text.includes('wake up study bunny')) {
      setIsAwake(true);
      addToast('Study Bunny is awake and listening!', 'success');
      return;
    }
    if (text.includes('deactivate study bunny') || text.includes('go to sleep')) {
      setIsAwake(false);
      addToast('Study Bunny is now resting.', 'info');
      return;
    }

    if (!isAwake) return; // Ignore everything else if asleep

    // Layer 1 & 2: Fast Deterministic / NLP Regex Parsing
    if (text.includes('start timer') || text.includes('begin studying')) {
      start(); addToast('Timer started', 'success');
    } else if (text.match(/start.*(\d+)\s*(minute|min|hour|hr)/)) {
      const match = text.match(/(\d+)\s*(minute|min|hour|hr)/);
      const mins = match![2].startsWith('h') ? parseInt(match![1]) * 60 : parseInt(match![1]);
      setMode('countdown'); start(mins); addToast(`Started ${mins}m timer`, 'success');
    } else if (text.includes('stop') || text.includes('cancel')) {
      stop(false); addToast('Timer stopped', 'info');
    } else if (text.includes('pause') || text.includes('hold')) {
      pause(); addToast('Timer paused', 'info');
    } else if (text.includes('resume')) {
      resume(); addToast('Timer resumed', 'info');
    } else {
      // Unrecognized -> send to AI
      interpretWithAIFallback(text);
    }
  }, [isAwake, start, stop, pause, resume, setMode, addToast]);

  const toggleListening = useCallback(() => {
    if (!isSupported) return;
    if (isListening) { setIsListening(false); setIsAwake(false); return; }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true; // 🚀 PERSISTENT LISTENING
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => { setIsListening(true); setIsAwake(true); setHasPermission(true); };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      handleCommand(transcript);
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') setHasPermission(false);
      setIsListening(false); setIsAwake(false);
    };

    // Auto-restart if browser tries to kill background listening, unless explicitly turned off
    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch(e) { setIsListening(false); }
      }
    };

    try { recognition.start(); } catch (e) { setIsListening(false); }
  }, [isSupported, isListening, handleCommand]);

  return { isSupported, isListening, isAwake, hasPermission, toggleListening };
};