import nacl from "tweetnacl";

const STORAGE_KEY = "e2e_keypair_v1";
const BOX_PUBLIC_KEY_LENGTH = nacl.box.keyPair().publicKey.length;
const BOX_SECRET_KEY_LENGTH = nacl.box.keyPair().secretKey.length;

const utf8ToBytes = (value: string): Uint8Array =>
  new TextEncoder().encode(value);

const bytesToUtf8 = (value: Uint8Array): string =>
  new TextDecoder().decode(value);

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface KeyBackupPayload {
  version: number;
  publicKey: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
}

// Utility functions for base64 encoding that work in browser
const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const fromBase64 = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const ensureSubtleCrypto = () => {
  if (!globalThis.crypto?.subtle) {
    throw new Error("WebCrypto is not available in this environment");
  }
};

export const initCrypto = async () => {
  // TweetNaCl doesn't require initialization
  return Promise.resolve();
};

// ==================== LEGACY USER-LEVEL KEY FUNCTIONS ====================
// ⚠️ DEPRECATED: These are kept for backward compatibility with key backup
// New code should use conversation-based functions below

export const buildKeyStorageKey = (options?: {
  userType?: "Admin" | "Student";
  userId?: string | null;
}): string => {
  if (!options?.userType || !options?.userId) return STORAGE_KEY;
  return `${STORAGE_KEY}:${options.userType}:${options.userId}`;
};

export const getOrCreateKeyPair = async (
  storageKey: string = STORAGE_KEY,
): Promise<KeyPair> => {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    return JSON.parse(stored) as KeyPair;
  }

  // Generate a new keypair for box encryption
  const keypair = nacl.box.keyPair();
  const kp = {
    publicKey: toBase64(keypair.publicKey),
    privateKey: toBase64(keypair.secretKey),
  };
  localStorage.setItem(storageKey, JSON.stringify(kp));
  return kp;
};

export const getStoredKeyPair = (
  storageKey: string = STORAGE_KEY,
): KeyPair | null => {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as KeyPair;
  } catch {
    return null;
  }
};

export const storeKeyPair = (
  keyPair: KeyPair,
  storageKey: string = STORAGE_KEY,
): void => {
  localStorage.setItem(storageKey, JSON.stringify(keyPair));
};

export const clearKeyPair = (storageKey: string = STORAGE_KEY): void => {
  localStorage.removeItem(storageKey);
  console.log(`🔐 Cleared keypair: ${storageKey}`);
};

export const clearAllChatKeys = (): void => {
  // Clear all storage keys that start with our prefix
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith(STORAGE_KEY)) {
      localStorage.removeItem(key);
      console.log(`🔐 Cleared: ${key}`);
    }
  });
  console.log(`🔐 All chat keys cleared`);
};

// ==================== CONVERSATION-BASED KEY MANAGEMENT ====================

/**
 * Build storage key for conversation-specific keypair
 * This ensures each conversation has its own isolated encryption keys
 */
export const buildConversationKeyStorageKey = (
  conversationId: string,
): string => {
  if (!conversationId) {
    throw new Error("conversationId is required for conversation keys");
  }
  return `${STORAGE_KEY}:conv:${conversationId}`;
};

/**
 * Get or create keypair for a specific conversation
 * Each conversation has isolated keys - prevents key mixing between chats
 * Tries localStorage first, then server, then generates new
 */
