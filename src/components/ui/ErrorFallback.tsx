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

const errorConfig: Record<ErrorType, { title: string; defaultMessage: string; icon: "alert" | "shield" | "clock"; tag: string }> = {
  "400": {
    title: "Check Your Details",
    defaultMessage: "Some of the information entered looks incorrect or is missing. Please check your inputs and try again.",
    icon: "alert",
    tag: "Needs Attention",
  },
  "401": {
    title: "Please Sign In Again",
    defaultMessage: "You have been signed out to protect your account. Please sign back in to continue.",
    icon: "shield",
    tag: "Sign In Required",
  },
  "403": {
    title: "Permission Needed",
    defaultMessage: "You do not have access to view this page or perform this action. Please ask your team administrator for help.",
    icon: "shield",
    tag: "Restricted",
  },
  "404": {
    title: "We Couldn't Find That Page",
    defaultMessage: "The link you followed might be broken, or the page may have been moved.",
    icon: "alert",
    tag: "Not Found",
  },
  "500": {
    title: "Something Went Wrong on Our End",
    defaultMessage: "We ran into an unexpected hiccup. Please wait a moment and try again.",
    icon: "alert",
    tag: "Temporary Issue",
  },
  timeout: {
    title: "Taking Longer Than Usual",
    defaultMessage: "The request took too long to finish. Please check your internet connection and try again.",
    icon: "clock",
    tag: "Connection Delay",
  },
  network: {
    title: "No Internet Connection",
    defaultMessage: "You are currently offline. Check your Wi-Fi or mobile data to continue.",
    icon: "alert",
    tag: "Offline",
  },
  unknown: {
    title: "Something Went Wrong",
    defaultMessage: "We ran into a problem loading this screen. You can try refreshing or return to your dashboard.",
    icon: "alert",
    tag: "Notice",
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
          {config.tag}
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
