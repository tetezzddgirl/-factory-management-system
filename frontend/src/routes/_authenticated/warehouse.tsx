import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Warehouse as WarehouseIcon, LocalShipping, Inventory } from "@mui/icons-material";
import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from "@mui/material";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/warehouse")({
  head: () => ({ meta: [{ title: "คลังสินค้า — FactoryFlow" }] }),
  component: WarehousePage,
});

const inventory = [
  { code: "FG-001", name: "ขวด PET 500ml", qty: "18,392 ขวด", location: "A-01" },
  { code: "FG-002", name: "ขวด PET 1L", qty: "9,240 ขวด", location: "A-02" },
  { code: "FG-003", name: "ฝาเกลียว", qty: "45,000 ชิ้น", location: "B-01" },
  { code: "FG-004", name: "ขวด HDPE", qty: "3,120 ขวด", location: "A-03" },
];

const shipments = [
  { id: "SHP-501", customer: "บ.น้ำดื่ม A", items: "ขวด PET 500ml × 5,000", status: "จัดส่ง", eta: "วันนี้" },
  { id: "SHP-502", customer: "บ.เครื่องดื่ม B", items: "ขวด PET 1L × 2,000", status: "เตรียมส่ง", eta: "พรุ่งนี้" },
  { id: "SHP-503", customer: "บ.บรรจุภัณฑ์ C", items: "ฝาเกลียว × 20,000", status: "รอตรวจ", eta: "12 ก.ค." },
];

const shipColor: Record<string, "success" | "info" | "warning"> = {
  "จัดส่ง": "success", "เตรียมส่ง": "info", "รอตรวจ": "warning",
};

function WarehousePage() {
  return (
    <PageShell title="คลังสินค้า" description="สต็อกสินค้าสำเร็จรูปและการจัดส่ง" icon={<WarehouseIcon />}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                <Inventory fontSize="small" color="primary" />
                <Typography sx={{ fontWeight: 600 }}>สต็อกสินค้าสำเร็จรูป</Typography>
              </Stack>
              <Grid container spacing={1.5}>
                {inventory.map((it, i) => (
                  <Grid key={it.code} size={{ xs: 12, sm: 6 }}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -2 }}>
                      <Box sx={{ p: 2, borderRadius: 2, background: "rgba(74,144,226,0.06)" }}>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">{it.code}</Typography>
                          <Chip label={it.location} size="small" variant="outlined" />
                        </Stack>
                        <Typography sx={{ fontWeight: 700 }}>{it.name}</Typography>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, mt: 0.5 }}>{it.qty}</Typography>
                      </Box>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                <LocalShipping fontSize="small" color="primary" />
                <Typography sx={{ fontWeight: 600 }}>รายการจัดส่ง</Typography>
              </Stack>
              <Stack spacing={1.5}>
                {shipments.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                    <Box sx={{ p: 2, borderRadius: 2, background: "rgba(74,144,226,0.06)" }}>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 700 }}>{s.customer}</Typography>
                        <Chip label={s.status} color={shipColor[s.status]} size="small" />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{s.id} • {s.items}</Typography>
                      <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "primary.main", fontWeight: 600 }}>ETA: {s.eta}</Typography>
                    </Box>
                  </motion.div>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageShell>
  );
}
