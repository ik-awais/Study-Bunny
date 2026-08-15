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

export interface CustomVoiceCommand {
  id: string;
  userId: string;
  phrase: string;
  aliases: string[];
  actionType: 'NAVIGATE' | 'TIMER';
  actionTarget: string; // e.g. '/', '/planner', '/goals', '/stats', '/settings', '/timer' or 'START', 'PAUSE', 'RESUME', 'STOP', 'RESET'
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('study-bunny-db', 4);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');

      const stores = ['sessions', 'goals', 'planner', 'customCommands'];
      stores.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
        }
      });

      if (oldVersion < 4 && db.objectStoreNames.contains('customCommands')) {
        const tx = (event.target as any).transaction;
        const store = tx.objectStore('customCommands');
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
        }
      }
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
  const tx = db.transaction(['settings', 'sessions', 'goals', 'planner', 'customCommands'], 'readonly');
  const data: Record<string, any> = {};
  
  const stores = ['settings', 'sessions', 'goals', 'planner', 'customCommands'];
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

export const migrateAnonymousData = async (userId: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(['sessions', 'goals', 'planner', 'customCommands'], 'readwrite');
  const stores = ['sessions', 'goals', 'planner', 'customCommands'];
  
  for (const storeName of stores) {
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = (e) => {
      const records = (e.target as IDBRequest).result;
      records.forEach((record: any) => {
        if (!record.userId) {
          record.userId = userId;
          store.put(record);
        }
      });
    };
  }
  return new Promise(res => {
    tx.oncomplete = () => res();
  });
};