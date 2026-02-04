/**
 * Network optimization utilities for 2G/3G networks
 * Includes: compression, payload optimization, retry logic
 */

// Detect network type
export const getNetworkType = (): "4g" | "3g" | "2g" | "unknown" => {
  if (!("connection" in navigator)) {
    return "unknown";
  }

  const connection = (
    navigator as unknown as { connection?: { effectiveType?: string } }
  ).connection;
  const effectiveType = connection?.effectiveType;

  if (effectiveType === "4g") return "4g";
  if (effectiveType === "3g") return "3g";
  if (effectiveType === "2g" || effectiveType === "slow-2g") return "2g";

  return "unknown";
};

// Check if on slow network
export const isSlowNetwork = (): boolean => {
  const type = getNetworkType();
  return type === "2g" || type === "3g";
};

// Estimate payload size in bytes
export const estimatePayloadSize = (payload: unknown): number => {
  return JSON.stringify(payload).length;
};

// Simple compression using base64 and TextEncoder
export const compressPayload = async (payload: unknown): Promise<string> => {
  try {
    const jsonStr = JSON.stringify(payload);
    const uint8Array = new TextEncoder().encode(jsonStr);

    // Use gzip compression if available
    if ("CompressionStream" in globalThis) {
      const CompressionStreamCtor = (
        globalThis as unknown as {
          CompressionStream: new (type: string) => {
            readable: ReadableStream<Uint8Array>;
            writable: WritableStream<Uint8Array>;
          };
        }
      ).CompressionStream;
      const stream = new CompressionStreamCtor("gzip");
      const writer = stream.writable.getWriter();
      writer.write(uint8Array);
      writer.close();

      const reader = stream.readable.getReader();
      const chunks: Uint8Array[] = [];

      let result = await reader.read();
      while (!result.done) {
        chunks.push(result.value);
        result = await reader.read();
      }

      const compressed = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0),
      );
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }

      return btoa(String.fromCharCode(...Array.from(compressed)));
    }

    // Fallback to base64 (no compression)
    return btoa(jsonStr);
  } catch (error) {
    console.error("Compression failed:", error);
    return btoa(JSON.stringify(payload));
  }
};

// Decompress payload
export const decompressPayload = async (
  compressed: string,
): Promise<unknown> => {
  try {
    const binaryStr = atob(compressed);
    const uint8Array = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      uint8Array[i] = binaryStr.charCodeAt(i);
    }

    // Try to decompress with gzip
    if ("DecompressionStream" in globalThis) {
      try {
        const DecompressionStreamCtor = (
          globalThis as unknown as {
            DecompressionStream: new (type: string) => {
              readable: ReadableStream<Uint8Array>;
              writable: WritableStream<Uint8Array>;
            };
          }
        ).DecompressionStream;
        const stream = new DecompressionStreamCtor("gzip");
        const writer = stream.writable.getWriter();
        writer.write(uint8Array);
        writer.close();

        const reader = stream.readable.getReader();
        const chunks: Uint8Array[] = [];

        let result = await reader.read();
        while (!result.done) {
          chunks.push(result.value);
          result = await reader.read();
        }

        const decompressed = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0),
        );
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        const jsonStr = new TextDecoder().decode(decompressed);
        return JSON.parse(jsonStr);
      } catch {
        // Decompression failed, try raw base64
        const jsonStr = new TextDecoder().decode(uint8Array);
        return JSON.parse(jsonStr);
      }
    }

    // Fallback: decode base64 directly
    const jsonStr = new TextDecoder().decode(uint8Array);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Decompression failed:", error);
    throw error;
  }
};

// Optimize payload size by removing unnecessary fields
export const optimizePayload = (payload: unknown): Record<string, unknown> => {
  if (typeof payload !== "object" || payload === null) {
    return {};
  }

  const optimized = { ...(payload as Record<string, unknown>) };

  // Remove fields that can be omitted
  delete optimized.tempId; // Will be regenerated
  delete optimized.meta; // Not needed for all messages

  return optimized;
};

// Retry with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * delay * 0.1; // Add 10% jitter
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
    }
  }

  throw lastError;
};

// Monitor network connectivity
export const onNetworkReconnect = (callback: () => void): (() => void) => {
  const handleOnline = () => {
    // Add a small delay to ensure connection is stable
    setTimeout(callback, 500);
  };

  window.addEventListener("online", handleOnline);

  return () => {
    window.removeEventListener("online", handleOnline);
  };
};

// Get optimal chunk size based on network
export const getOptimalChunkSize = (): number => {
  if (isSlowNetwork()) {
    return 10; // 10 messages for 2G
  }
  return 50; // 50 messages for 3G/4G
};

// Check if should batch operations
export const shouldBatchOperations = (): boolean => {
  return isSlowNetwork();
};

// Get retry config based on network
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export const getRetryConfig = (): RetryConfig => {
  if (isSlowNetwork()) {
    return {
      maxRetries: 5,
      baseDelay: 2000, // Start with 2 seconds
      maxDelay: 30000, // Max 30 seconds
    };
  }

  return {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  };
};

export default {
  getNetworkType,
  isSlowNetwork,
  estimatePayloadSize,
  compressPayload,
  decompressPayload,
  optimizePayload,
  retryWithBackoff,
  onNetworkReconnect,
  getOptimalChunkSize,
  shouldBatchOperations,
  getRetryConfig,
};
