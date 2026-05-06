import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1_800_000,
      retry: (failureCount, error: unknown) => {
        const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: number }).status : undefined;
        if (status === 401 || status === 404) return false;
        return failureCount < 2;
      },
    },
  },
});
