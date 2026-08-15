import { useTimerStore } from '../store/useTimerStore';
import { globalNavigate } from './navigationService';
import type { CustomVoiceCommand } from './db';

// --- STRUCTURED MODELS ---

export interface ParsedParameters {
  durationMs?: number;
}

export interface ResolvedCommand {
  source: 'BUILT_IN' | 'CUSTOM';
  intentId: string;
  actionType: 'NAVIGATE' | 'TIMER';
  actionTarget: string;
  parameters: ParsedParameters;
  phrase: string;
}

export interface CommandResult {
  success: boolean;
  actionType: string;
  message: string;
  errorCode?: string;
}

export interface BuiltInCommand {
  id: string;
  name: string;
  patterns: RegExp[];
  examplePhrases: string[];
  actionType: 'NAVIGATE' | 'TIMER';
  actionTarget: string;
  description: string;
}

// --- BUILT-IN REGISTRY ---

export const BUILT_IN_COMMANDS: BuiltInCommand[] = [
  {
    id: 'builtin_start_timer',
    name: 'Start Timer',
    patterns: [/(start|begin|let's).*(timer|study|session|focus)/i],
    examplePhrases: ['Start timer', 'Start my timer', "Let's study", 'Begin session', 'Start a 45 minute timer'],
    actionType: 'TIMER',
    actionTarget: 'START',
    description: 'Starts the focus timer (supports durations)'
  },
  {
    id: 'builtin_pause_timer',
    name: 'Pause Timer',
    patterns: [/(pause|hold).*(timer|session)|take a break|need a break/i],
    examplePhrases: ['Pause timer', 'Pause my session', 'Take a break'],
    actionType: 'TIMER',
    actionTarget: 'PAUSE',
    description: 'Pauses active timer and records rest duration'
  },
  {
    id: 'builtin_resume_timer',
    name: 'Resume Timer',
    patterns: [/(resume|continue).*(timer|study|session)|ready again/i],
    examplePhrases: ['Resume timer', 'Continue studying', "Let's continue"],
    actionType: 'TIMER',
    actionTarget: 'RESUME',
    description: 'Resumes timer after a pause'
  },
  {
    id: 'builtin_stop_timer',
    name: 'Stop Timer',
    patterns: [/(stop|end|finish|done).*(timer|study|session)|(i'm|im) done/i],
    examplePhrases: ['Stop timer', 'End my session', "I'm done"],
    actionType: 'TIMER',
    actionTarget: 'STOP',
    description: 'Completes and records the study session'
  },
  {
    id: 'builtin_reset_timer',
    name: 'Reset Timer',
    patterns: [/(reset|start over).*(timer|session)?/i],
    examplePhrases: ['Reset timer', 'Start over'],
    actionType: 'TIMER',
    actionTarget: 'RESET',
    description: 'Resets the timer to default duration'
  },
  {
    id: 'builtin_nav_dashboard',
    name: 'Open Dashboard',
    patterns: [/(open|go to|show|view|take me to).*(dashboard|home)/i],
    examplePhrases: ['Open dashboard', 'Take me home'],
    actionType: 'NAVIGATE',
    actionTarget: '/',
    description: 'Navigates to the Dashboard view'
  },
  {
    id: 'builtin_nav_timer',
    name: 'Open Timer',
    patterns: [/(open|go to|show|view|take me to).*(timer)/i],
    examplePhrases: ['Open timer', 'Go to timer'],
    actionType: 'NAVIGATE',
    actionTarget: '/timer',
    description: 'Navigates to the Timer view'
  },
  {
    id: 'builtin_nav_planner',
    name: 'Open Planner',
    patterns: [/(open|go to|show|view|take me to).*(planner|schedule|calendar)/i],
    examplePhrases: ['Open planner', 'Show my schedule'],
    actionType: 'NAVIGATE',
    actionTarget: '/planner',
    description: 'Navigates to the Planner calendar'
  },
  {
    id: 'builtin_nav_goals',
    name: 'Open Goals',
    patterns: [/(open|go to|show|view|take me to).*(goals|targets)/i],
    examplePhrases: ['Open goals', 'Take me to goals'],
    actionType: 'NAVIGATE',
    actionTarget: '/goals',
    description: 'Navigates to the Goals tracker'
  },
  {
    id: 'builtin_nav_stats',
    name: 'Open Statistics',
    patterns: [/(open|go to|show|view|take me to).*(statistics|stats|history|analytics)/i],
    examplePhrases: ['Open statistics', 'Show stats'],
    actionType: 'NAVIGATE',
    actionTarget: '/stats',
    description: 'Navigates to the Statistics and study history'
  },
  {
    id: 'builtin_nav_settings',
    name: 'Open Settings',
    patterns: [/(open|go to|show|view|take me to).*(settings|preferences|account)/i],
    examplePhrases: ['Open settings', 'Go to preferences'],
    actionType: 'NAVIGATE',
    actionTarget: '/settings',
    description: 'Navigates to Settings'
  }
];

// --- TEXT NORMALIZATION & PARSING ---

export const normalizePhrase = (text: string): string => {
  return text.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '').replace(/\s+/g, ' ');
};

export const parseDurationMs = (text: string): number | undefined => {
  let normalized = text.toLowerCase().replace(/and a half/g, '30 minutes');
  
  const numberWords: Record<string, string> = {
    ' a ': ' 1 ', ' an ': ' 1 ', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
    'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10', 'fifteen': '15',
    'twenty': '20', 'thirty': '30', 'forty': '40', 'forty-five': '45', 'fifty': '50',
    'sixty': '60', 'ninety': '90'
  };

  Object.entries(numberWords).forEach(([word, val]) => {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), val);
  });

  let totalMinutes = 0;
  let matched = false;

  const hourMatch = normalized.match(/([\d.]+)\s*(hour|hr)s?/);
  if (hourMatch) {
    totalMinutes += parseFloat(hourMatch[1]) * 60;
    matched = true;
  }

  const minMatch = normalized.match(/([\d.]+)\s*(minute|min)s?/);
  if (minMatch) {
    totalMinutes += parseFloat(minMatch[1]);
    matched = true;
  }

  return matched && totalMinutes > 0 ? totalMinutes * 60 * 1000 : undefined;
};

// --- PIPELINE CORE ---

export const resolveCommand = (
  rawTranscript: string,
  customCommands: CustomVoiceCommand[]
): ResolvedCommand | null => {
  const text = normalizePhrase(rawTranscript);
  if (!text) return null;

  const parameters: ParsedParameters = {
    durationMs: parseDurationMs(text)
  };

  // 1. Built-in Precedence
  for (const b of BUILT_IN_COMMANDS) {
    if (b.patterns.some(pattern => pattern.test(text))) {
      return { source: 'BUILT_IN', intentId: b.id, actionType: b.actionType, actionTarget: b.actionTarget, parameters, phrase: rawTranscript };
    }
  }

  // 2. Custom Command Matcher
  for (const cmd of customCommands) {
    if (!cmd.enabled) continue;
    const allPhrases = [normalizePhrase(cmd.phrase), ...cmd.aliases.map(normalizePhrase)].filter(Boolean);
    if (allPhrases.some(p => text === p || text.includes(p))) {
      return { source: 'CUSTOM', intentId: cmd.id, actionType: cmd.actionType, actionTarget: cmd.actionTarget, parameters, phrase: rawTranscript };
    }
  }

  return null;
};

export const executeResolvedCommand = (cmd: ResolvedCommand): CommandResult => {
  try {
    if (cmd.actionType === 'NAVIGATE') {
      globalNavigate(cmd.actionTarget);
      const label = cmd.actionTarget === '/' ? 'Dashboard' : cmd.actionTarget.replace('/', '').toUpperCase();
      return { success: true, actionType: cmd.actionType, message: `Navigated to ${label}` };
    }

    if (cmd.actionType === 'TIMER') {
      const { start, pause, resume, stop } = useTimerStore.getState();
      
      switch (cmd.actionTarget) {
        case 'START':
          if (cmd.parameters.durationMs) {
            const mins = Math.round(cmd.parameters.durationMs / 60000);
            start(mins);
            return { success: true, actionType: cmd.actionType, message: `Started ${mins}m timer` };
          }
          start();
          return { success: true, actionType: cmd.actionType, message: 'Started Timer' };
        case 'PAUSE':
          pause();
          return { success: true, actionType: cmd.actionType, message: 'Paused Timer' };
        case 'RESUME':
          resume();
          return { success: true, actionType: cmd.actionType, message: 'Resumed Timer' };
        case 'STOP':
          stop(true);
          return { success: true, actionType: cmd.actionType, message: 'Session stopped' };
        case 'RESET':
          stop(false);
          return { success: true, actionType: cmd.actionType, message: 'Timer reset' };
        default:
          return { success: false, actionType: cmd.actionType, message: 'Invalid timer target', errorCode: 'INVALID_TARGET' };
      }
    }
    return { success: false, actionType: 'UNKNOWN', message: 'Action not supported', errorCode: 'UNSUPPORTED_ACTION' };
  } catch (err) {
    console.error("Command Execution Error:", err);
    return { success: false, actionType: cmd.actionType, message: 'Execution failed', errorCode: 'EXECUTION_CRASH' };
  }
};

// --- BATCH 2 CONFLICT CHECKER ---
export const checkCommandConflict = (
  phrase: string, aliases: string[], existingCommands: CustomVoiceCommand[], currentEditingId?: string
): { hasConflict: boolean; reason?: string } => {
  const testPhrases = [normalizePhrase(phrase), ...aliases.map(normalizePhrase)].filter(Boolean);

  for (const p of testPhrases) {
    for (const b of BUILT_IN_COMMANDS) {
      if (b.examplePhrases.some(ex => normalizePhrase(ex) === p)) return { hasConflict: true, reason: `Conflicts with built-in command "${b.name}".` };
      if (b.patterns.some(pattern => pattern.test(p))) return { hasConflict: true, reason: `Matches pattern for built-in "${b.name}".` };
    }
  }

  for (const cmd of existingCommands) {
    if (currentEditingId && cmd.id === currentEditingId) continue;
    const otherPhrases = [normalizePhrase(cmd.phrase), ...cmd.aliases.map(normalizePhrase)];
    for (const p of testPhrases) {
      if (otherPhrases.includes(p)) return { hasConflict: true, reason: `Already used in custom command "${cmd.phrase}".` };
    }
  }
  return { hasConflict: false };
};

// --- DEVELOPER TEST HARNESS ---
export const simulateVoiceCommand = (text: string, customCommands: CustomVoiceCommand[]) => {
  console.log(`🎤 Simulating: "${text}"`);
  const resolved = resolveCommand(text, customCommands);
  if (!resolved) {
    console.log("❌ Result: Unrecognized Command");
    return;
  }
  console.log("✅ Resolved:", resolved);
  const result = executeResolvedCommand(resolved);
  console.log("⚡ Execution Result:", result);
};

import { useDataStore } from '../store/useDataStore';

export interface AIAction {
  type: string;
  parameters: any;
}

export const executeAIActions = async (actions: AIAction[]): Promise<boolean> => {
  const dataStore = useDataStore.getState();
  const timerStore = useTimerStore.getState();
  let successCount = 0;

  for (const action of actions) {
    try {
      if (action.type === 'CREATE_PLANNER_SESSION') {
        await dataStore.addPlannerItem({
          title: action.parameters.title || 'Study Session',
          subject: action.parameters.subject || 'General',
          date: action.parameters.date,
          startTime: action.parameters.startTime,
          endTime: addDurationToTime(action.parameters.startTime, action.parameters.plannedDurationMs || 3600000),
          plannedDurationMs: action.parameters.plannedDurationMs || 3600000,
          priority: 'medium'
        });
        successCount++;
      } 
      else if (action.type === 'DELETE_PLANNER_SESSION' && action.parameters.id) {
        await dataStore.deletePlannerItem(action.parameters.id);
        successCount++;
      }
      else if (action.type === 'CREATE_GOAL') {
        await dataStore.createGoal({
          title: action.parameters.title,
          type: action.parameters.type || 'daily',
          targetMs: action.parameters.targetMs || 3600000,
          status: 'active',
          priority: 'medium'
        });
        successCount++;
      }
      else if (action.type === 'START_TIMER') {
        const mins = action.parameters.durationMs ? Math.round(action.parameters.durationMs / 60000) : undefined;
        timerStore.setMode('countdown');
        timerStore.start(mins);
        successCount++;
      }
    } catch (e) {
      console.error(`Failed to execute AI action: ${action.type}`, e);
    }
  }
  
  return successCount === actions.length;
};

// Quick helper missing from previous imports for the above block
import { addDurationToTime } from './timeUtils';