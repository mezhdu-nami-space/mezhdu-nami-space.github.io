"use client";

type AppConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  basePath?: string;
};

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: { id: string; email?: string; user_metadata?: Record<string, unknown> };
};

declare global {
  interface Window {
    MEZHDU_NAMI_CONFIG?: AppConfig;
  }
}

const SESSION_KEY = "mezhdu_nami_session_v1";
const signedCache = new Map<string, { url: string; expires: number }>();

function config(): Required<AppConfig> {
  if (typeof window === "undefined") return { supabaseUrl: "", supabaseAnonKey: "", basePath: "" };
  const value = window.MEZHDU_NAMI_CONFIG ?? {};
  return {
    supabaseUrl: (value.supabaseUrl ?? "").replace(/\/$/, ""),
    supabaseAnonKey: value.supabaseAnonKey ?? "",
    basePath: value.basePath ?? "/mezhdu-nami",
  };
}

export function appPath(path = "/") {
  const base = config().basePath.replace(/\/$/, "");
  const tail = path.startsWith("/") ? path : `/${path}`;
  return `${base}${tail}`.replace(/\/+/g, "/");
}

export function configured() {
  const c = config();
  return /^https:\/\/.+\.supabase\.co$/i.test(c.supabaseUrl) && c.supabaseAnonKey.length > 20;
}

function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as AuthSession | null; }
  catch { return null; }
}

function saveSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) localStorage.removeItem(SESSION_KEY);
  else {
    if (!session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

async function authFetch(path: string, init: RequestInit = {}) {
  const c = config();
  if (!configured()) throw new Error("Приложение ещё не подключено к Supabase. Откройте файл config.js и вставьте Project URL и Publishable/anon key.");
  const headers = new Headers(init.headers);
  headers.set("apikey", c.supabaseAnonKey);
  if (!(init.body instanceof FormData)) headers.set("content-type", "application/json");
  return fetch(`${c.supabaseUrl}/auth/v1${path}`, { ...init, headers });
}

export async function signIn(email: string, password: string) {
  const response = await authFetch("/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error_description || data?.msg || "Не удалось войти. Проверьте почту и пароль.");
  saveSession(data as AuthSession);
  return data as AuthSession;
}

export function signInWithYandex() {
  const c = config();
  if (!configured()) throw new Error("Приложение ещё не подключено к Supabase.");
  const redirectTo = `${window.location.origin}${appPath("/")}`;
  const url = new URL(`${c.supabaseUrl}/auth/v1/authorize`);
  url.searchParams.set("provider", "custom:yandex");
  url.searchParams.set("redirect_to", redirectTo);
  window.location.href = url.toString();
}

export async function signUp(email: string, password: string, name: string) {
  const redirectTo = `${window.location.origin}${appPath("/")}`;
  const response = await authFetch(`/signup?redirect_to=${encodeURIComponent(redirectTo)}`, { method: "POST", body: JSON.stringify({ email, password, data: { name } }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.msg || data?.error_description || "Не удалось создать аккаунт.");
  if (data?.access_token) saveSession(data as AuthSession);
  return data as AuthSession;
}

export async function requestPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}${appPath("/reset-password/")}`;
  const response = await authFetch(`/recover?redirect_to=${encodeURIComponent(redirectTo)}`, { method: "POST", body: JSON.stringify({ email }) });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.msg || "Не удалось отправить письмо для восстановления.");
  }
}

export function acceptSessionFromUrl() {
  if (typeof window === "undefined" || !window.location.hash) return false;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return false;
  const expires_in = Number(params.get("expires_in") || 3600);
  saveSession({ access_token, refresh_token, expires_in, expires_at: Math.floor(Date.now() / 1000) + expires_in, token_type: params.get("token_type") || "bearer" });
  history.replaceState(null, "", window.location.pathname + window.location.search);
  return true;
}

async function refreshSession() {
  const session = readSession();
  if (!session?.refresh_token) return null;
  const response = await authFetch("/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) });
  if (!response.ok) { saveSession(null); return null; }
  const data = await response.json() as AuthSession;
  saveSession(data);
  return data;
}

async function activeSession() {
  let session = readSession();
  if (!session) return null;
  if ((session.expires_at ?? 0) < Math.floor(Date.now() / 1000) + 60) session = await refreshSession();
  return session;
}

export async function updatePassword(password: string) {
  const session = await activeSession();
  if (!session) throw new Error("Ссылка восстановления устарела. Запросите новое письмо.");
  const response = await authFetch("/user", { method: "PUT", headers: { Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ password }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.msg || "Не удалось изменить пароль.");
}

export async function signOut() {
  const session = await activeSession();
  if (session) await authFetch("/logout", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => undefined);
  saveSession(null);
}

async function apiFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const c = config();
  if (!configured()) throw new Error("Приложение ещё не подключено к Supabase. Вставьте настройки в config.js.");
  const session = await activeSession();
  if (!session) throw new Error("AUTH_REQUIRED");
  const headers = new Headers(init.headers);
  headers.set("apikey", c.supabaseAnonKey);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (!(init.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${c.supabaseUrl}${path}`, { ...init, headers });
  if (response.status === 401 && retry && await refreshSession()) return apiFetch(path, init, false);
  return response;
}

export async function rpc<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const response = await apiFetch(`/rest/v1/rpc/${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify(args) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.hint || data?.error || "Не удалось выполнить действие.");
  return data as T;
}

function camelKey(key: string) { return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()); }
function camelize(value: unknown): any {
  if (Array.isArray(value)) return value.map(camelize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, val]) => [camelKey(key), camelize(val)]));
  }
  return value;
}

export async function appAction(action: string, payload: Record<string, unknown> = {}) {
  return rpc<Record<string, unknown>>("app_action", { p_action: action, p_payload: payload });
}

async function signedUrl(key: string) {
  if (!key) return "";
  const hit = signedCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.url;
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  const response = await apiFetch(`/storage/v1/object/sign/couple-media/${encoded}`, { method: "POST", body: JSON.stringify({ expiresIn: 3600 }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return "";
  const raw = data.signedURL || data.signedUrl || "";
  const url = raw.startsWith("http") ? raw : `${config().supabaseUrl}/storage/v1${raw}`;
  if (url) signedCache.set(key, { url, expires: Date.now() + 50 * 60 * 1000 });
  return url;
}

export async function appGet<T = unknown>(): Promise<T> {
  const raw = await rpc<Record<string, unknown>>("app_get");
  const data = camelize(raw);
  const keys = new Set<string>();
  const add = (value?: string | null) => { if (value) keys.add(value); };
  add(data?.pair?.backgroundKey);
  for (const item of data?.members ?? []) add(item.avatarKey);
  for (const item of data?.events ?? []) add(item.photoKey);
  for (const item of data?.messages ?? []) add(item.photoKey);
  for (const item of data?.wishes ?? []) add(item.photoKey);
  const urls = new Map<string, string>();
  await Promise.all([...keys].map(async key => urls.set(key, await signedUrl(key))));
  if (data?.pair?.backgroundKey) data.pair.backgroundUrl = urls.get(data.pair.backgroundKey) || "";
  for (const item of data?.members ?? []) if (item.avatarKey) item.avatarUrl = urls.get(item.avatarKey) || "";
  for (const item of data?.events ?? []) if (item.photoKey) item.photoUrl = urls.get(item.photoKey) || "";
  for (const item of data?.messages ?? []) if (item.photoKey) item.photoUrl = urls.get(item.photoKey) || "";
  for (const item of data?.wishes ?? []) if (item.photoKey) item.photoUrl = urls.get(item.photoKey) || "";
  return data as T;
}

export async function uploadMedia(file: File, purpose: string, targetId = "", content = "") {
  const state = await appGet<any>();
  if (!state?.pair?.id || !state?.user?.id) throw new Error("Сначала создайте пространство пары.");
  const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
  const key = `${state.pair.id}/${purpose}/${targetId || state.user.id}-${crypto.randomUUID()}.${ext}`;
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  const response = await apiFetch(`/storage/v1/object/couple-media/${encoded}`, { method: "POST", headers: { "content-type": file.type, "x-upsert": "false" }, body: file });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || result?.error || "Не удалось загрузить фотографию.");
  await appAction("setPhoto", { purpose, targetId, key, content });
  signedCache.delete(key);
  return key;
}

export async function uploadSecretBlob(blob: Blob) {
  const state = await appGet<any>();
  if (!state?.pair?.id) throw new Error("Нет доступа к пространству пары.");
  const key = `${state.pair.id}/secret/${crypto.randomUUID()}.bin`;
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  const response = await apiFetch(`/storage/v1/object/couple-media/${encoded}`, { method: "POST", headers: { "content-type": "application/octet-stream", "x-upsert": "false" }, body: blob });
  if (!response.ok) throw new Error("Не удалось сохранить защищённую фотографию.");
  return key;
}

export async function downloadSecretBlob(key: string) {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  const response = await apiFetch(`/storage/v1/object/authenticated/couple-media/${encoded}`, { method: "GET" });
  if (!response.ok) throw new Error("Не удалось загрузить защищённую фотографию.");
  return response.arrayBuffer();
}
