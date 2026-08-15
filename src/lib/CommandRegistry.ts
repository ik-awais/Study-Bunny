import { useTimerStore } from '../store/useTimerStore';
import { useToastStore } from '../store/useToastStore';
import { globalNavigate } from './navigationService';
import type { CustomVoiceCommand } from './db';

export interface BuiltInCommand {
  id: string;
  name: string;
  patterns: RegExp[];
  examplePhrases: string[];
  actionType: 'NAVIGATE' | 'TIMER';
  actionTarget: string;
  description: string;
}

export const BUILT_IN_COMMANDS: BuiltInCommand[] = [
  {
    id: 'builtin_start_timer',
    name: 'Start Timer',
    patterns: [/(start|begin|let's).*(timer|study|session)/i],
    examplePhrases: ['Start timer', "Let's study", 'Begin session'],
    actionType: 'TIMER',
    actionTarget: 'START',
    description: 'Starts the focus timer or resumes current session'
  },
  {
    id: 'builtin_pause_timer',
    name: 'Pause Timer',
    patterns: [/(pause|hold).*(timer|session)|take a break|need a break/i],
    examplePhrases: ['Pause timer', 'Take a break', 'Hold session'],
    actionType: 'TIMER',
    actionTarget: 'PAUSE',
    description: 'Pauses active timer and records rest duration'
  },
  {
    id: 'builtin_resume_timer',
    name: 'Resume Timer',
    patterns: [/(resume|continue).*(timer|study)|ready again/i],
    examplePhrases: ['Resume timer', 'Continue studying', "I'm ready again"],
    actionType: 'TIMER',
    actionTarget: 'RESUME',
    description: 'Resumes timer after a pause'
  },
  {
    id: 'builtin_stop_timer',
    name: 'Stop Timer',
    patterns: [/(stop|end|finish).*(timer|study|session)/i],
    examplePhrases: ['Stop timer', 'End session', 'Finish studying'],
    actionType: 'TIMER',
    actionTarget: 'STOP',
    description: 'Completes and records the study session'
  },
  {
    id: 'builtin_reset_timer',
    name: 'Reset Timer',
    patterns: [/(reset|start over).*(timer)?/i],
    examplePhrases: ['Reset timer', 'Start over'],
    actionType: 'TIMER',
    actionTarget: 'RESET',
    description: 'Resets the timer to default duration'
  },
  {
    id: 'builtin_nav_dashboard',
    name: 'Open Dashboard',
    patterns: [/(open|go to|show|view).*(dashboard|home)/i],
    examplePhrases: ['Open dashboard', 'Go home', 'Show dashboard'],
    actionType: 'NAVIGATE',
    actionTarget: '/',
    description: 'Navigates to the Dashboard view'
  },
  {
    id: 'builtin_nav_timer',
    name: 'Open Timer',
    patterns: [/(open|go to|show|view).*(timer screen|timer page)/i],
    examplePhrases: ['Open timer', 'Go to timer'],
    actionType: 'NAVIGATE',
    actionTarget: '/timer',
    description: 'Navigates to the Timer view'
  },
  {
    id: 'builtin_nav_planner',
    name: 'Open Planner',
    patterns: [/(open|go to|show|view).*(planner|schedule|calendar)/i],
    examplePhrases: ['Open planner', 'Show schedule', 'View calendar'],
    actionType: 'NAVIGATE',
    actionTarget: '/planner',
    description: 'Navigates to the Planner calendar'
  },
  {
    id: 'builtin_nav_goals',
    name: 'Open Goals',
    patterns: [/(open|go to|show|view).*(goals|targets)/i],
    examplePhrases: ['Open goals', 'Show targets'],
    actionType: 'NAVIGATE',
    actionTarget: '/goals',
    description: 'Navigates to the Goals tracker'
  },
  {
    id: 'builtin_nav_stats',
    name: 'Open Statistics',
    patterns: [/(open|go to|show|view).*(statistics|stats|history|analytics)/i],
    examplePhrases: ['Open statistics', 'Show stats', 'View analytics'],
    actionType: 'NAVIGATE',
    actionTarget: '/stats',
    description: 'Navigates to the Statistics and study history'
  },
  {
    id: 'builtin_nav_settings',
    name: 'Open Settings',
    patterns: [/(open|go to|show|view).*(settings|preferences|account)/i],
    examplePhrases: ['Open settings', 'Go to preferences'],
    actionType: 'NAVIGATE',
    actionTarget: '/settings',
    description: 'Navigates to Settings'
  }
];

export const normalizePhrase = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
    .replace(/\s+/g, ' ');
};

export const checkCommandConflict = (
  phrase: string,
  aliases: string[],
  existingCommands: CustomVoiceCommand[],
  currentEditingId?: string
): { hasConflict: boolean; reason?: string } => {
  const normPhrase = normalizePhrase(phrase);
  const normAliases = aliases.map(normalizePhrase).filter(Boolean);
  const testPhrases = [normPhrase, ...normAliases];

  // 1. Check conflicts against built-in commands
  for (const p of testPhrases) {
    for (const b of BUILT_IN_COMMANDS) {
      if (b.examplePhrases.some(ex => normalizePhrase(ex) === p)) {
        return {
          hasConflict: true,
          reason: `"${p}" conflicts with the built-in command "${b.name}".`
        };
      }
      if (b.patterns.some(pattern => pattern.test(p))) {
        return {
          hasConflict: true,
          reason: `"${p}" matches the built-in action pattern for "${b.name}".`
        };
      }
    }
  }

  // 2. Check conflicts against other custom commands
  for (const cmd of existingCommands) {
    if (currentEditingId && cmd.id === currentEditingId) continue;
    const otherPhrases = [normalizePhrase(cmd.phrase), ...cmd.aliases.map(normalizePhrase)];
    for (const p of testPhrases) {
      if (otherPhrases.includes(p)) {
        return {
          hasConflict: true,
          reason: `"${p}" is already used in custom command "${cmd.phrase}".`
        };
      }
    }
  }

  return { hasConflict: false };
};

export const executeAction = (
  actionType: 'NAVIGATE' | 'TIMER',
  actionTarget: string
): { success: boolean; message: string } => {
  const toast = useToastStore.getState().addToast;

  if (actionType === 'NAVIGATE') {
    globalNavigate(actionTarget);
    const label = actionTarget === '/' ? 'Dashboard' : actionTarget.replace('/', '').toUpperCase();
    const msg = `Navigated to ${label}`;
    toast(msg, 'success');
    return { success: true, message: msg };
  }

  if (actionType === 'TIMER') {
    const { start, pause, resume, stop } = useTimerStore.getState();
    switch (actionTarget) {
      case 'START':
        start();
        toast('Timer started', 'success');
        return { success: true, message: 'Started Timer' };
      case 'PAUSE':
        pause();
        toast('Timer paused', 'info');
        return { success: true, message: 'Paused Timer' };
      case 'RESUME':
        resume();
        toast('Timer resumed', 'info');
        return { success: true, message: 'Resumed Timer' };
      case 'STOP':
        stop(true);
        toast('Session completed', 'success');
        return { success: true, message: 'Stopped Session' };
      case 'RESET':
        stop(false);
        toast('Timer reset', 'info');
        return { success: true, message: 'Reset Timer' };
      default:
        toast('Unknown timer command', 'error');
        return { success: false, message: 'Unknown timer action' };
    }
  }

  return { success: false, message: 'Unsupported action' };
};

export const matchAndExecute = (
  rawTranscript: string,
  customCommands: CustomVoiceCommand[]
): { matched: boolean; intent: string; action: string } => {
  const text = normalizePhrase(rawTranscript);
  if (!text) return { matched: false, intent: 'NONE', action: 'Empty transcript' };

  // 1. Match Built-in Commands First
  for (const b of BUILT_IN_COMMANDS) {
    if (b.patterns.some(pattern => pattern.test(text))) {
      const result = executeAction(b.actionType, b.actionTarget);
      return { matched: true, intent: b.id, action: result.message };
    }
  }

  // 2. Match Enabled Custom Commands (Phrase + Aliases)
  for (const cmd of customCommands) {
    if (!cmd.enabled) continue;
    const allPhrases = [normalizePhrase(cmd.phrase), ...cmd.aliases.map(normalizePhrase)].filter(Boolean);
    const isMatch = allPhrases.some(p => text === p || text.includes(p));

    if (isMatch) {
      const result = executeAction(cmd.actionType, cmd.actionTarget);
      return { matched: true, intent: `CUSTOM:${cmd.phrase}`, action: result.message };
    }
  }

  // 3. Unrecognized
  useToastStore.getState().addToast("Command not recognized.", 'info');
  return { matched: false, intent: 'UNRECOGNIZED', action: 'Command not recognized' };
};