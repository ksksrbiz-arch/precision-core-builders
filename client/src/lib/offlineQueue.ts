/**
 * Offline queue for field reports.
 *
 * When Eric is on-site with no signal, reports are saved to IndexedDB.
 * The service worker syncs them via Background Sync when connectivity returns.
 *
 * DB name and store must match sw.js (pcb-field-reports / queue).
 */

const DB_NAME = "pcb-field-reports";
const DB_VERSION = 1;
const STORE_NAME = "queue";

interface TextReportEntry {
  type: "text";
  projectId: number;
  text: string;
  accessToken: string;
  queuedAt: string;
}

interface VoiceReportEntry {
  type: "voice";
  projectId: number;
  audioData: ArrayBuffer;
  audioMime: string;
  accessToken: string;
  queuedAt: string;
}

type ReportEntry = TextReportEntry | VoiceReportEntry;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueTextReport(
  projectId: number,
  text: string,
  accessToken: string,
): Promise<void> {
  const entry: TextReportEntry = {
    type: "text",
    projectId,
    text,
    accessToken,
    queuedAt: new Date().toISOString(),
  };
  await addToQueue(entry);
}

export async function queueVoiceReport(
  projectId: number,
  audioBlob: Blob,
  accessToken: string,
): Promise<void> {
  const audioData = await audioBlob.arrayBuffer();
  const entry: VoiceReportEntry = {
    type: "voice",
    projectId,
    audioData,
    audioMime: audioBlob.type,
    accessToken,
    queuedAt: new Date().toISOString(),
  };
  await addToQueue(entry);
}

async function addToQueue(entry: ReportEntry): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).add(entry);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  // Request background sync so SW sends when online
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const reg = await navigator.serviceWorker.ready;
    await (reg as any).sync.register("sync-field-reports");
  }
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}
