"use client";

import { useEffect } from "react";
import ErrorFallback from "@/src/components/ui/ErrorFallback";
import { telemetry } from "@/src/lib/telemetry";
import "./global.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    telemetry.captureException(error, { digest: error.digest, context: "global_error" });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorFallback
          type="500"
          title="Something Went Wrong"
          message="We ran into an unexpected problem while loading the app. Please click below to reload and try again."
          onRetry={reset}
        />
      </body>
    </html>
  );
}
