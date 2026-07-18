import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Settings as CogIcon, Add, Speed } from "@mui/icons-material";
import { useState } from "react";
import { Box, Card, CardContent, Chip, Grid, Stack, Typography, Button } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";

export const Route = createFileRoute("/_authenticated/machines")({
  head: () => ({ meta: [{ title: "เครื่องจักร — FactoryFlow" }] }),
  component: MachinesPage,
});

const initialMachines = [
  { id: "M-01", name: "Injection Molder A", status: "ทำงาน", hours: 1284, job: "JOB-2451" },
  { id: "M-02", name: "Blow Molder B", status: "ว่าง", hours: 942, job: "-" },
  { id: "M-03", name: "Injection Molder C", status: "ทำงาน", hours: 1560, job: "JOB-2452" },
  { id: "M-04", name: "Labeling Machine", status: "บำรุงรักษา", hours: 892, job: "-" },
  { id: "M-05", name: "Cap Molder", status: "ทำงาน", hours: 1102, job: "JOB-2453" },
  { id: "M-06", name: "Packaging Line", status: "ว่าง", hours: 704, job: "-" },
];

const statusColor: Record<string, "success" | "info" | "warning"> = {
  ทำงาน: "success", ว่าง: "info", บำรุงรักษา: "warning",
};

function MachinesPage() {
  const [machines, setMachines] = useState(initialMachines);
  return (
    <PageShell
      title="เครื่องจักรและอุปกรณ์"
      description="ข้อมูล สถานะ และชั่วโมงการทำงานของเครื่องจักร"
      icon={<CogIcon />}
      actions={
        <AddItemDialog
          title="เพิ่มเครื่องจักรใหม่"
          description="กรอกข้อมูลเครื่องจักรที่ต้องการเพิ่มเข้าระบบ"
          successMessage="เพิ่มเครื่องจักรสำเร็จ"
          trigger={<Button variant="contained" startIcon={<Add />}>เพิ่มเครื่อง</Button>}
          fields={[
            { name: "id", label: "รหัสเครื่อง", placeholder: "M-07" },
            { name: "name", label: "ชื่อเครื่อง", placeholder: "Injection Molder D" },
            { name: "status", label: "สถานะ", type: "select", options: ["ทำงาน", "ว่าง", "บำรุงรักษา"], defaultValue: "ว่าง" },
            { name: "hours", label: "ชั่วโมงทำงานสะสม", type: "number", defaultValue: "0" },
          ]}
          onSubmit={(v) => setMachines((prev) => [
            { id: v.id, name: v.name, status: v.status, hours: Number(v.hours) || 0, job: "-" }, ...prev,
          ])}
        />
      }
    >
      <Grid container spacing={2}>
        {machines.map((m, i) => (
          <Grid key={m.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4 }}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <Box sx={{
                        width: 48, height: 48, borderRadius: 2.5, display: "flex",
                        alignItems: "center", justifyContent: "center", color: "#fff",
                        background: "linear-gradient(135deg,#7FB4EE,#4A90E2)",
                      }}>
                        <motion.div animate={m.status === "ทำงาน" ? { rotate: 360 } : {}} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
                          <CogIcon />
                        </motion.div>
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{m.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{m.id}</Typography>
                      </Box>
                    </Stack>
                    <Chip label={m.status} color={statusColor[m.status]} size="small" />
                  </Stack>
                  <Grid container spacing={1.5}>
                    <Grid size={6}>
                      <Box sx={{ p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.06)" }}>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
                          <Speed sx={{ fontSize: 14 }} />
                          <Typography variant="caption">ชั่วโมงทำงาน</Typography>
                        </Stack>
                        <Typography sx={{ fontWeight: 600, mt: 0.5 }}>{m.hours.toLocaleString()} ชม.</Typography>
                      </Box>
                    </Grid>
                    <Grid size={6}>
                      <Box sx={{ p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.06)" }}>
                        <Typography variant="caption" color="text.secondary">งานปัจจุบัน</Typography>
                        <Typography sx={{ fontWeight: 600, mt: 0.5 }}>{m.job}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </PageShell>
  );
}
