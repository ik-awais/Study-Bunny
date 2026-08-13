import { create } from 'zustand';
import { getAllData, addGoal, deleteGoal, addPlannerItem, updatePlannerItem, deletePlannerItem, type SessionRecord, type GoalRecord, type PlannerRecord } from '../lib/db';

const getLocalYYYYMMDD = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface DataState {
  sessions: SessionRecord[];
  goals: GoalRecord[];
  planner: PlannerRecord[];
  stats: {
    todayMs: number;
    weeklyMs: number;
    monthlyMs: number;
    completedCount: number;
    streak: number;
    longestStreak: number;
    avgSessionMs: number;
    last7Days: { date: string; ms: number }[];
  };
  refreshAll: () => Promise<void>;
  
  createGoal: (g: Omit<GoalRecord, 'id'>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  createPlanner: (p: Omit<PlannerRecord, 'id'>) => Promise<void>;
  togglePlanner: (id: string, completed: boolean) => Promise<void>;
  removePlanner: (id: string) => Promise<void>;
}

export const useDataStore = create<DataState>()((set, get) => ({
  sessions: [], goals: [], planner: [],
  stats: { todayMs: 0, weeklyMs: 0, monthlyMs: 0, completedCount: 0, streak: 0, longestStreak: 0, avgSessionMs: 0, last7Days: [] },
  
  refreshAll: async () => {
    const data = await getAllData();
    const now = new Date();
    const todayStr = getLocalYYYYMMDD(now);
    
    // Time boundaries safely handled without timezone offsets
    const monthPrefix = todayStr.substring(0, 7);
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon = 0, Sun = 6
    const monday = new Date(now);
    monday.setDate(monday.getDate() - dayOfWeek);
    const mondayStr = getLocalYYYYMMDD(monday);

    let todayMs = 0; let weeklyMs = 0; let monthlyMs = 0;
    let totalMs = 0; let completedCount = 0;
    
    const dailyTotals: Record<string, number> = {};

    data.sessions.forEach(s => {
      totalMs += s.actualDurationMs;
      if (s.completed) completedCount++;
      if (s.date === todayStr) todayMs += s.actualDurationMs;
      if (s.date >= mondayStr) weeklyMs += s.actualDurationMs;
      if (s.date.startsWith(monthPrefix)) monthlyMs += s.actualDurationMs;
      
      dailyTotals[s.date] = (dailyTotals[s.date] || 0) + s.actualDurationMs;
    });

    // Streak Calculation (Minimum 20 mins to count as a study day)
    const thresholdMs = 20 * 60 * 1000;
    const qualifyingDates = Object.keys(dailyTotals).filter(d => dailyTotals[d] >= thresholdMs).sort().reverse();
    
    let currentStreak = 0;
    let checkDate = new Date();
    let checkStr = getLocalYYYYMMDD(checkDate);
    
    if (!qualifyingDates.includes(checkStr)) {
      checkDate.setDate(checkDate.getDate() - 1); // Check yesterday
      checkStr = getLocalYYYYMMDD(checkDate);
    }
    
    while(qualifyingDates.includes(checkStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      checkStr = getLocalYYYYMMDD(checkDate);
    }

    // Trend (Last 7 Days)
    const last7Days = Array.from({length: 7}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const ds = getLocalYYYYMMDD(d);
      return { date: ds, ms: dailyTotals[ds] || 0 };
    });

    set({
      sessions: data.sessions.sort((a,b) => b.timestamp - a.timestamp),
      goals: data.goals,
      planner: data.planner.sort((a,b) => a.date.localeCompare(b.date)),
      stats: {
        todayMs, weeklyMs, monthlyMs, completedCount, streak: currentStreak,
        longestStreak: currentStreak, // simplified for now
        avgSessionMs: completedCount ? totalMs / completedCount : 0,
        last7Days
      }
    });
  },

  createGoal: async (g) => { await addGoal(g); await get().refreshAll(); },
  removeGoal: async (id) => { await deleteGoal(id); await get().refreshAll(); },
  createPlanner: async (p) => { await addPlannerItem(p); await get().refreshAll(); },
  removePlanner: async (id) => { await deletePlannerItem(id); await get().refreshAll(); },
  togglePlanner: async (id, completed) => {
    const item = get().planner.find(p => p.id === id);
    if (item) { await updatePlannerItem({ ...item, completed }); await get().refreshAll(); }
  },
}));