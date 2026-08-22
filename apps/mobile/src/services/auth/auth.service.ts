import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setApiTokenStore } from "../../api/endpoints";

const ACCESS_KEY = "auth.accessToken";
const REFRESH_KEY = "auth.refreshToken";
const DEV_EMAIL = "local@widgets.app"; // dev-mode identity; real IdP flows land in Milestone 18

async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_KEY);
}

setApiTokenStore({ get: getAccessToken });

export interface SessionState {
  status: "authenticated" | "anonymous";
  email: string | null;
}

/**
 * Development-mode session bootstrap: reuse the stored access token, or
 * exchange the fixed dev identity for a fresh token pair via /auth/dev/login
 * (backend refuses this outside DEVELOPMENT_MODE).
 */
export async function ensureSession(): Promise<SessionState> {
  const existing = await getAccessToken();
  if (existing) {
    try {
      const me = await api.me();
      return { status: "authenticated", email: me.email };
    } catch {
      // Token expired or invalid — fall through to re-login.
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
