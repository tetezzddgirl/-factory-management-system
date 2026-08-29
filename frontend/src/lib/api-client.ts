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

export type ApiProductionPlan = {
  planID: string;
  name: string;
  status: string;
  amount: number;
  priority: string;
  startDate?: string | null;
  endDate?: string | null;
};

export type ApiRawMaterial = {
  rmID: string;
  rawMaterial: string;
  amount: number;
  unit: string;
  max: number;
  min: number;
};

// ---- สินค้า/ผลิตภัณฑ์ + สูตรการผลิต (Product & Formula/BOM master data) ----

export type ApiProduct = { productID: string; name: string; unit: string };
export type ApiFormulaItem = { id: number; bomID: string; productID: string; rmID: string; qtyPerUnit: number; unit: string };

export const productsApi = {
  list: () => apiFetch<ApiProduct[]>("/api/products"),
  create: (p: Omit<ApiProduct, "productID"> & { productID?: string }) =>
    apiFetch<ApiProduct>("/api/products", { method: "POST", body: JSON.stringify(p) }),
};

export const formulasApi = {
  list: () => apiFetch<ApiFormulaItem[]>("/api/formulas"),
  create: (f: Omit<ApiFormulaItem, "id">) =>
    apiFetch<ApiFormulaItem>("/api/formulas", { method: "POST", body: JSON.stringify(f) }),
};

/** ดึงบรรทัดสูตรการผลิตของสินค้าตัวหนึ่ง (จาก productID) ออกมาจากรายการสูตรทั้งหมด */
export function formulaFor(formulas: ApiFormulaItem[], productID: string): ApiFormulaItem[] {
  return formulas.filter((f) => f.productID === productID);
}

/** คำนวณยอดวัตถุดิบที่ต้องใช้จริง = qtyPerUnit ในสูตร x จำนวนที่จะผลิต สำหรับสินค้าตัวหนึ่ง
 *  คืนค่าเป็น array ของ {rmID, name, required, available, unit} พร้อมชื่อ/ยอดคงเหลือจริงจาก rawMaterial (ถ้ามี) */
export function computeRequiredMaterials(
  formulas: ApiFormulaItem[],
  rawMaterial: ApiRawMaterial[],
  productID: string,
  amount: number,
): { rmID: string; name: string; required: number; available: number; unit: string }[] {
  return formulaFor(formulas, productID).map((f) => {
    const mat = rawMaterial.find((m) => m.rmID === f.rmID);
    return {
      rmID: f.rmID,
      name: mat?.rawMaterial ?? f.rmID,
      required: Math.round(f.qtyPerUnit * amount * 1000) / 1000,
      available: mat?.amount ?? 0,
      unit: f.unit || mat?.unit || "",
    };
  });
}

// ---- ตัวช่วยเรียก endpoint แต่ละกลุ่ม (ตรงกับ backend/handlers) ----

export const machinesApi = {
  list: () => apiFetch<ApiMachine[]>("/api/machines"),
  create: (m: ApiMachine) =>
    apiFetch<{ ok: boolean }>("/api/machines", { method: "POST", body: JSON.stringify(m) }),
};

export const plansApi = {
  list: () => apiFetch<ApiProductionPlan[]>("/api/plans"),
  create: (p: Pick<ApiProductionPlan, "name" | "amount"> & Partial<ApiProductionPlan>) =>
    apiFetch<ApiProductionPlan>("/api/plans", { method: "POST", body: JSON.stringify(p) }),
  updatePriority: (planID: string, priority: string, status?: string) =>
    apiFetch<{ ok: boolean }>(`/api/plans/${planID}`, {
      method: "PUT",
      body: JSON.stringify({ priority, status }),
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

export type ApiPersonnel = { id: string; name: string; role: string; dept: string; status: string; email?: string };

export const personnelApi = {
  list: () => apiFetch<ApiPersonnel[]>("/api/personnel"),
  create: (p: Omit<ApiPersonnel, "id"> & { id?: string }) =>
    apiFetch<ApiPersonnel>("/api/personnel", { method: "POST", body: JSON.stringify(p) }),
  updateStatus: (id: string, status: string) =>
    apiFetch<{ ok: boolean }>(`/api/personnel/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
};

/** จับคู่บัญชีที่ล็อกอินอยู่ (email จาก session) กับรายชื่อบุคลากร เพื่อเอาชื่อ-สกุลจริงมาเติมในฟอร์มต่างๆ
 *  ถ้าไม่เจอคนที่ email ตรงกัน (เช่น ยังไม่ได้ผูกบัญชีไว้ในหน้าบุคลากร) จะ fallback ไปใช้ email แทน */
export function resolveHandlerName(personnel: ApiPersonnel[], email: string | null | undefined): string {
  if (!email) return "";
  const match = personnel.find((p) => p.email && p.email.trim().toLowerCase() === email.trim().toLowerCase());
  return match?.name ?? email;
}

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
