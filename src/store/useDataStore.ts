import { create } from 'zustand';
import { initDB } from '../lib/db';
import type { Session, Goal, PlannerItem, CustomCommand } from '../lib/db';
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
  customCommands: CustomCommand[];

  refreshAll: (userId: string) => Promise<void>;
  createGoal: (goal: Omit<Goal, 'id' | 'userId'>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addPlannerItem: (item: Omit<PlannerItem, 'id' | 'userId' | 'completed'> & { completed?: boolean }) => Promise<void>;
  togglePlanner: (id: string, completed: boolean) => Promise<void>;
  clearData: () => void;
  syncToDrive: () => Promise<void>;
  restoreFromDriveBackup: () => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  stats: { todayMs: 0, weeklyMs: 0, totalMs: 0, completedCount: 0, avgSessionMs: 0, streak: 0 },
  goals: [],
  planner: [],
  history: [],
  customCommands: [],

  clearData: () => set({ 
    goals: [], 
    planner: [], 
    history: [],
    customCommands: [],
    stats: { todayMs: 0, weeklyMs: 0, totalMs: 0, completedCount: 0, avgSessionMs: 0, streak: 0 } 
  }),

  refreshAll: async (userId: string) => {
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction(['sessions', 'goals', 'planner', 'customCommands'], 'readonly');
    
    // Helper to fetch by userId index safely
    const fetchById = (storeName: string) => new Promise<any[]>((resolve) => {
      const store = tx.objectStore(storeName);
      const index = store.index('userId');
      const req = index.getAll(userId); // STRICT ISOLATION
      req.onsuccess = (e) => {
        const target = e.target as IDBRequest;
        resolve(target.result);
      };
      req.onerror = () => resolve([]);
    });

    const goals = await fetchById('goals') as Goal[];
    const planner = await fetchById('planner') as PlannerItem[];
    const sessions = await fetchById('sessions') as Session[];
    const customCommands = await fetchById('customCommands') as CustomCommand[];

    // Math Engine
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

      if (!dailyTotals[s.date]) dailyTotals[s.date] = 0;
      dailyTotals[s.date] += duration;
    });

    const avgSessionMs = completedCount > 0 ? Math.floor(totalMs / completedCount) : 0;
    
    // Streak Math (minimum 20 minutes = 1,200,000 ms to count as a study day)
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

    const history = sessions.sort((a, b) => b.timestamp - a.timestamp);

    set({ 
      goals, 
      planner, 
      history,
      customCommands,
      stats: { todayMs, weeklyMs, totalMs, completedCount, avgSessionMs, streak: currentStreak } 
    });
  },

  createGoal: async (goal) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('goals', 'readwrite');
    tx.objectStore('goals').put({ ...goal, id: Date.now().toString(), userId });
    await new Promise(res => tx.oncomplete = res);
    get().refreshAll(userId);
  },

  deleteGoal: async (id) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('goals', 'readwrite');
    tx.objectStore('goals').delete(id);
    await new Promise(res => tx.oncomplete = res);
    get().refreshAll(userId);
  },

  addPlannerItem: async (item) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('planner', 'readwrite');
    tx.objectStore('planner').put({ 
      ...item, 
      id: Date.now().toString(), 
      userId,
      completed: item.completed || false 
    });
    await new Promise(res => tx.oncomplete = res);
    get().refreshAll(userId);
  },

  togglePlanner: async (id, completed) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const db = await initDB();
    const tx = db.transaction('planner', 'readwrite');
    const store = tx.objectStore('planner');
    const req = store.get(id);
    
    // Strict typing for retrieval and update
    req.onsuccess = (event) => {
      const target = event.target as IDBRequest;
      const data = target.result as PlannerItem | undefined;
      if (data && data.userId === userId) { // Ensure ownership
        data.completed = completed;
        store.put(data);
      }
    };
    
    await new Promise(res => tx.oncomplete = res);
    get().refreshAll(userId);
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
        version: '1.0', 
        exportedAt: Date.now(), 
        userId: user.id 
      };
      await backupToDrive(user.accessToken, payload);
      useToastStore.getState().addToast('Backup saved to Google Drive.', 'success');
    } catch (e) {
      console.error(e);
      useToastStore.getState().addToast('Backup failed.', 'error');
    }
  },

  restoreFromDriveBackup: async () => {
    const user = useAuthStore.getState().user;
    if (!user || !user.hasDriveAccess) return;
    try {
      const data = await restoreFromDrive(user.accessToken);
      if (data.userId !== user.id) throw new Error("Backup identity mismatch.");
      
      const db = await initDB();
      const tx = db.transaction(['sessions', 'goals', 'planner', 'customCommands'], 'readwrite');
      
      // Wipe current user's local data and overwrite with backup
      for (const storeName of ['sessions', 'goals', 'planner', 'customCommands']) {
        const store = tx.objectStore(storeName);
        const index = store.index('userId');
        const req = index.getAllKeys(user.id);
        
        await new Promise((resolve) => {
          req.onsuccess = (e) => {
            const target = e.target as IDBRequest;
            const keys = target.result as IDBValidKey[];
            keys.forEach(k => store.delete(k));
            
            // Add backup data
            const backupKey = storeName === 'sessions' ? 'history' : storeName;
            const items = data[backupKey] || [];
            items.forEach((item: any) => {
              item.userId = user.id;
              store.put(item);
            });
            resolve(null);
          };
        });
      }
      
      await new Promise(res => tx.oncomplete = res);
      get().refreshAll(user.id);
      useToastStore.getState().addToast('Data restored from Drive.', 'success');
    } catch (e) {
      console.error(e);
      useToastStore.getState().addToast('Restore failed.', 'error');
    }
  }
}));