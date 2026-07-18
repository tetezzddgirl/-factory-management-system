import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Build, Add, Schedule, Person } from "@mui/icons-material";
import { useState } from "react";
import { Box, Card, CardContent, Chip, Grid, Stack, Typography, Button } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({ meta: [{ title: "ซ่อมบำรุง — FactoryFlow" }] }),
  component: MaintenancePage,
});

const initialTickets = [
  { id: "MT-1024", machine: "M-04", issue: "หัวฉีดอุดตัน ต้องล้าง", priority: "สูง", assignee: "ช่างสมศักดิ์", due: "วันนี้", status: "กำลังดำเนินการ" },
  { id: "MT-1025", machine: "M-01", issue: "เปลี่ยนน้ำมันหล่อลื่น (Routine)", priority: "ปกติ", assignee: "ช่างมานะ", due: "พรุ่งนี้", status: "รอดำเนินการ" },
  { id: "MT-1026", machine: "M-06", issue: "สายพานลำเลียงหลวม", priority: "กลาง", assignee: "ช่างพิชิต", due: "12 ก.ค.", status: "รอดำเนินการ" },
];

const priorityColor: Record<string, "error" | "warning" | "default"> = {
  "สูง": "error", "กลาง": "warning", "ปกติ": "default",
};

function MaintenancePage() {
  const [tickets, setTickets] = useState(initialTickets);
  return (
    <PageShell
      title="ซ่อมบำรุง"
      description="ใบแจ้งซ่อมและตารางบำรุงรักษาเครื่องจักร"
      icon={<Build />}
      actions={
        <AddItemDialog
          title="สร้างใบแจ้งซ่อม"
          description="กรอกรายละเอียดการซ่อมบำรุง"
          successMessage="สร้างใบแจ้งซ่อมสำเร็จ"
          submitLabel="สร้างใบซ่อม"
          trigger={<Button variant="contained" startIcon={<Add />}>แจ้งซ่อม</Button>}
          fields={[
            { name: "machine", label: "รหัสเครื่อง", placeholder: "M-01" },
            { name: "issue", label: "รายละเอียดปัญหา", type: "textarea" },
            { name: "priority", label: "ความสำคัญ", type: "select", options: ["สูง", "กลาง", "ปกติ"], defaultValue: "ปกติ" },
            { name: "assignee", label: "ผู้รับผิดชอบ", placeholder: "ช่าง..." },
            { name: "due", label: "กำหนดเสร็จ", placeholder: "วันนี้" },
          ]}
          onSubmit={(v) => setTickets((prev) => [
            { id: `MT-${Date.now().toString().slice(-4)}`, machine: v.machine, issue: v.issue, priority: v.priority, assignee: v.assignee, due: v.due, status: "รอดำเนินการ" }, ...prev,
          ])}
        />
      }
    >
      <Grid container spacing={2}>
        {tickets.map((t, i) => (
          <Grid key={t.id} size={{ xs: 12, md: 6 }}>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", background: "linear-gradient(135deg,#F59E0B,#F97316)" }}>
                        <Build />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{t.machine}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.id}</Typography>
                      </Box>
                    </Stack>
                    <Chip label={t.priority} color={priorityColor[t.priority]} size="small" />
                  </Stack>
                  <Typography variant="body2" sx={{ mb: 2 }}>{t.issue}</Typography>
                  <Stack direction="row" spacing={2} sx={{ color: "text.secondary" }}>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                      <Person sx={{ fontSize: 16 }} /><Typography variant="caption">{t.assignee}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                      <Schedule sx={{ fontSize: 16 }} /><Typography variant="caption">{t.due}</Typography>
                    </Stack>
                    <Chip label={t.status} size="small" variant="outlined" sx={{ ml: "auto !important" }} />
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </PageShell>
  );
}
