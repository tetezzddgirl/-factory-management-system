import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Groups, Add, Circle } from "@mui/icons-material";
import { useState } from "react";
import { Avatar, Box, Card, CardContent, Chip, Grid, Stack, Typography, Button } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";

export const Route = createFileRoute("/_authenticated/personnel")({
  head: () => ({ meta: [{ title: "บุคลากร — FactoryFlow" }] }),
  component: PersonnelPage,
});

const initial = [
  { name: "สมชาย กังวาน", role: "Operator", dept: "Production", status: "กำลังทำงาน" },
  { name: "อรพิน สุขสม", role: "Operator", dept: "Production", status: "กำลังทำงาน" },
  { name: "ประเสริฐ ทองดี", role: "Supervisor", dept: "Production", status: "กำลังทำงาน" },
  { name: "จันทร์เพ็ญ ศรี", role: "QC Inspector", dept: "Quality", status: "พัก" },
  { name: "ช่างสมศักดิ์", role: "Technician", dept: "Maintenance", status: "กำลังทำงาน" },
  { name: "มานพ ลาภสม", role: "Operator", dept: "Production", status: "ลา" },
];

function PersonnelPage() {
  const [people, setPeople] = useState(initial);
  return (
    <PageShell
      title="บุคลากร"
      description="ข้อมูลพนักงานและสถานะการทำงาน"
      icon={<Groups />}
      actions={
        <AddItemDialog
          title="เพิ่มพนักงาน"
          description="กรอกข้อมูลพนักงานใหม่"
          successMessage="เพิ่มพนักงานสำเร็จ"
          trigger={<Button variant="contained" startIcon={<Add />}>เพิ่มพนักงาน</Button>}
          fields={[
            { name: "name", label: "ชื่อ-นามสกุล", placeholder: "สมชาย ก." },
            { name: "role", label: "ตำแหน่ง", placeholder: "Operator" },
            { name: "dept", label: "แผนก", type: "select", options: ["Production", "Quality", "Maintenance", "Warehouse"], defaultValue: "Production" },
            { name: "status", label: "สถานะ", type: "select", options: ["กำลังทำงาน", "พัก", "ลา"], defaultValue: "กำลังทำงาน" },
          ]}
          onSubmit={(v) => setPeople((prev) => [v as any, ...prev])}
        />
      }
    >
      <Grid container spacing={2}>
        {people.map((p, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <Avatar sx={{ width: 52, height: 52, background: "linear-gradient(135deg,#7FB4EE,#4A90E2)", fontWeight: 700 }}>
                      {p.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }} noWrap>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.role} • {p.dept}</Typography>
                    </Box>
                  </Stack>
                  <Chip
                    icon={<Circle sx={{ fontSize: 10 }} />}
                    label={p.status}
                    size="small"
                    color={p.status === "กำลังทำงาน" ? "success" : p.status === "พัก" ? "warning" : "default"}
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </PageShell>
  );
}
