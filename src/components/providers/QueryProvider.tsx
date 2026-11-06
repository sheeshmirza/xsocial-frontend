"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiHttpError } from "@/src/lib/session";

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute fresh
            gcTime: 5 * 60 * 1000, // 5 minutes cache
            retry: (failureCount, error) => {
              // Do not retry 400/401/403/404/422 errors
              if (error instanceof ApiHttpError && [400, 401, 403, 404, 422].includes(error.status)) {
                return false;
              }
              if (error instanceof Error) {
                const msg = error.message.toLowerCase();
                if (
                  msg.includes("400") ||
                  msg.includes("401") ||
                  msg.includes("403") ||
                  msg.includes("404") ||
                  msg.includes("session expired")
                ) {
                  return false;
                }
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
