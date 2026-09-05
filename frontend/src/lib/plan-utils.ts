import type { PlanRow } from "@/components/plan-detail-dialog";
import type { ApiProductionPlan, ApiProductionLine } from "./api-client";

// แปลงค่าจาก <input type="date"> (เช่น "2025-07-03") ให้เป็น ISO datetime เต็มรูปแบบ (RFC3339)
// ก่อนส่งให้ backend เสมอ - Go's time.Time ต้องการรูปแบบนี้เป๊ะๆ ไม่งั้นจะได้ "bad json" กลับมา
// ถ้าไม่กรอกวันที่มา ไม่ใส่ค่าเริ่มต้นให้ (คืน "" กลับไป) เพื่อไม่ให้ backend เข้าใจผิดว่าผู้ใช้ตั้งใจกรอกวันที่ปัจจุบัน
export function toISO(dateOnly: string): string {
  if (!dateOnly) return "";
  const d = new Date(dateOnly);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

// แปลง ISO datetime กลับเป็นข้อความวันที่แบบไทยไว้ "แสดงผล" เท่านั้น (ไม่ใช้ค่านี้ส่งกลับไป backend อีก)
export function formatThaiDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("th-TH");
}

// แปลง ISO datetime กลับเป็นรูปแบบ YYYY-MM-DD ไว้เติมค่าเริ่มต้นให้ <input type="date"> เท่านั้น
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// หาชื่อสายการผลิตจาก production_line_id — ใช้แทนที่ decodeLine เดิม (ไม่ต้อง encode/decode string อีกแล้ว)
export function lineNameFromID(id: number | undefined, lines: ApiProductionLine[]): string {
  return lines.find((l) => l.id === id)?.name ?? "-";
}

/** แปลงแผนการผลิตจาก backend (ApiProductionPlan) เป็น PlanRow ที่ UI ใช้ — รวม formula/line/startDate ที่ backend เก็บจริงแล้ว
 *  ใช้ร่วมกันทั้งหน้า "วางแผนการผลิต" และตอน "เลือกแผนการผลิต" (สร้างใบสั่งผลิต) เพื่อไม่ให้ข้อมูลไม่ตรงกันระหว่างสองหน้า */
export function fromApiPlan(p: ApiProductionPlan): PlanRow {
  return {
    planID: String(p.planID),
    name: p.name,
    formula: p.formulaID || "-",
    amount: p.amount,
    priority: p.priority,
    dueDate: p.endDate ? formatThaiDate(p.endDate) : "-",
    startDate: p.startDate ? formatThaiDate(p.startDate) : undefined,
    status: p.status,
  };
}