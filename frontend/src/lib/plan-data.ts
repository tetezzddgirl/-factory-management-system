import type { PlanRow } from "@/components/plan-detail-dialog";
import type { ResourceCheckData } from "@/components/resource-check-dialog";

export const initialPlans: PlanRow[] = [
  { planID: "PLAN-2025-07-01", name: "ขวด PET 500ml", bom:"BOM-001", amount: 12000, dueDate: "05 ก.ค. 2568", status: "กำลังผลิต", priority: "สูง", startDate: "01 ก.ค. 2568", owner: "สมชาย ใจดี" },
  { planID: "PLAN-2025-07-02", name: "ขวด PET 1L", bom:"BOM-002", amount: 6000, dueDate: "07 ก.ค. 2568", status: "กำลังผลิต", priority: "ปกติ", startDate: "02 ก.ค. 2568", owner: "วราภรณ์ สุขใจ" },
  { planID: "PLAN-2025-07-03", name: "ฝาเกลียว", bom:"BOM-003", amount: 20000, dueDate: "03 ก.ค. 2568", status: "เสร็จสิ้น", priority: "ต่ำ", startDate: "28 มิ.ย. 2568", owner: "ธนกฤต ศรีสุข" },
  { planID: "PLAN-2025-07-04", name: "ขวด HDPE", bom:"BOM-004", amount: 5000, dueDate: "12 ก.ค. 2568", status: "รอเริ่ม", priority: "ปกติ", startDate: "10 ก.ค. 2568", owner: "สมชาย ใจดี" },
];

export type WorkOrder = {
  orderNo: string;
  planId: string;
  product: string;
  qty: number;
  line: string;
  startDate: string;
  dueDate: string;
  priority: string;
  status: "รอมอบหมาย" | "กำลังผลิต" | "เสร็จสิ้น" | "หยุดชั่วคราว";
  assignees?: string[];
};

export const initialWorkOrders: WorkOrder[] = [
  { orderNo: "WO-1042", planId: "PLAN-2025-07-01", product: "ขวด PET 500ml", qty: 12000, line: "สายการเป่าขวด L-01", startDate: "01 ก.ค. 2568", dueDate: "05 ก.ค. 2568", priority: "สูง", status: "รอมอบหมาย" },
  { orderNo: "WO-1043", planId: "PLAN-2025-07-02", product: "ขวด PET 1L", qty: 6000, line: "สายการบรรจุ L-02", startDate: "02 ก.ค. 2568", dueDate: "07 ก.ค. 2568", priority: "ปกติ", status: "รอมอบหมาย" },
  { orderNo: "WO-1039", planId: "PLAN-2025-07-03", product: "ฝาเกลียว", qty: 20000, line: "สายการฉีด L-03", startDate: "28 มิ.ย. 2568", dueDate: "03 ก.ค. 2568", priority: "ต่ำ", status: "เสร็จสิ้น", assignees: ["ธนกฤต ศรีสุข"] },
];

/** mock resource requirement calc from BOM — always sufficient so the demo flow proceeds */
export function buildCheck(product: string, target: number, dueDate: string): ResourceCheckData {
  const surplus = (base: number) => Math.max(base + 1, Math.round(base * 1.25));
  return {
    product, target, dueDate,
    materials: [
      { name: "เม็ดพลาสติก PET", required: target * 2, available: surplus(target * 2), unit: "กรัม" },
      { name: "สีผสม", required: Math.round(target * 0.05), available: surplus(Math.round(target * 0.05)), unit: "กรัม" },
      { name: "ฉลาก", required: target, available: surplus(target), unit: "ชิ้น" },
    ],
    machines: [
      { name: "เครื่องเป่าขวด M-01", required: 1, available: 1, unit: "เครื่อง" },
      { name: "สายการบรรจุ L-02", required: 1, available: 1, unit: "สาย" },
    ],
    personnel: [
      { name: "Operator", required: 3, available: 6, unit: "คน" },
      { name: "QC Inspector", required: 1, available: 2, unit: "คน" },
    ],
  };
}