export const getOrCreateConversationKeyPair = async (
  conversationId: string,
): Promise<KeyPair> => {
  const storageKey = buildConversationKeyStorageKey(conversationId);
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as KeyPair;
      console.log(
        `🔐 Retrieved existing keypair from localStorage: ${conversationId.slice(0, 8)}...`,
      );
      return parsed;
    } catch (error) {
      console.warn(
        `⚠️ Failed to parse stored keypair for conversation ${conversationId}, trying server...`,
      );
    }
  }

  // Try to fetch from server if not in localStorage
  try {
    // Dynamic import to avoid circular dependencies
    const { chatApi } = await import("@/api/chat.api");
    const response = await chatApi.getConversationKeyPair(conversationId);

    if (response.data?.data) {
      const keypair = response.data.data as KeyPair;
      localStorage.setItem(storageKey, JSON.stringify(keypair));
      console.log(
        `🔐 Retrieved keypair from server: ${conversationId.slice(0, 8)}...`,
      );
      return keypair;
    }
  } catch (error) {
    console.warn(
      `⚠️ Could not fetch keypair from server, generating new one: ${conversationId.slice(0, 8)}...`,
    );
  }

  // Generate a new keypair for this conversation
  const keypair = nacl.box.keyPair();
  const kp = {
    publicKey: toBase64(keypair.publicKey),
    privateKey: toBase64(keypair.secretKey),
  };
  localStorage.setItem(storageKey, JSON.stringify(kp));

  // Upload to server for persistence
  try {
    const { chatApi } = await import("@/api/chat.api");
    await chatApi.setConversationKeyPair(conversationId, kp);
    console.log(
      `🔐 Generated NEW keypair and uploaded: ${conversationId.slice(0, 8)}...`,
    );
  } catch (error) {
    console.warn(
      `⚠️ Generated keypair but failed to upload to server: ${conversationId.slice(0, 8)}...`,
    );
  }

  return kp;
};

/**
 * Clear keypair for a specific conversation
 * Use when conversation is deleted or needs key rotation
 */
export const clearConversationKey = (conversationId: string): void => {
  const key = buildConversationKeyStorageKey(conversationId);
  localStorage.removeItem(key);
  console.log(`🔐 Cleared conversation key: ${conversationId.slice(0, 8)}...`);
};

const KDF_ITERATIONS = 310000;

const deriveAesKey = async (password: string, salt: Uint8Array) => {
  ensureSubtleCrypto();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    utf8ToBytes(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: KDF_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const createKeyBackupPayload = async (
  keyPair: KeyPair,
  password: string,
): Promise<KeyBackupPayload> => {
  if (!password?.trim()) {
    throw new Error("Password is required to create key backup");
  }

  ensureSubtleCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    utf8ToBytes(keyPair.privateKey),
  );

  return {
    version: 1,
    publicKey: keyPair.publicKey,
    encryptedPrivateKey: toBase64(new Uint8Array(encrypted)),
    salt: toBase64(salt),
    iv: toBase64(iv),
  };
};

export const restoreKeyPairFromBackup = async (
  backup: KeyBackupPayload,
  password: string,
): Promise<KeyPair> => {
  if (!password?.trim()) {
    throw new Error("Password is required to restore key backup");
  }

  ensureSubtleCrypto();
  const salt = fromBase64(backup.salt);
  const iv = fromBase64(backup.iv);
  const aesKey = await deriveAesKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    fromBase64(backup.encryptedPrivateKey),
  );

  const privateKey = bytesToUtf8(new Uint8Array(decrypted));

  return {
    publicKey: backup.publicKey,
    privateKey,
  };
};

const normalizeKey = (
  key:
    | string
    | Uint8Array
    | ArrayBuffer
    | { data?: number[] }
    | null
    | undefined,
  expectedLength: number,
  label: string,
): Uint8Array => {
  let bytes: Uint8Array | null = null;

  if (typeof key === "string") {
    if (!key.trim()) {
      throw new Error(`${label} is empty`);
    }
    bytes = fromBase64(key);
  } else if (key instanceof Uint8Array) {
    bytes = key;
  } else if (key instanceof ArrayBuffer) {
    bytes = new Uint8Array(key);
  } else if (key && Array.isArray(key.data)) {
    bytes = new Uint8Array(key.data);
  }

  if (!bytes) {
    throw new Error(`${label} is invalid`);
  }

  if (bytes.length !== expectedLength) {
    throw new Error(`${label} must be ${expectedLength} bytes`);
  }

  return bytes;
};

