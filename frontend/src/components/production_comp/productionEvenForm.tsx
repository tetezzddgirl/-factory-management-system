import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from "@mui/material";

export interface EventData {
  eventType: string;
  startTime: string;
  endTime: string;
  description: string; // 👈 เปลี่ยนจาก details เป็น description
  impact: string;
  recordedBy: string;  // 👈 เปลี่ยนจาก recorder เป็น recordedBy
}

interface ProductionEvenFormProps {
  orderId?: string;
  orderName?: string;
  onSave: (data: EventData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const eventTypes = [
  "เครื่องจักรขัดข้อง/เสีย",
  "ขาดแคลนวัตถุดิบ",
  "อุบัติเหตุระหว่างผลิต",
  "ไฟตก/ไฟดับ",
  "อื่นๆ"
];

export default function ProductionEvenForm({ orderId, orderName, onSave, onCancel, loading }: ProductionEvenFormProps) {
  const [formData, setFormData] = useState<EventData>({
    eventType: "",
    startTime: "",
    endTime: "",
    description: "", 
    impact: "",
    recordedBy: "นายสมมติ ทดสอบ (Mock)", 
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  // ฟังก์ชันสำหรับเคลียร์ค่าในฟอร์ม
  const resetForm = () => {
    setFormData({
      eventType: "",
      startTime: "",
      endTime: "",
      description: "",
      impact: "",
      recordedBy: "นายสมมติ ทดสอบ (Mock)",
    });
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onSave(formData);
    resetForm(); // 👈 เคลียร์ค่าหลังจากกดยืนยัน
  };

  const handleCancel = () => {
    onCancel();
    resetForm(); // 👈 เคลียร์ค่าเมื่อกดยกเลิก
  };

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
          บันทึกเหตุการณ์ใหม่
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
                  {orderId || "-"}
                </Box>
              </Typography>
            </Stack>
          </Box>

          <Stack spacing={2.5}>
            <TextField
              select
              required
              fullWidth
              label="ประเภทเหตุการณ์"
              name="eventType"
              value={formData.eventType}
              onChange={handleChange}
            >
              {eventTypes.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2}>
              <TextField
                required
                fullWidth
                type="datetime-local"
                label="เวลาที่เริ่มเกิดเหตุ"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                type="datetime-local"
                label="เวลาที่สิ้นสุด (ถ้ามี)"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <TextField
              required
              fullWidth
              multiline
              rows={3}
              label="รายละเอียดเหตุการณ์"
              name="description" // 👈 เปลี่ยนเป็น description
              value={formData.description}
              onChange={handleChange}
              placeholder="อธิบายสิ่งที่เกิดขึ้น..."
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="ผลกระทบที่เกิดขึ้น"
              name="impact"
              value={formData.impact}
              onChange={handleChange}
              placeholder="เช่น เสียเวลาผลิต 2 ชั่วโมง, สินค้าเสียหาย 10 ชิ้น"
            />

            <TextField
              fullWidth
              disabled
              label="ผู้บันทึก"
              name="recordedBy" // 👈 เปลี่ยนเป็น recordedBy
              value={formData.recordedBy}
              slotProps={{ input: { readOnly: true } }}
              helperText="* ข้อมูลผู้บันทึกจะถูกดึงจากระบบอัตโนมัติ"
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
            บันทึกข้อมูล
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
          ยืนยันการบันทึก
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            คุณตรวจสอบข้อมูลครบถ้วนแล้ว และต้องการบันทึกเหตุการณ์นี้ใช่หรือไม่?
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