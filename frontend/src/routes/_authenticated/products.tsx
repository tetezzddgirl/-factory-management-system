import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Category, Add, CheckCircle, Cancel, HistoryEdu, Science } from "@mui/icons-material";
import { useState } from "react";
import {
  Box, Button, Card, CardContent, Chip, Grid, Stack, Tab, Tabs, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip,
} from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";
import { useRole } from "@/lib/roles";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "ผลิตภัณฑ์ & BOM — FactoryFlow" }] }),
  component: ProductsPage,
});

type Product = { code: string; name: string; category: string; activeBom: string };
type Bom = {
  id: string; product: string; version: string; status: "อนุมัติแล้ว" | "รอตรวจสอบ" | "ร่าง" | "ปฏิเสธ";
  materials: { code: string; name: string; qty: string }[];
  machines: string[]; updatedBy: string; updatedAt: string;
};

const initialProducts: Product[] = [
  { code: "P-001", name: "ขวด PET 500ml", category: "บรรจุภัณฑ์", activeBom: "v3" },
  { code: "P-002", name: "ขวด PET 1L",    category: "บรรจุภัณฑ์", activeBom: "v2" },
  { code: "P-003", name: "ฝาเกลียว 28mm", category: "อะไหล่",     activeBom: "v1" },
  { code: "P-004", name: "ขวด HDPE 1L",   category: "บรรจุภัณฑ์", activeBom: "v1" },
];

const initialBoms: Bom[] = [
  {
    id: "BOM-001", product: "ขวด PET 500ml", version: "v3", status: "อนุมัติแล้ว",
    materials: [
      { code: "RM-001", name: "PET Resin",       qty: "12 g" },
      { code: "RM-005", name: "สีมาสเตอร์แบทช์", qty: "0.3 g" },
    ],
    machines: ["M-01", "M-02"], updatedBy: "จันทร์เพ็ญ (QC)", updatedAt: "10 ก.ค. 2026",
  },
  {
    id: "BOM-002", product: "ขวด PET 1L", version: "v3", status: "รอตรวจสอบ",
    materials: [
      { code: "RM-001", name: "PET Resin",       qty: "22 g" },
      { code: "RM-005", name: "สีมาสเตอร์แบทช์", qty: "0.5 g" },
    ],
    machines: ["M-03"], updatedBy: "สมชาย (Planner)", updatedAt: "12 ก.ค. 2026",
  },
  {
    id: "BOM-003", product: "ฝาเกลียว 28mm", version: "v2", status: "ร่าง",
    materials: [{ code: "RM-004", name: "PP Compound", qty: "3 g" }],
    machines: ["M-05"], updatedBy: "อรพิน (Planner)", updatedAt: "13 ก.ค. 2026",
  },
];

const statusColor: Record<Bom["status"], "success" | "warning" | "default" | "error"> = {
  "อนุมัติแล้ว": "success", "รอตรวจสอบ": "warning", "ร่าง": "default", "ปฏิเสธ": "error",
};

