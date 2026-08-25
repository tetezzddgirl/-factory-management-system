import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Layers, SouthWest, NorthEast, Refresh, SwapHoriz, Add } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography, Button, LinearProgress, Tabs, Tab } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";
import { useRole } from "@/lib/roles";
import { WipLocationsTable } from "@/components/wip-locations-table";
import {
  wipApi, wipLocationsApi, wipRecordsApi, requisitionsApi,
  type ApiWorkInProcess, type ApiWipRecord, type ApiRequisitionSlip, type ApiWipLocation,
} from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wip")({
  head: () => ({
    meta: [
      { title: "คลังสินค้าระหว่างผลิต (WIP) — FactoryFlow" },
      { name: "description", content: "จัดการสินค้าระหว่างผลิต ตรวจสอบยอดคงเหลือ และบันทึกรายการรับเข้า โอนย้าย เบิกจ่าย คืน" },
      { property: "og:title", content: "คลังสินค้าระหว่างผลิต (WIP) — FactoryFlow" },
      { property: "og:description", content: "ยอดคงเหลือและรายการเคลื่อนไหวของสินค้าระหว่างผลิต" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WipPage,
});

const iconFor = (t: string) => t === "รับเข้า" ? SouthWest : t === "เบิกจ่าย" ? NorthEast : t === "โอนย้าย" ? SwapHoriz : Refresh;
const colorFor = (t: string) => t === "รับเข้า" ? "#10B981" : t === "เบิกจ่าย" ? "#3B82F6" : t === "โอนย้าย" ? "#8B5CF6" : "#F59E0B";
const bgFor = (t: string) => `${colorFor(t)}1F`;

function WipPage() {
  const { role } = useRole();
  const [workInProcess, setWorkInProcess] = useState<ApiWorkInProcess[]>([]);
  const [workInProcessRecord, setWorkInProcessRecord] = useState<ApiWipRecord[]>([]);
  const [wipLocations, setWipLocations] = useState<ApiWipLocation[]>([]);
  const [, setRequisitionSlips] = useState<ApiRequisitionSlip[]>([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [wip, records, slips, locs] = await Promise.all([
        wipApi.list(),
        wipRecordsApi.list(),
        requisitionsApi.list(),
        wipLocationsApi.list(),
      ]);
      setWorkInProcess(wip ?? []);
      setWorkInProcessRecord(records ?? []);
      setRequisitionSlips(slips ?? []);
      setWipLocations(locs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูล WIP ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleAddNew(v: Record<string, string>) {
    const amount = Number(v.amount) || 0;
    const max = Number(v.max) || amount || 0;
    try {
      await wipApi.create({ wipID: v.wipID, wip: v.wip, inStage: v.inStage, amount, unit: v.unit, max });
      await wipLocationsApi.create({
        wipID: v.wipID, location: v.location, paletteNumber: v.paletteNumber, lotNumber: v.lotNumber, amount,
      });
      await wipRecordsApi.create({
        wipID: v.wipID, orderID: v.orderID, type: "รับเข้า", inStage: v.inStage,
        amount, leftAmount: amount, handler: v.handler, agency: v.agency, wipLocationID: "",
      });
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เพิ่มสินค้าระหว่างผลิตไม่สำเร็จ");
    }
  }

  async function handleRecordTransaction(v: Record<string, string>) {
    const qty = Number(v.amount) || 0;
    const code = v.item.split(" — ")[0];
    const target = workInProcess.find((i) => i.wipID === code);
    const sign = v.type === "เบิกจ่าย" ? -1 : v.type === "โอนย้าย" ? 0 : 1;
    const newAmount = target ? Math.max(0, target.amount + sign * qty) : qty;

    try {
      if (target) {
        await wipApi.updateAmount(code, newAmount);
      }
      await wipLocationsApi.create({
        wipID: code, location: v.location, paletteNumber: v.paletteNumber, lotNumber: v.lotNumber, amount: newAmount,
      });
      await wipRecordsApi.create({
        wipID: code, orderID: v.orderID || "-", type: v.type, inStage: "-",
        amount: qty, leftAmount: newAmount, handler: v.handler, agency: v.agency, wipLocationID: "",
      });
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกรายการไม่สำเร็จ");
    }
  }

  async function handleRequisition(v: Record<string, string>) {
    const qty = Number(v.amount) || 0;
    const code = v.item.split(" — ")[0];
    try {
      await requisitionsApi.create({
        orderID: v.orderID || "-", wipID: code, amount: qty, handler: v.handler,
      });
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างใบเบิกจ่ายไม่สำเร็จ");
    }
  }

  async function handleAssignLocation(wipID: string, location: string, amount: number) {
    await wipLocationsApi.create({ wipID, location, amount, paletteNumber: "", lotNumber: "" });
    await wipRecordsApi.create({
      wipID, orderID: "-", type: "รับเข้า", inStage: "-",
      amount, leftAmount: amount, handler: "-", agency: "ฝ่ายคลัง WIP", wipLocationID: "",
    });
    await loadAll();
  }

  const firstWip = workInProcess[0];

  return (
    <PageShell
      title="จัดการสินค้าระหว่างผลิต"
      description="ยอดคงเหลือสินค้าระหว่างผลิต (WIP) และรายการเคลื่อนไหว"
      icon={<Layers />}
      actions={
        <>
          {role === "warehouse" && (
            <>
              <AddItemDialog
                title="เพิ่มสินค้าระหว่างผลิตในรายการ"
                description="ประเภทรายการถูกกำหนดเป็น 'รับเข้า' โดยระบบ"
                successMessage="เพิ่มสินค้าระหว่างผลิตแล้ว"
                trigger={<Button variant="outlined" startIcon={<Add />}>เพิ่มในรายการ</Button>}
                fields={[
                  { name: "type", label: "ประเภทรายการ", type: "select", options: ["รับเข้า"], defaultValue: "รับเข้า" },
                  { name: "orderID", label: "หมายเลขใบสั่งผลิต", type: "select", options: ["WO-1042 - ขวด PET 500ml", "WO-1043 - ขวด PET 1L", "WO-1039 - ฝาเกลียว"], defaultValue: "WO-1042 - ขวด PET 500ml" },
                  { name: "wipID", label: "รหัสสินค้าระหว่างผลิต", placeholder: "WIP-005" },
                  { name: "wip", label: "ชื่อสินค้าระหว่างผลิต", placeholder: "ขวดติดฉลากแล้ว" },
                  { name: "inStage", label: "ขั้นตอนการผลิต", placeholder: "หลังติดฉลาก" },
                  { name: "amount", label: "จำนวน", type: "number", defaultValue: "0" },
                  { name: "unit", label: "หน่วย", defaultValue: "ชิ้น" },
                  { name: "location", label: "Location", placeholder: "A-01-01" },
                  { name: "paletteNumber", label: "Palette Number", placeholder: "PLT-005" },
                  { name: "lotNumber", label: "Lot Number", placeholder: "LOT-005" },
                  { name: "handler", label: "ชื่อผู้บันทึกรายการ", placeholder: "สมชาย ใจดี" },
                  { name: "agency", label: "แผนกต้นทาง", defaultValue: "ฝ่ายผลิต" },
                ]}
                onSubmit={handleAddNew}
              />
              <AddItemDialog
                title="บันทึกรายการสินค้าระหว่างผลิต"
                description="เลือกประเภทรายการและสินค้าในระบบ แล้วกรอกจำนวน"
                successMessage="บันทึกรายการสำเร็จ"
                trigger={<Button variant="contained">บันทึกรายการ</Button>}
                fields={[
                  { name: "type", label: "ประเภทรายการ", type: "select", options: ["รับเข้า", "โอนย้าย", "เบิกจ่าย", "คืน"], defaultValue: "รับเข้า" },
                  { name: "orderID", label: "หมายเลขใบสั่งผลิต", type: "select", options: ["WO-1042 - ขวด PET 500ml", "WO-1043 - ขวด PET 1L", "WO-1039 - ฝาเกลียว"], defaultValue: "WO-1042 - ขวด PET 500ml" },
                  { name: "item", label: "รหัส / ชื่อสินค้าระหว่างผลิต", type: "select", options: workInProcess.map((i) => `${i.wipID} — ${i.wip}`), defaultValue: firstWip ? `${firstWip.wipID} — ${firstWip.wip}` : "" },
                  { name: "amount", label: "จำนวน", type: "number", defaultValue: "0" },
                  { name: "unit", label: "หน่วย", defaultValue: "ชิ้น" },
                  { name: "location", label: "Location", placeholder: "A-01-01" },
                  { name: "paletteNumber", label: "Palette Number", placeholder: "PLT-005" },
                  { name: "lotNumber", label: "Lot Number", placeholder: "LOT-005" },
                  { name: "handler", label: "ชื่อผู้บันทึกรายการ", placeholder: "สมชาย ใจดี" },
                  { name: "agency", label: "แผนกปลายทาง", defaultValue: "ฝ่ายผลิต" },
                ]}
                onSubmit={handleRecordTransaction}
              />
            </>
          )}

          {role === "operator" && (
            <AddItemDialog
              title="สร้างใบเบิกจ่าย"
              description="บันทึกคำขอเบิกวัตถุดิบ/สินค้าระหว่างผลิตไปยังฝ่ายผลิต"
              successMessage="สร้างใบเบิกจ่ายแล้ว"
              trigger={<Button variant="contained" startIcon={<Add />}>ใบเบิกจ่าย</Button>}
              fields={[
                { name: "orderID", label: "หมายเลขใบสั่งผลิต", type: "select", options: ["WO-1042 - ขวด PET 500ml", "WO-1043 - ขวด PET 1L", "WO-1039 - ฝาเกลียว"], defaultValue: "WO-1042 - ขวด PET 500ml" },
                { name: "item", label: "รหัส / ชื่อสินค้าระหว่างผลิต", type: "select", options: workInProcess.map((i) => `${i.wipID} — ${i.wip}`), defaultValue: firstWip ? `${firstWip.wipID} — ${firstWip.wip}` : "" },
                { name: "amount", label: "จำนวนที่ต้องการเบิก", type: "number", defaultValue: "0" },
                { name: "unit", label: "หน่วย", defaultValue: "ชิ้น" },
                { name: "paletteNumber", label: "Palette Number", placeholder: "PLT-005" },
                { name: "lotNumber", label: "Lot Number", placeholder: "LOT-005" },
                { name: "handler", label: "ชื่อผู้ขอเบิก", placeholder: "สมชาย ใจดี" },
                { name: "agency", label: "แผนกปลายทาง", defaultValue: "ฝ่ายคลังสินค้าระหว่างผลิต" },
              ]}
              onSubmit={handleRequisition}
            />
          )}
        </>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="ยอดคงเหลือ WIP" />
        <Tab label="ตำแหน่ง WIP" />
      </Tabs>

      {loading ? (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : tab === 1 ? (
        <WipLocationsTable
          stocks={workInProcess.map((i) => ({ wipID: i.wipID, wip: i.wip, amount: i.amount, unit: i.unit }))}
          locations={wipLocations}
          onAssign={handleAssignLocation}
        />
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Grid container spacing={2}>
              {workInProcess.map((m, i) => {
                const pct = Math.min(100, Math.round((m.amount / m.max) * 100));
                return (
                  <Grid key={m.wipID} size={{ xs: 12, sm: 6 }}>
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -3 }}>
                      <Card>
                        <CardContent>
                          <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 600 }} noWrap>{m.wip}</Typography>
                              <Typography variant="caption" color="text.secondary">{m.wipID}</Typography>
                            </Box>
                            <Chip label={m.inStage} size="small" />
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">คงเหลือ</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{m.amount.toLocaleString()} {m.unit}</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={pct} />
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardContent>
                <Typography sx={{ fontWeight: 600, mb: 2 }}>รายการเคลื่อนไหวล่าสุด</Typography>
                <Stack spacing={1.5}>
                  {workInProcessRecord.map((t, i) => {
                    const Icon = iconFor(t.type);
                    return (
                      <motion.div key={t.wipRecordID ?? i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.05)" }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", background: bgFor(t.type), color: colorFor(t.type) }}>
                            <Icon sx={{ fontSize: 18 }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{workInProcess.find((r) => r.wipID === t.wipID)?.wip ?? t.wipID}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t.type} • {new Date(t.timestamp).toLocaleString("th-TH")}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.amount}</Typography>
                        </Stack>
                      </motion.div>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </PageShell>
  );
}