export const encryptForRecipient = async (
  plaintext: string,
  recipientPublicKey: string | Uint8Array | ArrayBuffer | { data?: number[] },
  senderKeyPair?: KeyPair,
): Promise<string> => {
  // Get sender's keypair for encryption
  const senderKeys = senderKeyPair ?? (await getOrCreateKeyPair());

  // Convert inputs
  const message = utf8ToBytes(
    typeof plaintext === "string" ? plaintext : String(plaintext),
  );
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const recipientPubKey = normalizeKey(
    recipientPublicKey,
    BOX_PUBLIC_KEY_LENGTH,
    "Recipient public key",
  );
  const senderSecretKey = normalizeKey(
    senderKeys.privateKey,
    BOX_SECRET_KEY_LENGTH,
    "Sender private key",
  );

  console.log(`🔐 Encrypting for recipient:`, {
    plaintextLength: plaintext.length,
    messageLength: message.length,
    nonceLength: nonce.length,
    recipientPubKeyType: typeof recipientPublicKey,
    senderSecretKeyLength: senderSecretKey.length,
  });

  // Encrypt using authenticated encryption
  const encrypted = nacl.box(message, nonce, recipientPubKey, senderSecretKey);

  // Combine nonce + encrypted message for transmission
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);

  console.log(`✅ Encrypted:`, {
    encryptedLength: encrypted.length,
    combinedLength: combined.length,
  });

  return toBase64(combined);
};

// Fallback: Try decrypting with old user-level keypair (for messages sent before migration)
const tryDecryptWithLegacyKey = (
  ciphertext: string,
  senderPublicKey: string | Uint8Array | ArrayBuffer | { data?: number[] },
): string | null => {
  try {
    // Try to get the old user-level keypair from localStorage
    const oldKeyStorage = localStorage.getItem(STORAGE_KEY);
    if (!oldKeyStorage) return null;

    const legacyKeyPair = JSON.parse(oldKeyStorage) as KeyPair;
    const recipientSecretKey = normalizeKey(
      legacyKeyPair.privateKey,
      BOX_SECRET_KEY_LENGTH,
      "Legacy recipient private key",
    );

    const senderPubKey = normalizeKey(
      senderPublicKey,
      BOX_PUBLIC_KEY_LENGTH,
      "Sender public key",
    );

    const combined = fromBase64(ciphertext);
    const nonce = combined.slice(0, nacl.box.nonceLength);
    const encrypted = combined.slice(nacl.box.nonceLength);

    const decrypted = nacl.box.open(
      encrypted,
      nonce,
      senderPubKey,
      recipientSecretKey,
    );

    if (decrypted) {
      console.log(`✅ Decrypted with legacy user-level key`);
      return bytesToUtf8(decrypted);
    }
  } catch (err) {
    // Silently fail - not a legacy message
  }
  return null;
};

export const decryptForSelf = async (
  ciphertext: string,
  keyPair: KeyPair,
  senderPublicKey?: string | Uint8Array | ArrayBuffer | { data?: number[] },
): Promise<string> => {
  // Extract nonce and encrypted message
  const combined = fromBase64(ciphertext);
  const nonce = combined.slice(0, nacl.box.nonceLength);
  const encrypted = combined.slice(nacl.box.nonceLength);

  console.log(`🔓 Decrypting:`, {
    ciphertextLength: ciphertext.length,
    combinedLength: combined.length,
    nonceLength: nonce.length,
    encryptedLength: encrypted.length,
    senderPublicKeyType: typeof senderPublicKey,
  });

  // For decryption, we need:
  // - Our own private key (the recipient)
  // - The sender's public key
  const recipientSecretKey = normalizeKey(
    keyPair.privateKey,
    BOX_SECRET_KEY_LENGTH,
    "Recipient private key",
  );

  // If senderPublicKey is not provided, we can't decrypt
  if (!senderPublicKey) {
    throw new Error("Sender public key is required for decryption");
  }

  const senderPubKey = normalizeKey(
    senderPublicKey,
    BOX_PUBLIC_KEY_LENGTH,
    "Sender public key",
  );

  // Decrypt using the sender's public key and our private key
  const decrypted = nacl.box.open(
    encrypted,
    nonce,
    senderPubKey,
    recipientSecretKey,
  );

  if (!decrypted) {
    console.warn(`⚠️ Conversation key decryption failed, trying legacy key...`);

    // Try decrypting with old user-level keypair (for messages before migration)
    if (senderPublicKey) {
      const legacyDecrypted = tryDecryptWithLegacyKey(
        ciphertext,
        senderPublicKey,
      );
      if (legacyDecrypted) {
        return legacyDecrypted;
      }
    }

    console.warn(
      `⚠️ Failed to decrypt (old message encrypted with previous system)`,
    );

    // Return a special marker indicating this is an old encrypted message
    // that cannot be decrypted with current conversation key
    return "[Old message - encrypted with previous key]";
  }

  return bytesToUtf8(decrypted);
};
