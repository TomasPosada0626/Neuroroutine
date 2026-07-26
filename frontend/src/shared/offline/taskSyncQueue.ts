type QueuedTaskInsert = {
  local_id: string;
  user_id: string;
  routine_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  is_recurring?: boolean;
  queued_at: string;
};

const DB_NAME = 'nr-offline-db';
const DB_VERSION = 1;
const STORE_TASK_INSERTS = 'task_inserts';

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TASK_INSERTS)) {
        db.createObjectStore(STORE_TASK_INSERTS, { keyPath: 'local_id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueTaskInsert(task: QueuedTaskInsert): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TASK_INSERTS, 'readwrite');
      tx.objectStore(STORE_TASK_INSERTS).put(task);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch {
    // ignore queue persistence errors
  }
}

export async function listQueuedTaskInserts(): Promise<QueuedTaskInsert[]> {
  try {
    const db = await openDb();
    if (!db) return [];

    const items = await new Promise<QueuedTaskInsert[]>((resolve, reject) => {
      const tx = db.transaction(STORE_TASK_INSERTS, 'readonly');
      const req = tx.objectStore(STORE_TASK_INSERTS).getAll();
      req.onsuccess = () => resolve((req.result ?? []) as QueuedTaskInsert[]);
      req.onerror = () => reject(req.error);
    });

    db.close();
    return items.sort((a, b) => (a.queued_at < b.queued_at ? -1 : 1));
  } catch {
    return [];
  }
}

export async function removeQueuedTaskInsert(localId: string): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TASK_INSERTS, 'readwrite');
      tx.objectStore(STORE_TASK_INSERTS).delete(localId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch {
    // ignore queue removal errors
  }
}

export type { QueuedTaskInsert };
