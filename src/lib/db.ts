export interface Session {
  id: string;
  userId: string;
  title: string;
  subject: string;
  durationMinutes: number;
  actualDurationMs: number;
  pauseDurationMs: number;
  date: string;
  timestamp: number;
  mode: string;
  completed: boolean;
  goalId?: string;
  plannerId?: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  targetMs: number;
  targetSessions?: number;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

export interface PlannerItem {
  id: string;
  userId: string;
  title: string;
  subject: string;
  plannedDurationMs: number;
  date: string;
  startTime?: string;
  endTime?: string;
  priority?: 'low' | 'medium' | 'high';
  goalId?: string;
  description?: string;
  color?: string;
  completed: boolean;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('study-bunny-db', 3);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const target = event.target as IDBOpenDBRequest;
      resolve(target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      const oldVersion = event.oldVersion;

      // v1/v2 Stores
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      
      let sessionStore = db.objectStoreNames.contains('sessions') 
        ? target.transaction!.objectStore('sessions') 
        : db.createObjectStore('sessions', { keyPath: 'id' });
      
      let goalStore = db.objectStoreNames.contains('goals') 
        ? target.transaction!.objectStore('goals') 
        : db.createObjectStore('goals', { keyPath: 'id' });
      
      let plannerStore = db.objectStoreNames.contains('planner') 
        ? target.transaction!.objectStore('planner') 
        : db.createObjectStore('planner', { keyPath: 'id' });

      // v3 Upgrades: Data Isolation Indices
      if (oldVersion < 3) {
        if (!sessionStore.indexNames.contains('userId')) {
          sessionStore.createIndex('userId', 'userId', { unique: false });
        }
        if (!goalStore.indexNames.contains('userId')) {
          goalStore.createIndex('userId', 'userId', { unique: false });
        }
        if (!plannerStore.indexNames.contains('userId')) {
          plannerStore.createIndex('userId', 'userId', { unique: false });
        }
      }
    };
  });
};

export const migrateAnonymousData = async (userId: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(['sessions', 'goals', 'planner'], 'readwrite');
  const stores = ['sessions', 'goals', 'planner'];
  
  for (const storeName of stores) {
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = (e) => {
      const target = e.target as IDBRequest;
      const records = target.result;
      records.forEach((record: any) => {
        if (!record.userId) {
          record.userId = userId;
          store.put(record);
        }
      });
    };
  }
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
};

export const recordSession = async (session: Session): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction('sessions', 'readwrite');
  tx.objectStore('sessions').put(session);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// --- RESTORED HELPER FUNCTIONS ---

export const saveSettings = async (key: string, value: any): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction('settings', 'readwrite');
  tx.objectStore('settings').put(value, key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getSettings = async (key: string): Promise<any> => {
  const db = await initDB();
  const tx = db.transaction('settings', 'readonly');
  const req = tx.objectStore('settings').get(key);
  return new Promise((resolve, reject) => {
    req.onsuccess = (event) => {
      const target = event.target as IDBRequest;
      resolve(target.result);
    };
    req.onerror = () => reject(req.error);
  });
};

export const getAllData = async (): Promise<any> => {
  const db = await initDB();
  const tx = db.transaction(['settings', 'sessions', 'goals', 'planner'], 'readonly');
  const data: Record<string, any> = {};
  
  const stores = ['settings', 'sessions', 'goals', 'planner'];
  
  for (const storeName of stores) {
    data[storeName] = await new Promise((resolve) => {
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = (event) => {
        const target = event.target as IDBRequest;
        resolve(target.result);
      };
    });
  }
  return data;
};

export const updatePlannerItem = async (item: PlannerItem): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction('planner', 'readwrite');
  tx.objectStore('planner').put(item);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Additional helper functions for backward compatibility
export const addGoal = async (goal: Omit<Goal, 'id'>): Promise<string> => {
  const db = await initDB();
  const id = Date.now().toString();
  const newGoal: Goal = { ...goal, id, userId: goal.userId || 'anonymous' };
  const tx = db.transaction('goals', 'readwrite');
  tx.objectStore('goals').put(newGoal);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteGoal = async (id: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction('goals', 'readwrite');
  tx.objectStore('goals').delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const addPlannerItem = async (item: Omit<PlannerItem, 'id'>): Promise<string> => {
  const db = await initDB();
  const id = Date.now().toString();
  const newItem: PlannerItem = { ...item, id, userId: item.userId || 'anonymous' };
  const tx = db.transaction('planner', 'readwrite');
  tx.objectStore('planner').put(newItem);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
};

export const deletePlannerItem = async (id: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction('planner', 'readwrite');
  tx.objectStore('planner').delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};