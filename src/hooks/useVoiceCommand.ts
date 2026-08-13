import { useState, useCallback, useEffect, useRef } from 'react';
import { useTimerStore } from '../store/useTimerStore';
import { useToastStore } from '../store/useToastStore';

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

export const useVoiceCommand = () => {
  const [isSupported] = useState('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const [isListening, setIsListening] = useState(false); 
  const [isAwake, setIsAwake] = useState(false);         
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const recognitionRef = useRef<any>(null);
  const listeningIntentRef = useRef(false); // Tracks if the mic SHOULD be on

  const { start, stop, pause, resume, setMode } = useTimerStore();
  const { addToast } = useToastStore();

  const parseDuration = (text: string): number | null => {
    if (text.includes('half an hour')) return 30;
    if (text.includes('an hour')) return 60;
    
    const numMap: Record<string, number> = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'ten': 10, 'fifteen': 15, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'ninety': 90 };
    const regex = /(?:for\s+a\s+|for\s+|a\s+)?(\d+|one|two|three|four|five|ten|fifteen|twenty|thirty|forty|fifty|sixty|ninety)\s*(hour|hr|minute|min)/i;
    const match = text.match(regex);
    
    if (!match) return null;
    let val = parseInt(match[1]);
    if (isNaN(val)) val = numMap[match[1].toLowerCase()] || 0;
    return match[2].startsWith('h') ? val * 60 : val;
  };

  const handleCommand = useCallback((transcript: string) => {
    const text = transcript.toLowerCase().trim();
    console.log("🎤 Voice Pipeline Recognized:", text);

    // Wake Phrase Logic
    if (text.includes('activate study bunny') || text.includes('wake up study bunny')) {
      setIsAwake(true); addToast('Study Bunny is awake and listening!', 'success'); return;
    }
    if (text.includes('deactivate study bunny') || text.includes('go to sleep')) {
      setIsAwake(false); addToast('Study Bunny is now resting.', 'info'); return;
    }

    if (!isAwake) return;

    // Command Intent Parsing
    const duration = parseDuration(text);
    if (text.includes('start') || text.includes('begin')) {
      if (duration) {
        setMode('countdown'); start(duration); addToast(`Started a ${duration} minute session`, 'success');
      } else {
        start(); addToast('Timer started', 'success');
      }
    } else if (text.includes('stop') || text.includes('end my session')) {
      stop(false); addToast('Timer stopped', 'info');
    } else if (text.includes('pause') || text.includes('hold')) {
      pause(); addToast('Timer paused. Rest time is tracking.', 'info');
    } else if (text.includes('resume') || text.includes('continue')) {
      resume(); addToast('Timer resumed', 'info');
    } else if (text.includes('reset')) {
      stop(false); addToast('Timer reset', 'info');
    } else {
      console.log("AI Fallback Abstraction reached for:", text);
    }
  }, [isAwake, start, stop, pause, resume, setMode, addToast]);

  const toggleListening = useCallback(() => {
    if (!isSupported) return;
    
    if (listeningIntentRef.current) {
      listeningIntentRef.current = false;
      setIsListening(false);
      setIsAwake(false);
      recognitionRef.current?.stop();
      addToast('Voice engine deactivated.', 'info');
      return;
    }

    listeningIntentRef.current = true;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setIsAwake(true);
      setHasPermission(true);
      addToast('Voice engine activated! Try saying "Start a 45 minute timer".', 'success');
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      handleCommand(transcript);
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        setHasPermission(false);
        listeningIntentRef.current = false;
        setIsListening(false);
      }
    };

    // 🚀 THE FIX: Aggressively restart the loop if the browser kills it on silence,
    // AS LONG AS the user hasn't explicitly turned it off.
    recognition.onend = () => {
      if (listeningIntentRef.current) {
        try { recognition.start(); } catch(e) { console.error("Mic restart failed"); }
      } else {
        setIsListening(false);
      }
    };

    try { recognition.start(); } catch (e) { listeningIntentRef.current = false; }
  }, [isSupported, handleCommand, addToast]);

  // Global Keyboard Shortcut: Ctrl + Shift + B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleListening]);

  return { isSupported, isListening, isAwake, hasPermission, toggleListening };
};