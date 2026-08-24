import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setApiTokenStore } from "../../api/endpoints";

const ACCESS_KEY = "auth.accessToken";
const REFRESH_KEY = "auth.refreshToken";
const DEV_EMAIL = "local@widgets.app"; // dev-mode identity; real IdP flows land in Milestone 18

setApiTokenStore({
  get: () => AsyncStorage.getItem(ACCESS_KEY),
  refresh: async () => {
    // Refresh the access token using the stored refresh token.
    // Called by the API client on 401 before retrying the original request.
    const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;
    try {
      const tokens = await api.refresh(refreshToken);
      await AsyncStorage.setItem(ACCESS_KEY, tokens.accessToken);
      await AsyncStorage.setItem(REFRESH_KEY, tokens.refreshToken);
      return true;
    } catch {
      // Refresh rejected (rotated out / expired): force a fresh dev login.
      await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
      return false;
    }
  },
  relogin: async () => {
    const tokens = await api.devLogin(DEV_EMAIL, "Local User");
    await AsyncStorage.setItem(ACCESS_KEY, tokens.accessToken);
    await AsyncStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
});

export interface SessionState {
  status: "authenticated" | "anonymous";
  email: string | null;
}

/**
 * Development-mode session bootstrap: reuse the stored access token (or
 * refresh/re-login when it expired) via /auth/dev/login — backend refuses
 * this outside DEVELOPMENT_MODE.
 */
export async function ensureSession(): Promise<SessionState> {
  const existing = await AsyncStorage.getItem(ACCESS_KEY);
  if (existing) {
    try {
      const me = await api.me();
      return { status: "authenticated", email: me.email };
    } catch {
      // Invalid access token: try refresh, then fall through to re-login.
      if (await api.tryRefresh()) {
        try {
          const me = await api.me();
          return { status: "authenticated", email: me.email };
        } catch {
          // still failing — re-login below
        }
      }
    }
  }

  try {
    const tokens = await api.devLogin(DEV_EMAIL, "Local User");
    await AsyncStorage.setItem(ACCESS_KEY, tokens.accessToken);
    await AsyncStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    return { status: "authenticated", email: DEV_EMAIL };
  } catch {
    // Backend unreachable or dev login disabled: stay anonymous;
    // public endpoints still work and screens show offline/empty states.
    return { status: "anonymous", email: null };
  }
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}
