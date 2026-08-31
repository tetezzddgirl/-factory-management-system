import { motion } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  Typography, Box, LinearProgress, Chip, Alert, Divider,
} from "@mui/material";
import { CheckCircle, Warning, Cancel, Inventory2, PrecisionManufacturing, Groups } from "@mui/icons-material";

export type ResourceStatus = "ok" | "warn" | "fail";

export type ResourceItem = {
  name: string;
  required: number;
  available: number;
  unit: string;
};

export type ResourceCheckData = {
  product: string;
  target: number;
  due: string;
  materials: ResourceItem[];
  machines: ResourceItem[];
  personnel: ResourceItem[];
};

interface Props {
  open: boolean;
  data: ResourceCheckData | null;
  onClose: () => void;
  onConfirm: () => void;
}

function statusOf(items: ResourceItem[]): ResourceStatus {
  if (items.some((i) => i.available < i.required)) return "fail";
  if (items.some((i) => i.available < i.required * 1.1)) return "warn";
  return "ok";
}

function SectionCard({
  icon, title, items, index,
}: { icon: React.ReactNode; title: string; items: ResourceItem[]; index: number }) {
  const s = statusOf(items);
  const color = s === "ok" ? "success" : s === "warn" ? "warning" : "error";
  const label = s === "ok" ? "เพียงพอ" : s === "warn" ? "ใกล้ขาด" : "ไม่พอ";
  const Icon = s === "ok" ? CheckCircle : s === "warn" ? Warning : Cancel;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Box sx={{ p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.06)" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          {icon}
          <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>{title}</Typography>
          <Chip size="small" color={color} icon={<Icon sx={{ fontSize: 13 }} />} label={label} sx={{ height: 22 }} />
        </Stack>
        <Stack spacing={1}>
          {items.map((it) => {
            const pct = Math.min(100, Math.round((it.available / it.required) * 100));
            const enough = it.available >= it.required;
            return (
              <Box key={it.name}>
                <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.25 }}>
                  <Typography variant="caption">{it.name}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: enough ? "success.main" : "error.main" }}>
                    {it.available.toLocaleString()} / {it.required.toLocaleString()} {it.unit}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  color={enough ? (pct < 110 ? "warning" : "success") : "error"}
                  sx={{ height: 5, borderRadius: 3 }}
                />
              </Box>
            );
          })}
        </Stack>
      </Box>
    </motion.div>
  );
}

export function ResourceCheckDialog({ open, data, onClose, onConfirm }: Props) {
  if (!data) return null;
  const overall: ResourceStatus = (() => {
    const list = [statusOf(data.materials), statusOf(data.machines), statusOf(data.personnel)];
    if (list.includes("fail")) return "fail";
    if (list.includes("warn")) return "warn";
    return "ok";
  })();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        ตรวจสอบทรัพยากร
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 400, mt: 0.25 }}>
          {data.product} • เป้า {data.target.toLocaleString()} • กำหนด {data.due}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 1.5 }}>
        <Alert
          severity={overall === "ok" ? "success" : overall === "warn" ? "warning" : "error"}
          sx={{ mb: 1.5, py: 0.25 }}
        >
          {overall === "ok" && "ทรัพยากรพร้อมสำหรับแผนการผลิตนี้"}
          {overall === "warn" && "ทรัพยากรพอ แต่มีบางรายการใกล้ขาด แนะนำให้เตรียมเพิ่ม"}
          {overall === "fail" && "ทรัพยากรไม่เพียงพอ ต้องเติมสต็อก/จัดสรรก่อนเริ่มผลิต"}
        </Alert>
        <Stack spacing={1.5}>
          <SectionCard index={0} title="วัตถุดิบ" icon={<Inventory2 color="primary" fontSize="small" />} items={data.materials} />
          <SectionCard index={1} title="เครื่องจักร" icon={<PrecisionManufacturing color="primary" fontSize="small" />} items={data.machines} />
          <SectionCard index={2} title="บุคลากร" icon={<Groups color="primary" fontSize="small" />} items={data.personnel} />
        </Stack>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="caption" color="text.secondary">
          * ปริมาณที่ต้องการคำนวณจาก BOM และเป้าการผลิต
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>ยกเลิก</Button>
        <Button
          size="small"
          variant="contained"
          disabled={overall === "fail"}
          onClick={onConfirm}
        >
          {overall === "fail" ? "ทรัพยากรไม่พอ" : "ยืนยันสร้างใบสั่งผลิต"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}