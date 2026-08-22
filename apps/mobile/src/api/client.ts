import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";

/**
 * API base URL resolution order (spec section 64):
 * 1. EXPO_PUBLIC_API_URL baked at bundle time (.env)
 * 2. expo extra in app.json
 * 3. Android emulator loopback fallback
 */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  "http://10.0.2.2:3000/api/v1";

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
