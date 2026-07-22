import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Inventory2, Warning, SouthWest, NorthEast, Refresh } from "@mui/icons-material";
import { useState } from "react";
import { Box, Card, CardContent, Chip, Grid, Stack, Typography, Button, LinearProgress } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";

export const Route = createFileRoute("/_authenticated/materials")({
  head: () => ({ meta: [{ title: "จัดการวัตถุดิบ — FactoryFlow" }] }),
  component: MaterialsPage,
});

const materials = [
  { name: "PET Preform", code: "MAT-001", stock: 8, qty: "1,200 kg", low: true },
  { name: "HDPE Resin", code: "MAT-002", stock: 62, qty: "8,400 kg", low: false },
  { name: "ฝาพลาสติก", code: "MAT-003", stock: 45, qty: "22,000 ชิ้น", low: false },
  { name: "ฉลากสติกเกอร์", code: "MAT-004", stock: 15, qty: "5,000 ม.", low: true },
  { name: "กล่องกระดาษ", code: "MAT-005", stock: 78, qty: "3,200 ใบ", low: false },
  { name: "หมึกพิมพ์", code: "MAT-006", stock: 34, qty: "45 ลิตร", low: false },
];

type Txn = { type: string; item: string; qty: string; time: string };
const initialTxns: Txn[] = [
  { type: "รับเข้า", item: "HDPE Resin", qty: "+2,000 kg", time: "วันนี้ 09:30" },
  { type: "เบิกจ่าย", item: "PET Preform", qty: "-500 kg", time: "วันนี้ 08:15" },
  { type: "คืน", item: "ฝาพลาสติก", qty: "+120 ชิ้น", time: "เมื่อวาน 17:00" },
];

const iconFor = (t: string) => t === "รับเข้า" ? SouthWest : t === "เบิกจ่าย" ? NorthEast : Refresh;
const colorFor = (t: string) => t === "รับเข้า" ? "#10B981" : t === "เบิกจ่าย" ? "#3B82F6" : "#F59E0B";
const bgFor = (t: string) => t === "รับเข้า" ? "rgba(16,185,129,0.12)" : t === "เบิกจ่าย" ? "rgba(59,130,246,0.12)" : "rgba(245,158,11,0.12)";

function MaterialsPage() {
  const [txns, setTxns] = useState(initialTxns);
  return (
    <PageShell
      title="จัดการวัตถุดิบ"
      description="ตรวจสอบสต็อก บันทึกการรับ-จ่าย และแจ้งเตือนของหมด"
      icon={<Inventory2 />}
      actions={
        <Stack direction="row" spacing={2}>{
          <AddItemDialog
            title="บันทึกรายการวัตถุดิบ"
            description="บันทึกการรับเข้า เบิกจ่าย โอนย้าย หรือคืนวัตถุดิบ"
            successMessage="บันทึกรายการสำเร็จ"
            trigger={<Button variant="contained">บันทึกรายการ</Button>}
            fields={[
              { name: "type",     label: "ประเภทรายการ", type: "select", options: ["รับเข้า", "เบิกจ่าย", "โอนย้าย","คืน"], defaultValue: "" },
              { name: "code",     label: "รหัสวัตถุดิบ", type: "select", options: ["MAT-001", "MAT-002", "MAT-003","MAT-004", "MAT-005", "MAT-006"], defaultValue: "" },
              { name: "item",     label: "ชื่อวัตถุดิบ", placeholder: "HDPE Resin" },
              {
                type: "row",
                fields: [
                  { name: "qty",  label: "จำนวน", placeholder: "+500", flex: 2 },
                  { name: "unit", label: "หน่วย", type: "select", options: ["kg", "ชิ้น", "เมตร","ลิตร"], defaultValue: "", flex: 1 },
                ],
              },
              { name: "location", label: "ตำแหน่งที่จัดเก็บ", placeholder: "A11" },
              { name: "lot number",label: "lot number", placeholder: "LOT-005" },
              { name: "palette number",label: "palette number", placeholder: "PLT-005" },
            //โอนย้ายต้องบอกต้นทางปลายทาง
            ]}
            onSubmit={(v) => setTxns((prev) => [{ type: v.type, code: v.code, item: v.item, qty: v.qty, location: v.location, time: "เมื่อสักครู่" }, ...prev,])}
          />
        }
      </Stack>
      }
    >
      <Grid container spacing={2}></Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid container spacing={2}>
            {materials.map((m, i) => (
              <Grid key={m.code} size={{ xs: 12, sm: 6 }}>
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -3 }}>
                  <Card>
                    <CardContent>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>{m.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{m.code}</Typography>
                        </Box>
                        {m.low && (
                          <Chip icon={<Warning sx={{ fontSize: 14 }} />} label="ใกล้หมด" color="error" size="small" />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">คงเหลือ</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{m.qty}</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={m.stock}
                        color={m.low ? "error" : "primary"}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 600, mb: 2 }}>รายการเคลื่อนไหวล่าสุด</Typography>
              <Stack spacing={1.5}>
                {txns.map((t, i) => {
                  const Icon = iconFor(t.type);
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.05)" }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", background: bgFor(t.type), color: colorFor(t.type) }}>
                          <Icon sx={{ fontSize: 18 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{t.item}</Typography>
                          <Typography variant="caption" color="text.secondary">{t.type} • {t.time}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.qty}</Typography>
                      </Stack>
                    </motion.div>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageShell>
  );
}
