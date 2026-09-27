import { postJson, requestJson } from "./http";

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
  return (await postJson<{ data: AuthUser }>("auth/login", credentials)).data;
}

export function logout() {
  return postJson("auth/logout");
}
