"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold transition-all transform ${
        !isOnline
          ? "bg-amber-600 text-white border border-amber-500 animate-pulse"
          : "bg-emerald-600 text-white border border-emerald-500"
      }`}
    >
      <AppIcon name={!isOnline ? "alert" : "check"} className="w-4 h-4" />
      <span>
        {!isOnline
          ? "You are currently offline. Changes will sync once reconnected."
          : "Internet connection restored! Syncing data..."}
      </span>
    </div>
  );
}
