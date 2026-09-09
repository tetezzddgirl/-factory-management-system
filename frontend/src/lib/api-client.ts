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
  const raw = await res.text();
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    // 🔍 ชั่วคราว: log raw response ที่ parse ไม่ผ่าน เพื่อหา byte ที่เกินมา
    console.error(`[apiFetch] JSON parse failed for ${path}. Raw response:`, JSON.stringify(raw));
    throw e;
  }
}

// ---- ชนิดข้อมูลที่ตรงกับ backend (Go structs ใน models/) ----

/** เครื่องจักรหนึ่งเครื่อง — ตรงกับ handlers.MachineResponse ฝั่ง backend */
export type ApiMachine = {
  id: string;
  name: string;
  /** รหัสสถานะ: running | idle | maintenance | down */
  status: string;
  /** ชื่อสถานะภาษาไทย (ทำงาน / ว่าง / บำรุงรักษา / เสีย) */
  statusName: string;
  hours: number;
  typeID: number | null;
  type: string;
  description: string;
  staff: string;
  ownerRole: string;
  currentJob: string;
  productionLineID: number | null;
  productionLine: string;
  lineOrder: number;
  /** สถานะงานซ่อมล่าสุดของเครื่อง: pending | in_progress | done */
  repairStatus: string;
};

export type ApiMachineType = { type_id: number; type_name: string };
export type ApiMachineStatus = { status_id: string; status_name: string };

/** ประวัติการทำงานของเครื่องจักรหนึ่งรายการ */
export type ApiMachineJob = {
  id: string;
  machineID: string;
  jobCode: string;
  finishedAt: string;
  owner: string;
  detail: string;
};

/** ใบงานซ่อมบำรุงหนึ่งใบ — ตรงกับ handlers.MaintenanceOrderResponse */
export type ApiMaintenanceOrder = {
  id: string;
  code: string;
  machineID: string;
  machineName: string;
  technician: string;
  date: string;
  finishedAt: string;
  /** CM = ซ่อมเมื่อเสีย, PM = บำรุงรักษาตามแผน */
  type: string;
  /** pending | in_progress | done */
  status: string;
  statusName: string;
  detail: string;
};

export type ApiMaintenanceLog = {
  logID: string;
  requestID: string;
  machineID: string;
  description: string;
  staff: string;
  repairDate: string;
  totalCost: number;
};

export type ApiProductionLine = { id: number; name: string };

export type ApiProductionPlan = {
  planID: string;
  name: string;
  status: string;
  amount: number;
  priority: string;
  startDate?: string | null;
  endDate?: string | null;
  productID?: string;
  formulaID?: string;
  done: number;
  target: number;
  progress: number;
};

export type ApiRawMaterial = {
  rmID: string;
  rawMaterial: string;
  amount: number;
  unit: string;
  max: number;
  min: number;
};

// ---- สินค้า/ผลิตภัณฑ์ + สูตรการผลิต (Product & Formula/FOR master data) ----

export type ApiProduct = { product_id: string; product_name: string; unit: string };
export type ApiFormulaItem = { id: number; formulaID: string; productID: string; rmID: string; qtyPerUnit: number; unit: string };

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

export type ApiFormulaStep = {
  id: number;
  formulaID: string;
  stepNo: number;
  stepName: string;
  description: string;
  machine: string;
  durationMinutes: number;
};

export const formulaStepsApi = {
  list: () => apiFetch<ApiFormulaStep[]>("/api/formulas/steps"),
  create: (s: Omit<ApiFormulaStep, "id"> & { stepNo?: number }) =>
    apiFetch<ApiFormulaStep>("/api/formulas/steps", { method: "POST", body: JSON.stringify(s) }),
};

/** ดึงขั้นตอนการผลิตของสูตรหนึ่ง (formulaID) เรียงตามลำดับ stepNo */
export function stepsFor(steps: ApiFormulaStep[], formulaID: string): ApiFormulaStep[] {
  return steps.filter((s) => s.formulaID === formulaID).sort((a, b) => a.stepNo - b.stepNo);
}

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

