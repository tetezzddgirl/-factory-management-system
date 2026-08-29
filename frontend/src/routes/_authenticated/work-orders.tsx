import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { initialPlans, buildCheck, type WorkOrder } from "@/lib/plan-data";
import { workOrdersApi, workApi, type ApiWorkOrder, type ApiWork } from "@/lib/api-client";
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

// backend ProductionOrder ไม่มี field priority/assignees แยก จึงเข้ารหัสไว้ใน "machines" เป็น line::priority
// ส่วนผู้ปฏิบัติงานผูกผ่านตาราง Work (orderID) แยกต่างหาก
function encodeLine(line: string, priority: string) {
  return `${line}::${priority}`;
}
function decodeLine(machines: string): { line: string; priority: string } {
  const [line, priority] = machines.split("::");
  return { line: line || "-", priority: priority || "ปกติ" };
}

// แปลงค่าจาก <input type="date"> (เช่น "2025-07-03") ให้เป็น ISO datetime เต็มรูปแบบ (RFC3339)
// ก่อนส่งให้ backend เสมอ - Go's time.Time ต้องการรูปแบบนี้เป๊ะๆ ไม่งั้นจะได้ "bad json" กลับมา
function toISO(dateOnly: string): string {
  const d = dateOnly ? new Date(dateOnly) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// แปลง ISO datetime กลับเป็นข้อความวันที่แบบไทยไว้ "แสดงผล" เท่านั้น (ไม่ใช้ค่านี้ส่งกลับไป backend อีก)
function formatThaiDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("th-TH");
}

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
    due: o.endDate ?? "",
    priority,
    status: (o.status as WorkOrder["status"]) || "รอมอบหมาย",
    assignees: assignees.length ? assignees : undefined,
  };
}

function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [orderPlan, setOrderPlan] = useState<PlanRow | null>(null);
  const [active, setActive] = useState<WorkOrder | null>(null);
  const [checkData, setCheckData] = useState<ResourceCheckData | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const { role } = useRole();
  const canAssign = role === "planner" || role === "supervisor" || role === "admin";

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const [rawOrders, work] = await Promise.all([workOrdersApi.list(), workApi.list()]);
      const workByOrder = new Map<string, string[]>();
      (work ?? []).forEach((w: ApiWork) => {
        const list = workByOrder.get(w.orderID) ?? [];
        list.push(w.work);
        workByOrder.set(w.orderID, list);
      });
      setOrders((rawOrders ?? []).map((o) => toWorkOrder(o, workByOrder.get(o.orderID) ?? [])));
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
    setCheckData(buildCheck(wo.product, wo.qty, formatThaiDate(wo.due)));
    setCheckOpen(true);
  }

  function confirmCheck() {
    setCheckOpen(false);
    if (canAssign) {
      setAssignOpen(true);
    } else {
      toast.success(`ตรวจสอบทรัพยากรของ ${active?.orderNo ?? ""} เรียบร้อย`);
      setActive(null);
    }
  }

  async function confirmAssignment(rs: AssignWorkResult[]) {
    const workNames = rs.map((r) => r.work).filter(Boolean);
    if (!active) return;
    try {
      await workOrdersApi.updateStatus(active.orderNo, "กำลังผลิต", encodeLine(active.line, active.priority));
      await Promise.all(
        rs
          .filter((r) => r.work)
          .map((r) =>
            workApi.create({
              work: r.work,
              startDate: toISO(r.start),
              endDate: toISO(r.due),
              orderID: active.orderNo,
            }),
          ),
      );
      toast.success(
        `ใบสั่งผลิต ${active.orderNo} • ${rs.length} งาน • มอบหมายให้ ${workNames.join(", ")} เรียบร้อย`,
      );
      await loadOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "มอบหมายงานไม่สำเร็จ");
    } finally {
      setAssignOpen(false);
      setActive(null);
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
        plans={initialPlans}
        onClose={() => setSelectOpen(false)}
        onSelect={handlePlanSelected}
      />
      <WorkOrderDialog
        open={Boolean(orderPlan)}
        data={orderPlan}
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
        data={active ? { product: active.product, target: active.qty, due: formatThaiDate(active.due), orderID: active.orderNo } : null}
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
                            ผู้ปฏิบัติงาน: {o.assignees.join(", ")}
                          </Typography>
                        </>
                      ) : null}
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary", mt: 1 }}>
                        <TrendingUp sx={{ fontSize: 16 }} />
                        <Typography variant="caption">กำหนดเสร็จ: {formatThaiDate(o.due)} • คลิกเพื่อตรวจสอบทรัพยากร</Typography>
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
