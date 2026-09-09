// FRESH-12 — constants + pure helpers for the ported FactoryFlow Personnel /
// Assignment UX.
//
// Ported VERBATIM (values, wording, ordering) from the original FactoryFlow
// source `factory-flow-core-8ec208be/frontend/src/lib/factory-store.tsx` and
// `.../components/personnel-filters.tsx`. Only the framework-specific colour
// intent (`ROLE_TONE`, status colour) is re-expressed as MUI Chip `color`
// values instead of the original's Tailwind classes — the final app is MUI.
//
// No React, no MUI import here: this file is data + string/array logic so it can
// be unit-reasoned and reused by both the page and its dialogs.

import type { ApiEmployee } from "./api-client";

// ── enums — mirror the FRESH-03 CHECK constraints / backend validate lists ────

export const DEPARTMENTS = [
  "Production",
  "Quality",
  "Maintenance",
  "Warehouse",
  "Planning & Purchasing",
  "HR",
  "IT",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

/** ตำแหน่งย่อยของแต่ละแผนก (ต้นฉบับ FactoryFlow). Dropdown ในฟอร์มบุคลากรใช้ชุดนี้
 *  + ตัวเลือก "อื่น ๆ" ให้พิมพ์เอง (D7) เพราะ position ใน DB เป็น free text และ
 *  พนักงานที่ seed มาบางคนมีตำแหน่งนอกลิสต์นี้ */
export const POSITIONS_BY_DEPARTMENT: Record<Department, string[]> = {
  Production: ["Production Manager", "Supervisor", "Operator"],
  Quality: ["QC Manager", "QC Supervisor", "QC Inspector"],
  Maintenance: ["Maintenance Manager", "Technician"],
  Warehouse: ["Warehouse Manager", "Warehouse Staff"],
  "Planning & Purchasing": ["Planning Manager", "Planner", "Purchasing Officer"],
  HR: ["HR Manager", "HR Officer"],
  IT: ["System Administrator"],
};

/** free-text sentinel for the "อื่น ๆ" option in the position dropdown */
export const POSITION_OTHER = "__other__";

export const ROLES = [
  "admin",
  "factory_manager",
  "department_manager",
  "supervisor",
  "operator",
  "qc_inspector",
  "technician",
  "staff",
] as const;
export type Role = (typeof ROLES)[number] | "unassigned";

/** internal role -> ป้ายไทย/อังกฤษที่แสดง (ต้นฉบับ) */
export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  factory_manager: "Factory Manager",
  department_manager: "Department Manager",
  supervisor: "Supervisor",
  operator: "Operator",
  qc_inspector: "QC Inspector",
  technician: "Technician",
  staff: "Staff",
  unassigned: "Unassigned",
};

export type MuiChipColor =
  "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

/** สีป้าย Role — เจตนาสีเดียวกับ ROLE_TONE ต้นฉบับ (Tailwind) แปลงเป็น MUI Chip color:
 *  destructive→error · warning→warning · accent→primary · info→info · primary→primary ·
 *  success→success · secondary→secondary · muted→default */
export const ROLE_TONE: Record<string, MuiChipColor> = {
  admin: "error",
  factory_manager: "warning",
  department_manager: "primary",
  supervisor: "info",
  operator: "primary",
  qc_inspector: "success",
  technician: "secondary",
  staff: "default",
  unassigned: "default",
};

export type EmployeeStatus = "working" | "leave" | "off";

/** ต้นฉบับ STATUS_LABEL */
export const STATUS_LABEL: Record<EmployeeStatus, string> = {
  working: "กำลังทำงาน",
  leave: "ลา",
  off: "หยุด",
};

/** เจตนาสีเดียวกับ statusStyle ต้นฉบับ: success / warning / muted */
export const STATUS_TONE: Record<EmployeeStatus, MuiChipColor> = {
  working: "success",
  leave: "warning",
  off: "default",
};

export type ShiftId = "morning" | "afternoon" | "night";

