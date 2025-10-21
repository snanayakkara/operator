import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure React Query client with optimized caching and reduced refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache AI responses for 10 minutes (increased from 5 minutes)
      staleTime: 10 * 60 * 1000,
      // Keep cached data for 30 minutes (increased from 10 minutes)
      gcTime: 30 * 60 * 1000,
      // Retry failed requests 2 times (reduced from 3 to fail faster)
      retry: 2,
      // Don't refetch on window focus for AI responses
      refetchOnWindowFocus: false,
      // Disable automatic refetching on mount to prevent excessive requests
      refetchOnMount: false,
      // Keep refetch on reconnect for recovery after network issues
      refetchOnReconnect: true,
      // Disable global refetch interval (individual queries can override)
      refetchInterval: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
