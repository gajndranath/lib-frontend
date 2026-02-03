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

export const initCrypto = async () => {
  // TweetNaCl doesn't require initialization
  return Promise.resolve();
};

export const getOrCreateKeyPair = async (): Promise<KeyPair> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored) as KeyPair;
  }

  // Generate a new keypair for box encryption
  const keypair = nacl.box.keyPair();
  const kp = {
    publicKey: toBase64(keypair.publicKey),
    privateKey: toBase64(keypair.secretKey),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(kp));
  return kp;
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
): Promise<string> => {
  // Get sender's keypair for encryption
  const senderKeyPair = await getOrCreateKeyPair();

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
    senderKeyPair.privateKey,
    BOX_SECRET_KEY_LENGTH,
    "Sender private key",
  );

  // Encrypt using authenticated encryption
  const encrypted = nacl.box(message, nonce, recipientPubKey, senderSecretKey);

  // Combine nonce + encrypted message for transmission
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);

  return toBase64(combined);
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
    console.error(
      `❌ Decryption failed with nonce:`,
      nonce.length,
      `encrypted:`,
      encrypted.length,
      `recipient key:`,
      recipientSecretKey.length,
      `sender key:`,
      senderPubKey.length,
    );
    throw new Error("Decryption failed");
  }

  return bytesToUtf8(decrypted);
};