/** ต้นฉบับ SHIFTS */
export const SHIFTS: { id: ShiftId; name: string; time: string }[] = [
  { id: "morning", name: "กะเช้า", time: "06:00 – 14:00" },
  { id: "afternoon", name: "กะบ่าย", time: "14:00 – 22:00" },
  { id: "night", name: "กะดึก", time: "22:00 – 06:00" },
];

export const SHIFT_NAME: Record<ShiftId, string> = {
  morning: "กะเช้า",
  afternoon: "กะบ่าย",
  night: "กะดึก",
};

export const shiftLabel = (id: ShiftId): string => {
  const s = SHIFTS.find((x) => x.id === id);
  return s ? `${s.name} ${s.time}` : id;
};

/** ต้นฉบับ NO_MACHINE — ค่าที่ใช้แทน "ไม่ผูกกับเครื่องจักร" ในตัวเลือกเครื่องจักรของงาน */
export const NO_MACHINE = "ไม่มี";

export type TaskStatus = "pending" | "in_progress" | "done";

// ── pure helpers (ported) ───────────────────────────────────────────────────

export const fullName = (e: Pick<ApiEmployee, "firstName" | "lastName">): string =>
  `${e.firstName} ${e.lastName}`.trim();

const usernameBase = (role: string): string =>
  (ROLE_LABELS[role] ?? role)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

/** เสนอ username ที่ไม่ซ้ำจากรายชื่อบัญชีที่มีอยู่ (ใช้ในฟอร์ม "เพิ่มพนักงาน") — ต้นฉบับ */
export const suggestUsername = (role: string, existingUsernames: string[]): string => {
  const base = usernameBase(role) || "user";
  const taken = new Set(existingUsernames.map((u) => u.toLowerCase()));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}${i}`)) i += 1;
  return `${base}${i}`;
};

/** ค้นหาจาก ชื่อ / นามสกุล / ชื่อเต็ม / Employee ID (case-insensitive) — ต้นฉบับ */
export function matchesEmployeeQuery(e: ApiEmployee, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    e.firstName.toLowerCase().includes(q) ||
    e.lastName.toLowerCase().includes(q) ||
    fullName(e).toLowerCase().includes(q) ||
    e.employeeId.toLowerCase().includes(q)
  );
}

export const ALL_DEPARTMENTS = "all" as const;
export type DeptFilter = Department | typeof ALL_DEPARTMENTS;

/** นับจำนวนพนักงานต่อแผนก — ต้นฉบับ */
export function departmentCounts(employees: ApiEmployee[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(DEPARTMENTS.map((d) => [d, 0]));
  for (const e of employees) counts[e.department] = (counts[e.department] ?? 0) + 1;
  return counts;
}

// ── FRESH-14 — resolve the authenticated user to their own employee row ──────
//
// The real role of the logged-in user is `employees.role`, NOT the freely
// switchable frontend RoleContext. A FactoryFlow session's JWT carries
// sub="USR-####" (1:1 with "EMP-####", FRESH-03 trigger) and the linked email;
// we resolve on the id first (stable across a self-service email edit) and fall
// back to the email. Returns null for a session with no FactoryFlow employee
// (e.g. the Friend demo login).

/** derive "EMP-####" from a session userId of the form "USR-####", else null */
export function employeeIdFromUserId(userId: string | null | undefined): string | null {
  const s = (userId ?? "").trim();
  return s.startsWith("USR-") ? "EMP-" + s.slice(4) : null;
}

/** find the caller's own employee row in a loaded list */
export function findMyEmployee(
  employees: ApiEmployee[],
  session: { userId?: string | null; email?: string | null } | null | undefined,
): ApiEmployee | null {
  if (!session) return null;
  const byId = employeeIdFromUserId(session.userId);
  if (byId) {
    const hit = employees.find((e) => e.employeeId === byId);
    if (hit) return hit;
  }
  const email = (session.email ?? "").trim().toLowerCase();
  if (!email) return null;
  return employees.find((e) => (e.email ?? "").trim().toLowerCase() === email) ?? null;
}

/** true only when the caller's own employee row has role 'admin' */
export function isAdminEmployee(me: ApiEmployee | null | undefined): boolean {
  return (me?.role ?? "") === "admin";
}
