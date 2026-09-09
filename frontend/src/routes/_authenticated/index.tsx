import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  TrendingUp, Inventory2, Factory, CheckCircle,
  Warning, AutoAwesome, ArrowOutward,
} from "@mui/icons-material";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Box, Card, CardContent, Typography, Chip, LinearProgress, Grid, Stack } from "@mui/material";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/")({
  component: Index,
});

const productionData = [
  { day: "จ", planned: 400, actual: 380 }, { day: "อ", planned: 420, actual: 410 },
  { day: "พ", planned: 450, actual: 470 }, { day: "พฤ", planned: 430, actual: 425 },
  { day: "ศ", planned: 460, actual: 480 }, { day: "ส", planned: 300, actual: 290 },
  { day: "อา", planned: 200, actual: 210 },
];

const qcData = [
  { name: "ผ่าน", value: 92 }, { name: "ซ่อม", value: 5 }, { name: "ไม่ผ่าน", value: 3 },
];

const stats = [
  { label: "สินค้าที่ผลิตวันนี้", value: "2,480", change: "+12%", Icon: Factory, color: "linear-gradient(135deg,#7FB4EE,#4A90E2)" },
  { label: "สินค้าสำเร็จรูป", value: "18,392", change: "+4.2%", Icon: Inventory2, color: "linear-gradient(135deg,#5FC7D8,#38BDF8)" },
  { label: "ผ่าน QC", value: "94.6%", change: "+1.1%", Icon: CheckCircle, color: "linear-gradient(135deg,#5EEAD4,#14B8A6)" },
  { label: "กำไรเดือนนี้", value: "฿1.24M", change: "+8.7%", Icon: TrendingUp, color: "linear-gradient(135deg,#818CF8,#6366F1)" },
];

const activeJobs = [
  { id: "JOB-2451", product: "ขวด PET 500ml", progress: 78, status: "กำลังผลิต" },
  { id: "JOB-2452", product: "ขวด PET 1L", progress: 45, status: "กำลังผลิต" },
  { id: "JOB-2453", product: "ฝาเกลียว", progress: 92, status: "ใกล้เสร็จ" },
  { id: "JOB-2454", product: "ขวด HDPE", progress: 20, status: "เพิ่งเริ่ม" },
];

function Index() {
  return (
    <PageShell
      title="ภาพรวมการผลิต"
      description="สวัสดี ยินดีต้อนรับกลับมา ระบบทำงานปกติ"
      icon={<AutoAwesome />}
    >
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s, i) => (
          <Grid key={s.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 120 }}
              whileHover={{ y: -4 }}
            >
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{s.label}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>{s.value}</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mt: 0.5, color: "success.main" }}>
                        <ArrowOutward sx={{ fontSize: 14 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{s.change}</Typography>
                      </Stack>
                    </Box>
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}>
                      <Box sx={{
                        width: 46, height: 46, borderRadius: 2.5, display: "flex",
                        alignItems: "center", justifyContent: "center", color: "#fff",
                        background: s.color, boxShadow: "0 6px 18px rgba(74,144,226,0.28)",
                      }}>
                        <s.Icon />
                      </Box>
                    </motion.div>
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>ยอดผลิตรายวัน (แผน vs จริง)</Typography>
              <Box sx={{ height: 288 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", background: "white" }} />
                    <Line type="monotone" dataKey="planned" stroke="#7FB4EE" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="actual" stroke="#4A90E2" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>สรุปคุณภาพ (QC)</Typography>
              <Box sx={{ height: 288 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qcData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", background: "white" }} />
                    <Bar dataKey="value" fill="#7FB4EE" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                <Factory fontSize="small" color="primary" />
                <Typography sx={{ fontWeight: 600 }}>งานผลิตที่กำลังดำเนินการ</Typography>
              </Stack>
              <Stack spacing={2}>
                {activeJobs.map((j, i) => (
                  <motion.div key={j.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography variant="body2">
                        <Box component="span" sx={{ fontWeight: 600 }}>{j.id}</Box>
                        <Box component="span" sx={{ color: "text.secondary", ml: 1 }}>{j.product}</Box>
                      </Typography>
                      <Chip label={j.status} size="small" sx={{ background: "linear-gradient(135deg,#7FB4EE,#4A90E2)", color: "#fff" }} />
                    </Stack>
                    <LinearProgress variant="determinate" value={j.progress} />
                  </motion.div>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ background: "linear-gradient(135deg,#FFF7ED,#FEF3C7)" }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2, color: "#92400E" }}>
                <Warning fontSize="small" />
                <Typography sx={{ fontWeight: 600 }}>แจ้งเตือน</Typography>
              </Stack>
              <Stack spacing={1.5}>
                {[
                  { title: "วัตถุดิบ Preform ใกล้หมด", sub: "คงเหลือ 8% • ต่ำกว่าเกณฑ์" },
                  { title: "เครื่อง M-04 ต้องบำรุงรักษา", sub: "ครบกำหนดใน 2 วัน" },
                  { title: "งาน JOB-2447 พบสินค้าไม่ผ่าน QC", sub: "รอผู้รับผิดชอบ" },
                ].map((a) => (
                  <Box key={a.title} sx={{ p: 1.5, borderRadius: 2, background: "rgba(255,255,255,0.7)" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.sub}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageShell>
  );
}
