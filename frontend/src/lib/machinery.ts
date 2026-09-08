// ค่าคงที่ + ตัวช่วยของโดเมน "เครื่องจักรและการซ่อมบำรุง"
//
// พอร์ตมาจาก Machinery-maintenance (frontend/src/lib/factory-store.tsx) แต่ตัดส่วนที่เป็น
// data layer ออก เพราะฝั่งนี้เรียก backend ผ่าน machinesApi / maintenanceApi ใน api-client.ts
// เหลือไว้เฉพาะป้ายชื่อ/สี/ตัวช่วยล้วนๆ แนวเดียวกับ lib/factoryflow-personnel.ts
//
// สีถูกแปลงจาก design token ของต้นฉบับ (Tailwind) มาเป็น MUI Chip color ให้เข้ากับหน้าอื่น
// ในระบบนี้ ตามรหัสสีใน aaa.txt: เขียว=ปกติ · ฟ้า=พร้อมใช้งาน · ส้ม=ต้องดูแล · แดง=วิกฤต

import type { ApiMachine } from "./api-client";

export type MuiChipColor =
  "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

// ── สถานะเครื่องจักร ─────────────────────────────────────────────────────────

export type MachineStatus = "running" | "idle" | "maintenance" | "down";

export const MACHINE_STATUSES: MachineStatus[] = ["running", "idle", "maintenance", "down"];

export const MACHINE_STATUS_LABEL: Record<MachineStatus, string> = {
  running: "ทำงาน",
  idle: "ว่าง",
  maintenance: "บำรุงรักษา",
  down: "เสีย",
};

export const MACHINE_STATUS_TONE: Record<MachineStatus, MuiChipColor> = {
  running: "success",
  idle: "info",
  maintenance: "warning",
  down: "error",
};

/** ป้ายสถานะเครื่องจักร — เผื่อกรณีที่ backend คืนรหัสสถานะที่ยังไม่รู้จัก */
export function machineStatusLabel(status: string): string {
  return MACHINE_STATUS_LABEL[status as MachineStatus] ?? status ?? "-";
}

export function machineStatusTone(status: string): MuiChipColor {
  return MACHINE_STATUS_TONE[status as MachineStatus] ?? "default";
}

// ── งานซ่อมบำรุง ─────────────────────────────────────────────────────────────

export type MaintenanceStatus = "pending" | "in_progress" | "done";

export const MAINTENANCE_STATUSES: MaintenanceStatus[] = ["pending", "in_progress", "done"];

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  done: "เสร็จสิ้น",
};

export const MAINTENANCE_STATUS_TONE: Record<MaintenanceStatus, MuiChipColor> = {
  pending: "default",
  in_progress: "warning",
  done: "success",
};

export function maintenanceStatusLabel(status: string): string {
  return MAINTENANCE_STATUS_LABEL[status as MaintenanceStatus] ?? status ?? "-";
}

export function maintenanceStatusTone(status: string): MuiChipColor {
  return MAINTENANCE_STATUS_TONE[status as MaintenanceStatus] ?? "default";
}

/** ประเภทงานซ่อม: CM = ซ่อมเมื่อเครื่องเสีย · PM = บำรุงรักษาตามแผน */
export type MaintenanceType = "CM" | "PM";

export const MAINTENANCE_TYPE_LABEL: Record<MaintenanceType, string> = {
  CM: "ซ่อมเมื่อเสีย (CM)",
  PM: "บำรุงรักษาตามแผน (PM)",
};

/** CM คือเครื่องเสียอยู่จริง จึงใช้สีวิกฤต ส่วน PM เป็นงานตามแผนจึงใช้สีฟ้า */
export const MAINTENANCE_TYPE_TONE: Record<MaintenanceType, MuiChipColor> = {
  CM: "error",
  PM: "info",
};

export function maintenanceTypeTone(type: string): MuiChipColor {
  return MAINTENANCE_TYPE_TONE[type as MaintenanceType] ?? "default";
}

// ── ตัวช่วยทั่วไป ────────────────────────────────────────────────────────────

/** แปลงวันที่ ISO (yyyy-mm-dd) เป็นรูปแบบไทยแบบสั้น — คืน "-" ถ้าไม่มีค่า */
export function formatMachineDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

/** วันนี้ในรูปแบบ yyyy-mm-dd ตามเวลาเครื่องผู้ใช้ (ใช้เป็นค่าเริ่มต้นของ input type=date) */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** จัดลำดับการผลิตใหม่ให้เป็นเลขเรียงต่อกันเสมอ (1, 2, 3, ...) */
export function renumberLine(machines: ApiMachine[]): ApiMachine[] {
  return [...machines]
    .sort((a, b) => a.lineOrder - b.lineOrder)
    .map((m, i) => ({ ...m, lineOrder: i + 1 }));
}

/**
 * ย้ายเครื่องจักรไปยังลำดับที่ต้องการ แล้วจัดลำดับที่เหลือใหม่ให้เรียงต่อกัน
 * (พอร์ตจาก changeOrder ใน Machinery-maintenance/frontend/src/routes/index.tsx)
 */
export function moveToOrder(machines: ApiMachine[], id: string, target: number): ApiMachine[] {
  const found = machines.find((m) => m.id === id);
  if (!found) return machines;
  const rest = machines.filter((m) => m.id !== id).sort((a, b) => a.lineOrder - b.lineOrder);
  const pos = Math.min(Math.max(target, 1), rest.length + 1) - 1;
  return [...rest.slice(0, pos), found, ...rest.slice(pos)].map((m, i) => ({ ...m, lineOrder: i + 1 }));
}
