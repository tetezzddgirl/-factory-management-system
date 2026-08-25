import React, { useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Divider,
  Dialog,
} from "@mui/material";

interface ProductionWipFormProps {
  onClose?: () => void; // ฟังก์ชันเมื่อกดยกเลิก
  onSave?: () => void;  // ฟังก์ชันเมื่อกดยืนยันบันทึกสำเร็จ
}

export default function ProductionWipForm({ onClose, onSave }: ProductionWipFormProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ฟังก์ชันกดยืนยันใน Popup
  const handleConfirm = () => {
    setConfirmOpen(false);
    if (onSave) onSave();
  };

  return (
    <Box sx={{ width: "100%", bgcolor: "#fff", borderRadius: 2 }}>
      
      {/* ส่วนหัว */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
          บันทึกข้อมูลสินค้าระหว่างผลิต (WIP)
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b" }}>
          ขวดเปล่า 500 ml • L260807-W01
        </Typography>
      </Box>
      
      <Divider />

      {/* เนื้อหาฟอร์ม */}
      <Box sx={{ p: 3, maxHeight: "60vh", overflowY: "auto" }}>
        <Stack spacing={2.5}>
          
          {/* ข้อมูลอ้างอิง (อ่านอย่างเดียว) */}
          <Stack spacing={1.5} sx={{ color: "#1e293b", fontSize: "1rem" }}>
            <Stack direction="row" spacing={2}>
              <Typography sx={{ fontWeight: 700, width: 160 }}>รหัส WIP :</Typography>
              <Typography>WIP-BTL500 (ขวดเปล่า 500 ml)</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography sx={{ fontWeight: 700, width: 160 }}>ล็อต :</Typography>
              <Typography>L260807-W01</Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1 }} />

          {/* ช่องกรอกข้อมูล */}
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>ขั้นตอนปัจจุบัน :</Typography>
            <TextField fullWidth size="small" variant="outlined" placeholder="เช่น รอเป่าขวด, รอติดฉลาก" />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>จำนวน :</Typography>
            <TextField fullWidth size="small" variant="outlined" type="number" />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>เวลาเข้าสู่ WIP :</Typography>
            {/* ใช้ type="datetime-local" เพื่อให้มีปฏิทินและเวลาให้เลือก */}
            <TextField 
            fullWidth 
            size="small" 
            variant="outlined" 
            type="datetime-local" 
            slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>พนักงานรับผิดชอบ :</Typography>
            <TextField fullWidth size="small" variant="outlined" />
          </Box>

        </Stack>
      </Box>
      
      <Divider />

      {/* ปุ่มด้านล่าง */}
      <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button onClick={onClose} sx={{ fontWeight: 600, color: "#4a90e2", textTransform: "none" }}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={() => setConfirmOpen(true)} // กดแล้วเปิด Popup
          sx={{
            bgcolor: "#4a90e2",
            color: "#fff",
            borderRadius: 2,
            fontWeight: 600,
            px: 4,
            textTransform: "none",
            "&:hover": { bgcolor: "#357abd" },
          }}
        >
          บันทึก
        </Button>
      </Box>

      {/* Popup ยืนยันการบันทึก */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        sx={{ "& .MuiDialog-paper": { borderRadius: 3, p: 4, textAlign: "center", minWidth: 350 } }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1b2559", mb: 4 }}>
          คุณต้องการบันทึกข้อมูล WIP ใช่หรือไม่?
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", gap: 3 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{ fontWeight: 600, color: "#4a90e2", textTransform: "none", px: 3 }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleConfirm}
            sx={{
              bgcolor: "#4a90e2",
              color: "#fff",
              borderRadius: 2,
              fontWeight: 600,
              px: 4,
              textTransform: "none",
              "&:hover": { bgcolor: "#357abd" },
            }}
          >
            ยืนยัน
          </Button>
        </Box>
      </Dialog>
      
    </Box>
  );
}