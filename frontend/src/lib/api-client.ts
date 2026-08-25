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

// ---- ชนิดข้อมูลที่ตรงกับ backend (Go structs ใน models/) ----

export type ApiMachine = { id: string; name: string; status: string; hours: number };

export type ApiPlan = {
  id: number;
  product: string;
  target: number;
  done: number;
  dueDate?: string | null;
  status: string;
};

export type ApiRawMaterial = {
  rmID: string;
  rawMaterial: string;
  amount: number;
  unit: string;
  max: number;
  min: number;
};

// ---- ตัวช่วยเรียก endpoint แต่ละกลุ่ม (ตรงกับ backend/handlers) ----

export const machinesApi = {
  list: () => apiFetch<ApiMachine[]>("/api/machines"),
  create: (m: ApiMachine) =>
    apiFetch<{ ok: boolean }>("/api/machines", { method: "POST", body: JSON.stringify(m) }),
};

export const plansApi = {
  list: () => apiFetch<ApiPlan[]>("/api/plans"),
  create: (p: Pick<ApiPlan, "product" | "target"> & Partial<ApiPlan>) =>
    apiFetch<ApiPlan>("/api/plans", { method: "POST", body: JSON.stringify(p) }),
  updateProgress: (id: number, done: number, status: string) =>
    apiFetch<{ ok: boolean }>(`/api/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify({ done, status }),
    }),
};

export const materialsApi = {
  list: () => apiFetch<ApiRawMaterial[]>("/api/materials"),
  create: (m: ApiRawMaterial) =>
    apiFetch<ApiRawMaterial>("/api/materials", { method: "POST", body: JSON.stringify(m) }),
  updateStock: (rmID: string, amount: number) =>
    apiFetch<{ ok: boolean }>(`/api/materials/${rmID}`, {
      method: "PUT",
      body: JSON.stringify({ amount }),
    }),
};

export type ApiRawMaterialLocation = {
  rmLocationID: string;
  location: string;
  paletteNumber: string;
  lotNumber: string;
  amount: number;
  rmID: string;
};

export type ApiRawMaterialRecord = {
  timestamp: string;
  rmRecordID: string;
  type: string;
  amount: number;
  leftAmount: number;
  handler: string;
  agency: string;
  orderID: string;
  rmLocationID: string;
  rmID: string;
};

export const materialLocationsApi = {
  list: (rmID?: string) =>
    apiFetch<ApiRawMaterialLocation[]>(`/api/materials/locations${rmID ? `?rmID=${encodeURIComponent(rmID)}` : ""}`),
  create: (loc: Omit<ApiRawMaterialLocation, "rmLocationID"> & { rmLocationID?: string }) =>
    apiFetch<ApiRawMaterialLocation>("/api/materials/locations", { method: "POST", body: JSON.stringify(loc) }),
  update: (rmLocationID: string, amount: number, location: string) =>
    apiFetch<{ ok: boolean }>(`/api/materials/locations/${rmLocationID}`, {
      method: "PUT",
      body: JSON.stringify({ amount, location }),
    }),
};

export const materialRecordsApi = {
  list: (rmID?: string) =>
    apiFetch<ApiRawMaterialRecord[]>(`/api/materials/records${rmID ? `?rmID=${encodeURIComponent(rmID)}` : ""}`),
  create: (rec: Omit<ApiRawMaterialRecord, "rmRecordID" | "timestamp"> & { rmRecordID?: string }) =>
    apiFetch<ApiRawMaterialRecord>("/api/materials/records", { method: "POST", body: JSON.stringify(rec) }),
};

// ---- บุคลากร (Personnel) ----

export type ApiPersonnel = { id: string; name: string; role: string; dept: string; status: string };

export const personnelApi = {
  list: () => apiFetch<ApiPersonnel[]>("/api/personnel"),
  create: (p: Omit<ApiPersonnel, "id"> & { id?: string }) =>
    apiFetch<ApiPersonnel>("/api/personnel", { method: "POST", body: JSON.stringify(p) }),
  updateStatus: (id: string, status: string) =>
    apiFetch<{ ok: boolean }>(`/api/personnel/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
};

// ---- ปัญหาการผลิต (Issues) ----

export type ApiIssue = {
  timestamp: string;
  issue_id: string;
  reporter_id: string;
  issue: string;
  description_id: string;
  solution_provider_id?: string;
  solutions?: string;
  status: string;
  orderID: string;
};

export const issuesApi = {
  list: () => apiFetch<ApiIssue[]>("/api/issues"),
  create: (iss: Omit<ApiIssue, "issue_id" | "timestamp"> & { issue_id?: string }) =>
    apiFetch<ApiIssue>("/api/issues", { method: "POST", body: JSON.stringify(iss) }),
  update: (issueID: string, body: { solution_provider_id?: string; solutions?: string; status: string }) =>
    apiFetch<{ ok: boolean }>(`/api/issues/${issueID}`, { method: "PUT", body: JSON.stringify(body) }),
};

// ---- สินค้าระหว่างผลิต (Work In Process) ----

export type ApiWorkInProcess = { wipID: string; wip: string; inStage: string; amount: number; unit: string; max: number };

export type ApiWipLocation = {
  wipLocationID: string;
  location: string;
  paletteNumber: string;
  lotNumber: string;
  amount: number;
  wipID: string;
};

export type ApiWipRecord = {
  timestamp: string;
  wipRecordID: string;
  type: string;
  inStage: string;
  amount: number;
  leftAmount: number;
  handler: string;
  agency: string;
  orderID: string;
  wipLocationID: string;
  wipID: string;
};

export type ApiRequisitionSlip = {
  timestamp: string;
  slipID: string;
  amount: number;
  status: string;
  handler: string;
  approver?: string;
  approveTime?: string;
  orderID: string;
  wipID: string;
};

export const wipApi = {
  list: () => apiFetch<ApiWorkInProcess[]>("/api/wip"),
  create: (w: ApiWorkInProcess) => apiFetch<ApiWorkInProcess>("/api/wip", { method: "POST", body: JSON.stringify(w) }),
  updateAmount: (wipID: string, amount: number) =>
    apiFetch<{ ok: boolean }>(`/api/wip/${wipID}`, { method: "PUT", body: JSON.stringify({ amount }) }),
};

export const wipLocationsApi = {
  list: (wipID?: string) =>
    apiFetch<ApiWipLocation[]>(`/api/wip/locations${wipID ? `?wipID=${encodeURIComponent(wipID)}` : ""}`),
  create: (loc: Omit<ApiWipLocation, "wipLocationID"> & { wipLocationID?: string }) =>
    apiFetch<ApiWipLocation>("/api/wip/locations", { method: "POST", body: JSON.stringify(loc) }),
};

export const wipRecordsApi = {
  list: (wipID?: string) =>
    apiFetch<ApiWipRecord[]>(`/api/wip/records${wipID ? `?wipID=${encodeURIComponent(wipID)}` : ""}`),
  create: (rec: Omit<ApiWipRecord, "wipRecordID" | "timestamp"> & { wipRecordID?: string }) =>
    apiFetch<ApiWipRecord>("/api/wip/records", { method: "POST", body: JSON.stringify(rec) }),
};

export const requisitionsApi = {
  list: () => apiFetch<ApiRequisitionSlip[]>("/api/wip/requisitions"),
  create: (slip: Omit<ApiRequisitionSlip, "slipID" | "timestamp" | "status"> & { slipID?: string; status?: string }) =>
    apiFetch<ApiRequisitionSlip>("/api/wip/requisitions", { method: "POST", body: JSON.stringify(slip) }),
};

// ---- ใบสั่งผลิต (Work Orders / Production Orders) ----

export type ApiWorkOrder = {
  timestamp: string;
  orderID: string;
  name: string;
  status: string;
  amount: number;
  machines: string;
  startDate: string;
  endDate: string;
  planID: string;
};

export type ApiWork = { workID: string; work: string; startDate: string; endDate: string; orderID: string };

export const workOrdersApi = {
  list: () => apiFetch<ApiWorkOrder[]>("/api/work-orders"),
  create: (o: Omit<ApiWorkOrder, "orderID" | "timestamp"> & { orderID?: string }) =>
    apiFetch<ApiWorkOrder>("/api/work-orders", { method: "POST", body: JSON.stringify(o) }),
  updateStatus: (orderID: string, status: string, machines?: string) =>
    apiFetch<{ ok: boolean }>(`/api/work-orders/${orderID}`, {
      method: "PUT",
      body: JSON.stringify({ status, machines }),
    }),
};

export const workApi = {
  list: (orderID?: string) =>
    apiFetch<ApiWork[]>(`/api/work-orders/work${orderID ? `?orderID=${encodeURIComponent(orderID)}` : ""}`),
  create: (w: Omit<ApiWork, "workID"> & { workID?: string }) =>
    apiFetch<ApiWork>("/api/work-orders/work", { method: "POST", body: JSON.stringify(w) }),
};
