import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { VerifiedUser, CheckCircle, Cancel, Build } from "@mui/icons-material";
import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from "@mui/material";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/quality")({
  head: () => ({ meta: [{ title: "ควบคุมคุณภาพ — FactoryFlow" }] }),
  component: QualityPage,
});

const checks = [
  { id: "QC-1201", job: "JOB-2451", product: "ขวด PET 500ml", passed: 380, defect: 12, rework: 8, inspector: "อภิชาติ", time: "10:15" },
  { id: "QC-1202", job: "JOB-2452", product: "ขวด PET 1L", passed: 195, defect: 5, rework: 0, inspector: "จันทร์เพ็ญ", time: "10:30" },
  { id: "QC-1203", job: "JOB-2453", product: "ฝาเกลียว", passed: 950, defect: 25, rework: 25, inspector: "สุริยา", time: "11:00" },
];

function QualityPage() {
  return (
    <PageShell title="ควบคุมคุณภาพ" description="ผลการตรวจสอบคุณภาพและบันทึกของเสีย" icon={<VerifiedUser />}>
      <Grid container spacing={2}>
        {checks.map((c, i) => {
          const total = c.passed + c.defect + c.rework;
          const passRate = Math.round((c.passed / total) * 100);
          return (
            <Grid key={c.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}>
                <Card>
                  <CardContent>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{c.product}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.id} • {c.job}</Typography>
                      </Box>
                      <Chip label={`${passRate}%`} color={passRate >= 95 ? "success" : passRate >= 90 ? "warning" : "error"} size="small" />
                    </Stack>
                    <Grid container spacing={1}>
                      <Grid size={4}>
                        <Box sx={{ p: 1, borderRadius: 2, background: "rgba(16,185,129,0.1)", textAlign: "center" }}>
                          <CheckCircle sx={{ color: "#10B981", fontSize: 20 }} />
                          <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{c.passed}</Typography>
                          <Typography variant="caption" color="text.secondary">ผ่าน</Typography>
                        </Box>
                      </Grid>
                      <Grid size={4}>
                        <Box sx={{ p: 1, borderRadius: 2, background: "rgba(245,158,11,0.1)", textAlign: "center" }}>
                          <Build sx={{ color: "#F59E0B", fontSize: 20 }} />
                          <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{c.rework}</Typography>
                          <Typography variant="caption" color="text.secondary">ซ่อม</Typography>
                        </Box>
                      </Grid>
                      <Grid size={4}>
                        <Box sx={{ p: 1, borderRadius: 2, background: "rgba(239,68,68,0.1)", textAlign: "center" }}>
                          <Cancel sx={{ color: "#EF4444", fontSize: 20 }} />
                          <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{c.defect}</Typography>
                          <Typography variant="caption" color="text.secondary">ไม่ผ่าน</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                      ผู้ตรวจ: {c.inspector} • เวลา {c.time}
                    </Typography>
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
