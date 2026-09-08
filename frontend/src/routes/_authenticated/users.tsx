import { createFileRoute } from "@tanstack/react-router";
import { ManageAccounts, Add } from "@mui/icons-material";
import { Box, Card, CardContent, Grid, Stack, Typography, Chip, Button, Avatar } from "@mui/material";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "บัญชีผู้ใช้ — FactoryFlow" }] }),
  component: UsersPage,
});

function UsersPage() {
  const users = [
    { id: "1", name: "สมชาย วางแผนดี", email: "planner@factoryflow.app", role: "ฝ่ายวางแผนการผลิต (Planner)", dept: "Planning" },
    { id: "2", name: "สมศรี ตรวจสอบ", email: "qc@factoryflow.app", role: "ฝ่ายควบคุมคุณภาพ (QC)", dept: "Quality Control" },
    { id: "3", name: "มนัส คลังสินค้า", email: "warehouse@factoryflow.app", role: "ฝ่ายคลังสินค้า (Warehouse)", dept: "Warehouse" },
    { id: "4", name: "วิชัย หัวหน้างาน", email: "supervisor@factoryflow.app", role: "หัวหน้างานฝ่ายผลิต (Supervisor)", dept: "Production" },
  ];

  return (
    <PageShell
      title="บัญชีผู้ใช้งาน"
      description="จัดการบัญชีผู้ใช้งานและกำหนดบทบาทในระบบ"
      icon={<ManageAccounts />}
      actions={
        <Button variant="contained" color="primary" startIcon={<Add />}>
          เพิ่มผู้ใช้งาน
        </Button>
      }
    >
      <Grid container spacing={2}>
        {users.map((u) => (
          <Grid size={{ xs: 12, md: 6 }} key={u.id}>
            <Card sx={{ borderRadius: 3, border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: "primary.main", width: 44, height: 44 }}>
                    {u.name[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{u.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">{u.email}</Typography>
                    <Chip size="small" label={u.role} sx={{ mt: 1, fontSize: "0.75rem" }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </PageShell>
  );
}