/** หา bomID ของสูตรที่ผูกกับสินค้าตัวหนึ่ง (ใช้ไปดึงขั้นตอนการผลิตที่ผูกกับ bomID นั้นต่อ) */
export function formulaIDFor(formulas: ApiFormulaItem[], productID: string): string | undefined {
  return formulaFor(formulas, productID)[0]?.formulaID;
}

/** ตัวคั่นระหว่าง "รหัสสูตร" กับ "ชื่อสูตร/สินค้า" ตอนแสดงเป็นตัวเลือกใน dropdown (เช่น "BOM-001 — ขวด PET 500ml") */
export const FOR_LABEL_SEP = " — ";

/** สร้างรายการตัวเลือกสูตรการผลิตแบบไม่ซ้ำ (bomID) พร้อมชื่อสินค้าที่สูตรนั้นผูกอยู่ ไว้ใช้เป็น options ของ dropdown
 *  แสดงทั้งรหัสสูตรและชื่อสูตร (ชื่อสินค้าที่สูตรนั้นผลิต) ในตัวเลือกเดียวกัน */
export function formulaOptions(formulas: ApiFormulaItem[], products: ApiProduct[]): string[] {
  const seen = new Map<string, string>();
  for (const f of formulas) {
    if (seen.has(f.formulaID)) continue;
    const productName = products.find((p) => p.product_id === f.productID)?.product_name ?? f.productID;
    seen.set(f.formulaID, `${f.formulaID}${FOR_LABEL_SEP}${productName}`);
  }
  return Array.from(seen.values());
}

/** ดึง formulaID ล้วนๆ ออกจากตัวเลือกที่แสดงแบบ "FOR-001 — ขวด PET 500ml" (หรือคืนค่าเดิมถ้าไม่มีตัวคั่น) */
export function formulaIDFromOption(option: string): string {
  return option.split(FOR_LABEL_SEP)[0] ?? option;
}

/** ประกอบตัวเลือกแบบ "BOM-001 — ชื่อสินค้า" จาก bomID ล้วนๆ ไว้ตั้งค่าเริ่มต้นให้ตรงกับ options ของ dropdown */
export function formulaOptionFor(
  formulas: ApiFormulaItem[],
  products: ApiProduct[],
  formulaID: string,
): string {
  if (!formulaID) return "";
  const match = formulas.find((f) => f.formulaID === formulaID);
  const productName = match ? products.find((p) => p.product_id === match.productID)?.product_name ?? match.productID : undefined;
  return productName ? `${formulaID}${FOR_LABEL_SEP}${productName}` : formulaID;
}

// ---- ตัวช่วยเรียก endpoint แต่ละกลุ่ม (ตรงกับ backend/handlers) ----

/** ข้อมูลที่ส่งไปตอนสร้างเครื่องจักรใหม่ */
export type NewMachine = {
  id: string;
  name: string;
  status: string;
  hours: number;
  typeID: number | null;
  description: string;
  staff: string;
  ownerRole: string;
  currentJob: string;
};

/** ฟิลด์ที่แก้ไขได้ของเครื่องจักร — ส่งเฉพาะฟิลด์ที่ต้องการเปลี่ยน
 *  currentJob = "" หมายถึงเลิกมอบหมายงาน, productionLineID = 0 หมายถึงเอาออกจากสายการผลิต */
export type MachinePatch = Partial<Omit<NewMachine, "id">> & {
  productionLineID?: number;
  lineOrder?: number;
};

