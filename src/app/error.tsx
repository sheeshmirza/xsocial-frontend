"use client";

import { useEffect } from "react";
import ErrorFallback, { ErrorType } from "@/src/components/ui/ErrorFallback";
import { telemetry } from "@/src/lib/telemetry";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
}) {
  useEffect(() => {
    telemetry.captureException(error, { digest: error.digest });
  }, [error]);

  let type: ErrorType = "unknown";
  if (error.message.includes("401") || error.message.toLowerCase().includes("unauthorized") || error.message.toLowerCase().includes("session expired")) {
    type = "401";
  } else if (error.message.includes("403") || error.message.toLowerCase().includes("forbidden")) {
    type = "403";
  } else if (error.message.includes("404") || error.message.toLowerCase().includes("not found")) {
    type = "404";
  } else if (error.message.toLowerCase().includes("timed out")) {
    type = "timeout";
  } else if (error.message.toLowerCase().includes("offline") || error.message.toLowerCase().includes("network")) {
    type = "network";
  } else if (error.message.includes("500") || error.message.toLowerCase().includes("server error")) {
    type = "500";
  }

  return <ErrorFallback type={type} message={error.message} onRetry={reset} />;
}
