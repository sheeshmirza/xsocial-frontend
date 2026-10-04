"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute fresh
            gcTime: 5 * 60 * 1000, // 5 minutes cache
            retry: (failureCount, error) => {
              // Do not retry 401/403/404 errors
              if (error instanceof Error && error.message.includes("401")) return false;
              if (error instanceof Error && error.message.includes("403")) return false;
              if (error instanceof Error && error.message.includes("404")) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
