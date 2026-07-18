// ตัวช่วยยิง API ไปที่ Go backend พร้อมแนบ JWT ใน header อัตโนมัติ
// ใช้แทนที่การเรียก supabase.from(...) เดิม

import { getToken, logout } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8090";

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    // token หมดอายุ/ไม่ถูกต้อง — เคลียร์ session ทิ้ง แล้วให้หน้าเว็บ redirect ไป /auth เอง
    await logout();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
