import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Settings as CogIcon, Add, Speed } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography, Button } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";
import { machinesApi, type ApiMachine } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/machines")({
  head: () => ({ meta: [{ title: "เครื่องจักร — FactoryFlow" }] }),
  component: MachinesPage,
});

const statusColor: Record<string, "success" | "info" | "warning"> = {
  ทำงาน: "success", ว่าง: "info", บำรุงรักษา: "warning",
};

function MachinesPage() {
  const [machines, setMachines] = useState<ApiMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMachines() {
    setLoading(true);
    setError(null);
    try {
      const data = await machinesApi.list();
      setMachines(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลเครื่องจักรไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMachines();
  }, []);

  async function handleAdd(v: Record<string, string>) {
    try {
      await machinesApi.create({
        id: v.id,
        name: v.name,
        status: v.status || "ว่าง",
        hours: Number(v.hours) || 0,
      });
      await loadMachines();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เพิ่มเครื่องจักรไม่สำเร็จ");
    }
  }

  return (
    <PageShell
      title="เครื่องจักรและอุปกรณ์"
      description="ข้อมูล สถานะ และชั่วโมงการทำงานของเครื่องจักร"
      icon={<CogIcon />}
      actions={
        <AddItemDialog
          title="เพิ่มเครื่องจักร"
          successMessage="เพิ่มเครื่องจักรแล้ว"
          trigger={<Button variant="contained" startIcon={<Add />}>เพิ่มเครื่องจักร</Button>}
          fields={[
            { name: "id", label: "รหัสเครื่องจักร", placeholder: "M-07" },
            { name: "name", label: "ชื่อเครื่องจักร", placeholder: "Cap Molder 2" },
            { name: "status", label: "สถานะ", type: "select", options: ["ทำงาน", "ว่าง", "บำรุงรักษา"], defaultValue: "ว่าง" },
            { name: "hours", label: "ชั่วโมงทำงานสะสม", type: "number", defaultValue: "0" },
          ]}
          onSubmit={handleAdd}
        />
      }
    >
      {loading && (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      )}
      {!loading && error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !error && (
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
                      <Chip label={m.status} color={statusColor[m.status] ?? "info"} size="small" />
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
                          <Typography sx={{ fontWeight: 600, mt: 0.5 }}>-</Typography>
                        </Box>
                      </Grid>
                    </Grid>
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