function ProductsPage() {
  const { role } = useRole();
  const isQC = role === "qc";
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState(initialProducts);
  const [boms, setBoms] = useState(initialBoms);

  // QC sees drafts + pending; others see approved only (with drafts visible if they authored — mocked as all)
  const visibleBoms = boms;
  const pending = boms.filter((b) => b.status === "รอตรวจสอบ");

  function decide(id: string, ok: boolean) {
    setBoms((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: ok ? "อนุมัติแล้ว" : "ปฏิเสธ", updatedBy: "คุณ (QC)", updatedAt: "วันนี้" } : b,
      ),
    );
    toast.success(ok ? "อนุมัติสูตรการผลิตแล้ว" : "ปฏิเสธสูตรการผลิตแล้ว");
  }

  return (
    <PageShell
      title="ผลิตภัณฑ์ & สูตรการผลิต (BOM)"
      description="จัดการข้อมูลผลิตภัณฑ์ สูตรการผลิต และเวอร์ชันย้อนหลัง"
      icon={<Category />}
      actions={
        <AddItemDialog
          title="เพิ่มผลิตภัณฑ์"
          description="กรอกข้อมูลผลิตภัณฑ์ใหม่"
          successMessage="เพิ่มผลิตภัณฑ์สำเร็จ"
          trigger={<Button variant="contained" startIcon={<Add />}>เพิ่มผลิตภัณฑ์</Button>}
          fields={[
            { name: "code", label: "รหัสผลิตภัณฑ์", placeholder: "P-005" },
            { name: "name", label: "ชื่อผลิตภัณฑ์", placeholder: "ขวด PET ..." },
            { name: "category", label: "หมวดหมู่", type: "select", options: ["บรรจุภัณฑ์", "อะไหล่", "วัตถุดิบ"], defaultValue: "บรรจุภัณฑ์" },
            { name: "activeBom", label: "เวอร์ชัน BOM", placeholder: "v1", defaultValue: "v1" },
          ]}
          onSubmit={(v) => setProducts((prev) => [v as any, ...prev])}
        />
      }
    >
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`ผลิตภัณฑ์ (${products.length})`} />
        <Tab label={`สูตรการผลิต (${visibleBoms.length})`} />
        <Tab label={`รออนุมัติ (${pending.length})`} icon={isQC ? <Science fontSize="small" /> : undefined} iconPosition="end" />
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>รหัส</TableCell>
                  <TableCell>ชื่อผลิตภัณฑ์</TableCell>
                  <TableCell>หมวดหมู่</TableCell>
                  <TableCell>BOM ที่ใช้งาน</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((p, i) => (
                  <TableRow key={p.code} component={motion.tr as any} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} hover>
                    <TableCell><Typography variant="caption" sx={{ fontWeight: 700 }}>{p.code}</Typography></TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell><Chip label={p.category} size="small" variant="outlined" /></TableCell>
                    <TableCell><Chip label={p.activeBom} size="small" color="primary" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          {visibleBoms.map((b, i) => (
            <Grid key={b.id} size={{ xs: 12, md: 6 }}>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -3 }}>
                <Card>
                  <CardContent>
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{b.product}</Typography>
                        <Typography variant="caption" color="text.secondary">{b.id} • {b.version}</Typography>
                      </Box>
                      <Chip label={b.status} color={statusColor[b.status]} size="small" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>วัตถุดิบ</Typography>
                    <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                      {b.materials.map((m) => (
                        <Stack key={m.code} direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
                          <Typography variant="body2">{m.name} <Box component="span" color="text.disabled">({m.code})</Box></Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.qty}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                      {b.machines.map((m) => <Chip key={m} label={m} size="small" variant="outlined" />)}
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
                      <HistoryEdu sx={{ fontSize: 14 }} />
                      <Typography variant="caption">แก้ไขล่าสุดโดย {b.updatedBy} • {b.updatedAt}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 2 && (
        <Card>
          <CardContent>
            {pending.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>ไม่มีสูตรการผลิตที่รออนุมัติ</Typography>
            ) : (
              <Stack spacing={1.5}>
                {pending.map((b) => (
                  <Box key={b.id} sx={{ p: 2, borderRadius: 2, background: "rgba(245,158,11,0.08)" }}>
                    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 700 }}>{b.product} <Chip label={b.version} size="small" sx={{ ml: 1 }} /></Typography>
                        <Typography variant="caption" color="text.secondary">ส่งโดย {b.updatedBy} • {b.updatedAt}</Typography>
                      </Box>
                      {isQC ? (
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => decide(b.id, true)}>อนุมัติ</Button>
                          <Button size="small" variant="outlined" color="error" startIcon={<Cancel />} onClick={() => decide(b.id, false)}>ปฏิเสธ</Button>
                        </Stack>
                      ) : (
                        <Tooltip title="เฉพาะฝ่าย QC เท่านั้น">
                          <span>
                            <IconButton disabled><CheckCircle /></IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}