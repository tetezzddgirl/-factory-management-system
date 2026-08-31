import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from "@mui/material";
import QualityQcPointRequirement, { InspectItemInput } from "./qualityQcPointRequirement";

export interface QcPointData {
  pointName: string;
  description: string;
  inspectItems: InspectItemInput[];
}

interface QualityQcPointAddProps {
  orderID?: string;
  orderName?: string;
  onSave: (data: QcPointData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function QualityQcPointAdd({ orderID, orderName, onSave, onCancel, loading }: QualityQcPointAddProps) {
  const [pointName, setPointName] = useState("");
  const [description, setDescription] = useState("");
  const [inspectItems, setInspectItems] = useState<InspectItemInput[]>([
    { requirementID: "", checkItem: "", specification: "", unit: "" }
  ]);
  
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const resetForm = () => {
    setPointName("");
    setDescription("");
    setInspectItems([{ requirementID: "", checkItem: "", specification: "", unit: "" }]);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onSave({
      pointName,
      description,
      inspectItems,
    });
    resetForm();
  };

  const handleCancel = () => {
    onCancel();
    resetForm();
  };

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
          เพิ่มจุดตรวจคุณภาพ
        </DialogTitle>
        <Divider />
        
        <DialogContent>
          <Box sx={{ mb: 3, p: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2 }}>
            <Stack direction="column" spacing={0.75}>
              <Typography sx={{ fontSize: "1rem", color: "text.secondary" }}>
                คำสั่งผลิต:{" "}
                <Box component="span" sx={{ fontWeight: 600, color: "#1e293b" }}>
                  {orderName || "ไม่ระบุชื่อ"}
                </Box>
              </Typography>
              <Typography sx={{ fontSize: "1rem", color: "text.secondary" }}>
                ID:{" "}
                <Box component="span" sx={{ fontWeight: 600, color: "#1e293b" }}>
                  {orderID || "-"}
                </Box>
              </Typography>
            </Stack>
          </Box>

          <Stack spacing={3}>
            <TextField
              required
              fullWidth
              label="ชื่อจุดตรวจ"
              value={pointName}
              onChange={(e) => setPointName(e.target.value)}
              placeholder="เช่น ตรวจสอบความสมบูรณ์ของขวด"
            />

            {/* นำ Component ลูกมาใช้งานและส่ง props เข้าไป */}
            <QualityQcPointRequirement 
              inspectItems={inspectItems} 
              onChange={setInspectItems} 
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="รายละเอียดเพิ่มเติม (ถ้ามี)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="วิธีการตรวจสอบ หรือข้อควรระวังเพิ่มเติม..."
            />
          </Stack>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCancel} color="inherit" disabled={loading}>
            ยกเลิก
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            sx={{ bgcolor: "#4a90e2", "&:hover": { bgcolor: "#357abd" } }}
          >
            บันทึกจุดตรวจ
          </Button>
        </DialogActions>
      </Box>

      {/* --- Popup ยืนยันการบันทึก --- */}
      <Dialog
        open={confirmOpen}
        onClose={() => !loading && setConfirmOpen(false)}
        sx={{ "& .MuiDialog-paper": { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
          ยืนยันการบันทึกจุดตรวจ
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            คุณตรวจสอบข้อมูลจุดตรวจครบถ้วนแล้ว และต้องการบันทึกข้อมูลนี้ใช่หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" disabled={loading}>
            กลับไปแก้ไข
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading}
            sx={{ bgcolor: "#4a90e2", "&:hover": { bgcolor: "#357abd" } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "ยืนยัน"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}