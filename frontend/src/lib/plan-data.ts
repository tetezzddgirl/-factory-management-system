import type { PlanRow } from "@/components/plan-detail-dialog";

export const initialPlans: PlanRow[] = [
  { planID: "PLAN-2025-07-01-001", name: "ขวด PET 500ml", formula:"FOR-001", amount: 12000, dueDate: "05 ก.ค. 2568", status: "กำลังผลิต", priority: "สูง", startDate: "01 ก.ค. 2568", owner: "สมชาย ใจดี" },
  { planID: "PLAN-2025-07-02-001", name: "ขวด PET 1L", formula:"FOR-002", amount: 6000, dueDate: "07 ก.ค. 2568", status: "กำลังผลิต", priority: "ปกติ", startDate: "02 ก.ค. 2568", owner: "วราภรณ์ สุขใจ" },
  { planID: "PLAN-2025-07-03-001", name: "ฝาเกลียว", formula:"FOR-003", amount: 20000, dueDate: "03 ก.ค. 2568", status: "เสร็จสิ้น", priority: "ต่ำ", startDate: "28 มิ.ย. 2568", owner: "ธนกฤต ศรีสุข" },
  { planID: "PLAN-2025-07-04-001", name: "ขวด HDPE", formula:"FOR-004", amount: 5000, dueDate: "12 ก.ค. 2568", status: "รอเริ่ม", priority: "ปกติ", startDate: "10 ก.ค. 2568", owner: "สมชาย ใจดี" },
];

export type WorkOrder = {
  orderNo: string;
  planId: string;
  product: string;
  qty: number;
  line: string;
  productionLineID?: number;
  startDate: string;
  dueDate: string;
  // priority: string;
  status: "รอมอบหมาย" | "กำลังผลิต" | "เสร็จสิ้น" | "หยุดชั่วคราว";
  assignees?: string[];
};

export const initialWorkOrders: WorkOrder[] = [
  { orderNo: "WO-20250702-001", planId: "PLAN-2025-07-01-001", product: "ขวด PET 500ml", qty: 12000, line: "สายการเป่าขวด L-01", startDate: "01 ก.ค. 2568", dueDate: "05 ก.ค. 2568", status: "รอมอบหมาย" },
  { orderNo: "WO-20250703-001", planId: "PLAN-2025-07-02-001", product: "ขวด PET 1L", qty: 6000, line: "สายการบรรจุ L-02", startDate: "02 ก.ค. 2568", dueDate: "07 ก.ค. 2568",  status: "รอมอบหมาย" },
  { orderNo: "WO-20250701-001", planId: "PLAN-2025-07-03-001", product: "ฝาเกลียว", qty: 20000, line: "สายการฉีด L-03", startDate: "28 มิ.ย. 2568", dueDate: "03 ก.ค. 2568",  status: "เสร็จสิ้น", assignees: ["ธนกฤต ศรีสุข"] },
];

