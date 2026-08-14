import { useTimerStore } from '../store/useTimerStore';
import { useToastStore } from '../store/useToastStore';
import { useDataStore } from '../store/useDataStore';
declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

export type VoiceState = 'OFF' | 'STARTING' | 'LISTENING' | 'RECOVERING' | 'DENIED' | 'UNSUPPORTED' | 'ERROR';

export interface VoiceLog {
  id: string;
  time: Date;
  transcript: string;
  intent: string;
  action: string;
}

class VoiceEngineController {
  private recognition: any = null;
  public state: VoiceState = 'OFF';
  public isEnabled = false;
  
  private restartTimeout: any = null;
  private backoff = 500;
  
  public history: VoiceLog[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.state = 'UNSUPPORTED';
    } else {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.state = 'LISTENING';
        this.backoff = 500; // Reset backoff on success
        this.notify();
      };

      this.recognition.onresult = (event: any) => this.handleResult(event);
      this.recognition.onerror = (e: any) => this.handleError(e);
      this.recognition.onend = () => this.handleEnd();
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public toggle(force?: boolean) {
    if (this.state === 'UNSUPPORTED' || this.state === 'DENIED') return;
    
    const nextEnabled = force !== undefined ? force : !this.isEnabled;
    this.isEnabled = nextEnabled;

    if (this.isEnabled) {
      this.startSafe();
    } else {
      this.state = 'OFF';
      clearTimeout(this.restartTimeout);
      try { this.recognition.abort(); } catch(e) {}
      this.notify();
    }
  }

  private startSafe() {
    if (this.state === 'LISTENING' || this.state === 'STARTING') return;
    this.state = 'STARTING';
    this.notify();
    try {
      this.recognition.start();
    } catch (e) {
      this.state = 'RECOVERING';
      this.handleEnd(); // Trigger backoff
    }
  }

  private handleEnd() {
    if (!this.isEnabled) return;
    this.state = 'RECOVERING';
    this.notify();
    
    // 🚀 CONTROLLED BACKOFF RECOVERY - No Infinite Loops
    clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => {
      if (this.isEnabled) this.startSafe();
    }, this.backoff);
    
    this.backoff = Math.min(this.backoff * 1.5, 5000); 
  }

  private handleError(e: any) {
    if (e.error === 'not-allowed') {
      this.isEnabled = false;
      this.state = 'DENIED';
      useToastStore.getState().addToast('Microphone access denied.', 'error');
      this.notify();
    }
    // no-speech and network errors are silently caught by onend and cleanly recovered.
  }

  private async handleResult(event: any) {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
    }
    const text = finalTranscript.trim();
    if (!text) return;

    // 1. Check Custom Commands First
    const customCommands = useDataStore.getState().customCommands || [];
    const customMatch = customCommands.find(c => c.enabled && text.toLowerCase().includes(c.phrase.toLowerCase()));
    if (customMatch) {
      this.executeAction(customMatch.action, text);
      return;
    }

    // 2. Deterministic Local Parsing
    const lower = text.toLowerCase();
    if (lower.match(/(start|begin|let's).*(timer|study)/)) return this.executeAction('START_TIMER', text);
    if (lower.match(/(pause|hold).*(timer|session)|take a break/)) return this.executeAction('PAUSE_TIMER', text);
    if (lower.match(/(resume|continue).*(timer|study)/)) return this.executeAction('RESUME_TIMER', text);
    if (lower.match(/(stop|end).*(timer|session)/)) return this.executeAction('STOP_TIMER', text);

    // 3. Optional AI Fallback
    this.log(text, 'PROCESSING', 'Passing to AI...');
    try {
      const res = await fetch('/api/voice/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text })
      });
      const data = await res.json();
      if (data.confidence !== 'low') {
        this.executeAction(data.intent, text, data.parameters);
      } else {
        this.log(text, 'UNKNOWN', 'I didn\'t understand that.');
      }
    } catch (e) {
      this.log(text, 'ERROR', 'AI Interpretation failed.');
    }
  }

  private executeAction(intent: string, transcript: string, params?: any) {
    const { start, pause, resume, stop, setMode } = useTimerStore.getState();
    const { addToast } = useToastStore.getState();
    let actionStr = 'Executed';

    switch (intent) {
      case 'START_TIMER':
        if (params?.duration) { setMode('countdown'); start(params.duration); actionStr = `Started ${params.duration}m timer`; }
        else { start(); actionStr = 'Started timer'; }
        addToast(actionStr, 'success');
        break;
      case 'PAUSE_TIMER': pause(); actionStr = 'Paused timer'; break;
      case 'RESUME_TIMER': resume(); actionStr = 'Resumed timer'; break;
      case 'STOP_TIMER': stop(); actionStr = 'Stopped session'; break;
      case 'OPEN_PLANNER': window.location.hash = '/planner'; actionStr = 'Navigated to Planner'; break;
    }
    this.log(transcript, intent, actionStr);
  }

  private log(transcript: string, intent: string, action: string) {
    this.history.unshift({ id: Date.now().toString(), time: new Date(), transcript, intent, action });
    if (this.history.length > 50) this.history.pop();
    this.notify();
  }
}

export const voiceEngine = new VoiceEngineController();