import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const client = useQueryClient();
  const notify = useToast();
  const session = useQuery({
    queryKey: ["session"],
    // No abort signal: React Query would cancel and refetch on StrictMode remount.
    queryFn: async () => {
      try {
        return await auth.getSession();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
  });
  const user = session.data ?? null;
  const loading = session.isPending;
  const error = session.error?.message ?? null;

  useEffect(() => {
    if (error) notify(error, "error");
  }, [error, notify]);
  useEffect(() => {
    if (session.data === null) {
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "session",
      });
    }
  }, [client, session.data]);

  async function refresh() {
    await session.refetch({ cancelRefetch: false });
  }
  useEffect(() => {
    const expire = () => {
      void client.cancelQueries();
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "session",
      });
      client.setQueryData(["session"], null);
      notify("Your session expired. Please sign in again.", "error");
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, [client, notify]);

  async function signIn(credentials: auth.Credentials) {
    const user = await auth.login(credentials);
    await client.cancelQueries();
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== "session",
    });
    client.setQueryData(["session"], user);
    notify("Signed in successfully", "success");
  }
  async function signOut() {
    await auth.logout();
    await client.cancelQueries();
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== "session",
    });
    client.setQueryData(["session"], null);
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
