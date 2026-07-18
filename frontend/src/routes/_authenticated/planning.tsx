import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarMonth, Add, TrendingUp } from "@mui/icons-material";
import { useState } from "react";
import { Box, Card, CardContent, Chip, Grid, Stack, Typography, Button, LinearProgress } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";

export const Route = createFileRoute("/_authenticated/planning")({
  head: () => ({ meta: [{ title: "วางแผนการผลิต — FactoryFlow" }] }),
  component: PlanningPage,
});

const initialPlans = [
  { id: "PLAN-2025-07-01", product: "ขวด PET 500ml", target: 12000, done: 8400, due: "05 ก.ค. 2568", status: "กำลังผลิต" },
  { id: "PLAN-2025-07-02", product: "ขวด PET 1L", target: 6000, done: 3200, due: "07 ก.ค. 2568", status: "กำลังผลิต" },
  { id: "PLAN-2025-07-03", product: "ฝาเกลียว", target: 20000, done: 20000, due: "03 ก.ค. 2568", status: "เสร็จสิ้น" },
  { id: "PLAN-2025-07-04", product: "ขวด HDPE", target: 5000, done: 0, due: "12 ก.ค. 2568", status: "รอเริ่ม" },
];

const statusColor: Record<string, "success" | "info" | "default"> = {
  "เสร็จสิ้น": "success", "กำลังผลิต": "info", "รอเริ่ม": "default",
};

function PlanningPage() {
  const [plans, setPlans] = useState(initialPlans);
  return (
    <PageShell
      title="วางแผนการผลิต"
      description="สร้างและติดตามแผนการผลิตของโรงงาน"
      icon={<CalendarMonth />}
      actions={
        <AddItemDialog
          title="สร้างแผนการผลิต"
          description="กรอกข้อมูลแผนการผลิตใหม่"
          successMessage="สร้างแผนสำเร็จ"
          submitLabel="สร้างแผน"
          trigger={<Button variant="contained" startIcon={<Add />}>สร้างแผน</Button>}
          fields={[
            { name: "product", label: "สินค้า", placeholder: "ขวด PET 500ml" },
            { name: "target", label: "จำนวนที่ตั้งเป้า", type: "number", defaultValue: "1000" },
            { name: "due", label: "กำหนดเสร็จ", placeholder: "15 ก.ค. 2568" },
          ]}
          onSubmit={(v) => setPlans((prev) => [
            { id: `PLAN-${Date.now()}`, product: v.product, target: Number(v.target) || 0, done: 0, due: v.due, status: "รอเริ่ม" },
            ...prev,
          ])}
        />
      }
    >
      <Grid container spacing={2}>
        {plans.map((p, i) => {
          const pct = Math.round((p.done / p.target) * 100);
          return (
            <Grid key={p.id} size={{ xs: 12, md: 6 }}>
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
                <Card sx={{ overflow: "hidden" }}>
                  <Box sx={{ height: 4, background: "linear-gradient(90deg,#7FB4EE,#4A90E2)" }} />
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
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>
    </PageShell>
  );
}
