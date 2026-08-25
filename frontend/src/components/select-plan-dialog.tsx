import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  TextField, MenuItem, Alert, Typography,
} from "@mui/material";
import type { PlanRow } from "./plan-detail-dialog";

interface Props {
  open: boolean;
  plans: PlanRow[];
  onClose: () => void;
  onSelect: (plan: PlanRow) => void;
}

export function SelectPlanDialog({ open, plans, onClose, onSelect }: Props) {
  const [id, setId] = useState("");
  useEffect(() => { if (open) setId(""); }, [open]);

  const picked = plans.find((p) => p.id === id) ?? null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>เลือกแผนการผลิตที่จะใช้งาน</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select label="เลือกหมายเลข / ชื่อแผนการผลิต" value={id}
            onChange={(e) => setId(e.target.value)}
          >
            {plans.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.id} — {p.product}</MenuItem>
            ))}
          </TextField>
          {picked && (
            <Alert severity="info">
              <Typography variant="body2">
                เป้าหมาย {picked.target.toLocaleString()} ชิ้น • กำหนดเสร็จ {picked.due}
                {picked.line ? ` • ${picked.line}` : ""}
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button variant="contained" disabled={!picked} onClick={() => picked && onSelect(picked)}>
          ถัดไป: กรอกใบสั่งผลิต
        </Button>
      </DialogActions>
    </Dialog>
  );
}