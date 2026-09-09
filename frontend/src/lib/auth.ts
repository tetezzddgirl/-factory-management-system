// เชื่อมกับ Go backend (factoryflow) แทน Supabase Auth
// เก็บ JWT ใน localStorage แล้วแนบ Authorization header เองผ่าน apiFetch (ดู api-client.ts)

const TOKEN_KEY = "ff:token";
const AUTH_EVENT = "ff-auth-changed";

export type AuthSession = {
  token: string;
  userId: string;
  email: string;
};

function decodeJwtPayload(token: string): { sub?: string; email?: string; exp?: number } | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isExpired(payload: { exp?: number } | null): boolean {
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

/** อ่าน session ปัจจุบันจาก localStorage (sync, ใช้ได้เฉพาะฝั่ง client) */
export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload?.sub || isExpired(payload)) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return { token, userId: String(payload.sub), email: payload.email ?? "" };
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

function setSession(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { signedIn: true } }));
}

/** เหมือน supabase.auth.onAuthStateChange แต่ผูกกับ event ของเราเอง */
export function onAuthStateChange(callback: (signedIn: boolean) => void) {
  const handler = (e: Event) => callback((e as CustomEvent).detail?.signedIn ?? false);
  window.addEventListener(AUTH_EVENT, handler);
  return {
    unsubscribe: () => window.removeEventListener(AUTH_EVENT, handler),
  };
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8090";

async function authRequest(path: "/auth/login" | "/auth/signup", email: string, password: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || (path === "/auth/login" ? "เข้าสู่ระบบไม่สำเร็จ" : "สมัครสมาชิกไม่สำเร็จ"));
  }
  const data: { token: string } = await res.json();
  setSession(data.token);
  return data.token;
}

export async function login(email: string, password: string) {
  return authRequest("/auth/login", email, password);
}

/** หมายเหตุ: backend Go ปัจจุบันรับแค่ email/password ตอน signup ยังไม่รองรับ display name */
export async function signup(email: string, password: string) {
  return authRequest("/auth/signup", email, password);
}

export async function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { signedIn: false } }));
}
