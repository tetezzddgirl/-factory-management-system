import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  MenuItem,
  CircularProgress,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";

interface ProductionFgFormProps {
  orderID?: string;
  orderName?: string;
  onClose: () => void;
  onSave: () => void;
}

export default function ProductionFgForm({
  orderID,
  orderName,
  onClose,
  onSave,
}: ProductionFgFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    paletteNumber: "",
    fgID: "",
    amount: "",
    remark: "",
    recordedBy: "นายสมมติ ทดสอบ (Mock)",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("ff:token") || localStorage.getItem("token") || "";
      
      // ตัวอย่าง Payload สำหรับส่งไปบันทึกข้อมูล FG และ Transfer Record
      const payload = {
        transferType: "FG",
        status: "Pending",
        createdBy: formData.recordedBy,
        remark: formData.remark,
        order_id: orderID,
        // เพิ่มข้อมูลส่วน Inventory / FG ตามที่ Backend ต้องการ
        paletteNumber: formData.paletteNumber,
        fgID: formData.fgID,
        amount: Number(formData.amount),
      };

      const res = await fetch(`http://localhost:8090/api/production/transfers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`บันทึกข้อมูลไม่สำเร็จ: ${errText}`);
      }

      onSave(); // เรียกเพื่อรีเฟรชข้อมูลและปิด Dialog
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
        เพิ่มข้อมูลสินค้าสำเร็จรูป (FG)
      </DialogTitle>
      <Divider />

      <DialogContent>
        {/* ส่วนแสดงข้อมูลงานผลิต */}
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

        {/* ฟิลด์กรอกข้อมูล */}
        <Stack spacing={2.5}>
          <TextField
            required
            fullWidth
            label="รหัสพาเลท (Palette Number)"
            name="paletteNumber"
            value={formData.paletteNumber}
            onChange={handleChange}
            placeholder="เช่น PLT-001"
          />

          <TextField
            required
            fullWidth
            select
            label="เลือกสินค้าสำเร็จรูป (FG)"
            name="fgID"
            value={formData.fgID}
            onChange={handleChange}
          >
            {/* ตัวอย่าง MenuItem สามารถดึงจาก State รายชื่อ FG จริงมา map แทนได้ */}
            <MenuItem value="FG-001">สินค้าสำเร็จรูป A</MenuItem>
            <MenuItem value="FG-002">สินค้าสำเร็จรูป B</MenuItem>
          </TextField>

          <TextField
            required
            fullWidth
            type="number"
            label="จำนวน (Amount)"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0"
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="หมายเหตุ (Remark)"
            name="remark"
            value={formData.remark}
            onChange={handleChange}
            placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
          />

          <TextField
            fullWidth
            disabled
            label="ผู้บันทึก"
            name="recordedBy"
            value={formData.recordedBy}
            slotProps={{ input: { readOnly: true } }}
            helperText="* ระบบดึงชื่อผู้ใช้ปัจจุบันให้อัตโนมัติ"
          />
        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          ยกเลิก
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{ bgcolor: "#4a90e2", "&:hover": { bgcolor: "#357abd" } }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "บันทึกข้อมูล"}
        </Button>
      </DialogActions>
    </Box>
  );
}