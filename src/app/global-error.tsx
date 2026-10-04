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
          title="Critical Application Error"
          message="A fatal error occurred while loading XSocial. Click below to reload the application."
          onRetry={reset}
        />
      </body>
    </html>
  );
}
