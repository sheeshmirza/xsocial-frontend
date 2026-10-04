"use client";

import { useEffect } from "react";
import ErrorFallback, { ErrorType } from "@/src/components/ui/ErrorFallback";
import { telemetry } from "@/src/lib/telemetry";

export default function PagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    telemetry.captureException(error, { digest: error.digest, context: "pages_error" });
  }, [error]);

  let type: ErrorType = "unknown";
  if (error.message.includes("401") || error.message.toLowerCase().includes("session expired")) {
    type = "401";
  } else if (error.message.includes("403")) {
    type = "403";
  } else if (error.message.includes("404")) {
    type = "404";
  } else if (error.message.includes("500")) {
    type = "500";
  } else if (error.message.toLowerCase().includes("timed out")) {
    type = "timeout";
  }

  return <ErrorFallback type={type} message={error.message} onRetry={reset} />;
}