export const machinesApi = {
  list: () => apiFetch<ApiMachine[]>("/api/machines"),
  get: (id: string) => apiFetch<ApiMachine>(`/api/machines/${encodeURIComponent(id)}`),
  create: (m: NewMachine) =>
    apiFetch<ApiMachine>("/api/machines", { method: "POST", body: JSON.stringify(m) }),
  update: (id: string, patch: MachinePatch) =>
    apiFetch<ApiMachine>(`/api/machines/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  remove: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/machines/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // ข้อมูลตั้งต้น
  types: () => apiFetch<ApiMachineType[]>("/api/machines/types"),
  createType: (name: string) =>
    apiFetch<ApiMachineType>("/api/machines/types", {
      method: "POST",
      body: JSON.stringify({ type_name: name }),
    }),
  statuses: () => apiFetch<ApiMachineStatus[]>("/api/machines/statuses"),

  // ประวัติการทำงานของเครื่องจักร
  jobs: (machineID?: string) =>
    apiFetch<ApiMachineJob[]>(
      machineID ? `/api/machines/histories?machineID=${encodeURIComponent(machineID)}` : "/api/machines/histories",
    ),
  createJob: (j: { machineID: string; finishedAt: string; owner: string; detail: string }) =>
    apiFetch<ApiMachineJob>("/api/machines/histories", { method: "POST", body: JSON.stringify(j) }),
  removeJob: (historyID: string) =>
    apiFetch<{ ok: boolean }>(`/api/machines/histories/${encodeURIComponent(historyID)}`, {
      method: "DELETE",
    }),
};

/** ข้อมูลที่ส่งไปตอนแจ้งซ่อม/บันทึกงานบำรุงรักษาใหม่ (รหัสใบงานสร้างให้ฝั่ง backend) */
export type NewMaintenanceOrder = {
  machineID: string;
  technician: string;
  date: string;
  type: string;
  detail: string;
};

export type MaintenanceOrderPatch = Partial<NewMaintenanceOrder> & { status?: string };

export const maintenanceApi = {
  list: () => apiFetch<ApiMaintenanceOrder[]>("/api/maintenance/requests"),
  getNextCode: () => apiFetch<{ code: string }>("/api/maintenance/requests/next-id"),
  create: (o: NewMaintenanceOrder) =>
    apiFetch<ApiMaintenanceOrder>("/api/maintenance/requests", { method: "POST", body: JSON.stringify(o) }),
  update: (id: string, patch: MaintenanceOrderPatch) =>
    apiFetch<ApiMaintenanceOrder>(`/api/maintenance/requests/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  remove: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/maintenance/requests/${encodeURIComponent(id)}`, { method: "DELETE" }),
  /** ปิดงานซ่อม — backend จะสร้างประวัติการซ่อมบำรุงและคืนสถานะเครื่องจักรให้เอง */
  complete: (id: string, body: { staff: string; description: string; totalCost: number }) =>
    apiFetch<{ order: ApiMaintenanceOrder; logID: string }>(
      `/api/maintenance/requests/${encodeURIComponent(id)}/complete`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  logs: (machineID?: string) =>
    apiFetch<ApiMaintenanceLog[]>(
      machineID ? `/api/maintenance/logs?machineID=${encodeURIComponent(machineID)}` : "/api/maintenance/logs",
    ),
};

function toProductionLine(r: { production_line_id: number; productionline_name: string }): ApiProductionLine {
  return { id: r.production_line_id, name: r.productionline_name };
}

export const productionLinesApi = {
  list: async () => {
    const raw = await apiFetch<{ production_line_id: number; productionline_name: string }[]>(
      "/api/production-lines",
    );
    return raw.map(toProductionLine);
  },
  create: async (l: { name: string }) =>
    toProductionLine(
      await apiFetch<{ production_line_id: number; productionline_name: string }>("/api/production-lines", {
        method: "POST",
        body: JSON.stringify({ productionline_name: l.name }),
      }),
    ),
  rename: async (id: number, name: string) =>
    toProductionLine(
      await apiFetch<{ production_line_id: number; productionline_name: string }>(
        `/api/production-lines/${id}`,
        { method: "PUT", body: JSON.stringify({ productionline_name: name }) },
      ),
    ),
  remove: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/production-lines/${id}`, { method: "DELETE" }),
};

