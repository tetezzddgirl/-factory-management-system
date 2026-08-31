import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Groups, Add, Circle } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { Alert, Avatar, Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography, Button } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";
import { personnelApi, type ApiPersonnel } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/personnel")({
  head: () => ({ meta: [{ title: "บุคลากร — FactoryFlow" }] }),
  component: PersonnelPage,
});

function PersonnelPage() {
  const [people, setPeople] = useState<ApiPersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPeople() {
    setLoading(true);
    setError(null);
    try {
      const data = await personnelApi.list();
      setPeople(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลบุคลากรไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPeople();
  }, []);

  async function handleAdd(v: Record<string, string>) {
    try {
      await personnelApi.create({
        name: v.name,
        role: v.role,
        dept: v.dept,
        status: v.status || "กำลังทำงาน",
      });
      await loadPeople();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เพิ่มบุคลากรไม่สำเร็จ");
      return false;
    }
  }

  return (
    <PageShell
      title="บุคลากร"
      description="ข้อมูลพนักงานและสถานะการทำงาน"
      icon={<Groups />}
      actions={
        <AddItemDialog
          title="เพิ่มบุคลากร"
          description="กรอกข้อมูลพนักงานใหม่"
          successMessage="เพิ่มบุคลากรแล้ว"
          trigger={<Button variant="contained" startIcon={<Add />}>เพิ่มบุคลากร</Button>}
          fields={[
            { name: "name", label: "ชื่อ-สกุล", placeholder: "สมชาย ใจดี" },
            { name: "role", label: "ตำแหน่ง", placeholder: "Operator" },
            { name: "dept", label: "แผนก", placeholder: "Production" },
            {
              name: "status", label: "สถานะ", type: "select",
              options: ["กำลังทำงาน", "พัก", "ลา"], defaultValue: "กำลังทำงาน",
            },
          ]}
          onSubmit={handleAdd}
        />
      }
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <Grid container spacing={2}>
          {people.map((p, i) => (
            <Grid key={p.id ?? i} size={{ xs: 12, sm: 6, md: 4 }}>
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
      )}
    </PageShell>
  );
}
