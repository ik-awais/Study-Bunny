import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface SessionRecord {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  actualDurationMs: number;
  date: string; // YYYY-MM-DD local
  timestamp: number;
  mode: 'countdown' | 'pomodoro';
  completed: boolean;
}

export interface GoalRecord {
  id: string;
  title: string;
  type: 'daily' | 'weekly';
  targetMs: number;
}

export interface PlannerRecord {
  id: string;
  title: string;
  subject: string;
  plannedDurationMs: number;
  date: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
}

interface StudyBunnyDB extends DBSchema {
  settings: { key: string; value: any; };
  sessions: { key: string; value: SessionRecord; indexes: { 'by-date': string }; };
  goals: { key: string; value: GoalRecord; };
  planner: { key: string; value: PlannerRecord; indexes: { 'by-date': string }; };
}

let dbPromise: Promise<IDBPDatabase<StudyBunnyDB>>;

export const initDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<StudyBunnyDB>('study-bunny-db', 2, {
      upgrade(db, oldVersion) {
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
export const recordSession = async (session: Omit<SessionRecord, 'id'>) => {
  const db = await initDB();
  const id = Date.now().toString();
  await db.put('sessions', { ...session, id });
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
export const addGoal = async (g: Omit<GoalRecord, 'id'>) => (await initDB()).put('goals', { ...g, id: Date.now().toString() });
export const deleteGoal = async (id: string) => (await initDB()).delete('goals', id);
export const addPlannerItem = async (p: Omit<PlannerRecord, 'id'>) => (await initDB()).put('planner', { ...p, id: Date.now().toString() });
export const updatePlannerItem = async (p: PlannerRecord) => (await initDB()).put('planner', p);
export const deletePlannerItem = async (id: string) => (await initDB()).delete('planner', id);