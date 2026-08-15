import { create } from 'zustand';
import { initDB } from '../lib/db';
import type { Session, Goal, PlannerItem, CustomVoiceCommand, AIConversation, AIMessage } from '../lib/db';
import { useAuthStore } from './useAuthStore';
import { backupToDrive, restoreFromDrive } from '../lib/driveSync';
import { useToastStore } from './useToastStore';

interface Stats {
  todayMs: number;
  weeklyMs: number;
  totalMs: number;
  completedCount: number;
  avgSessionMs: number;
  streak: number;
}

interface DataState {
  stats: Stats;
  goals: Goal[];
  planner: PlannerItem[];
  history: Session[];
  customCommands: CustomVoiceCommand[];
  aiConversations: AIConversation[];
  currentChatMessages: AIMessage[];

  refreshAll: (userId: string) => Promise<void>;
  clearData: () => void;
  createGoal: (goal: Omit<Goal, 'id' | 'userId'>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addPlannerItem: (item: Omit<PlannerItem, 'id' | 'completed' | 'userId'> & { completed?: boolean }) => Promise<void>;
  togglePlanner: (id: string, completed: boolean) => Promise<void>;
  updatePlannerItem: (id: string, updates: Partial<PlannerItem>) => Promise<void>;
  deletePlannerItem: (id: string) => Promise<void>;

  // Custom Voice Commands Actions
  createCustomCommand: (cmd: Omit<CustomVoiceCommand, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCustomCommand: (id: string, updates: Partial<CustomVoiceCommand>) => Promise<void>;
  deleteCustomCommand: (id: string) => Promise<void>;
  toggleCustomCommand: (id: string, enabled: boolean) => Promise<void>;

  // AI Chat Actions
  loadAiMessages: (conversationId: string) => Promise<void>;
  saveAiMessage: (conversationId: string, role: 'user' | 'assistant', content: string, title?: string, proposal?: any) => Promise<void>;
  updateAiMessage: (messageId: string, updates: Partial<AIMessage>) => Promise<void>;
  deleteAiConversation: (conversationId: string) => Promise<void>;
  renameAiConversation: (conversationId: string, newTitle: string) => Promise<void>;

  syncToDrive: () => Promise<void>;
  restoreFromDriveBackup: () => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  stats: { todayMs: 0, weeklyMs: 0, totalMs: 0, completedCount: 0, avgSessionMs: 0, streak: 0 },
  goals: [],
  planner: [],
  history: [],
  customCommands: [],
  aiConversations: [],
  currentChatMessages: [],

  clearData: () => set({
    goals: [],
    planner: [],
    history: [],
    customCommands: [],
    aiConversations: [],
    currentChatMessages: [],
    stats: { todayMs: 0, weeklyMs: 0, totalMs: 0, completedCount: 0, avgSessionMs: 0, streak: 0 }
  }),

  refreshAll: async (userId: string) => {
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction(['sessions', 'goals', 'planner', 'customCommands', 'aiConversations'], 'readonly');

    const fetchById = <T>(storeName: string) => new Promise<T[]>((resolve) => {
      const index = tx.objectStore(storeName).index('userId');
      const req = index.getAll(userId);
      req.onsuccess = (e) => resolve((e.target as IDBRequest).result as T[]);
    });

    const [goals, planner, sessions, customCommands, aiConversations] = await Promise.all([
      fetchById<Goal>('goals'),
      fetchById<PlannerItem>('planner'),
      fetchById<Session>('sessions'),
      fetchById<CustomVoiceCommand>('customCommands'),
      fetchById<AIConversation>('aiConversations')
    ]);

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const sevenDaysAgo = Date.now() - (7 * 24 * 3600 * 1000);

    let todayMs = 0;
    let weeklyMs = 0;
    let totalMs = 0;
    let completedCount = 0;
    const dailyTotals: Record<string, number> = {};

    sessions.forEach(s => {
      const duration = s.actualDurationMs || 0;
      totalMs += duration;
      if (s.date === todayStr) todayMs += duration;
      if (s.timestamp >= sevenDaysAgo) weeklyMs += duration;
      if (s.completed) completedCount++;
      dailyTotals[s.date] = (dailyTotals[s.date] || 0) + duration;
    });

    const avgSessionMs = completedCount > 0 ? Math.floor(totalMs / completedCount) : 0;

    let currentStreak = 0;
    let checkDate = new Date();
    while (true) {
      const dStr = checkDate.toLocaleDateString('en-CA');
      if (dailyTotals[dStr] && dailyTotals[dStr] >= 1200000) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (currentStreak === 0 && dStr === todayStr) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const sortedHistory = sessions.sort((a, b) => b.timestamp - a.timestamp);

    set({
      goals,
      planner,
      history: sortedHistory,
      customCommands: customCommands.sort((a, b) => b.createdAt - a.createdAt),
      aiConversations: aiConversations.sort((a, b) => b.updatedAt - a.updatedAt),
      stats: { todayMs, weeklyMs, totalMs, completedCount, avgSessionMs, streak: currentStreak }
    });
  },

  createGoal: async (goal) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('goals', 'readwrite');
    tx.objectStore('goals').put({ ...goal, id: Date.now().toString(), userId });
    await new Promise(res => { tx.oncomplete = res; });
    get().refreshAll(userId);
  },

  deleteGoal: async (id) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('goals', 'readwrite');
    tx.objectStore('goals').delete(id);
    await new Promise(res => { tx.oncomplete = res; });
    get().refreshAll(userId);
  },

  addPlannerItem: async (item) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('planner', 'readwrite');
    tx.objectStore('planner').put({ ...item, id: Date.now().toString(), userId, completed: item.completed || false });
    await new Promise(res => { tx.oncomplete = res; });
    get().refreshAll(userId);
  },

