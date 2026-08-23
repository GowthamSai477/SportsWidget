import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { API_BASE_CANDIDATES } from "./base-url";

// Offline-first (spec section 20): serve cache instantly, refresh in background.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 7 * 24 * 3600_000,
      networkMode: "offlineFirst",
      retry: 2,
      retryDelay: (attempt) => Math.min(4000, 500 * Math.pow(2, attempt)),
    },
  },
});

export const queryPersister = createAsyncStoragePersister({ storage: AsyncStorage });

export { API_BASE_CANDIDATES };
