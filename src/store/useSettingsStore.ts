import { create } from 'zustand';
import { getSettings, saveSettings, getAllData, initDB } from '../lib/db';
import { useDataStore } from './useDataStore';
import { useToastStore } from './useToastStore';

export interface AppSettings {
  soundEnabled: boolean;
  ambientEnabled: boolean;
  reducedMotion: boolean;
  voiceEnabled: boolean;
  pomodoroFocusMins: number;
  pomodoroShortBreakMins: number;
  pomodoroLongBreakMins: number;
  notificationsEnabled: boolean;
  spotifyEmbedUrl: string;
}

const defaultSettings: AppSettings = {
  soundEnabled: true, 
  ambientEnabled: true, 
  reducedMotion: false, 
  voiceEnabled: false,
  pomodoroFocusMins: 25, 
  pomodoroShortBreakMins: 5, 
  pomodoroLongBreakMins: 15, 
  notificationsEnabled: false,
  spotifyEmbedUrl: ''
};

interface SettingsState {
  settings: AppSettings;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
  sendNotification: (title: string, body: string) => void;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: defaultSettings,

  loadSettings: async () => {
    const saved = await getSettings('app-settings');
    if (saved) set({ settings: { ...defaultSettings, ...saved } });
  },

  updateSetting: async (key, value) => {
    const newSettings = { ...get().settings, [key]: value };
    set({ settings: newSettings });
    await saveSettings('app-settings', newSettings);
  },

  requestNotificationPermission: async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    get().updateSetting('notificationsEnabled', perm === 'granted');
  },

  sendNotification: (title, body) => {
    if (get().settings.notificationsEnabled && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🐰</text></svg>' });
    }
  },

  exportData: async () => {
    const data = await getAllData();
    const exportObj = { version: 1, timestamp: Date.now(), data, settings: get().settings };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-bunny-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    useToastStore.getState().addToast('Data exported successfully', 'success');
  },

  importData: async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.version || !parsed.data) throw new Error("Invalid file format");
      
      const db = await initDB();
      const tx = db.transaction(['sessions', 'goals', 'planner', 'settings'], 'readwrite');
      
      // Clear existing
      await Promise.all([ tx.objectStore('sessions').clear(), tx.objectStore('goals').clear(), tx.objectStore('planner').clear() ]);
      
      // Populate
      for (const s of parsed.data.sessions) tx.objectStore('sessions').put(s);
      for (const g of parsed.data.goals) tx.objectStore('goals').put(g);
      for (const p of parsed.data.planner) tx.objectStore('planner').put(p);
      if (parsed.settings) tx.objectStore('settings').put(parsed.settings, 'app-settings');
      
      // Native IndexedDB transaction completion
      await new Promise(resolve => tx.oncomplete = resolve);
      
      await useDataStore.getState().refreshAll();
      await get().loadSettings();
      useToastStore.getState().addToast('Data imported successfully!', 'success');
    } catch (e) {
      console.error(e);
      useToastStore.getState().addToast('Failed to import data. Invalid file.', 'error');
    }
  }
}));