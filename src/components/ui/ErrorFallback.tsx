"use client";

import Link from "next/link";
import AppIcon from "@/src/components/ui/AppIcon";

export type ErrorType = "400" | "401" | "403" | "404" | "500" | "timeout" | "network" | "unknown";

interface ErrorFallbackProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeLink?: boolean;
}

const errorConfig: Record<ErrorType, { title: string; defaultMessage: string; icon: "alert" | "shield" | "clock" }> = {
  "400": {
    title: "Invalid Request",
    defaultMessage: "The server could not process this request. Please verify the entered data and try again.",
    icon: "alert",
  },
  "401": {
    title: "Session Expired",
    defaultMessage: "Your session has timed out or is unauthorized. Please sign in again to continue.",
    icon: "shield",
  },
  "403": {
    title: "Access Forbidden",
    defaultMessage: "You do not have permission to view this resource or perform this action in this workspace.",
    icon: "shield",
  },
  "404": {
    title: "Page Not Found",
    defaultMessage: "The page or resource you requested does not exist or has been moved.",
    icon: "alert",
  },
  "500": {
    title: "Internal Server Error",
    defaultMessage: "Our backend services encountered an unexpected issue. Please retry in a few moments.",
    icon: "alert",
  },
  timeout: {
    title: "Request Timed Out",
    defaultMessage: "The server took too long to respond. Please check your network connection and retry.",
    icon: "clock",
  },
  network: {
    title: "Network Offline",
    defaultMessage: "You appear to be offline or experiencing connection drops. Reconnecting will resume operations.",
    icon: "alert",
  },
  unknown: {
    title: "Something Went Wrong",
    defaultMessage: "An unexpected error occurred while rendering this view. You can reload or return to the dashboard.",
    icon: "alert",
  },
};

export default function ErrorFallback({
  type = "unknown",
  title,
  message,
  onRetry,
  showHomeLink = true,
}: ErrorFallbackProps) {
  const config = errorConfig[type] || errorConfig.unknown;
  const displayTitle = title || config.title;
  const displayMessage = message || config.defaultMessage;

  return (
    <div className="dashboard-shell" role="alert" aria-live="assertive">
      <div className="dashboard-card max-w-lg w-full text-center p-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-200 mb-4 mx-auto">
          <AppIcon name={config.icon} className="w-7 h-7" />
        </div>
        <p className="eyebrow text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">
          {type !== "unknown" ? `Error ${type.toUpperCase()}` : "Application Error"}
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">{displayTitle}</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{displayMessage}</p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="primary-btn inline-flex items-center gap-2 px-5 py-2.5"
            >
              <AppIcon name="trend" className="w-4 h-4" />
              Try Again
            </button>
          )}
          {type === "401" ? (
            <Link href="/signin" className="solid-link inline-flex items-center gap-2 px-5 py-2.5">
              Sign In
            </Link>
          ) : showHomeLink ? (
            <Link href="/dashboard" className="outline-btn inline-flex items-center gap-2 px-5 py-2.5">
              Go to Dashboard
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
