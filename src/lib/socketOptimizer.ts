/**
 * Socket.io event throttling and deduplication utility
 * Prevents duplicate events and throttles rapid updates
 */

class SocketEventOptimizer {
  private eventLastEmitTime = new Map<string, number>();
  private eventThrottleMs: Record<string, number> = {
    "user-status": 1000, // Throttle user status updates to 1s
    typing: 500, // Throttle typing indicators to 500ms
    "cursor-position": 300, // Throttle cursor to 300ms
    notification: 100, // Don't throttle notifications
  };
  private lastEventData = new Map<string, unknown>();

  /**
   * Check if event should be emitted based on throttling and deduplication
   */
  shouldEmit(eventName: string, data: unknown): boolean {
    const now = Date.now();
    const lastEmit = this.eventLastEmitTime.get(eventName) || 0;
    const throttle = this.eventThrottleMs[eventName] || 0;

    // Check if within throttle window
    if (now - lastEmit < throttle) {
      return false;
    }

    // Check if data is duplicate (for data-heavy events)
    const lastData = this.lastEventData.get(eventName);
    if (JSON.stringify(lastData) === JSON.stringify(data)) {
      return false;
    }

    return true;
  }

  /**
   * Record event emission
   */
  recordEmit(eventName: string, data: unknown): void {
    this.eventLastEmitTime.set(eventName, Date.now());
    this.lastEventData.set(eventName, data);
  }

  /**
   * Get throttle delay for event
   */
  getThrottleDelay(eventName: string): number {
    return this.eventThrottleMs[eventName] || 0;
  }

  /**
   * Set custom throttle for event
   */
  setThrottle(eventName: string, ms: number): void {
    this.eventThrottleMs[eventName] = ms;
  }

  /**
   * Reset throttle for event
   */
  resetEvent(eventName: string): void {
    this.eventLastEmitTime.delete(eventName);
    this.lastEventData.delete(eventName);
  }

  /**
   * Clear all throttles
   */
  clear(): void {
    this.eventLastEmitTime.clear();
    this.lastEventData.clear();
  }
}

export const socketEventOptimizer = new SocketEventOptimizer();
