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
import { plansApi, productsApi, formulasApi, formulaStepsApi, materialsApi, productionLinesApi, workOrdersApi, workApi, computeRequiredMaterials, formulaIDFor, formulaIDFromOption, formulaOptions, formulaOptionFor, stepsFor, type ApiProduct, type ApiFormulaItem, type ApiFormulaStep, type ApiRawMaterial, type ApiProductionLine } from "@/lib/api-client";
import { fromApiPlan, toISO, toDateInputValue } from "@/lib/plan-utils";

export const Route = createFileRoute("/_authenticated/planning")({
  head: () => ({ meta: [{ title: "วางแผนการผลิต — FactoryFlow" }] }),
  component: PlanningPage,
});

const statusColor: Record<string, "success" | "info" | "default"> = {
  "เสร็จสิ้น": "success", "กำลังผลิต": "info", "รอเริ่ม": "default", "รอมอบหมาย": "default",
};

function PlanningPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [formulas, setFormulas] = useState<ApiFormulaItem[]>([]);
  const [formulaSteps, setFormulaSteps] = useState<ApiFormulaStep[]>([]);
  const [rawMaterial, setRawMaterial] = useState<ApiRawMaterial[]>([]);
  const [productionLines, setProductionLines] = useState<ApiProductionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPlans() {
    setLoading(true);
    setError(null);
    try {
      const [data, prods, forms, steps, materials, lines] = await Promise.all([
        plansApi.list(),
        productsApi.list(),
        formulasApi.list(),
        formulaStepsApi.list(),
        materialsApi.list(),
        productionLinesApi.list(),
      ]);
      setPlans((data ?? []).map(fromApiPlan));
      setProducts(prods ?? []);
      setFormulas(forms ?? []);
      setFormulaSteps(steps ?? []);
      setRawMaterial(materials ?? []);
      setProductionLines(lines ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดแผนการผลิตไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  /** ขั้นตอนการผลิตของสินค้าตัวหนึ่ง (ไว้โชว์ตอนมอบหมายงาน) — หา bomID จากสูตรของสินค้านั้นก่อน แล้วดึงขั้นตอนที่ผูกกับ bomID นั้น */
  function stepsForProduct(product: string) {
    const productID = products.find((p) => p.name === product)?.productID;
    if (!productID) return undefined;
    const formulaID = formulaIDFor(formulas, productID);
    if (!formulaID) return undefined;
    return stepsFor(formulaSteps, formulaID);
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
  // งานที่เคยมอบหมาย/บันทึกไว้แล้วของใบสั่งผลิตที่กำลังจะมอบหมาย — ดึงมาก่อนเปิด AssignWorkDialog เพื่อเติมฟอร์มให้อัตโนมัติ
  // และกันไม่ให้กด "มอบหมายงาน" ซ้ำแล้วสร้างงานซ้ำ (duplicate) ใน backend
  const [existingTasks, setExistingTasks] = useState<AssignWorkResult[]>([]);
  const existingWorkIdsRef = useRef<Set<string>>(new Set());
  const { role } = useRole();
  const canAssign = role === "planner" || role === "supervisor" || role === "admin";

  function buildCheck(product: string, target: number, due: string): ResourceCheckData {
    const surplus = (base: number) => Math.max(base + 1, Math.round(base * (1.15 + Math.random() * 0.25)));
    const matchedProduct = products.find((p) => p.name === product);

    // ถ้าสินค้านี้มีสูตรการผลิต (Formula) อยู่ในระบบ -> คำนวณยอดวัตถุดิบที่ต้องใช้จริงจากสูตร x จำนวนที่ผลิต
    // เทียบกับยอดคงเหลือจริงในคลัง (ไม่ใช่ตัวเลขสุ่มอีกต่อไป)
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
      product, target, dueDate:due,
      materials,
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

  /** สร้างแผนจริงที่ backend — name/amount/status/priority/productID/bomID/line/startDate/endDate persist ลง DB ทั้งหมดแล้ว */
  async function savePlan(
  name: string, formula: string, amount: number, due: string, priority?: string,
  productID?: string, start?: string,
): Promise<boolean> {
  try {
    const apiPlan = await plansApi.create({
      name, amount, status: "รอเริ่ม", priority,
      productID, formulaID: formula,
      startDate: toISO(start ?? ""), endDate: toISO(due),
    });
    const created: PlanRow = fromApiPlan(apiPlan);
    setPlans((prev) => [created, ...prev]);
    setSavedPlan(created);
    return true;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "สร้างแผนการผลิตไม่สำเร็จ");
    return false;
  }
}

  async function updatePriority(planId: string, priority: string) {
    setPlans((prev) => prev.map((p) => (p.planID === planId ? { ...p, priority } : p)));
    setDetailPlan((prev) => (prev && prev.planID === planId ? { ...prev, priority } : prev));
    try {
      await plansApi.updatePriority(planId, priority);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปเดตลำดับความสำคัญไม่สำเร็จ");
    }
  }

  function isNegative(field: string) {
    return (values: Record<string, string>) => Number(values[field]) < 0;
  }

  function handleRequestPlan(v: Record<string, string>) {
    const amount = Number(v.amount) || 0;
    if (amount < 0) {
      toast.error("จำนวนที่ผลิตต้องไม่ติดลบ");
      return false;
    }
    const productID = v.productID.split(" — ")[0];
    const productName = v.productID.split(" — ")[1] ?? v.productID;
    const formulaID = formulaIDFromOption(v.formula);
    return savePlan(productName, formulaID, amount, v.due, v.priority, productID, v.start);
  }

  /** เลือกสินค้า -> เติมสูตรการผลิต (bom) และคำนวณยอดวัตถุดิบที่ต้องใช้แสดงเป็น preview ให้เอง
   *  เปลี่ยนจำนวนที่ผลิต -> คำนวณ preview ใหม่ตามสูตรของสินค้าที่เลือกอยู่ */
  function autoFillPlan(values: Record<string, string>, changed: string): Partial<Record<string, string>> | void {
    if (changed !== "productID" && changed !== "amount") return;
    const productID = values.productID.split(" — ")[0];
    const product = products.find((p) => p.productID === productID);
    if (!product) return;

    const amount = Number(values.amount) || 0;
    const need = computeRequiredMaterials(formulas, rawMaterial, productID, amount);
    const formulaID = formulas.find((f) => f.productID === productID)?.formulaID ?? "";
    const requiredMaterials = need.length
      ? need.map((m) => `${m.name} ${m.required.toLocaleString()} ${m.unit} (คงเหลือ ${m.available.toLocaleString()} ${m.unit})`).join(" | ")
      : "ยังไม่มีสูตรการผลิตของสินค้านี้ในระบบ";

    return changed === "productID"
      ? { formula: formulaOptionFor(formulas, products, formulaID), requiredMaterials }
      : { requiredMaterials };
  }

  async function handleTemplate(r: TemplateResult) {
  if (r.target < 0) {
    toast.error("จำนวนที่ผลิตต้องไม่ติดลบ");
    return false;
  }
  const productID = products.find((p) => p.name === r.product)?.productID;
  const ok = await savePlan(r.product, formulaIDFromOption(r.formula), r.target, r.due, r.priority, productID, r.start);
  if (ok) setTemplateOpen(false);
  return ok;
}

  function createOrderFor(plan: PlanRow) {
    setDetailPlan(null);
    setSavedPlan(null);
    setOrderPlan(plan);
  }

  function getToday() {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  }

  /** สร้างใบสั่งผลิตจริงที่ backend ก่อน (persist ลง DB แล้ว) แล้วค่อยพาไปตรวจสอบทรัพยากรต่อ
   *  เดิม flow นี้เก็บไว้แค่ฝั่ง frontend เท่านั้น ทำให้ใบสั่งผลิต/งานที่มอบหมายจากหน้านี้ไม่ถูกบันทึกลง DB เลย */
  async function handleOrderSubmit(r: WorkOrderResult) {
    try {
      const created = await workOrdersApi.create({
        orderID: r.orderNo,
        name: r.product,
        status: "รอมอบหมาย",
        amount: r.qty,
        startDate: toISO(r.startDate),
        endDate: toISO(r.due),
        planID: orderPlan?.planID ?? "-",
        production_line_id: r.productionLineID,
      });
      setOrderPlan(null);
      setOrder(r);
      setPending({ product: r.product, target: r.qty, due: r.due, orderID: created.orderID });
      setCheckData(buildCheck(r.product, r.qty, r.due));
      setCheckOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกใบสั่งผลิตไม่สำเร็จ");
    }
  }

  async function confirmPlan() {
    setCheckOpen(false);
    if (canAssign) {
      // โหลดงานที่เคยมอบหมายไว้แล้วของใบสั่งผลิตนี้ (ถ้ามี) มาเติมฟอร์มมอบหมายงานให้อัตโนมัติ
      if (pending) {
        try {
          const existing = await workApi.list(pending.orderID);
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
      toast.success(`สร้างใบสั่งผลิต ${order?.orderNo ?? ""} สำเร็จ`);
      setPending(null);
      setOrder(null);
    }
  }

  /** มอบหมายงาน — บันทึกใบสั่งผลิตเป็น "กำลังผลิต" และสร้างงาน (Work) แต่ละงานลง backend จริง
   *  เดิม flow นี้แค่ toast แจ้งเฉยๆ ไม่เคยเรียก API เลย ทำให้งานที่มอบหมายหายไปทันทีที่ปิด dialog */
  async function confirmAssignment(rs: AssignWorkResult[]) {
    const workNames = rs.map((r) => r.work).filter(Boolean);
    if (!order || !pending) return;
    try {
      await workOrdersApi.updateStatus(pending.orderID, "กำลังผลิต");
      // สร้างเฉพาะงานที่ยังไม่เคยบันทึกลง backend (ไม่มี workID เดิมอยู่แล้ว) กันงานซ้ำตอนเปิด dialog มอบหมายซ้ำ
      await Promise.all(
        rs.filter((r) => r.work && !existingWorkIdsRef.current.has(r.workID)).map((r) =>
          workApi.create({
            work: r.work,
            description: r.description,
            startDate: toISO(r.start),
            endDate: toISO(r.due),
            orderID: pending.orderID,
          }),
        ),
      );
      toast.success(
        `ใบสั่งผลิต ${pending.orderID} • ${rs.length} งาน • มอบหมายให้ ${workNames.join(", ")} เรียบร้อย`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "มอบหมายงานไม่สำเร็จ");
    } finally {
      setAssignOpen(false);
      setPending(null);
      setOrder(null);
      setExistingTasks([]);
      existingWorkIdsRef.current = new Set();
    }
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
                { name: "planID", label: "หมายเลขแผนการผลิต", readOnly: true, required: false, helperText: "ระบบกำหนดให้อัตโนมัติ", },
                { name: "productID", label: "สินค้า", type: "select", options: products.map((p) => `${p.productID} — ${p.name}`), defaultValue: products[0] ? `${products[0].productID} — ${products[0].name}` : "" },
                { name: "formula", label: "สูตรการผลิต", type: "select", options: formulaOptions(formulas, products), helperText: "เติมอัตโนมัติตามสินค้าที่เลือก — แสดงทั้งรหัสสูตรและชื่อสูตร เลือกสูตรอื่นเองได้ถ้าต้องการ" },
                { name: "amount", label: "จำนวนที่ผลิต", type: "number", defaultValue: "1000", error: isNegative("amount") },
                { name: "requiredMaterials", label: "วัตถุดิบที่ต้องใช้ (คำนวณจากสูตร x จำนวน)", type: "textarea", required: false, helperText: "คำนวณอัตโนมัติจากสูตรการผลิตของสินค้าที่เลือก เทียบกับยอดคงเหลือปัจจุบัน" },
                { name: "priority", label: "ลำดับความสำคัญ", type: "select", options: ["สูง", "ปกติ", "ต่ำ"], defaultValue: "ปกติ" },
                { name: "start", label: "วันที่เริ่มผลิต", type: "date", defaultValue: getToday() },
                { name: "due", label: "กำหนดเสร็จ", type: "date", defaultValue: getToday() },
              ]}
              onOpen={async () => {
                try {
                  const res = await plansApi.getNextID();
                  return { planID: res.planID };
                } catch {
                  return {}; // preview พลาดไม่บล็อก user, ปล่อยว่างไว้ให้ backend generate ตอน submit จริง
                      }
              }}
              onAutoFill={autoFillPlan}
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
        planId={savedPlan?.planID ?? null}
        product={savedPlan?.name ?? ""}
        onSaveOnly={() => { setSavedPlan(null); toast.success("บันทึกแผนการผลิตแล้ว"); }}
        onCreateOrder={() => { if (savedPlan) createOrderFor(savedPlan); }}
      />
      <WorkOrderDialog
        open={Boolean(orderPlan)}
        data={orderPlan}
        productionLines={productionLines}
        onClose={() => setOrderPlan(null)}
        onSubmit={handleOrderSubmit}
      />
      <CopyTemplateDialog
        open={templateOpen}
        plans={plans}
        products={products}
        formulas={formulas}
        rawMaterial={rawMaterial}
        productionLines={productionLines}
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
        data={pending ? { ...pending, dueDate: pending.due, materials: checkData?.materials, steps: stepsForProduct(pending.product), existingTasks } : null}
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
          // const pct = Math.round((p.done / p.target) * 100);
          return (
            <Grid key={p.planID} size={{ xs: 12, md: 6 }}>
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
                <Card sx={{ overflow: "hidden" }}>
                  <Box sx={{ height: 4, background: "linear-gradient(90deg,#7FB4EE,#4A90E2)" }} />
                  <CardActionArea onClick={() => setDetailPlan(p)}>
                  <CardContent>
                    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.planID}</Typography>
                      </Box>
                      <Chip label={p.status} color={statusColor[p.status]} size="small" />
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">ความคืบหน้า</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {/* {p.done.toLocaleString()} / {p.amount.toLocaleString()} <Box component="span" sx={{ color: "primary.main" }}>({pct}%)</Box> */}
                      </Typography>
                    </Stack>
                    {/* <LinearProgress variant="determinate" value={pct} sx={{ mb: 2 }} /> */}
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
                      <TrendingUp sx={{ fontSize: 16 }} />
                      <Typography variant="caption">กำหนดเสร็จ: {p.dueDate}</Typography>
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