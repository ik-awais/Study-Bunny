import { create } from 'zustand';
import { initDB } from '../lib/db';
import type { Session, Goal, PlannerItem } from '../lib/db';

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

  refreshAll: () => Promise<void>;
  createGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addPlannerItem: (item: Omit<PlannerItem, 'id' | 'completed'> & { completed?: boolean }) => Promise<void>;
  togglePlanner: (id: string, completed: boolean) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  stats: { todayMs: 0, weeklyMs: 0, totalMs: 0, completedCount: 0, avgSessionMs: 0, streak: 0 },
  goals: [],
  planner: [],
  history: [],

  refreshAll: async () => {
    const db = await initDB();
    const tx = db.transaction(['sessions', 'goals', 'planner'], 'readonly');
    
    // Fetch Goals with strict event typing
    const goals = await new Promise<Goal[]>((resolve) => {
      const req = tx.objectStore('goals').getAll();
      req.onsuccess = (event) => {
        const target = event.target as IDBRequest;
        resolve(target.result as Goal[]);
      };
    });
    
    // Fetch Planner
    const planner = await new Promise<PlannerItem[]>((resolve) => {
      const req = tx.objectStore('planner').getAll();
      req.onsuccess = (event) => {
        const target = event.target as IDBRequest;
        resolve(target.result as PlannerItem[]);
      };
    });

    // Fetch Sessions (History)
    const sessions = await new Promise<Session[]>((resolve) => {
      const req = tx.objectStore('sessions').getAll();
      req.onsuccess = (event) => {
        const target = event.target as IDBRequest;
        resolve(target.result as Session[]);
      };
    });

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
    
    // Streak Math
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
      stats: { todayMs, weeklyMs, totalMs, completedCount, avgSessionMs, streak: currentStreak } 
    });
  },

  createGoal: async (goal) => {
    const db = await initDB();
    const tx = db.transaction('goals', 'readwrite');
    tx.objectStore('goals').put({ ...goal, id: Date.now().toString() });
    await new Promise(res => tx.oncomplete = res);
    get().refreshAll();
  },

  deleteGoal: async (id) => {
    const db = await initDB();
    const tx = db.transaction('goals', 'readwrite');
    tx.objectStore('goals').delete(id);
    await new Promise(res => tx.oncomplete = res);
    get().refreshAll();
  },

  addPlannerItem: async (item) => {
    const db = await initDB();
    const tx = db.transaction('planner', 'readwrite');
    tx.objectStore('planner').put({ ...item, id: Date.now().toString(), completed: item.completed || false });
    await new Promise(res => tx.oncomplete = res);
    get().refreshAll();
  },

  togglePlanner: async (id, completed) => {
    const db = await initDB();
    const tx = db.transaction('planner', 'readwrite');
    const store = tx.objectStore('planner');
    const req = store.get(id);
    
    // Strict typing for retrieval and update
    req.onsuccess = (event) => {
       const target = event.target as IDBRequest;
       const data = target.result as PlannerItem | undefined;
       if (data) {
           data.completed = completed;
           store.put(data);
       }
    };
    
    await new Promise(res => tx.oncomplete = res);
    get().refreshAll();
  }
}));