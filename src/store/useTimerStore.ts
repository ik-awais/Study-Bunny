import { create } from 'zustand';
import { saveSettings, getSettings, recordSession } from '../lib/db';
import { useDataStore } from './useDataStore';
import { useSettingsStore } from './useSettingsStore';
import { useAuthStore } from './useAuthStore';

type TimerMode = 'countdown' | 'pomodoro';
type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
type PomodoroPhase = 'focus' | 'break';

interface SessionContext {
  title: string;
  subject: string;
  plannerId?: string;
}

interface TimerState {
  status: TimerStatus;
  mode: TimerMode;
  phase: PomodoroPhase;
  targetDurationMs: number;
  remainingMs: number;
  
  // Math internals
  expectedEndTime: number | null;
  accumulatedMs: number;
  lastStartTime: number | null;
  
  // Pause tracking
  pauseAccumulatedMs: number;
  pauseStartTime: number | null;
  
  // Session context
  context: SessionContext | null;
  
  // Actions
  setMode: (mode: TimerMode) => void;
  start: (durationMins?: number, ctx?: SessionContext) => void;
  pause: () => void;
  resume: () => void;
  stop: (completed?: boolean) => void;
  tick: () => void;
  recoverState: () => Promise<void>;
}

const persistState = (state: Partial<TimerState>) => {
  saveSettings('activeTimerState', state).catch(console.error);
};

