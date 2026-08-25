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

interface ProductionFgFormProps {
  onClose?: () => void; // ฟังก์ชันเมื่อกดยกเลิก
  onSave?: () => void;  // ฟังก์ชันเมื่อกดยืนยันบันทึกสำเร็จ
}

export default function ProductionFgForm({ onClose, onSave }: ProductionFgFormProps) {
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
          บันทึกข้อมูลสินค้าสำเร็จรูป (FG)
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b" }}>
          น้ำดื่ม PET 500 ml (แพ็ก 12 ขวด) • L260806-A02
        </Typography>
      </Box>
      
      <Divider />

      {/* เนื้อหาฟอร์ม */}
      <Box sx={{ p: 3, maxHeight: "60vh", overflowY: "auto" }}>
        <Stack spacing={2.5}>
          
          {/* ข้อมูลอ้างอิง (อ่านอย่างเดียว) */}
          <Stack spacing={1.5} sx={{ color: "#1e293b", fontSize: "1rem" }}>
            <Stack direction="row" spacing={2}>
              <Typography sx={{ fontWeight: 700, width: 120 }}>รหัสสินค้า :</Typography>
              <Typography>FG-WAT500-P12</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography sx={{ fontWeight: 700, width: 120 }}>ชื่อสินค้า :</Typography>
              <Typography>น้ำดื่ม PET 500 ml (แพ็ก 12 ขวด หุ้มชริงค์ฟิล์ม)</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography sx={{ fontWeight: 700, width: 120 }}>รหัสล็อต :</Typography>
              <Typography>L260806-A02</Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1 }} />

            <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>วันที่ผลิต :</Typography>
            <TextField
                fullWidth
                size="small"
                variant="outlined"
                type="date"
                slotProps={{
                inputLabel: {
                    shrink: true,
                },
                }}
            />
            </Box>

            <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>วันหมดอายุ :</Typography>
            <TextField
                fullWidth
                size="small"
                variant="outlined"
                type="date"
                slotProps={{
                inputLabel: {
                    shrink: true,
                },
                }}
            />
            </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>จำนวน :</Typography>
            <TextField 
              fullWidth 
              size="small" 
              variant="outlined" 
              type="number" 
              placeholder="ระบุจำนวน (แพ็ก)" 
            />
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
          คุณต้องการบันทึกข้อมูลสินค้าสำเร็จรูป (FG) ใช่หรือไม่?
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