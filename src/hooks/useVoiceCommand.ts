import { useState, useCallback, useRef } from 'react';
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
  
  // Debug State
  const [lastTranscript, setLastTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const listeningIntentRef = useRef(false);

  const { start, stop, pause, resume, setMode } = useTimerStore();
  const { addToast } = useToastStore();

  const parseDuration = (text: string): number | null => {
    if (text.includes('half an hour')) return 30;
    if (text.includes('an hour')) return 60;
    
    const numMap: Record<string, number> = { 'one':1, 'two':2, 'three':3, 'four':4, 'five':5, 'ten':10, 'fifteen':15, 'twenty':20, 'thirty':30, 'forty':40, 'forty-five':45, 'fifty':50, 'sixty':60, 'ninety':90 };
    const regex = /(?:for\s+a\s+|for\s+|a\s+)?(\d+|one|two|three|four|five|ten|fifteen|twenty|thirty|forty|forty-five|fifty|sixty|ninety)\s*(hour|hr|minute|min)s?/i;
    const match = text.match(regex);
    
    if (!match) return null;
    let val = parseInt(match[1]);
    if (isNaN(val)) val = numMap[match[1].toLowerCase()] || 0;
    return match[2].startsWith('h') ? val * 60 : val;
  };

  const processTranscript = useCallback((transcript: string) => {
    const text = transcript.toLowerCase().trim();
    setLastTranscript(text);
    console.log("🎤 Final Transcript:", text);

    // Wake / Sleep Commands
    if (text.match(/activate study bunny|wake up study bunny/)) {
      setIsAwake(true); addToast('Study Bunny is awake.', 'success'); return;
    }
    if (text.match(/deactivate study bunny|go to sleep/)) {
      setIsAwake(false); addToast('Study Bunny is resting.', 'info'); return;
    }

    if (!isAwake) return;

    // Intent Parsing
    let intent: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RESET' | 'UNKNOWN' = 'UNKNOWN';
    
    if (text.match(/start|begin|let's study/)) intent = 'START';
    else if (text.match(/pause|hold|take a break|need a break/)) intent = 'PAUSE';
    else if (text.match(/resume|continue|ready again/)) intent = 'RESUME';
    else if (text.match(/stop|end my session|done studying/)) intent = 'STOP';
    else if (text.match(/reset|start over/)) intent = 'RESET';

    const duration = parseDuration(text);

    // Execution & Validation Pipeline
    switch (intent) {
      case 'START':
        if (duration) {
          setMode('countdown'); start(duration); 
          addToast(`Starting a ${duration}-minute session.`, 'success');
        } else {
          start(); 
          addToast('Starting timer.', 'success');
        }
        break;
      case 'PAUSE':
        pause(); addToast('Timer paused. Rest time is tracking.', 'info');
        break;
      case 'RESUME':
        resume(); addToast('Resuming your session.', 'info');
        break;
      case 'STOP':
        stop(false); addToast('Study session completed.', 'info');
        break;
      case 'RESET':
        stop(false); addToast('Timer reset.', 'info');
        break;
      default:
        // AI Fallback Architecture (Stubbed as requested)
        console.log("Passed to Optional AI Fallback:", text);
        addToast("I didn't understand that.", 'error');
        break;
    }
  }, [isAwake, start, stop, pause, resume, setMode, addToast]);

  const toggleListening = useCallback(() => {
    if (!isSupported) return;
    
    if (listeningIntentRef.current) {
      listeningIntentRef.current = false;
      setIsListening(false);
      setIsAwake(false);
      recognitionRef.current?.stop();
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
      addToast('Voice engine active! Say "Start a 45 minute timer".', 'success');
    };
    
    recognition.onresult = (event: any) => {
      // 🚀 CRITICAL FIX: Only process final results to prevent duplicate triggers
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          processTranscript(event.results[i][0].transcript);
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        setHasPermission(false);
        listeningIntentRef.current = false;
        setIsListening(false);
      }
    };

    // 🚀 CRITICAL FIX: Controlled backoff-restart logic
    recognition.onend = () => {
      if (listeningIntentRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch(e) { console.error("Mic restart failed"); }
        }, 250);
      } else {
        setIsListening(false);
      }
    };

    try { recognition.start(); } catch (e) { listeningIntentRef.current = false; }
  }, [isSupported, processTranscript, addToast]);

  return { isSupported, isListening, isAwake, hasPermission, lastTranscript, toggleListening };
};