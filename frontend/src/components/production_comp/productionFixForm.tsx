import React, { useState } from "react";
import { Box, Button, Stack, TextField, Typography, Tabs, Tab, Divider, Dialog } from "@mui/material";

interface ProductionFixFormProps {
  fixId: number;
  onSave: (id: number) => void;
  onCancel: () => void;
}

export default function ProductionFixForm({ fixId, onSave, onCancel }: ProductionFixFormProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false); // State สำหรับ Popup ยืนยัน

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <Box sx={{ width: "100%", p: 0 }}>
      {/* ส่วนหัว */}
      <Box sx={{ p: 3, pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1b2559" }}>
          แก้ไขข้อบกพร่อง{fixId}
        </Typography>
        <Typography variant="body2" sx={{ color: "#475467", mt: 0.5 }}>
          ขวด PET 500ml • JOB-2451
        </Typography>
      </Box>

      {/* แถบ Tabs */}
      <Tabs 
        value={tabIndex} 
        onChange={handleTabChange} 
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="รายละเอียด" sx={{ fontWeight: 600, textTransform: "none" }} />
        <Tab label="บันทึกผล" sx={{ fontWeight: 600, textTransform: "none" }} />
      </Tabs>

      {/* เนื้อหา Tab 0: รายละเอียด */}
      {tabIndex === 0 && (
        <Box sx={{ p: 3, height: 450, overflowY: "auto" }}>
          <Stack spacing={2} sx={{ color: "#334155", fontSize: "0.95rem" }}>
            <Typography><strong>ข้อมูลอ้างอิง:</strong> ล็อต LOT-PET-0626-11 | สินค้า: ขวด PET ขนาด 600 ml</Typography>
            <Typography><strong>ผลการตัดสิน:</strong> ต้องแก้ไข</Typography>
            <Typography><strong>อาการที่พบ:</strong> มีติ่งหรือเศษพลาสติกยื่นออกมาจากรอยตะเข็บแม่พิมพ์บริเวณก้นขวด ทำให้ขวดวางตั้งแล้วเอียง (พบ 150 ใบ)</Typography>
            
            <Box>
              <Typography sx={{ mb: 1 }}><strong>แนวทางแก้ไขมาตรฐาน (จากระบบ):</strong></Typography>
              <ol style={{ marginTop: 0, paddingLeft: 20 }}>
                <li>ให้พนักงานนำมีดขูดแต่งคม (Deburring Tool) ปาดเศษพลาสติกที่ยื่นออกมาออกให้เรียบ</li>
                <li>ทดสอบนำขวดไปวางบนพื้นราบเพื่อเช็คว่าขวดไม่เอียงหรือล้ม</li>
              </ol>
            </Box>

            <Typography><strong>คำแนะนำเพิ่มเติมจาก QC:</strong> "ให้ระวังน้ำหนักมือตอนขูด อย่าให้ใบมีดกินเนื้อพลาสติกลึกเกินไปเพราะจะทำให้ก้นขวดบางและทะลุได้"</Typography>
            <Typography><strong>ผู้ตรวจสอบ:</strong> นายสมศักดิ์</Typography>
          </Stack>
        </Box>
      )}

      {/* เนื้อหา Tab 1: บันทึกผล */}
      {tabIndex === 1 && (
        <Box sx={{ p: 3, height: 450, overflowY: "auto" }}>
          <Stack spacing={2}>
            <Box sx={{ color: "#334155", fontSize: "0.9rem", mb: 1 }}>
              <Typography><strong>ข้อมูลอ้างอิง:</strong> ล็อต LOT-PET-0626-11 | สินค้า: ขวด PET ขนาด 600 ml</Typography>
              <Typography><strong>อาการที่พบ:</strong> มีติ่งหรือเศษพลาสติกยื่นออกมาจากรอยตะเข็บแม่พิมพ์บริเวณก้นขวด ทำให้ขวดวางตั้งแล้วเอียง (พบ 150 ใบ)</Typography>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.9rem" }}>วิธีการที่ใช้แก้ไข :</Typography>
              <TextField fullWidth size="small" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.9rem" }}>วิธีการที่ใช้แก้ไข :</Typography>
              <TextField fullWidth size="small" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.9rem" }}>ผลลัพธ์การแก้ไข :</Typography>
              <TextField fullWidth size="small" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.9rem" }}>จำนวนที่แก้ไขสำเร็จ :</Typography>
              <TextField fullWidth size="small" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.9rem" }}>จำนวนที่เสียทิ้ง/ขยะ :</Typography>
              <TextField fullWidth size="small" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.9rem" }}>หมายเหตุ/บันทึกเพิ่มเติม :</Typography>
              <TextField fullWidth size="small" />
            </Box>
          </Stack>
        </Box>
      )}

      <Divider />

      {/* ปุ่มส่วนล่าง */}
      <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", gap: 2, bgcolor: "#fafafa" }}>
        <Button onClick={onCancel} sx={{ fontWeight: 600, color: "#4a90e2" }}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={() => setConfirmOpen(true)} // เปลี่ยนมากดแล้วเปิด Popup ยืนยันแทน
          disabled={tabIndex === 0}
          sx={{
            bgcolor: "#4a90e2",
            color: "#fff",
            borderRadius: 2,
            fontWeight: 600,
            px: 4,
            "&.Mui-disabled": { bgcolor: "#c0dff8", color: "#fff" },
          }}
        >
          บันทึก
        </Button>
      </Box>

      {/* Dialog ยืนยันการบันทึก */}
      <Dialog 
        open={confirmOpen} 
        onClose={() => setConfirmOpen(false)}
        sx={{ "& .MuiDialog-paper": { borderRadius: 3, p: 4, textAlign: "center", minWidth: 350 } }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1b2559", mb: 4 }}>
          คุณต้องการบันทึกข้อมูลนี้ใช่หรือไม่?
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
            onClick={() => {
              setConfirmOpen(false); // ปิด Popup ยืนยัน
              onSave(fixId);         // สั่งบันทึกข้อมูลและเปลี่ยนสถานะ
            }}
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