  togglePlanner: async (id, completed) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('planner', 'readwrite');
    const store = tx.objectStore('planner');
    const req = store.get(id);

    req.onsuccess = (event) => {
      const target = event.target as IDBRequest;
      const data = target.result as PlannerItem | undefined;
      if (data) {
        data.completed = completed;
        store.put(data);
      }
    };

    await new Promise(res => { tx.oncomplete = res; });
    get().refreshAll(userId);
  },

  updatePlannerItem: async (id, updates) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('planner', 'readwrite');
    const store = tx.objectStore('planner');
    const req = store.get(id);

    req.onsuccess = (event) => {
      const target = event.target as IDBRequest;
      const data = target.result as PlannerItem | undefined;
      if (data) {
        Object.assign(data, updates);
        store.put(data);
      }
    };

    await new Promise(res => { tx.oncomplete = res; });
    useToastStore.getState().addToast('Event updated successfully.', 'success');
    get().refreshAll(userId);
  },

  deletePlannerItem: async (id) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('planner', 'readwrite');
    tx.objectStore('planner').delete(id);
    
    await new Promise(res => { tx.oncomplete = res; });
    useToastStore.getState().addToast('Event deleted.', 'info');
    get().refreshAll(userId);
  },

  createCustomCommand: async (cmd) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('customCommands', 'readwrite');
    const newCommand: CustomVoiceCommand = {
      ...cmd,
      id: Date.now().toString(),
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    tx.objectStore('customCommands').put(newCommand);
    await new Promise(res => { tx.oncomplete = res; });
    await get().refreshAll(userId);
    useToastStore.getState().addToast(`Created command "${newCommand.phrase}"`, 'success');
  },

  updateCustomCommand: async (id, updates) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('customCommands', 'readwrite');
    const store = tx.objectStore('customCommands');
    const req = store.get(id);

    req.onsuccess = (event) => {
      const target = event.target as IDBRequest;
      const data = target.result as CustomVoiceCommand | undefined;
      if (data) {
        Object.assign(data, { ...updates, updatedAt: Date.now() });
        store.put(data);
      }
    };

    await new Promise(res => { tx.oncomplete = res; });
    await get().refreshAll(userId);
    useToastStore.getState().addToast('Command updated', 'success');
  },

  deleteCustomCommand: async (id) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('customCommands', 'readwrite');
    tx.objectStore('customCommands').delete(id);
    await new Promise(res => { tx.oncomplete = res; });
    await get().refreshAll(userId);
    useToastStore.getState().addToast('Command deleted', 'info');
  },

  toggleCustomCommand: async (id, enabled) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('customCommands', 'readwrite');
    const store = tx.objectStore('customCommands');
    const req = store.get(id);

    req.onsuccess = (event) => {
      const target = event.target as IDBRequest;
      const data = target.result as CustomVoiceCommand | undefined;
      if (data) {
        data.enabled = enabled;
        data.updatedAt = Date.now();
        store.put(data);
      }
    };

    await new Promise(res => { tx.oncomplete = res; });
    await get().refreshAll(userId);
  },

  loadAiMessages: async (conversationId) => {
    const db = await initDB();
    const tx = db.transaction('aiMessages', 'readonly');
    const index = tx.objectStore('aiMessages').index('conversationId');
    const req = index.getAll(conversationId);
    req.onsuccess = (e) => {
      const msgs = (e.target as IDBRequest).result as AIMessage[];
      set({ currentChatMessages: msgs.sort((a, b) => a.timestamp - b.timestamp) });
    };
  },

  saveAiMessage: async (conversationId, role, content, title, proposal) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    const db = await initDB();
    const tx = db.transaction(['aiConversations', 'aiMessages'], 'readwrite');
    const now = Date.now();

    // Ensure conversation exists
    const convStore = tx.objectStore('aiConversations');
    const getReq = convStore.get(conversationId);
    getReq.onsuccess = (e) => {
      let conv = (e.target as IDBRequest).result as AIConversation;
      if (!conv) {
        conv = { id: conversationId, userId, title: title || 'New Chat', createdAt: now, updatedAt: now };
      } else {
        conv.updatedAt = now;
        if (title && conv.title === 'New Chat') conv.title = title;
      }
      convStore.put(conv);
    };

    // Save message with proposal support
    const msg: AIMessage = { 
      id: Date.now().toString() + Math.random().toString(36).substring(7), 
      conversationId, 
      role, 
      content, 
      timestamp: now,
      proposal: proposal || null,
      proposalState: proposal ? 'PENDING' : undefined
    };
    tx.objectStore('aiMessages').put(msg);

    await new Promise(res => { tx.oncomplete = res; });
    get().refreshAll(userId);
    await get().loadAiMessages(conversationId);
  },

  updateAiMessage: async (messageId, updates) => {
    const db = await initDB();
    const tx = db.transaction('aiMessages', 'readwrite');
    const store = tx.objectStore('aiMessages');
    const req = store.get(messageId);

    req.onsuccess = (event) => {
      const msg = (event.target as IDBRequest).result as AIMessage | undefined;
      if (msg) {
        Object.assign(msg, updates);
        store.put(msg);
      }
    };
    
    await new Promise(res => { tx.oncomplete = res; });
    // Refresh current chat view
    set(state => ({
      currentChatMessages: state.currentChatMessages.map(m => m.id === messageId ? { ...m, ...updates } : m)
    }));
  },

  renameAiConversation: async (conversationId, newTitle) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('aiConversations', 'readwrite');
    const store = tx.objectStore('aiConversations');
    const req = store.get(conversationId);

    req.onsuccess = (e) => {
      const conv = (e.target as IDBRequest).result as AIConversation | undefined;
      if (conv) {
        conv.title = newTitle;
        conv.updatedAt = Date.now();
        store.put(conv);
      }
    };
    
    await new Promise(res => { tx.oncomplete = res; });
    get().refreshAll(userId);
  },

  deleteAiConversation: async (conversationId) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    
    const db = await initDB();
    const tx = db.transaction(['aiConversations', 'aiMessages'], 'readwrite');
    tx.objectStore('aiConversations').delete(conversationId);
    
    const index = tx.objectStore('aiMessages').index('conversationId');
    const req = index.getAllKeys(conversationId);
    req.onsuccess = (e) => {
      const keys = (e.target as IDBRequest).result;
      keys.forEach((k: any) => tx.objectStore('aiMessages').delete(k));
    };

    await new Promise(res => { tx.oncomplete = res; });
    set({ currentChatMessages: [] });
    get().refreshAll(userId);
    useToastStore.getState().addToast('Conversation deleted', 'info');
  },

  syncToDrive: async () => {
    const user = useAuthStore.getState().user;
    if (!user || !user.hasDriveAccess) return;
    try {
      const payload = {
        goals: get().goals,
        planner: get().planner,
        history: get().history,
        customCommands: get().customCommands,
        aiConversations: get().aiConversations,
        version: '2.0',
        exportedAt: Date.now(),
        userId: user.id
      };
      await backupToDrive(user.accessToken, payload);
      useToastStore.getState().addToast('Backup saved to Google Drive.', 'success');
    } catch (e) {
      useToastStore.getState().addToast('Backup failed.', 'error');
    }
  },

  restoreFromDriveBackup: async () => {
    const user = useAuthStore.getState().user;
    if (!user || !user.hasDriveAccess) return;
    try {
      const data = await restoreFromDrive(user.accessToken);
      if (data.userId !== user.id) throw new Error('Backup identity mismatch.');

      const db = await initDB();
      const tx = db.transaction(['sessions', 'goals', 'planner', 'customCommands', 'aiConversations', 'aiMessages'], 'readwrite');

      ['sessions', 'goals', 'planner', 'customCommands', 'aiConversations', 'aiMessages'].forEach(store => {
        const index = tx.objectStore(store).index('userId');
        const req = index.getAllKeys(user.id);
        req.onsuccess = (e) => {
          const keys = (e.target as IDBRequest).result;
          keys.forEach((k: any) => tx.objectStore(store).delete(k));
          data[store === 'history' ? 'sessions' : store]?.forEach((item: any) => tx.objectStore(store).put(item));
        };
      });

      await new Promise(res => { tx.oncomplete = res; });
      get().refreshAll(user.id);
      useToastStore.getState().addToast('Data restored from Drive.', 'success');
    } catch (e) {
      useToastStore.getState().addToast('Restore failed.', 'error');
    }
  }
}));