export const plansApi = {
  list: () => apiFetch<ApiProductionPlan[]>("/api/plans"),
  getNextID: () => apiFetch<{ planID: string }>("/api/plans/next-id"),
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
  palletNumber: string;
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
    apiFetch<ApiRawMaterialLocation[]>(
      `/api/materials/locations${rmID ? `?rmID=${encodeURIComponent(rmID)}` : ""}`,
    ),
  previewNextCodes: (orderID?: string) =>
    apiFetch<{ palletNumber: string; lotNumber: string }>(
      `/api/materials/locations/next-code${orderID ? `?orderID=${encodeURIComponent(orderID)}` : ""}`,
    ),
  create: (loc: Omit<ApiRawMaterialLocation, "rmLocationID"> & { rmLocationID?: string }) =>
    apiFetch<ApiRawMaterialLocation>("/api/materials/locations", {
      method: "POST",
      body: JSON.stringify(loc),
    }),
  update: (rmLocationID: string, amount: number, location: string) =>
    apiFetch<{ ok: boolean }>(`/api/materials/locations/${rmLocationID}`, {
      method: "PUT",
      body: JSON.stringify({ amount, location }),
    }),
};

export const materialRecordsApi = {
  list: (rmID?: string) =>
    apiFetch<ApiRawMaterialRecord[]>(
      `/api/materials/records${rmID ? `?rmID=${encodeURIComponent(rmID)}` : ""}`,
    ),
  create: (rec: Omit<ApiRawMaterialRecord, "rmRecordID" | "timestamp"> & { rmRecordID?: string }) =>
    apiFetch<ApiRawMaterialRecord>("/api/materials/records", {
      method: "POST",
      body: JSON.stringify(rec),
    }),
};

// ---- บุคลากร (Personnel) ----

// ---- บุคลากร FactoryFlow (Employee) — FRESH-04/05 backend, FRESH-06 UI ----
// ใช้ apiFetch เดิม (แนบ JWT ของ Friend อัตโนมัติ + จัดการ 401 แบบเดิม)

export type ApiEmployee = {
  employeeId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  department: string;
  position: string;
  role: string;
  status: string;
  shift: string;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeCreateInput = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  department: string;
  position?: string;
  role: string;
  status?: string;
  shift?: string;
  /** optional 1:1 login account — must be sent together (backend contract) */
  username?: string;
  password?: string;
};

export type EmployeeUpdateInput = Omit<EmployeeCreateInput, "username" | "password">;

/** Safe view of an Employee's 1:1 login account (no password hash). FRESH-07. */
export type ApiEmployeeAccount = {
  userId: string;
  username: string;
  active: boolean;
  lastLogin: string | null;
};

