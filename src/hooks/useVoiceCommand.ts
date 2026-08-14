import { useState, useCallback, useEffect, useRef } from 'react';
import { useTimerStore } from '../store/useTimerStore';
import { useToastStore } from '../store/useToastStore';

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

export type VoiceStatus = 'initializing' | 'inactive' | 'listening' | 'denied' | 'unsupported' | 'error';

interface DebugInfo {
  transcript: string;
  intent: string;
  duration: number | null;
  action: string;
}

export const useVoiceCommand = () => {
  const [status, setStatus] = useState<VoiceStatus>('initializing');
  const [debug, setDebug] = useState<DebugInfo>({ transcript: '', intent: 'NONE', duration: null, action: 'Waiting...' });
  
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const isStartingRef = useRef(false);
  
  // 🚀 CRITICAL FIX: Lifecycle guards to prevent infinite ghost loops
  const isMounted = useRef(true);
  const initFired = useRef(false);

  const { start, stop, pause, resume, setMode } = useTimerStore();
  const { addToast } = useToastStore();

  const extractDuration = (text: string): number | null => {
    if (text.includes('half an hour') || text.includes('half hour')) return 30;
    if (text.includes('an hour') || text.includes('one hour')) return 60;
    
    const numMap: Record<string, number> = { 'one':1, 'two':2, 'three':3, 'four':4, 'five':5, 'ten':10, 'fifteen':15, 'twenty':20, 'thirty':30, 'forty':40, 'forty-five':45, 'fifty':50, 'sixty':60, 'ninety':90 };
    const regex = /(\d+|one|two|three|four|five|ten|fifteen|twenty|thirty|forty|forty-five|fifty|sixty|ninety)\s*(hour|hr|minute|min)s?/i;
    const match = text.match(regex);
    
    if (!match) return null;
    let val = parseInt(match[1]);
    if (isNaN(val)) val = numMap[match[1].toLowerCase()] || 0;
    return match[2].startsWith('h') ? val * 60 : val;
  };

  const processTranscript = useCallback((transcript: string) => {
    const text = transcript.toLowerCase().trim().replace(/[.,!?]/g, '');
    if (!text) return;

    let intent = 'UNKNOWN';
    const duration = extractDuration(text);

    if (text.match(/(start|begin|let's).*(timer|study|session)/)) intent = 'START_TIMER';
    else if (text.match(/(pause|hold).*(timer|session)|take a break|need a break/)) intent = 'PAUSE_TIMER';
    else if (text.match(/(resume|continue).*(timer|study)|ready again/)) intent = 'RESUME_TIMER';
    else if (text.match(/(stop|end|finish).*(timer|study|session)/)) intent = 'STOP_TIMER';
    else if (text.match(/(reset|start over).*(timer)?/)) intent = 'RESET_TIMER';

    let actionStr = 'None';

    switch (intent) {
      case 'START_TIMER':
        if (duration) {
          setMode('countdown'); start(duration);
          actionStr = `Started ${duration}m timer`;
          addToast(actionStr, 'success');
        } else {
          start();
          actionStr = 'Started default timer';
          addToast(actionStr, 'success');
        }
        break;
      case 'PAUSE_TIMER':
        pause(); actionStr = 'Paused timer'; addToast(actionStr, 'info');
        break;
      case 'RESUME_TIMER':
        resume(); actionStr = 'Resumed timer'; addToast(actionStr, 'info');
        break;
      case 'STOP_TIMER':
      case 'RESET_TIMER':
        stop(false); actionStr = 'Stopped session'; addToast(actionStr, 'info');
        break;
      default:
        actionStr = 'Unrecognized - Passed to AI Fallback';
        break;
    }

    if (isMounted.current) setDebug({ transcript: text, intent, duration, action: actionStr });
  }, [start, stop, pause, resume, setMode, addToast]);

  const toggleVoice = useCallback((forceState?: boolean) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (isMounted.current) setStatus('unsupported');
      return;
    }

    const nextState = forceState !== undefined ? forceState : !shouldListenRef.current;
    
    if (!nextState) {
      shouldListenRef.current = false;
      if (isMounted.current) setStatus('inactive');
      if (recognitionRef.current) {
        // Force stop and prevent onend from restarting
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      return;
    }

    shouldListenRef.current = true;
    
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isStartingRef.current = false;
        if (isMounted.current && shouldListenRef.current) {
          setStatus('listening');
          setDebug(prev => ({ ...prev, action: 'Listening...' }));
        }
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        }
        if (finalTranscript) processTranscript(finalTranscript);
      };

      recognition.onerror = (e: any) => {
        isStartingRef.current = false;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          shouldListenRef.current = false;
          if (isMounted.current) setStatus('denied');
        } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
          if (isMounted.current && shouldListenRef.current) setStatus('error');
        }
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        if (shouldListenRef.current && isMounted.current) {
          setTimeout(() => {
            if (shouldListenRef.current && isMounted.current && !isStartingRef.current) {
              isStartingRef.current = true;
              try { recognitionRef.current.start(); } catch(e) { isStartingRef.current = false; }
            }
          }, 400); // Controlled 400ms backoff
        } else if (isMounted.current) {
          setStatus('inactive');
        }
      };

      recognitionRef.current = recognition;
    }

    if (!isStartingRef.current && shouldListenRef.current) {
      isStartingRef.current = true;
      try {
        recognitionRef.current.start();
        addToast('Voice engine active!', 'success');
      } catch (e) {
        isStartingRef.current = false;
      }
    }
  }, [processTranscript, addToast]);

  useEffect(() => {
    isMounted.current = true;
    if (!initFired.current) {
      initFired.current = true;
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setStatus('unsupported');
      } else {
        toggleVoice(true); // Auto-init ONCE
      }
    }

    return () => {
      // 🚀 CRITICAL FIX: Utterly destroy the engine on unmount to prevent ghost loops
      isMounted.current = false;
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null; // Detach restarter
          recognitionRef.current.abort();      // Kill active listening instantly
        } catch(e) {}
      }
    };
  }, [toggleVoice]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
        e.preventDefault();
        toggleVoice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleVoice]);

  return { status, debug, toggleVoice };
};