import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Alert, Box, Card, CardContent, CardActionArea, Chip, CircularProgress, Grid, Stack, Typography,
  Button, Divider,
} from "@mui/material";
import { Assignment, TrendingUp, Add, Factory } from "@mui/icons-material";
import { PageShell } from "@/components/page-shell";
import { WorkOrderDialog, type WorkOrderResult } from "@/components/work-order-dialog";
import { ResourceCheckDialog, type ResourceCheckData } from "@/components/resource-check-dialog";
import { AssignWorkDialog, type AssignWorkResult } from "@/components/assign-work-dialog";
import { SelectPlanDialog } from "@/components/select-plan-dialog";
import type { PlanRow } from "@/components/plan-detail-dialog";
import { type WorkOrder } from "@/lib/plan-data";
import { workOrdersApi, workApi, plansApi, productsApi, formulasApi, formulaStepsApi, materialsApi, productionLinesApi, computeRequiredMaterials, bomIDFor, stepsFor, type ApiWorkOrder, type ApiWork, type ApiProduct, type ApiFormulaItem, type ApiFormulaStep, type ApiRawMaterial, type ApiProductionLine } from "@/lib/api-client";
import { fromApiPlan, toISO, toDateInputValue, formatThaiDate, encodeLine, decodeLine } from "@/lib/plan-utils";
import { useRole } from "@/lib/roles";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/work-orders")({
  head: () => ({
    meta: [
      { title: "สร้างใบสั่งผลิต — FactoryFlow" },
      { name: "description", content: "เลือกแผนการผลิตเพื่อออกใบสั่งผลิต ตรวจสอบทรัพยากร และมอบหมายงานให้ทีมผลิต" },
      { property: "og:title", content: "สร้างใบสั่งผลิต — FactoryFlow" },
      { property: "og:description", content: "เลือกแผนการผลิตเพื่อออกใบสั่งผลิต ตรวจสอบทรัพยากรและมอบหมายงาน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkOrdersPage,
});

const statusColor: Record<string, "success" | "info" | "default"> = {
  "เสร็จสิ้น": "success", "กำลังผลิต": "info", "รอเริ่ม": "default", "รอมอบหมาย": "default",
};

function toWorkOrder(o: ApiWorkOrder, assignees: string[]): WorkOrder {
  const { line, priority } = decodeLine(o.machines);
  return {
    orderNo: o.orderID,
    planId: o.planID,
    product: o.name,
    qty: o.amount,
    line,
    // เก็บเป็น ISO ดิบไว้ก่อน (ใช้ต่อ API ได้ทันที) ค่อยแปลงเป็นข้อความไทยตอน render เท่านั้น
    startDate: o.startDate ?? "",
    dueDate: o.endDate ?? "",
    priority,
    status: (o.status as WorkOrder["status"]) || "รอมอบหมาย",
    assignees: assignees.length ? assignees : undefined,
  };
}

function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [formulas, setFormulas] = useState<ApiFormulaItem[]>([]);
  const [formulaSteps, setFormulaSteps] = useState<ApiFormulaStep[]>([]);
  const [rawMaterial, setRawMaterial] = useState<ApiRawMaterial[]>([]);
  const [productionLines, setProductionLines] = useState<ApiProductionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [orderPlan, setOrderPlan] = useState<PlanRow | null>(null);
  const [active, setActive] = useState<WorkOrder | null>(null);
  const [checkData, setCheckData] = useState<ResourceCheckData | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  // งานที่เคยมอบหมาย/บันทึกไว้แล้วของใบสั่งผลิตที่กำลังจะมอบหมาย — เติมฟอร์มให้อัตโนมัติ + กันมอบหมายซ้ำสร้างงานซ้ำ
  const [existingTasks, setExistingTasks] = useState<AssignWorkResult[]>([]);
  const existingWorkIdsRef = useRef<Set<string>>(new Set());
  const { role } = useRole();
  const canAssign = role === "planner" || role === "supervisor" || role === "admin";

  /** ตรวจสอบทรัพยากรของใบสั่งผลิต — ถ้าสินค้านี้มีสูตรการผลิต (Formula) ในระบบ คำนวณยอดวัตถุดิบที่ต้องใช้จริงจากสูตร x จำนวนที่สั่งผลิต
   *  เทียบกับยอดคงเหลือจริงในคลัง ถ้ายังไม่มีสูตร fallback เป็นตัวเลขประมาณการ (เดิม) เพื่อให้ demo flow ทำงานต่อได้ */
  function buildCheck(product: string, target: number, dueDate: string): ResourceCheckData {
    const matchedProduct = products.find((p) => p.name === product);
    const surplus = (base: number) => Math.max(base + 1, Math.round(base * 1.25));
    const materials = matchedProduct
      ? computeRequiredMaterials(formulas, rawMaterial, matchedProduct.productID, target).map((m) => ({
          name: m.name, required: m.required, available: m.available, unit: m.unit,
        }))
      : [
          { name: "เม็ดพลาสติก PET", required: target * 2, available: surplus(target * 2), unit: "กรัม" },
          { name: "สีผสม", required: Math.round(target * 0.05), available: surplus(Math.round(target * 0.05)), unit: "กรัม" },
          { name: "ฉลาก", required: target, available: surplus(target), unit: "ชิ้น" },
        ];
    return {
      product, target, dueDate, materials,
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

  /** ขั้นตอนการผลิตของสินค้าตัวหนึ่ง (ไว้โชว์ตอนมอบหมายงาน) — หา bomID จากสูตรของสินค้านั้นก่อน แล้วดึงขั้นตอนที่ผูกกับ bomID นั้น */
  function stepsForProduct(product: string) {
    const productID = products.find((p) => p.name === product)?.productID;
    if (!productID) return undefined;
    const bomID = bomIDFor(formulas, productID);
    if (!bomID) return undefined;
    return stepsFor(formulaSteps, bomID);
  }

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const [rawOrders, work, prods, forms, steps, materials, rawPlans, lines] = await Promise.all([
        workOrdersApi.list(), workApi.list(), productsApi.list(), formulasApi.list(), formulaStepsApi.list(), materialsApi.list(), plansApi.list(), productionLinesApi.list(),
      ]);
      const workByOrder = new Map<string, string[]>();
      (work ?? []).forEach((w: ApiWork) => {
        const list = workByOrder.get(w.orderID) ?? [];
        list.push(w.work);
        workByOrder.set(w.orderID, list);
      });
      setOrders((rawOrders ?? []).map((o) => toWorkOrder(o, workByOrder.get(o.orderID) ?? [])));
      setProducts(prods ?? []);
      setFormulas(forms ?? []);
      setFormulaSteps(steps ?? []);
      setRawMaterial(materials ?? []);
      setProductionLines(lines ?? []);
      // ดึงแผนการผลิตจริงจาก backend มาให้เลือกตอน "สร้างใบสั่งผลิต" แทนข้อมูลตัวอย่าง (mock) เดิม
      // เพื่อให้ bom/สายการผลิต/วันที่เริ่มผลิตที่กรอกไว้ตอนสร้างแผน ถูกดึงมาใช้ต่อได้จริง
      setPlans((rawPlans ?? []).map(fromApiPlan));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดใบสั่งผลิตไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function handlePlanSelected(plan: PlanRow) {
    setSelectOpen(false);
    setOrderPlan(plan);
  }

  async function handleOrderSubmit(r: WorkOrderResult) {
    try {
      const created = await workOrdersApi.create({
        orderID: r.orderNo,
        name: r.product,
        status: "รอมอบหมาย",
        amount: r.qty,
        machines: encodeLine(r.line, r.priority),
        startDate: toISO(r.startDate),
        endDate: toISO(r.due),
        planID: orderPlan?.planID ?? "-",
      });
      setOrderPlan(null);
      toast.success(`บันทึกใบสั่งผลิต ${created.orderID} แล้ว — ตรวจสอบทรัพยากรต่อ`);
      await loadOrders();
      openCheck(toWorkOrder(created, []));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกใบสั่งผลิตไม่สำเร็จ");
    }
  }

  function openCheck(wo: WorkOrder) {
    setActive(wo);
    setCheckData(buildCheck(wo.product, wo.qty, formatThaiDate(wo.dueDate)));
    setCheckOpen(true);
  }

  async function confirmCheck() {
    setCheckOpen(false);
    if (canAssign) {
      // โหลดงานที่เคยมอบหมายไว้แล้วของใบสั่งผลิตนี้ (ถ้ามี) มาเติมฟอร์มมอบหมายงานให้อัตโนมัติ
      // เดิม flow นี้เปิด AssignWorkDialog เปล่าๆ ทุกครั้ง ทำให้งานที่เคยมอบหมาย/บันทึกไปแล้วดูเหมือนหายไป
      if (active) {
        try {
          const existing = await workApi.list(active.orderNo);
          const mapped: AssignWorkResult[] = (existing ?? []).map((w) => ({
            workID: w.workID, work: w.work, description: w.description ?? "",
            start: toDateInputValue(w.startDate), due: toDateInputValue(w.endDate),
          }));
          setExistingTasks(mapped);
          existingWorkIdsRef.current = new Set(mapped.map((t) => t.workID));
        } catch {
          setExistingTasks([]);
          existingWorkIdsRef.current = new Set();
        }
      }
      setAssignOpen(true);
    } else {
      toast.success(`ตรวจสอบทรัพยากรของ ${active?.orderNo ?? ""} เรียบร้อย`);
      setActive(null);
    }
  }

//   async function confirmAssignment(rs: AssignWorkResult[]) {
//   const workNames = rs.map((r) => r.work).filter(Boolean);
//   if (!active) return;
//   try {
//     // 1. อัปเดตสถานะใบสั่งผลิต
//     await workOrdersApi.updateStatus(active.orderNo, "กำลังผลิต", encodeLine(active.line, active.priority));

//     // 2. เปรียบเทียบหางานที่ถูกลบออกใน Dialog
//     const currentWorkIds = new Set(rs.map((r) => r.workID));
//     const deletedWorkIds = Array.from(existingWorkIdsRef.current).filter(
//       (id) => !currentWorkIds.has(id)
//     );

//     // 🛠️ 3. สั่ง Delete ไปที่ Backend สำหรับงานที่ถูกกดลบออก
//     if (deletedWorkIds.length > 0) {
//       await Promise.all(deletedWorkIds.map((id) => workApi.delete(id)));
//     }

//     // 4. สั่ง Create งานใหม่ที่เพิ่งเพิ่มเข้ามา
//     await Promise.all(
//       rs
//         .filter((r) => r.work && !existingWorkIdsRef.current.has(r.workID))
//         .map((r) =>
//           workApi.create({
//             work: r.work,
//             startDate: toISO(r.start),
//             endDate: toISO(r.due),
//             orderID: active.orderNo,
//           }),
//         ),
//     );

//     toast.success(
//       `ใบสั่งผลิต ${active.orderNo} • ${rs.length} งาน • มอบหมายเรียบร้อย`,
//     );
    
//     // 5. โหลดข้อมูลใหม่จาก Backend มาแสดงผล
//     await loadOrders();
//   } catch (e) {
//     toast.error(e instanceof Error ? e.message : "มอบหมายงานไม่สำเร็จ");
//   } finally {
//     setAssignOpen(false);
//     setActive(null);
//     setExistingTasks([]);
//     existingWorkIdsRef.current = new Set();
//   }
// }

async function confirmAssignment(rs: AssignWorkResult[]) {
  const workNames = rs.map((r) => r.work).filter(Boolean);
  if (!active) return;
  try {
    await workOrdersApi.updateStatus(active.orderNo, "กำลังผลิต", encodeLine(active.line, active.priority));

    const currentWorkIds = new Set(rs.map((r) => r.workID));

    // 1. ลบงานที่โดนกดลบออก
    const deletedWorkIds = Array.from(existingWorkIdsRef.current).filter(
      (id) => !currentWorkIds.has(id)
    );
    if (deletedWorkIds.length > 0) {
      await Promise.all(deletedWorkIds.map((id) => workApi.delete(id)));
    }

    // 🛠️ 2. อัปเดตงานเดิมที่มีอยู่แล้ว (ที่มี workID ตรงกับของเดิม)
    const existingToUpdate = rs.filter((r) => r.work && existingWorkIdsRef.current.has(r.workID));
    if (existingToUpdate.length > 0) {
      await Promise.all(
        existingToUpdate.map((r) =>
          workApi.update(r.workID, {
            work: r.work,
            startDate: toISO(r.start),
            endDate: toISO(r.due),
          })
        )
      );
    }

    // 3. สร้างงานใหม่ที่เพิ่งเพิ่มเข้ามา
    const newToCreate = rs.filter((r) => r.work && !existingWorkIdsRef.current.has(r.workID));
    if (newToCreate.length > 0) {
      await Promise.all(
        newToCreate.map((r) =>
          workApi.create({
            work: r.work,
            startDate: toISO(r.start),
            endDate: toISO(r.due),
            orderID: active.orderNo,
          })
        )
      );
    }

    toast.success(`บันทึกการเปลี่ยนแปลงของ ${active.orderNo} เรียบร้อย`);
    await loadOrders();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "มอบหมายงานไม่สำเร็จ");
  } finally {
    setAssignOpen(false);
    setActive(null);
    setExistingTasks([]);
    existingWorkIdsRef.current = new Set();
  }
}

  return (
    <PageShell
      title="สร้างใบสั่งผลิต"
      description="รายการใบสั่งผลิตทั้งหมด — กดที่ใบสั่งผลิตเพื่อตรวจสอบทรัพยากรและมอบหมายงาน"
      icon={<Assignment />}
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={() => setSelectOpen(true)}>
          สร้างใบสั่งผลิต
        </Button>
      }
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        ขั้นตอน: กด "สร้างใบสั่งผลิต" → เลือกแผนการผลิตจาก combo box → กรอกใบสั่งผลิต → ตรวจสอบทรัพยากรต่อทันที → มอบหมายงาน (เพิ่มงานได้หลายงาน) • กดการ์ดใบสั่งผลิตเดิมเพื่อตรวจสอบซ้ำได้
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <SelectPlanDialog
        open={selectOpen}
        plans={plans}
        onClose={() => setSelectOpen(false)}
        onSelect={handlePlanSelected}
      />
      <WorkOrderDialog
        open={Boolean(orderPlan)}
        data={orderPlan}
        productionLines={productionLines}
        onClose={() => setOrderPlan(null)}
        onSubmit={handleOrderSubmit}
      />
      <ResourceCheckDialog
        open={checkOpen}
        data={checkData}
        onClose={() => setCheckOpen(false)}
        onConfirm={confirmCheck}
      />
      <AssignWorkDialog
        open={assignOpen}
        data={active ? { product: active.product, target: active.qty, dueDate: formatThaiDate(active.dueDate), orderID: active.orderNo, materials: checkData?.materials ?? [], steps: stepsForProduct(active.product) ?? [], existingTasks } : null}
        onClose={() => setAssignOpen(false)}
        onConfirm={confirmAssignment}
      />

      {loading ? (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <Grid container spacing={2}>
          {orders.map((o, i) => (
            <Grid key={o.orderNo} size={{ xs: 12, md: 6 }}>
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
                <Card sx={{ overflow: "hidden" }}>
                  <Box sx={{ height: 4, background: "linear-gradient(90deg,#7FB4EE,#4A90E2)" }} />
                  <CardActionArea onClick={() => openCheck(o)}>
                    <CardContent>
                      <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{o.orderNo}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {o.product} • อ้างอิงแผน {o.planId}
                          </Typography>
                        </Box>
                        <Chip label={o.status} color={statusColor[o.status]} size="small" />
                      </Stack>
                      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 1.5 }}>
                        <Chip size="small" variant="outlined" label={`${o.qty.toLocaleString()} ชิ้น`} />
                        <Chip size="small" variant="outlined" icon={<Factory sx={{ fontSize: 16 }} />} label={o.line} />
                        <Chip size="small" variant="outlined" color={o.priority === "สูง" ? "error" : "default"} label={`ความสำคัญ: ${o.priority}`} />
                      </Stack>
                      {o.assignees?.length ? (
                        <>
                          <Divider sx={{ mb: 1 }} />
                          <Typography variant="caption" color="text.secondary">
                            งาน: {o.assignees.join(", ")}
                          </Typography>
                        </>
                      ) : null}
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary", mt: 1 }}>
                        <TrendingUp sx={{ fontSize: 16 }} />
                        <Typography variant="caption">กำหนดเสร็จ: {formatThaiDate(o.dueDate)} • คลิกเพื่อตรวจสอบทรัพยากร</Typography>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}
    </PageShell>
  );
}
