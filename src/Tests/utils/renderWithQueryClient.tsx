import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, type RenderHookOptions } from "@testing-library/react";

/** A fresh QueryClient per test, without retries so errors surface at once. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/** renderHook inside a QueryClientProvider; returns the client for assertions. */
export function renderHookWithQueryClient<Result, Props>(
  hook: (props: Props) => Result,
  options: Omit<RenderHookOptions<Props>, "wrapper"> = {}
) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(hook, { ...options, wrapper }) };
}
