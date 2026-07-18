import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AdminPanelSettings, Add, Email } from "@mui/icons-material";
import { useState } from "react";
import { Avatar, Box, Card, CardContent, Chip, Stack, Typography, Button } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "จัดการผู้ใช้ — FactoryFlow" }] }),
  component: UsersPage,
});

const initial = [
  { name: "Admin User", email: "admin@factoryflow.app", role: "admin", last: "วันนี้ 09:00" },
  { name: "Manager One", email: "manager@factoryflow.app", role: "manager", last: "วันนี้ 08:30" },
  { name: "Operator A", email: "op.a@factoryflow.app", role: "operator", last: "เมื่อวาน" },
  { name: "Operator B", email: "op.b@factoryflow.app", role: "operator", last: "3 วันก่อน" },
];

const roleColor: Record<string, "error" | "warning" | "info"> = {
  admin: "error", manager: "warning", operator: "info",
};

function UsersPage() {
  const [users, setUsers] = useState(initial);
  return (
    <PageShell
      title="จัดการผู้ใช้"
      description="บัญชีผู้ใช้และสิทธิ์การเข้าถึงระบบ"
      icon={<AdminPanelSettings />}
      actions={
        <AddItemDialog
          title="เพิ่มผู้ใช้"
          description="สร้างบัญชีผู้ใช้ใหม่"
          successMessage="เพิ่มผู้ใช้สำเร็จ"
          trigger={<Button variant="contained" startIcon={<Add />}>เพิ่มผู้ใช้</Button>}
          fields={[
            { name: "name", label: "ชื่อ", placeholder: "ชื่อผู้ใช้" },
            { name: "email", label: "อีเมล", placeholder: "user@company.com" },
            { name: "role", label: "บทบาท", type: "select", options: ["admin", "manager", "operator"], defaultValue: "operator" },
          ]}
          onSubmit={(v) => setUsers((prev) => [{ name: v.name, email: v.email, role: v.role, last: "-" }, ...prev])}
        />
      }
    >
      <Stack spacing={1.5}>
        {users.map((u, i) => (
          <motion.div key={u.email} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ x: 4 }}>
            <Card>
              <CardContent sx={{ py: 2 }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                  <Avatar sx={{ background: "linear-gradient(135deg,#7FB4EE,#4A90E2)", fontWeight: 700 }}>
                    {u.name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{u.name}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
                      <Email sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{u.email}</Typography>
                    </Stack>
                  </Box>
                  <Chip label={u.role} color={roleColor[u.role]} size="small" />
                  <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
                    เข้าล่าสุด {u.last}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Stack>
    </PageShell>
  );
}