/** ชื่อ-นามสกุลเต็มของพนักงาน สำหรับแสดงในตัวเลือก/ตาราง ("ว่าง" ถ้าไม่มีข้อมูลเลย) */
export function employeeFullName(e: Pick<ApiEmployee, "firstName" | "lastName">): string {
  return `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim();
}

/** ตัวเลือกสำหรับ dropdown "ผู้บันทึกรายการ" ในรูปแบบ "EMP-0001 — ชื่อ นามสกุล" */
export function employeeOptions(employees: ApiEmployee[]): string[] {
  return employees.map((e) => `${e.employeeId} — ${employeeFullName(e)}`);
}

export const employeesApi = {
  list: () => apiFetch<ApiEmployee[]>("/api/employees"),
  get: (id: string) => apiFetch<ApiEmployee>(`/api/employees/${encodeURIComponent(id)}`),
  create: (e: EmployeeCreateInput) =>
    apiFetch<ApiEmployee>("/api/employees", { method: "POST", body: JSON.stringify(e) }),
  update: (id: string, e: EmployeeUpdateInput) =>
    apiFetch<ApiEmployee>(`/api/employees/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(e),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/api/employees/${encodeURIComponent(id)}`, { method: "DELETE" }),
  /** null when the employee has no login account */
  getAccount: (id: string) =>
    apiFetch<{ account: ApiEmployeeAccount | null }>(
      `/api/employees/${encodeURIComponent(id)}/account`,
    ).then((r) => r.account),
};

// ---- งาน FactoryFlow (Task) + การมอบหมายพนักงาน (Task Assignment) — FRESH-08 ----
// backend: FRESH-08 handlers. Uses the same shared apiFetch (JWT + 401 handling).

export type ApiTask = {
  taskId: string;
  title: string;
  description: string;
  machineId: string | null;
  shift: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskInput = {
  title: string;
  description?: string;
  machineId?: string | null;
  shift?: string;
  status?: string;
};

/** raw task_assignments row + the assigned employee's display fields (no secrets) */
export type ApiTaskAssignment = {
  assignmentId: string;
  taskId: string;
  employeeId: string;
  assignedAt: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
};

export const tasksApi = {
  list: () => apiFetch<ApiTask[]>("/api/tasks"),
  get: (id: string) => apiFetch<ApiTask>(`/api/tasks/${encodeURIComponent(id)}`),
  create: (t: TaskInput) =>
    apiFetch<ApiTask>("/api/tasks", { method: "POST", body: JSON.stringify(t) }),
  update: (id: string, t: TaskInput) =>
    apiFetch<ApiTask>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(t),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listAssignments: (taskId: string) =>
    apiFetch<ApiTaskAssignment[]>(`/api/tasks/${encodeURIComponent(taskId)}/assignments`),
  assign: (taskId: string, employeeId: string) =>
    apiFetch<ApiTaskAssignment>(`/api/tasks/${encodeURIComponent(taskId)}/assignments`, {
      method: "POST",
      body: JSON.stringify({ employeeId }),
    }),
  unassign: (taskId: string, assignmentId: string) =>
    apiFetch<void>(
      `/api/tasks/${encodeURIComponent(taskId)}/assignments/${encodeURIComponent(assignmentId)}`,
      { method: "DELETE" },
    ),
};

/** จับคู่บัญชีที่ล็อกอินอยู่ (email จาก session) กับรายชื่อพนักงาน (employees) เพื่อเอาชื่อ-สกุลจริงมาเติมในฟอร์มต่างๆ
 *  ถ้าไม่เจอคนที่ email ตรงกัน (เช่น พนักงานคนนี้ไม่มีอีเมล) จะ fallback ไปใช้ email แทน */
export function resolveHandlerName(
  employees: ApiEmployee[],
  email: string | null | undefined,
): string {
  if (!email) return "";
  const match = employees.find(
    (e) => e.email && e.email.trim().toLowerCase() === email.trim().toLowerCase(),
  );
  return match ? employeeFullName(match) : email;
}

// ---- ปัญหาการผลิต (Issues) ----

export type ApiIssue = {
  timestamp: string;
  issue_id: string;
  reporter_id: string;
  issue: string;
  description: string;
  solution_provider_id?: string;
  solutions?: string;
  status: string;
  orderID: string;
};

export const issuesApi = {
  list: () => apiFetch<ApiIssue[]>("/api/issues"),
  create: (iss: Omit<ApiIssue, "issue_id" | "timestamp"> & { issue_id?: string }) =>
    apiFetch<ApiIssue>("/api/issues", { method: "POST", body: JSON.stringify(iss) }),
  update: (
    issueID: string,
    body: { solution_provider_id?: string; solutions?: string; status: string },
  ) =>
    apiFetch<{ ok: boolean }>(`/api/issues/${issueID}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

// ---- สินค้าระหว่างผลิต (Work In Process) ----

export type ApiWorkInProcess = {
  wipID: string;
  wip: string;
  inStage: string;
  amount: number;
  unit: string;
  max: number;
};

export type ApiWipLocation = {
  wipLocationID: string;
  location: string;
  palletNumber: string;
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
  create: (w: ApiWorkInProcess) =>
    apiFetch<ApiWorkInProcess>("/api/wip", { method: "POST", body: JSON.stringify(w) }),
  updateAmount: (wipID: string, amount: number) =>
    apiFetch<{ ok: boolean }>(`/api/wip/${wipID}`, {
      method: "PUT",
      body: JSON.stringify({ amount }),
    }),
};

export const wipLocationsApi = {
  list: (wipID?: string) =>
    apiFetch<ApiWipLocation[]>(
      `/api/wip/locations${wipID ? `?wipID=${encodeURIComponent(wipID)}` : ""}`,
    ),
  previewNextCodes: (orderID?: string) =>
    apiFetch<{ palletNumber: string; lotNumber: string }>(
      `/api/wip/locations/next-code${orderID ? `?orderID=${encodeURIComponent(orderID)}` : ""}`,
    ),
  create: (
    loc: Omit<ApiWipLocation, "wipLocationID"> & { wipLocationID?: string; orderID?: string },
  ) =>
    apiFetch<ApiWipLocation>("/api/wip/locations", {
      method: "POST",
      body: JSON.stringify(loc),
    }),
  update: (wipLocationID: string, amount: number, location: string) =>
    apiFetch<ApiWipLocation>(`/api/wip/locations/${encodeURIComponent(wipLocationID)}`, {
      method: "PUT",
      body: JSON.stringify({ amount, location }),
    }),
};

export const wipRecordsApi = {
  list: (wipID?: string) =>
    apiFetch<ApiWipRecord[]>(
      `/api/wip/records${wipID ? `?wipID=${encodeURIComponent(wipID)}` : ""}`,
    ),
  create: (rec: Omit<ApiWipRecord, "wipRecordID" | "timestamp"> & { wipRecordID?: string }) =>
    apiFetch<ApiWipRecord>("/api/wip/records", { method: "POST", body: JSON.stringify(rec) }),
};

export const requisitionsApi = {
  list: () => apiFetch<ApiRequisitionSlip[]>("/api/wip/requisitions"),
  create: (
    slip: Omit<ApiRequisitionSlip, "slipID" | "timestamp" | "status"> & {
      slipID?: string;
      status?: string;
    },
  ) =>
    apiFetch<ApiRequisitionSlip>("/api/wip/requisitions", {
      method: "POST",
      body: JSON.stringify(slip),
    }),
};

// ---- ใบสั่งผลิต (Work Orders / Production Orders) ----

export type ApiWorkOrder = {
  timestamp: string;
  orderID: string;
  name: string;
  status: string;
  amount: number;
  startDate: string;
  endDate: string;
  planID: string;
  production_line_id?: number;
};

export type ApiWork = {
  workID: string;
  work: string;
  description?: string;
  startDate: string;
  endDate: string;
  orderID: string;
};

export const workOrdersApi = {
  list: () => apiFetch<ApiWorkOrder[]>("/api/work-orders"),
  getDetail: (orderID: string) =>
    apiFetch<ApiWorkOrder>(`/api/work-orders/${encodeURIComponent(orderID)}/detail`),
  getNextID: () => apiFetch<{ orderID: string }>("/api/work-orders/next-id"),
  create: (o: Omit<ApiWorkOrder, "orderID" | "timestamp"> & { orderID?: string }) =>
    apiFetch<ApiWorkOrder>("/api/work-orders", { method: "POST", body: JSON.stringify(o) }),
  updateStatus: (orderID: string, status: string) =>
    apiFetch<{ ok: boolean }>(`/api/work-orders/${orderID}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

export const workApi = {
  list: (orderID?: string) =>
    apiFetch<ApiWork[]>(
      `/api/work-orders/work${orderID ? `?orderID=${encodeURIComponent(orderID)}` : ""}`,
    ),
  create: (w: Omit<ApiWork, "workID"> & { workID?: string }) =>
    apiFetch<ApiWork>("/api/work-orders/work", { method: "POST", body: JSON.stringify(w) }),
  delete: (workID: string) =>
    apiFetch<{ message: string }>(`/api/work-orders/work/${encodeURIComponent(workID)}`, {
      method: "DELETE",
    }),
  update: (workID: string, w: Partial<ApiWork>) =>
    apiFetch<{ ok: boolean }>(`/api/work-orders/work/${encodeURIComponent(workID)}`, {
      method: "PUT",
      body: JSON.stringify(w),
    }),
};

// ---- การแจ้งเตือน (Notifications) ----

export type ApiNotification = {
  notificationID: string;
  recipientRole: string;
  title: string;
  description: string;
  type: "info" | "warning" | "success" | "error";
  refID: string;
  isRead: boolean;
  createdAt: string;
};

export const notificationsApi = {
  list: (role: string) =>
    apiFetch<ApiNotification[]>(`/api/notifications?role=${encodeURIComponent(role)}`),
  markRead: (notificationID: string) =>
    apiFetch<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(notificationID)}/read`, { method: "PUT" }),
  markAllRead: (role: string) =>
    apiFetch<{ ok: boolean }>(`/api/notifications/read-all?role=${encodeURIComponent(role)}`, { method: "PUT" }),
};