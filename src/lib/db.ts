export interface Session {
  id: string;
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
    const request = indexedDB.open('study-bunny-db', 2);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = (event) => {
      const target = event.target as IDBOpenDBRequest;
      resolve(target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('goals')) db.createObjectStore('goals', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('planner')) db.createObjectStore('planner', { keyPath: 'id' });
    };
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

export const updatePlannerItem = async (id: string, updates: Partial<PlannerItem>): Promise<void> => {
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
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};