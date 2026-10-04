/**
 * Centralized telemetry and runtime monitoring utility.
 * Captures exceptions, user interactions, and Core Web Vitals for production diagnostics.
 */

type TelemetrySeverity = "info" | "warning" | "error" | "fatal";

interface TelemetryEvent {
  name: string;
  category: "ui" | "network" | "auth" | "performance";
  severity?: TelemetrySeverity;
  data?: Record<string, any>;
  timestamp?: number;
}

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class TelemetryService {
  private isBrowser = typeof window !== "undefined";
  private isDev = process.env.NODE_ENV !== "production";

  /**
   * Log a general telemetry event
   */
  public trackEvent(event: TelemetryEvent): void {
    const payload = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    };

    if (this.isDev) {
      // Clean console reporting in development
      // eslint-disable-next-line no-console
      console.debug(`[Telemetry:${payload.category}] ${payload.name}`, payload.data || "");
    }

    // In production, buffer or dispatch to monitoring endpoint / Sentry
    if (this.isBrowser && !this.isDev) {
      try {
        // Ready for Sentry / PostHog / Datadog dispatcher
        window.dispatchEvent(new CustomEvent("xsocial:telemetry", { detail: payload }));
      } catch {
        // Fallback gracefully without breaking UI
      }
    }
  }

  /**
   * Capture and report an unhandled or caught application exception
   */
  public captureException(error: unknown, context?: Record<string, any>): void {
    const report: ErrorReport = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: this.isBrowser ? window.location.href : undefined,
      userAgent: this.isBrowser ? navigator.userAgent : undefined,
      timestamp: Date.now(),
      metadata: context,
    };

    // eslint-disable-next-line no-console
    console.error("[Telemetry:Exception]", report);

    if (this.isBrowser && !this.isDev) {
      try {
        window.dispatchEvent(new CustomEvent("xsocial:error", { detail: report }));
      } catch {
        // Ignore telemetry dispatch failure
      }
    }
  }

  /**
   * Track Web Vitals (LCP, CLS, FID, INP, TTFB)
   */
  public trackMetric(name: string, value: number, rating?: "good" | "needs-improvement" | "poor"): void {
    this.trackEvent({
      name: `vitals:${name}`,
      category: "performance",
      severity: rating === "poor" ? "warning" : "info",
      data: { value, rating },
    });
  }
}

export const telemetry = new TelemetryService();
