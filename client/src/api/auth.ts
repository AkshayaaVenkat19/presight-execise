import { requestJson } from "./http";

export interface AuthUser {
  id: number;
  username: string;
}
export interface Credentials {
  username: string;
  password: string;
}

export async function getSession(signal: AbortSignal) {
  return (await requestJson<{ data: AuthUser }>("auth/me", { signal })).data;
}

export async function login(credentials: Credentials) {
  return (
    await requestJson<{ data: AuthUser }>("auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    })
  ).data;
}

export function logout() {
  return requestJson("auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}
