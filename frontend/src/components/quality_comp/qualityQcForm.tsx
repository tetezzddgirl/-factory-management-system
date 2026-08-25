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

interface QualityQcForm {
  onClose?: () => void; // ฟังก์ชันเมื่อกดยกเลิก
  onSave?: () => void;  // ฟังก์ชันเมื่อกดยืนยันบันทึกสำเร็จ
}

export default function QualityQcForm({ onClose, onSave }: QualityQcForm) {
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
          เพิ่มตรวจสินค้าสำเร็จรูป
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b" }}>
          ขวด PET 500ml • JOB-2451
        </Typography>
      </Box>
      
      <Divider />

      {/* เนื้อหาฟอร์ม (ใส่ scrollbar กันเนื้อหายาวเกินหน้าจอ) */}
      <Box sx={{ p: 3, maxHeight: "60vh", overflowY: "auto" }}>
        <Stack spacing={2.5}>
          
          {/* ข้อมูลอ้างอิง (อ่านอย่างเดียว) */}
          <Stack spacing={1.5} sx={{ color: "#1e293b", fontSize: "1rem" }}>
            <Stack direction="row" spacing={2}>
              <Typography sx={{ fontWeight: 700, width: 220 }}>รหัสใบรายงานการตรวจ :</Typography>
              <Typography>AQA123</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography sx={{ fontWeight: 700, width: 220 }}>รหัสล็อตสินค้า :</Typography>
              <Typography>JOB-2451</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography sx={{ fontWeight: 700, width: 220 }}>รายการสินค้า :</Typography>
              <Typography>ขวด PET 500ml</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Typography sx={{ fontWeight: 700, width: 220 }}>จำนวนทั้งหมดในล็อต :</Typography>
              <Typography>5000</Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1 }} />

          {/* ช่องกรอกข้อมูล */}
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>จำนวนที่สุ่มตรวจ :</Typography>
            <TextField fullWidth size="small" variant="outlined" type="number" />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>ด้านกายภาพ :</Typography>
            <TextField fullWidth size="small" variant="outlined" />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>ด้านขนาด :</Typography>
            <TextField fullWidth size="small" variant="outlined" />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>ด้านฟังก์ชันการใช้งาน :</Typography>
            <TextField fullWidth size="small" variant="outlined" />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>สถานะการตัดสิน :</Typography>
            <TextField fullWidth size="small" variant="outlined" placeholder="เช่น ผ่าน / ไม่ผ่าน" />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>จำนวนที่พบปัญหา :</Typography>
            <TextField fullWidth size="small" variant="outlined" type="number" />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>หมายเหตุจาก QC :</Typography>
            <TextField fullWidth size="small" variant="outlined" multiline rows={2} />
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
          คุณต้องการบันทึกข้อมูลการตรวจคุณภาพใช่หรือไม่?
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