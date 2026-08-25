import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Layers, Inventory2, Warning, SouthWest, NorthEast, Refresh, SwapHoriz, Add } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography, Button, LinearProgress, Tabs, Tab } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";
import { useRole } from "@/lib/roles";
import { RMLocationsTable } from "@/components/material-locations-table";
import { materialsApi, materialLocationsApi, materialRecordsApi, type ApiRawMaterial, type ApiRawMaterialRecord } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/materials")({
  head: () => ({ meta: [{ title: "วัตถุดิบ — FactoryFlow" }] }),
  component: MaterialsPage,
});

type RawMaterial = ApiRawMaterial;
type RawMaterialRecord = ApiRawMaterialRecord;

const iconFor = (t: string) => t === "รับเข้า" ? SouthWest : t === "เบิกจ่าย" ? NorthEast : Refresh;
const colorFor = (t: string) => t === "รับเข้า" ? "#10B981" : t === "เบิกจ่าย" ? "#3B82F6" : "#F59E0B";
const bgFor = (t: string) => t === "รับเข้า" ? "rgba(16,185,129,0.12)" : t === "เบิกจ่าย" ? "rgba(59,130,246,0.12)" : "rgba(245,158,11,0.12)";

function MaterialsPage() {
  const { role } = useRole();
  const [rawMaterial, setRawMaterial] = useState<RawMaterial[]>([]);
  const [rawMaterialRecord, setRawMaterialRecord] = useState<RawMaterialRecord[]>([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [materials, records] = await Promise.all([
        materialsApi.list(),
        materialRecordsApi.list(),
      ]);
      setRawMaterial(materials ?? []);
      setRawMaterialRecord(records ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลวัตถุดิบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <PageShell
      title="จัดการวัตถุดิบ"
      description="ตรวจสอบสต็อก บันทึกการรับ-จ่าย และแจ้งเตือนของหมด"
      icon={<Layers />}
      actions={
        role === "warehouse" && (
        <>
          <AddItemDialog
            title="เพิ่มวัตถุดิบในรายการ"
            description="ประเภทรายการถูกกำหนดเป็น 'รับเข้า' โดยระบบ"
            successMessage="เพิ่มวัตถุดิบแล้ว"
            trigger={<Button variant="outlined" startIcon={<Add />}>เพิ่มในรายการ</Button>}
            fields={[
              { name: "type", label: "ประเภทรายการ", type: "select", options: ["รับเข้า"], defaultValue: "รับเข้า" },
              { name: "orderID", label: "หมายเลขใบสั่งผลิต", type: "select", options: ["WO-1042 - ขวด PET 500ml", "WO-1043 - ขวด PET 1L", "WO-1039 - ฝาเกลียว"], defaultValue: "WO-1042 - ขวด PET 500ml" },
              { name: "rmID", label: "รหัสวัตถุดิบ", placeholder: "RM-005" },
              { name: "rawMaterial", label: "ชื่อวัตถุดิบ", placeholder: "HDPE Resin" },
              { name: "amount", label: "จำนวน", type: "number", defaultValue: "0" },
              { name: "unit", label: "หน่วย", defaultValue: "ชิ้น" },
              { name: "max", label: "จำนวนสูงสุดที่เก็บได้", type: "number", defaultValue: "10000" },
              { name: "min", label: "จำนวนที่ต้องสำรอง", type: "number", defaultValue: "0" },
              { name: "location", label: "Location", placeholder: "A-01-01" },
              { name: "paletteNumber", label: "Palette Number", placeholder: "PLT-005" },
              { name: "lotNumber", label: "Lot Number", placeholder: "LOT-005" },
              { name: "handler", label: "ชื่อผู้บันทึกรายการ", placeholder: "สมชาย ใจดี" },
              { name: "agency", label: "แผนกต้นทาง", defaultValue: "Supplier A" },
            ]}
            onSubmit={async (v) => {
              const amount = Number(v.amount) || 0;
              const max = Number(v.max) || 0;
              const min = Number(v.min) || 0;

              try {
                const created = await materialsApi.create({
                  rmID: v.rmID, rawMaterial: v.rawMaterial, amount, unit: v.unit, max, min,
                });
                setRawMaterial((prev) => [created, ...prev.filter((i) => i.rmID !== created.rmID)]);

                const loc = await materialLocationsApi.create({
                  rmID: v.rmID, amount, location: v.location,
                  paletteNumber: v.paletteNumber, lotNumber: v.lotNumber,
                });
                const rec = await materialRecordsApi.create({
                  rmID: v.rmID, orderID: v.orderID, type: "รับเข้า", amount,
                  leftAmount: amount, handler: v.handler, agency: v.agency,
                  rmLocationID: loc.rmLocationID,
                });
                setRawMaterialRecord((prev) => [rec, ...prev]);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "เพิ่มวัตถุดิบไม่สำเร็จ");
              }
            }}
          />
          <AddItemDialog
            title="บันทึกรายการวัตถุดิบ"
            description="บันทึกการรับเข้า เบิกจ่าย หรือคืนวัตถุดิบ"
            successMessage="บันทึกรายการสำเร็จ"
            trigger={<Button variant="contained">บันทึกรายการ</Button>}
            fields={[
              { name: "type", label: "ประเภทรายการ", type: "select", options: ["รับเข้า", "โอนย้าย", "เบิกจ่าย", "คืน"], defaultValue: "รับเข้า" },
              { name: "orderID", label: "หมายเลขใบสั่งผลิต", type: "select", options: ["WO-1042 - ขวด PET 500ml", "WO-1043 - ขวด PET 1L", "WO-1039 - ฝาเกลียว"], defaultValue: "WO-1042 - ขวด PET 500ml" },
              { name: "item", label: "รหัส / ชื่อวัตถุดิบ", type: "select", options: rawMaterial.map((i) => `${i.rmID} — ${i.rawMaterial}`), defaultValue: rawMaterial[0] ? `${rawMaterial[0].rmID} — ${rawMaterial[0].rawMaterial}` : "" },
              { name: "amount", label: "จำนวน", type: "number", defaultValue: "0" },
              { name: "unit", label: "หน่วย", defaultValue: "ชิ้น" },
              { name: "location", label: "Location", placeholder: "A-01-01" },
              { name: "paletteNumber", label: "Palette Number", placeholder: "PLT-005" },
              { name: "lotNumber", label: "Lot Number", placeholder: "LOT-005" },
              { name: "handler", label: "ชื่อผู้บันทึกรายการ", placeholder: "สมชาย ใจดี" },
              { name: "agency", label: "แผนกปลายทาง", defaultValue: "ฝ่ายผลิต" },
            ]}
            onSubmit={async (v) => {
              const qty = Number(v.amount) || 0;
              const code = v.item.split(" — ")[0];
              const target = rawMaterial.find((i) => i.rmID === code);
              const sign = v.type === "เบิกจ่าย" ? -1 : v.type === "โอนย้าย" ? 0 : 1;
              const newAmount = target ? Math.max(0, target.amount + sign * qty) : qty;

              try {
                await materialsApi.updateStock(code, newAmount);
                setRawMaterial((prev) => prev.map((i) => (i.rmID === code ? { ...i, amount: newAmount } : i)));

                let rmLocationID = "";
                if (v.location) {
                  const loc = await materialLocationsApi.create({
                    rmID: code, amount: qty, location: v.location,
                    paletteNumber: v.paletteNumber, lotNumber: v.lotNumber,
                  });
                  rmLocationID = loc.rmLocationID;
                }
                const rec = await materialRecordsApi.create({
                  rmID: code, orderID: v.orderID, type: v.type, amount: qty,
                  leftAmount: newAmount, handler: v.handler, agency: v.agency, rmLocationID,
                });
                setRawMaterialRecord((prev) => [rec, ...prev]);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "บันทึกรายการไม่สำเร็จ");
              }
            }}
            />
        </>
  )}
    >
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="ยอดคงเหลือวัตถุดิบ" />
        <Tab label="ตำแหน่งวัตถุดิบ" />
      </Tabs>

      {loading && (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      )}
      {!loading && error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !error && (
      tab === 1 ? (
        <RMLocationsTable
          stocks={rawMaterial.map((i) => ({ rmID: i.rmID, rawMaterial: i.rawMaterial, amount: i.amount, unit: i.unit }))}
           />
      ) : (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid container spacing={2}>
            {rawMaterial.map((m, i) => {
              const pct = Math.min(100, Math.round((m.amount / m.max) * 100));
              return (
                <Grid key={m.rmID} size={{ xs: 12, sm: 6 }}>
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -3 }}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600 }} noWrap>{m.rawMaterial}</Typography>
                            <Typography variant="caption" color="text.secondary">{m.rmID}</Typography>
                          </Box>
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
                {rawMaterialRecord.map((t, i) => {
                  const Icon = iconFor(t.type);
                  return (
                    <motion.div key={t.rmRecordID} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.05)" }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", background: bgFor(t.type), color: colorFor(t.type) }}>
                          <Icon sx={{ fontSize: 18 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{rawMaterial.find((r) => r.rmID === t.rmID)?.rawMaterial ?? t.rmID}</Typography>
                          <Typography variant="caption" color="text.secondary">{t.type} • {new Date(t.timestamp).toLocaleString("th-TH")}</Typography>
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
      )
      )}
    </PageShell>
  );
}
