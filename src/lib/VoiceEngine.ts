import { useToastStore } from '../store/useToastStore';
import { useDataStore } from '../store/useDataStore';
import { resolveCommand, executeResolvedCommand, executeAIActions } from './CommandRegistry';
import type { ResolvedCommand, CommandResult } from './CommandRegistry';

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
  success: boolean;
}

class VoiceEngineController {
  private recognition: any = null;
  public state: VoiceState = 'OFF';
  public isEnabled = false;
  
  private restartTimeout: any = null;
  private backoff = 500;
  
  // Exactly-Once Deduplication State
  private lastTranscript = '';
  private lastTranscriptTime = 0;
  
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
      try { this.recognition.abort(); } catch (e) {}
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

  private async handleResult(event: any) {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
    }
    const text = finalTranscript.trim();
    if (!text) return;

    // 🚀 EXACTLY-ONCE EXECUTION DEDUPLICATION (2000ms window)
    const now = Date.now();
    if (text === this.lastTranscript && now - this.lastTranscriptTime < 2000) {
      return; 
    }
    this.lastTranscript = text;
    this.lastTranscriptTime = now;

    const dataStore = useDataStore.getState();
    const customCommands = dataStore.customCommands || [];
    
    // 1. Structural Resolution (Deterministic)
    const resolved: ResolvedCommand | null = resolveCommand(text, customCommands);
    
    if (resolved) {
      const result: CommandResult = executeResolvedCommand(resolved);
      if (result.success) {
        useToastStore.getState().addToast(result.message, 'success');
      } else {
        useToastStore.getState().addToast(result.message, 'error');
      }
      this.log(text, resolved.intentId, result.message, result.success);
      return;
    }

    // 2. AI Fallback (Complex Natural Language)
    useToastStore.getState().addToast("Thinking...", 'info');
    
    try {
      const response = await fetch('/api/voice/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: text,
          context: {
            currentDateTime: new Date().toISOString(),
            goals: dataStore.goals.filter(g => g.status === 'active'),
            planner: dataStore.planner.filter(p => !p.completed)
          }
        })
      });

      const aiData = await response.json();

      if (aiData.requiresConfirmation) {
        if (!window.confirm(`AI proposes: ${aiData.message}\n\nProceed?`)) {
          useToastStore.getState().addToast("Action canceled.", 'info');
          this.log(text, 'AI_CANCELED', 'User denied confirmation', false);
          return;
        }
      }

      if (aiData.actions && aiData.actions.length > 0) {
        const success = await executeAIActions(aiData.actions);
        useToastStore.getState().addToast(aiData.message, success ? 'success' : 'error');
        this.log(text, 'AI_EXECUTED', aiData.message, success);
      } else {
        useToastStore.getState().addToast(aiData.message, 'info');
        this.log(text, 'AI_NO_ACTION', aiData.message, false);
      }

    } catch (e) {
      console.error(e);
      useToastStore.getState().addToast("AI service unavailable.", 'error');
      this.log(text, 'AI_ERROR', 'Service unavailable', false);
    }
  }

  public log(transcript: string, intent: string, action: string, success: boolean) {
    this.history.unshift({ id: Date.now().toString(), time: new Date(), transcript, intent, action, success });
    if (this.history.length > 50) this.history.pop();
    this.notify();
  }
}

export const voiceEngine = new VoiceEngineController();