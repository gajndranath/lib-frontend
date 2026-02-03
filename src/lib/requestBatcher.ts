/**
 * Request batching utility to reduce number of API calls
 * Batches multiple requests and sends them together
 */

interface BatchRequest {
  key: string;
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

class RequestBatcher {
  private batch: Map<string, BatchRequest> = new Map();
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly batchDelay = 10; // 10ms delay to accumulate requests
  private readonly maxBatchSize = 20; // Max requests per batch

  /**
   * Add request to batch
   */
  addRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.batch.has(key)) {
        // Return cached promise if duplicate request
        const existing = this.batch.get(key)!;
        existing.promise
          .then(() => resolve(existing.resolve as unknown as T))
          .catch(reject);
        return;
      }

      const batchRequest: BatchRequest = {
        key,
        promise: request() as Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      };

      this.batch.set(key, batchRequest);

      // Process batch if it reaches max size
      if (this.batch.size >= this.maxBatchSize) {
        this.processBatch();
      } else if (!this.batchTimeout) {
        // Schedule batch processing
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.batchDelay);
      }
    });
  }

  private processBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const requests = Array.from(this.batch.values());
    this.batch.clear();

    // Execute all requests in parallel
    Promise.all(requests.map((req) => req.promise))
      .then((results) => {
        requests.forEach((req, index) => {
          req.resolve(results[index]);
        });
      })
      .catch((error) => {
        requests.forEach((req) => {
          req.reject(error);
        });
      });
  }

  /**
   * Force flush remaining batch
   */
  flush(): void {
    if (this.batch.size > 0) {
      this.processBatch();
    }
  }
}

export const requestBatcher = new RequestBatcher();

// Auto-flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    requestBatcher.flush();
  });
}
