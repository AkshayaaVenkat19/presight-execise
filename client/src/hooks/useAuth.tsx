import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as auth from "../api/auth";
import { ApiError } from "../api/http";
import { useToast } from "../components/feedback/ToastProvider";

type AuthState = {
  user: auth.AuthUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signIn: (credentials: auth.Credentials) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<auth.AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const client = useQueryClient();
  const notify = useToast();
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(await auth.getSession());
    } catch (error) {
      setUser(null);
      if (!(error instanceof ApiError && error.status === 401)) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to check your session";
        setError(message);
        notify(message, "error");
      }
    } finally {
      setLoading(false);
    }
  }, [notify]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const expire = () => {
      setUser(null);
      client.clear();
      notify("Your session expired. Please sign in again.", "error");
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, [client, notify]);

  async function signIn(credentials: auth.Credentials) {
    const user = await auth.login(credentials);
    client.clear();
    setError(null);
    setUser(user);
    notify("Signed in successfully", "success");
  }
  async function signOut() {
    await auth.logout();
    setUser(null);
    client.clear();
    notify("Signed out successfully", "success");
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, error, refresh, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
