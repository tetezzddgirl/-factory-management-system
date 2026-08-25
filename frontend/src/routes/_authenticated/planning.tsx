import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarMonth, Add, TrendingUp, ContentCopy, NoteAdd, ArrowDropDown } from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";
import { Alert, Box, Card, CardContent, CardActionArea, Chip, CircularProgress, Grid, Stack, Typography, Button, LinearProgress, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";
import { ResourceCheckDialog, type ResourceCheckData } from "@/components/resource-check-dialog";
import { AssignWorkDialog, type AssignWorkResult } from "@/components/assign-work-dialog";
import { PlanDetailDialog, type PlanRow } from "@/components/plan-detail-dialog";
import { CopyTemplateDialog, type TemplateResult } from "@/components/copy-template-dialog";
import { WorkOrderDialog, type WorkOrderResult } from "@/components/work-order-dialog";
import { PlanSavedDialog } from "@/components/plan-saved-dialog";
import { useRole } from "@/lib/roles";
import { toast } from "sonner";
import { plansApi, type ApiPlan } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/planning")({
  head: () => ({ meta: [{ title: "วางแผนการผลิต — FactoryFlow" }] }),
  component: PlanningPage,
});

const statusColor: Record<string, "success" | "info" | "default"> = {
  "เสร็จสิ้น": "success", "กำลังผลิต": "info", "รอเริ่ม": "default",
};

// backend/models.Plan ยังไม่มี field bom/priority/start/line/owner จึงเก็บแค่ฝั่ง frontend
// (ไม่ persist ไป backend) — ถ้าต้องการเก็บจริงต้องเพิ่ม column ฝั่ง Go ก่อน
function fromApiPlan(p: ApiPlan): PlanRow {
  return {
    id: String(p.id),
    product: p.product,
    bom: "-",
    target: p.target,
    done: p.done,
    due: p.dueDate ? new Date(p.dueDate).toLocaleDateString("th-TH") : "-",
    status: p.status,
  };
}

function PlanningPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPlans() {
    setLoading(true);
    setError(null);
    try {
      const data = await plansApi.list();
      setPlans((data ?? []).map(fromApiPlan));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดแผนการผลิตไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);
  const [checkOpen, setCheckOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [orderPlan, setOrderPlan] = useState<PlanRow | null>(null);
  const [savedPlan, setSavedPlan] = useState<PlanRow | null>(null);
  const [order, setOrder] = useState<WorkOrderResult | null>(null);
  const [detailPlan, setDetailPlan] = useState<PlanRow | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);
  const newPlanRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState<{ product: string; target: number; due: string; orderID: string } | null>(null);
  const [checkData, setCheckData] = useState<ResourceCheckData | null>(null);
  const { role } = useRole();
  const canAssign = role === "planner" || role === "supervisor" || role === "admin";

  function buildCheck(product: string, target: number, due: string): ResourceCheckData {
    // mock resource requirement calc from BOM — ensure sufficient supply so demo flow can proceed
    const surplus = (base: number) => Math.max(base + 1, Math.round(base * (1.15 + Math.random() * 0.25)));
    return {
      product, target, due,
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
        { name: "Operator", required: 3, available: 4, unit: "คน" },
        { name: "QC Inspector", required: 1, available: 2, unit: "คน" },
      ],
    };
  }

  /** สร้างแผนจริงที่ backend (product/target/status) แล้วผสาน field ที่ backend ยังไม่รองรับ (bom/priority) ไว้ฝั่ง frontend */
  async function savePlan(product: string, bom: string, target: number, due: string, priority?: string) {
    try {
      const apiPlan = await plansApi.create({ product, target, status: "รอเริ่ม" });
      const created: PlanRow = { ...fromApiPlan(apiPlan), bom, due: due || "-", priority };
      setPlans((prev) => [created, ...prev]);
      setSavedPlan(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างแผนการผลิตไม่สำเร็จ");
    }
  }

  function updatePriority(planId: string, priority: string) {
  setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, priority } : p)));
  setDetailPlan((prev) => (prev && prev.id === planId ? { ...prev, priority } : prev));
  }

  function handleRequestPlan(v: Record<string, string>) {
    savePlan(v.product, v.bom, Number(v.target) || 0, v.due, v.priority);
  }

  function handleTemplate(r: TemplateResult) {
    setTemplateOpen(false);
    savePlan(r.product, r.bom,  r.target, r.due, r.priority);
  }

  function createOrderFor(plan: PlanRow) {
    setDetailPlan(null);
    setSavedPlan(null);
    setOrderPlan(plan);
  }

  function handleOrderSubmit(r: WorkOrderResult) {
    setOrderPlan(null);
    setOrder(r);
    setPending({ product: r.product, target: r.qty, due: r.due, orderID: r.orderNo });
    setCheckData(buildCheck(r.product, r.qty, r.due));
    setCheckOpen(true);
  }

  function confirmPlan() {
    setCheckOpen(false);
    if (canAssign) {
      setAssignOpen(true);
    } else {
      toast.success(`สร้างใบสั่งผลิต ${order?.orderNo ?? ""} สำเร็จ`);
      setPending(null);
      setOrder(null);
    }
  }

  function confirmAssignment(rs: AssignWorkResult[]) {
    const workNames = rs.map((r) => r.work).filter(Boolean);
    toast.success(
      `ใบสั่งผลิต ${order?.orderNo ?? ""} • ${rs.length} งาน • มอบหมายให้ ${workNames.join(", ")} เรียบร้อย`,
    );
    setAssignOpen(false);
    setPending(null);
    setOrder(null);
  }

  return (
    <PageShell
      title="วางแผนการผลิต"
      description="สร้างและติดตามแผนการผลิตของโรงงาน"
      icon={<CalendarMonth />}
      actions={
        <>
          <Button variant="contained" startIcon={<Add />} endIcon={<ArrowDropDown />} onClick={(e) => setMenuEl(e.currentTarget)}>
            สร้างแผน
          </Button>
          <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
            <MenuItem onClick={() => { setMenuEl(null); newPlanRef.current?.click(); }}>
              <ListItemIcon><NoteAdd fontSize="small" /></ListItemIcon>
              <ListItemText primary="สร้างแผนการผลิตใหม่" secondary="กรอกข้อมูลเองทั้งหมด" />
            </MenuItem>
            <MenuItem onClick={() => { setMenuEl(null); setTemplateOpen(true); }}>
              <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
              <ListItemText primary="ปรับแต่งแผนการผลิตเดิม" secondary="Copy as Template" />
            </MenuItem>
          </Menu>
          <Box sx={{ display: "none" }}>
            <AddItemDialog
              title="สร้างแผนการผลิตใหม่"
              description="กรอกข้อมูลแผนการผลิตใหม่"
              successMessage="บันทึกแผนการผลิตแล้ว"
              submitLabel="บันทึกแผนการผลิต"
              trigger={<Button ref={newPlanRef}>เปิด</Button>}
              fields={[
                { name: "planID", label: "หมายเลขแผนการผลิต", placeholder: "PLAN-2025-07-01" },
                { name: "name", label: "ชื่อแผนการผลิต", placeholder: "ขวด PET 500ml" },
                { name: "product", label: "สินค้า", placeholder: "ขวด PET 500ml" },
                { name: "bom", label: "สูตรการผลิต", placeholder: "BOM-001" },
                { name: "amount", label: "จำนวนที่ผลิต", type: "number", defaultValue: "1000" },
                { name: "machine", label: "ลำดับสายการผลิตที่ใช้งาน", placeholder: "สายการผลิตที่ 1" },
                { name: "priority", label: "ลำดับความสำคัญ", type: "select", options: ["สูง", "ปกติ", "ต่ำ"], defaultValue: "ปกติ" },
                { name: "start", label: "วันที่เริ่มผลิต", placeholder: "10 ก.ค. 2568" },
                { name: "due", label: "กำหนดเสร็จ", placeholder: "15 ก.ค. 2568" },
              ]}
              onSubmit={handleRequestPlan}
            />
          </Box>
        </>
      }
    >
      <PlanDetailDialog
        open={Boolean(detailPlan)}
        plan={detailPlan}
        onClose={() => setDetailPlan(null)}
        onCreateOrder={createOrderFor}
        onUpdatePriority={updatePriority}
      />
      <PlanSavedDialog
        open={Boolean(savedPlan)}
        planId={savedPlan?.id ?? null}
        product={savedPlan?.product ?? ""}
        onSaveOnly={() => { setSavedPlan(null); toast.success("บันทึกแผนการผลิตแล้ว"); }}
        onCreateOrder={() => { if (savedPlan) createOrderFor(savedPlan); }}
      />
      <WorkOrderDialog
        open={Boolean(orderPlan)}
        data={orderPlan}
        onClose={() => setOrderPlan(null)}
        onSubmit={handleOrderSubmit}
      />
      <CopyTemplateDialog
        open={templateOpen}
        plans={plans}
        onClose={() => setTemplateOpen(false)}
        onSubmit={handleTemplate}
      />
      <ResourceCheckDialog
        open={checkOpen}
        data={checkData}
        onClose={() => setCheckOpen(false)}
        onConfirm={confirmPlan}
      />
      <AssignWorkDialog
        open={assignOpen}
        data={pending}
        onClose={() => setAssignOpen(false)}
        onConfirm={confirmAssignment}
      />
      {loading && (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      )}
      {!loading && error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !error && (
      <Grid container spacing={2}>
        {plans.map((p, i) => {
          const pct = Math.round((p.done / p.target) * 100);
          return (
            <Grid key={p.id} size={{ xs: 12, md: 6 }}>
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
                <Card sx={{ overflow: "hidden" }}>
                  <Box sx={{ height: 4, background: "linear-gradient(90deg,#7FB4EE,#4A90E2)" }} />
                  <CardActionArea onClick={() => setDetailPlan(p)}>
                  <CardContent>
                    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{p.product}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.id}</Typography>
                      </Box>
                      <Chip label={p.status} color={statusColor[p.status]} size="small" />
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">ความคืบหน้า</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {p.done.toLocaleString()} / {p.target.toLocaleString()} <Box component="span" sx={{ color: "primary.main" }}>({pct}%)</Box>
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={pct} sx={{ mb: 2 }} />
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
                      <TrendingUp sx={{ fontSize: 16 }} />
                      <Typography variant="caption">กำหนดเสร็จ: {p.due}</Typography>
                    </Stack>
                  </CardContent>
                  </CardActionArea>
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>
      )}
    </PageShell>
  );
}
