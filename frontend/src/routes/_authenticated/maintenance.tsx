import { createFileRoute } from "@tanstack/react-router";
import { Build } from "@mui/icons-material";
import { Card, CardContent, Grid, Stack, Typography, Chip, Button } from "@mui/material";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({ meta: [{ title: "ซ่อมบำรุง — FactoryFlow" }] }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const tasks = [
    { id: "MT-01", machine: "เครื่องเป่าขวด PET #1 (M-01)", type: "บำรุงรักษาตามรอบ (Preventive)", status: "รอดำเนินการ", dueDate: "วันนี้", priority: "สูง" },
    { id: "MT-02", machine: "เครื่องฉีดฝาพลาสติก #2 (M-02)", type: "ตรวจสอบระบบไฮดรอลิก", status: "กำลังดำเนินการ", dueDate: "พรุ่งนี้", priority: "ปานกลาง" },
    { id: "MT-03", machine: "สายพานลำเลียงหลัก Line 1", type: "เปลี่ยนสารหล่อลื่น", status: "เสร็จสิ้น", dueDate: "05 ก.ย. 2026", priority: "ปกติ" },
  ];

  return (
    <PageShell
      title="ซ่อมบำรุง"
      description="แผนงานบำรุงรักษาและประวัติการซ่อมเครื่องจักร"
      icon={<Build />}
      actions={
        <Button variant="contained" color="primary" startIcon={<Build />}>
          สร้างใบแจ้งซ่อม
        </Button>
      }
    >
      <Grid container spacing={2}>
        {tasks.map((t) => (
          <Grid size={{ xs: 12, md: 4 }} key={t.id}>
            <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{t.id}</Typography>
                    <Chip
                      size="small"
                      label={t.status}
                      color={t.status === "เสร็จสิ้น" ? "success" : t.status === "กำลังดำเนินการ" ? "info" : "warning"}
                    />
                  </Stack>
                  <Typography variant="subtitle1" fontWeight={700}>{t.machine}</Typography>
                  <Typography variant="body2" color="text.secondary">{t.type}</Typography>
                  <Typography variant="caption" color="text.secondary">กำหนดเสร็จ: {t.dueDate}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </PageShell>
  );
}
