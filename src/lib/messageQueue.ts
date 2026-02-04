/**
 * IndexedDB-based message queue for offline support
 * Stores unsent messages locally and retries on reconnect
 */

const DB_NAME = "ChatDatabase";
const STORE_NAME = "messageQueue";
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

interface QueuedMessage {
  id: string;
  conversationId: string;
  recipientId: string;
  recipientType: "Student" | "Admin";
  encryptedForRecipient: { ciphertext: string; algorithm: string };
  encryptedForSender: { ciphertext: string; algorithm: string };
  senderPublicKey: string;
  contentType: string;
  status: "PENDING" | "RETRYING" | "FAILED";
  retryCount: number;
  createdAt: number;
  lastRetryAt?: number;
}

// Initialize IndexedDB
export const initMessageQueue = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve();
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("conversationId", "conversationId", {
          unique: false,
        });
      }
    };
  });
};

// Add message to queue
export const queueMessage = async (
  message: Omit<QueuedMessage, "status" | "retryCount" | "createdAt">,
): Promise<string> => {
  await initMessageQueue();
  if (!db) throw new Error("IndexedDB not initialized");

  const queuedMsg: QueuedMessage = {
    ...message,
    status: "PENDING",
    retryCount: 0,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(queuedMsg);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as string);
  });
};

// Get all pending messages
export const getPendingMessages = async (): Promise<QueuedMessage[]> => {
  await initMessageQueue();
  if (!db) throw new Error("IndexedDB not initialized");

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("status");
    const request = index.getAll("PENDING");

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as QueuedMessage[]);
  });
};

// Update message status
export const updateMessageStatus = async (
  id: string,
  status: "PENDING" | "RETRYING" | "FAILED",
  retryCount?: number,
): Promise<void> => {
  await initMessageQueue();
  if (!db) throw new Error("IndexedDB not initialized");

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const message = getRequest.result as QueuedMessage;
      if (message) {
        message.status = status;
        if (retryCount !== undefined) message.retryCount = retryCount;
        message.lastRetryAt = Date.now();

        const updateRequest = store.put(message);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
};

// Remove message from queue
export const removeFromQueue = async (id: string): Promise<void> => {
  await initMessageQueue();
  if (!db) throw new Error("IndexedDB not initialized");

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Get messages for a conversation
export const getQueuedMessagesForConversation = async (
  conversationId: string,
): Promise<QueuedMessage[]> => {
  await initMessageQueue();
  if (!db) throw new Error("IndexedDB not initialized");

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("conversationId");
    const request = index.getAll(conversationId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as QueuedMessage[]);
  });
};

// Clear all messages from queue (use with caution)
export const clearQueue = async (): Promise<void> => {
  await initMessageQueue();
  if (!db) throw new Error("IndexedDB not initialized");

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Cleanup old messages (older than 24 hours)
export const cleanupOldMessages = async (): Promise<number> => {
  await initMessageQueue();
  if (!db) throw new Error("IndexedDB not initialized");

  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  let deleted = 0;

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("createdAt");
    const range = IDBKeyRange.upperBound(twentyFourHoursAgo);
    const request = index.openCursor(range);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        deleted++;
        cursor.continue();
      } else {
        resolve(deleted);
      }
    };

    request.onerror = () => reject(request.error);
  });
};

export default {
  initMessageQueue,
  queueMessage,
  getPendingMessages,
  updateMessageStatus,
  removeFromQueue,
  getQueuedMessagesForConversation,
  clearQueue,
  cleanupOldMessages,
};
