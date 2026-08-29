import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  Typography, Box, TextField, MenuItem, Chip, Alert, Divider,
} from "@mui/material";
import { Assignment, Factory, EventNote } from "@mui/icons-material";

export type WorkOrderData = { planID?: string; name: string; amount: number; dueDate: string };

export type WorkOrderResult = {
  orderNo: string;
  product: string;
  qty: number;
  line: string;
  startDate: string;
  due: string;
  priority: string;
  note: string;
};

const LINES = ["สายการเป่าขวด L-01", "สายการบรรจุ L-02", "สายการฉีด L-03", "สายการประกอบ L-04"];
const PRIORITIES = ["สูง", "ปกติ", "ต่ำ"];

interface Props {
  open: boolean;
  data: WorkOrderData | null;
  onClose: () => void;
  onSubmit: (r: WorkOrderResult) => void;
}

export function WorkOrderDialog({ open, data, onClose, onSubmit }: Props) {
  const [v, setV] = useState<WorkOrderResult>({
    orderNo: "", product: "", qty: 0, line: LINES[0],
    startDate: "", due: "", priority: "ปกติ", note: "",
  });

  useEffect(() => {
    if (!open || !data) return;
    setV({
      orderNo: `WO-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      product: data.name,
      qty: data.amount,
      line: LINES[0],
      startDate: "",
      due: "",
      priority: "ปกติ",
      note: "",
    });
  }, [open, data]);

  if (!data) return null;

  const set = <K extends keyof WorkOrderResult>(k: K, val: WorkOrderResult[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Assignment color="primary" />
          <span>สร้างใบสั่งผลิต</span>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400, mt: 0.5 }}>
          อ้างอิงแผน {data.planID ?? "-"} • {data.name}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          กรอกรายละเอียดใบสั่งผลิต แล้วระบบจะพาไปตรวจสอบทรัพยากรต่อ
        </Alert>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField fullWidth label="เลขที่ใบสั่งผลิต" value={v.orderNo} onChange={(e) => set("orderNo", e.target.value)} />
              <TextField fullWidth label="สินค้า" value={v.product} onChange={(e) => set("product", e.target.value)} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth label="จำนวนที่สั่งผลิต" type="number" value={v.qty}
                onChange={(e) => set("qty", Number(e.target.value) || 0)}
              />
              <TextField
                fullWidth select label="สายการผลิต" value={v.line} onChange={(e) => set("line", e.target.value)}
                slotProps={{ input: { startAdornment: <Factory sx={{ fontSize: 18, mr: 1, color: "primary.main" }} /> } }}
              >
                {LINES.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth label="วันที่เริ่มผลิต" type="date" value={v.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth label="กำหนดเสร็จ" type="date" value={v.due}
                onChange={(e) => set("due", e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
            <TextField select label="ลำดับความสำคัญ" value={v.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <TextField
              label="หมายเหตุ" multiline minRows={2} value={v.note} onChange={(e) => set("note", e.target.value)}
              slotProps={{ input: { startAdornment: <EventNote sx={{ fontSize: 18, mr: 1, mt: 1, color: "primary.main", alignSelf: "flex-start" }} /> } }}
            />
          </Stack>
        </motion.div>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.06)" }}>
          <Typography variant="caption" color="text.secondary">สรุปใบสั่งผลิต</Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mt: 0.5 }}>
            <Chip size="small" color="primary" variant="outlined" label={v.orderNo} />
            <Chip size="small" variant="outlined" label={`${v.qty.toLocaleString()} ชิ้น`} />
            <Chip size="small" variant="outlined" label={v.line} />
            <Chip size="small" color={v.priority === "สูง" ? "error" : v.priority === "ปกติ" ? "default" : "info"} label={v.priority} />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button
          variant="contained"
          disabled={!v.orderNo.trim() || !v.product.trim() || v.qty <= 0 || !v.startDate.trim() || !v.due.trim()}
          onClick={() => onSubmit(v)}
        >
          ถัดไป: ตรวจสอบทรัพยากร
        </Button>
      </DialogActions>
    </Dialog>
  );
}
