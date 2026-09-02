import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Box,
  Typography, Chip, LinearProgress, Divider, TextField, MenuItem,
} from "@mui/material";
import { Assignment } from "@mui/icons-material";

export type PlanRow = {
  planID: string; name: string; formulaID?: string; formula:string; amount: number; dueDate: string; status: string;
  priority?: string; startDate?: string; owner?: string;
};

interface Props {
  open: boolean;
  plan: PlanRow | null;
  onClose: () => void;
  onCreateOrder: (plan: PlanRow) => void;
  onUpdatePriority: (planId: string, priority: string) => void;  // เพิ่มบรรทัดนี้
}

const PRIORITIES = ["สูง", "ปกติ", "ต่ำ"];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>{value}</Typography>
    </Stack>
  );
}

export function PlanDetailDialog({ open, plan, onClose, onCreateOrder, onUpdatePriority }: Props) {
  if (!plan) return null;
  const pct = plan.amount ? Math.round((plan.amount)) : 0;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>รายละเอียดแผนการผลิต</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2, borderRadius: 3, background: "linear-gradient(135deg,rgba(127,180,238,0.18),rgba(74,144,226,0.10))", mb: 2 }}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{plan.name}</Typography>
              <Typography variant="caption" color="text.secondary">{plan.planID}</Typography>
            </Box>
            <Chip label={plan.status} size="small" color="info" />
          </Stack>
        </Box>
        <Row label="จำนวนที่ตั้งเป้า" value={`${plan.amount.toLocaleString()} ชิ้น`} />
        {/* <Row label="ผลิตแล้ว" value={`${plan.done.toLocaleString()} ชิ้น (${pct}%)`} /> */}
        <LinearProgress variant="determinate" value={pct} sx={{ my: 1 }} />
        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "center", py: 0.75 }}>
          <Typography variant="body2" color="text.secondary">ลำดับความสำคัญ</Typography>
          <TextField
            select
            size="small"
            value={plan.priority ?? "ปกติ"}
            onChange={(e) => onUpdatePriority(plan.planID, e.target.value)}
            sx={{ width: 140 }}
          >
            {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
        </Stack>

        <Row label="วันเริ่มผลิต" value={plan.startDate ?? "-"} />
        <Row label="กำหนดเสร็จ" value={plan.dueDate} />
        <Row label="สูตรการผลิต (Formula)" value={plan.formula && plan.formula !== "-" ? plan.formula : "ยังไม่ได้ระบุ"} />
        <Row label="ผู้รับผิดชอบ" value={plan.owner ?? "ฝ่ายวางแผนการผลิต"} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button variant="contained" startIcon={<Assignment />} onClick={() => onCreateOrder(plan)}>
          สร้างใบสั่งผลิต
        </Button>
      </DialogActions>
    </Dialog>
  );
}