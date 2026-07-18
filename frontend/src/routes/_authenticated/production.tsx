import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Factory, PlayArrow, Pause, Stop, CheckCircle, Person, Settings as CogIcon } from "@mui/icons-material";
import { Box, Card, CardContent, Chip, Grid, Stack, Typography, Button, LinearProgress } from "@mui/material";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/production")({
  head: () => ({ meta: [{ title: "การผลิต — FactoryFlow" }] }),
  component: ProductionPage,
});

const jobs = [
  { id: "JOB-2451", product: "ขวด PET 500ml", target: 5000, done: 3900, operator: "สมชาย ก.", machine: "M-01", status: "running" },
  { id: "JOB-2452", product: "ขวด PET 1L", target: 3000, done: 1350, operator: "อรพิน ส.", machine: "M-03", status: "running" },
  { id: "JOB-2453", product: "ฝาเกลียว", target: 12000, done: 11040, operator: "ประเสริฐ ท.", machine: "M-05", status: "running" },
  { id: "JOB-2454", product: "ขวด HDPE", target: 2500, done: 500, operator: "มานพ ล.", machine: "M-02", status: "paused" },
];

function ProductionPage() {
  return (
    <PageShell title="การผลิต" description="ติดตามความคืบหน้าและควบคุมงานผลิตในสายการผลิต" icon={<Factory />}>
      <Grid container spacing={2}>
        {jobs.map((j, i) => {
          const pct = Math.round((j.done / j.target) * 100);
          const running = j.status === "running";
          return (
            <Grid key={j.id} size={{ xs: 12, md: 6 }}>
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}>
                <Card sx={{ overflow: "hidden" }}>
                  <Box sx={{ height: 4, background: "linear-gradient(90deg,#7FB4EE,#4A90E2)" }} />
                  <CardContent>
                    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{j.product}</Typography>
                        <Typography variant="caption" color="text.secondary">{j.id}</Typography>
                      </Box>
                      <Chip label={running ? "กำลังผลิต" : "หยุดชั่วคราว"} color={running ? "success" : "warning"} size="small" />
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">ความคืบหน้า</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {j.done.toLocaleString()} / {j.target.toLocaleString()} <Box component="span" sx={{ color: "primary.main" }}>({pct}%)</Box>
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={pct} sx={{ mb: 2 }} />
                    <Stack direction="row" spacing={2} sx={{ color: "text.secondary", mb: 2 }}>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                        <Person sx={{ fontSize: 16 }} /><Typography variant="caption">{j.operator}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                        <CogIcon sx={{ fontSize: 16 }} /><Typography variant="caption">{j.machine}</Typography>
                      </Stack>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      {running ? (
                        <Button size="small" variant="outlined" startIcon={<Pause />} sx={{ flex: 1 }}>หยุด</Button>
                      ) : (
                        <Button size="small" variant="contained" startIcon={<PlayArrow />} sx={{ flex: 1 }}>เริ่ม</Button>
                      )}
                      <Button size="small" variant="outlined"><Stop fontSize="small" /></Button>
                      <Button size="small" variant="outlined"><CheckCircle fontSize="small" /></Button>
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
