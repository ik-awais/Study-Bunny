import { useToastStore } from '../store/useToastStore';
import { useDataStore } from '../store/useDataStore';
import { matchAndExecute } from './CommandRegistry';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
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
        this.backoff = 500;
        this.notify();
      };

      this.recognition.onresult = (event: any) => this.handleResult(event);
      this.recognition.onerror = (e: any) => this.handleError(e);
      this.recognition.onend = () => this.handleEnd();
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
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
      try {
        this.recognition.abort();
      } catch (e) {}
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
      this.handleEnd();
    }
  }

  private handleEnd() {
    if (!this.isEnabled) return;
    this.state = 'RECOVERING';
    this.notify();
    
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
  }

  private handleResult(event: any) {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      }
    }
    const text = finalTranscript.trim();
    if (!text) return;

    const customCommands = useDataStore.getState().customCommands || [];
    const outcome = matchAndExecute(text, customCommands);

    this.log(text, outcome.intent, outcome.action);
  }

  public log(transcript: string, intent: string, action: string) {
    this.history.unshift({
      id: Date.now().toString(),
      time: new Date(),
      transcript,
      intent,
      action
    });
    if (this.history.length > 50) this.history.pop();
    this.notify();
  }
}

export const voiceEngine = new VoiceEngineController();