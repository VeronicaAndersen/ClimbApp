import { QueryClient } from "@tanstack/react-query";
import { shouldRetryQuery } from "./queryRetry";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
      retry: shouldRetryQuery, // Once for network errors and 5xx, never for 4xx
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: true, // Refetch when reconnecting to network
    },
    mutations: {
      retry: false, // Never resend writes such as logins automatically
    },
  },
});
