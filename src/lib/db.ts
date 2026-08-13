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
    
    // Strict typing for IDBOpenDBRequest
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