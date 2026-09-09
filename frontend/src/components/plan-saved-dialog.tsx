import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogActions, Button, Stack, Box, Typography,
} from "@mui/material";
import { CheckCircle, Assignment, Save } from "@mui/icons-material";

interface Props {
  open: boolean;
  planId: string | null;
  product: string;
  onSaveOnly: () => void;
  onCreateOrder: () => void;
}

export function PlanSavedDialog({ open, planId, product, onSaveOnly, onCreateOrder }: Props) {
  return (
    <Dialog open={open} onClose={onSaveOnly} fullWidth maxWidth="xs">
      <DialogContent sx={{ textAlign: "center", pt: 4 }}>
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220 }}>
          <Box sx={{ display: "inline-flex", p: 2, borderRadius: "50%", background: "rgba(16,185,129,0.12)" }}>
            <CheckCircle color="success" sx={{ fontSize: 44 }} />
          </Box>
        </motion.div>
        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2 }}>สร้างแผนการผลิตสำเร็จ</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {product} {planId ? `• ${planId}` : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          จะสร้างใบสั่งผลิตต่อเลย หรือบันทึกแผนไว้ก่อน?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexDirection: "column", gap: 1 }}>
        <Button fullWidth variant="contained" startIcon={<Assignment />} onClick={onCreateOrder}>
          สร้างใบสั่งผลิต
        </Button>
        <Button fullWidth startIcon={<Save />} onClick={onSaveOnly}>
          บันทึกแผนไว้ก่อน
        </Button>
      </DialogActions>
    </Dialog>
  );
}