export const useTimerStore = create<TimerState>()((set, get) => ({
  status: 'idle',
  mode: 'pomodoro',
  phase: 'focus',
  targetDurationMs: 25 * 60 * 1000,
  remainingMs: 25 * 60 * 1000,
  expectedEndTime: null,
  accumulatedMs: 0,
  lastStartTime: null,
  pauseAccumulatedMs: 0,
  pauseStartTime: null,
  context: null,

  setMode: (mode) => {
    const targetMs = mode === 'pomodoro' ? 25 * 60 * 1000 : 15 * 60 * 1000;
    set({ 
      mode, 
      status: 'idle', 
      phase: 'focus', 
      targetDurationMs: targetMs, 
      remainingMs: targetMs, 
      accumulatedMs: 0,
      pauseAccumulatedMs: 0,
      pauseStartTime: null,
      context: null 
    });
    persistState({ status: 'idle', context: null, pauseAccumulatedMs: 0, pauseStartTime: null });
  },

  start: (durationMins, ctx) => {
    const targetMs = durationMins ? durationMins * 60 * 1000 : get().targetDurationMs;
    const now = Date.now();
    const expectedEnd = now + targetMs;
    const context = ctx || { title: get().mode === 'pomodoro' ? 'Pomodoro' : 'Custom Session', subject: 'General Focus' };
    
    set({ 
      status: 'running', 
      targetDurationMs: targetMs, 
      remainingMs: targetMs, 
      expectedEndTime: expectedEnd,
      lastStartTime: now,
      accumulatedMs: 0,
      pauseAccumulatedMs: 0,
      pauseStartTime: null,
      context
    });
    
    persistState({
      status: 'running', 
      mode: get().mode, 
      phase: get().phase,
      targetDurationMs: targetMs, 
      expectedEndTime: expectedEnd, 
      lastStartTime: now, 
      accumulatedMs: 0,
      pauseAccumulatedMs: 0,
      pauseStartTime: null,
      context
    });
  },

  pause: () => {
    const state = get();
    if (state.status !== 'running') return;
    
    const now = Date.now();
    const newAccumulated = state.accumulatedMs + (now - (state.lastStartTime || now));
    
    // Start tracking pause time
    set({ 
      status: 'paused', 
      accumulatedMs: newAccumulated, 
      expectedEndTime: null, 
      pauseStartTime: now 
    });
    persistState({ 
      status: 'paused', 
      accumulatedMs: newAccumulated, 
      expectedEndTime: null,
      pauseStartTime: now
    });
  },

  resume: () => {
    const state = get();
    if (state.status !== 'paused') return;
    
    const now = Date.now();
    let newPauseAccumulated = state.pauseAccumulatedMs;
    
    if (state.pauseStartTime) {
      newPauseAccumulated += (now - state.pauseStartTime);
    }
    
    const remaining = state.targetDurationMs - state.accumulatedMs;
    const expectedEnd = now + remaining;
    
    set({ 
      status: 'running', 
      expectedEndTime: expectedEnd, 
      lastStartTime: now, 
      pauseAccumulatedMs: newPauseAccumulated, 
      pauseStartTime: null 
    });
    persistState({ 
      status: 'running', 
      expectedEndTime: expectedEnd, 
      lastStartTime: now,
      pauseAccumulatedMs: newPauseAccumulated,
      pauseStartTime: null
    });
  },

  stop: async (completed = false) => {
    const state = get();
    // Do not record breaks as study time
    if (state.status !== 'idle' && state.phase === 'focus') {
      const now = Date.now();
      let timeSpent = state.accumulatedMs;
      let finalPauseMs = state.pauseAccumulatedMs;
      
      if (state.status === 'running' && state.lastStartTime) {
        timeSpent += (now - state.lastStartTime);
      }
      if (state.status === 'paused' && state.pauseStartTime) {
        finalPauseMs += (now - state.pauseStartTime);
      }
      
      // 🚀 Grab the current logged-in user
      const user = useAuthStore.getState().user;
      
      if (timeSpent > 60000 && user) { // Only record if > 1 minute and user is logged in
        await recordSession({
          id: Date.now().toString(),
          userId: user.id, // 🚀 Now required for Data Isolation!
          title: state.context?.title || 'Study Session',
          subject: state.context?.subject || 'General Focus',
          durationMinutes: Math.round(state.targetDurationMs / 60000),
          actualDurationMs: Math.min(timeSpent, state.targetDurationMs),
          pauseDurationMs: finalPauseMs || 0,
          date: new Date().toLocaleDateString('en-CA'),
          timestamp: Date.now(),
          mode: state.mode,
          completed: completed || (timeSpent >= state.targetDurationMs),
          plannerId: state.context?.plannerId
        });
        
        // Auto-complete planner task if linked
        if (completed && state.context?.plannerId) {
          const plannerItems = useDataStore.getState().planner;
          const target = plannerItems.find(p => p.id === state.context!.plannerId);
          if (target) {
            // 🚀 Call the Zustand store directly. It expects (id, completed)
            await useDataStore.getState().togglePlanner(target.id, true);
          }
        }
      }
      
      // 🚀 Pass the userId to refreshAll so it knows whose data to reload
      if (user) {
        await useDataStore.getState().refreshAll(user.id);
      }
    }

    // Reset timer state
    const resetState = {
      status: 'idle' as TimerStatus,
      accumulatedMs: 0,
      pauseAccumulatedMs: 0,
      pauseStartTime: null,
      context: null
    };

    // If pomodoro completes, switch to break automatically. Otherwise, reset.
    if (completed && state.mode === 'pomodoro' && state.phase === 'focus') {
      const breakMs = 5 * 60 * 1000;
      set({ 
        ...resetState,
        phase: 'break', 
        targetDurationMs: breakMs, 
        remainingMs: breakMs 
      });
      persistState({ 
        status: 'idle', 
        context: null,
        pauseAccumulatedMs: 0,
        pauseStartTime: null
      });
    } else {
      const resetMs = state.mode === 'pomodoro' ? 25 * 60 * 1000 : 15 * 60 * 1000;
      set({ 
        ...resetState,
        phase: 'focus', 
        targetDurationMs: resetMs, 
        remainingMs: resetMs 
      });
      persistState({ 
        status: 'idle', 
        context: null,
        pauseAccumulatedMs: 0,
        pauseStartTime: null
      });
    }
  },

  tick: () => {
    const state = get();
    if (state.status !== 'running' || !state.expectedEndTime) return;

    const now = Date.now();
    const remaining = state.expectedEndTime - now;

    if (remaining <= 0) {
      set({ remainingMs: 0 });
      useSettingsStore.getState().sendNotification('Timer Finished! 🥕', 'Great job. Time for your next phase.');
      state.stop(true);
    } else {
      set({ remainingMs: remaining });
    }
  },

  recoverState: async () => {
    const saved = await getSettings('activeTimerState');
    if (!saved) return;
    
    if (saved.status === 'running' && saved.expectedEndTime) {
      const now = Date.now();
      if (now >= saved.expectedEndTime) {
        // Finished while away
        set({ ...saved });
        get().stop(true);
      } else {
        // Still running
        set({ ...saved, remainingMs: saved.expectedEndTime - now });
      }
    } else if (saved.status === 'paused') {
      set({ 
        ...saved, 
        remainingMs: saved.targetDurationMs - saved.accumulatedMs 
      });
    }
  }
}));

// Initialize tick interval (UI update loop only, math is independent)
setInterval(() => {
  useTimerStore.getState().tick();
}, 500);