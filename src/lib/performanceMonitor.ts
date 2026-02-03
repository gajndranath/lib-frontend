/**
 * Performance monitoring and analytics
 * Track API response times, component render times, and bundle sizes
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics

  /**
   * Record API call performance
   */
  recordApiCall(endpoint: string, duration: number, status: number): void {
    this.recordMetric({
      name: `api:${endpoint}`,
      duration,
      tags: {
        status: String(status),
        endpoint,
      },
    });
  }

  /**
   * Record component render time
   */
  recordComponentRender(componentName: string, duration: number): void {
    this.recordMetric({
      name: `component:${componentName}`,
      duration,
      tags: {
        component: componentName,
      },
    });
  }

  /**
   * Record custom metric
   */
  recordMetric(metric: Omit<PerformanceMetric, "timestamp">): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics to prevent memory leak
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow requests in development
    if (import.meta.env.DEV && metric.duration > 1000) {
      console.warn(
        `[Performance] Slow operation: ${metric.name} took ${metric.duration}ms`,
      );
    }
  }

  /**
   * Get average duration for metric
   */
  getAverageDuration(metricName: string): number {
    const filtered = this.metrics.filter((m) => m.name === metricName);
    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  /**
   * Get all metrics for analysis
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    totalMetrics: number;
    avgApiDuration: number;
    slowestApi: { endpoint: string; duration: number } | null;
  } {
    const apiMetrics = this.metrics.filter((m) => m.name.startsWith("api:"));
    const avgDuration =
      apiMetrics.length > 0
        ? apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length
        : 0;

    const slowest = apiMetrics.reduce((max, m) =>
      m.duration > max.duration ? m : max,
    );

    return {
      totalMetrics: this.metrics.length,
      avgApiDuration: Math.round(avgDuration),
      slowestApi: slowest
        ? {
            endpoint: slowest.tags?.endpoint || "unknown",
            duration: slowest.duration,
          }
        : null,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for analytics
   */
  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Log summary periodically in development
if (import.meta.env.DEV) {
  setInterval(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.totalMetrics > 0) {
      console.log("[Performance Summary]", summary);
    }
  }, 60000); // Log every 60 seconds
}
