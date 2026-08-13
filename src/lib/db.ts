import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Session {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  actualDurationMs: number;
  pauseDurationMs: number; // NEW: Tracks rest time
  date: string; // YYYY-MM-DD local
  timestamp: number;
  mode: string;
  completed: boolean;
  goalId?: string; // NEW: Direct goal association
  plannerId?: string;
}

export interface Goal {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  targetMs: number;
  targetSessions?: number; // NEW: Multi-metric goals
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

export interface PlannerItem {
  id: string;
  title: string;
  subject: string;
  plannedDurationMs: number;
  date: string;
  startTime?: string; // HH:MM
  endTime?: string;   // HH:MM
  priority?: 'low' | 'medium' | 'high';
  goalId?: string;
  description?: string;
  color?: string;
  completed: boolean;
}

// Legacy interfaces for backward compatibility during migration
export interface SessionRecord extends Session {}
export interface GoalRecord extends Goal {}
export interface PlannerRecord extends PlannerItem {}

interface StudyBunnyDB extends DBSchema {
  settings: { key: string; value: any; };
  sessions: { key: string; value: Session; indexes: { 'by-date': string }; };
  goals: { key: string; value: Goal; };
  planner: { key: string; value: PlannerItem; indexes: { 'by-date': string }; };
}

let dbPromise: Promise<IDBPDatabase<StudyBunnyDB>>;

export const initDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<StudyBunnyDB>('study-bunny-db', 2, {
      upgrade(db, oldVersion) {
        // V2: Safely upgrades schema without deleting existing object stores.
        if (oldVersion < 1) {
          db.createObjectStore('settings');
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('by-date', 'date');
          db.createObjectStore('goals', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('planner')) {
            const plannerStore = db.createObjectStore('planner', { keyPath: 'id' });
            plannerStore.createIndex('by-date', 'date');
          }
        }
      },
    });
  }
  return dbPromise;
};

// --- Generic CRUD ---
export const getSettings = async (key: string) => (await initDB()).get('settings', key);
export const saveSettings = async (key: string, value: any) => (await initDB()).put('settings', value, key);

export const recordSession = async (session: Omit<Session, 'id'>) => {
  const db = await initDB();
  const id = Date.now().toString();
  // Ensure pauseDurationMs exists with default 0 for backward compatibility
  const sessionWithDefaults = {
    ...session,
    pauseDurationMs: session.pauseDurationMs || 0,
    goalId: session.goalId || undefined,
    plannerId: session.plannerId || undefined
  };
  await db.put('sessions', { ...sessionWithDefaults, id });
  return id;
};

export const getAllData = async () => {
  const db = await initDB();
  return {
    sessions: await db.getAll('sessions'),
    goals: await db.getAll('goals'),
    planner: await db.getAll('planner'),
  };
};

// --- Goal CRUD ---
export const addGoal = async (g: Omit<Goal, 'id'>) => {
  const db = await initDB();
  const id = Date.now().toString();
  const goalWithDefaults = {
    ...g,
    targetSessions: g.targetSessions || 1,
    startDate: g.startDate || new Date().toISOString().split('T')[0],
    status: g.status || 'active',
    priority: g.priority || 'medium'
  };
  await db.put('goals', { ...goalWithDefaults, id });
  return id;
};

export const updateGoal = async (g: Goal) => {
  const db = await initDB();
  await db.put('goals', g);
};

export const deleteGoal = async (id: string) => {
  const db = await initDB();
  await db.delete('goals', id);
};

export const getGoal = async (id: string) => {
  const db = await initDB();
  return db.get('goals', id);
};

export const getAllGoals = async () => {
  const db = await initDB();
  return db.getAll('goals');
};

// --- Planner CRUD ---
export const addPlannerItem = async (p: Omit<PlannerItem, 'id'>) => {
  const db = await initDB();
  const id = Date.now().toString();
  const itemWithDefaults = {
    ...p,
    priority: p.priority || 'medium',
    completed: p.completed || false
  };
  await db.put('planner', { ...itemWithDefaults, id });
  return id;
};

export const updatePlannerItem = async (p: PlannerItem) => {
  const db = await initDB();
  await db.put('planner', p);
};

export const deletePlannerItem = async (id: string) => {
  const db = await initDB();
  await db.delete('planner', id);
};

export const getPlannerItem = async (id: string) => {
  const db = await initDB();
  return db.get('planner', id);
};

export const getPlannerItemsByDate = async (date: string) => {
  const db = await initDB();
  return db.getAllFromIndex('planner', 'by-date', date);
};

// --- Session CRUD ---
export const getSessionsByDate = async (date: string) => {
  const db = await initDB();
  return db.getAllFromIndex('sessions', 'by-date', date);
};

export const deleteSession = async (id: string) => {
  const db = await initDB();
  await db.delete('sessions', id);
};

export const updateSession = async (s: Session) => {
  const db = await initDB();
  await db.put('sessions', s);
};

// --- Migration Helper ---
export const migrateData = async () => {
  const db = await initDB();
  const oldData = await getAllData();
  
  // Migrate sessions to add new fields
  const migratedSessions = oldData.sessions.map(s => ({
    ...s,
    pauseDurationMs: (s as any).pauseDurationMs || 0,
    goalId: (s as any).goalId || undefined,
    plannerId: (s as any).plannerId || undefined,
    mode: (s as any).mode || 'pomodoro'
  }));
  
  // Migrate goals to add new fields
  const migratedGoals = oldData.goals.map(g => ({
    ...g,
    type: (g as any).type || 'daily',
    targetSessions: (g as any).targetSessions || 1,
    status: (g as any).status || 'active',
    priority: (g as any).priority || 'medium'
  }));
  
  // Migrate planner items to add new fields
  const migratedPlanner = oldData.planner.map(p => ({
    ...p,
    priority: (p as any).priority || 'medium',
    startTime: (p as any).startTime || undefined,
    endTime: (p as any).endTime || undefined,
    goalId: (p as any).goalId || undefined,
    description: (p as any).description || undefined,
    color: (p as any).color || undefined
  }));
  
  // Store migrated data
  const tx = db.transaction(['sessions', 'goals', 'planner'], 'readwrite');
  for (const s of migratedSessions) tx.objectStore('sessions').put(s);
  for (const g of migratedGoals) tx.objectStore('goals').put(g);
  for (const p of migratedPlanner) tx.objectStore('planner').put(p);
  await tx.done;
  
  return { sessions: migratedSessions, goals: migratedGoals, planner: migratedPlanner };
};