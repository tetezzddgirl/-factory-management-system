import React, { useState } from "react";
import { Box, Card, Stack, Typography, Chip, Button, Dialog } from "@mui/material";
import ProductionFixForm from "./productionFixForm"; // Import ฟอร์มเข้ามา

// --- Types ---
interface FixItem {
  id: number;
  title: string;
  status: string;
  inspector: string;
  datetime: string;
}

// ข้อมูลตั้งต้น
const initialFixData: FixItem[] = [
  {
    id: 1,
    title: "แก้ไขข้อบกพร่อง1",
    status: "ยังไม่แก้ไข",
    inspector: "ผู้ตรวจ : นายรวยมาก",
    datetime: "24/07/2026 10:45:10",
  },
  {
    id: 2,
    title: "แก้ไขข้อบกพร่อง2",
    status: "ยังไม่แก้ไข",
    inspector: "ผู้ตรวจ : นายรวยมาก",
    datetime: "24/07/2026 10:45:10",
  },
];

export default function ProductionFix() {
  // 1. State เก็บรายการข้อมูล (เพื่อให้แก้ไขสถานะได้)
  const [fixList, setFixList] = useState<FixItem[]>(initialFixData);
  
  // 2. State ควบคุม Popup
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // ฟังก์ชันเปิด Popup และจำว่ากดเปิดจากรายการไหน
  const handleOpenForm = (id: number) => {
    setSelectedId(id);
    setOpenDialog(true);
  };

  // 3. ฟังก์ชันรับการบันทึกจาก Component ลูก
  const handleSaveFix = (idToUpdate: number) => {
    // หา id ที่ตรงกัน แล้วเปลี่ยน status เป็น "แก้ไขแล้ว"
    const updatedList = fixList.map((item) => {
      if (item.id === idToUpdate) {
        return { ...item, status: "แก้ไขแล้ว" };
      }
      return item;
    });

    setFixList(updatedList); // อัปเดตข้อมูลบนหน้าจอ
    setOpenDialog(false); // ปิด Popup
  };

  return (
    <Box sx={{ width: "100%", mt: 0 }}>
      <Stack spacing={2}>
        {fixList.map((item) => (
          <Card
            key={item.id}
            sx={{
              borderRadius: 1.5,
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              border: "1px solid #e0e6ed",
            }}
          >
            <Box
              sx={{
                p: 2,
                px: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Typography sx={{ fontWeight: 500, color: "#1b2559", minWidth: 150 }}>
                {item.title}
              </Typography>

              {/* ปรับสี Badge อัตโนมัติตาม State */}
              <Chip
                label={item.status}
                sx={{
                  bgcolor: item.status === "แก้ไขแล้ว" ? "#00c853" : "#ff4d4f",
                  color: "#fff",
                  fontWeight: "bold",
                  minWidth: 100,
                }}
                size="small"
              />

              <Typography sx={{ color: "#475467", minWidth: 150, textAlign: "center" }}>
                {item.inspector}
              </Typography>
              <Typography sx={{ color: "#475467", minWidth: 180, textAlign: "center" }}>
                {item.datetime}
              </Typography>

              <Button
                variant="contained"
                disableElevation
                onClick={() => handleOpenForm(item.id)} // สั่งเปิดฟอร์ม
                sx={{
                  bgcolor: "#4a90e2",
                  color: "#fff",
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#357abd" },
                }}
              >
                รายละเอียด/บันทึกผล
              </Button>
            </Box>
          </Card>
        ))}
      </Stack>

      {/* Popup นำ Component Form มาแสดง */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="md"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}
      >
        {selectedId !== null && (
          <ProductionFixForm 
            fixId={selectedId} // ส่ง ID ลงไปให้ฟอร์มรู้ว่ากำลังแก้ตัวไหน
            onSave={handleSaveFix} 
            onCancel={() => setOpenDialog(false)} 
          />
        )}
      </Dialog>
    </Box>
  );
}