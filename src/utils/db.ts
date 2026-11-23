import type { AuditRecord } from '../types';

const DB_NAME = 'CemsAuditSupervisorDB';
const DB_VERSION = 1;
const STORE_RECORDS = 'audit_records';
const LEGACY_LOCALSTORAGE_KEY = 'cems_audit_records_v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function loadRecordsFromDb(): Promise<AuditRecord[]> {
  try {
    const db = await openDb();
    const records = await new Promise<AuditRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as AuditRecord[]) || []);
      req.onerror = () => reject(req.error);
    });

    // Automatic one-time migration from legacy localStorage if IndexedDB is empty
    if (records.length === 0) {
      const legacyRaw = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
      if (legacyRaw) {
        try {
          const legacyRecords = JSON.parse(legacyRaw) as AuditRecord[];
          if (Array.isArray(legacyRecords) && legacyRecords.length > 0) {
            await saveAllRecordsToDb(legacyRecords);
            localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
            return sortByUpdated(legacyRecords);
          }
        } catch {
          // ignore corrupted legacy data
        }
      }
    }

    return sortByUpdated(records);
  } catch {
    // Fallback to localStorage if IndexedDB is blocked
    try {
      const raw = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
      return raw ? sortByUpdated(JSON.parse(raw) as AuditRecord[]) : [];
    } catch {
      return [];
    }
  }
}

export async function saveAllRecordsToDb(records: AuditRecord[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDS);
      store.clear();
      records.forEach((rec) => {
        store.put(rec);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage
    localStorage.setItem(LEGACY_LOCALSTORAGE_KEY, JSON.stringify(records));
  }
}

function sortByUpdated(records: AuditRecord[]): AuditRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
