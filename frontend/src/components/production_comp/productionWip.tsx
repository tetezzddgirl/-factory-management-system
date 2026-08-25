import React, { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog, // เพิ่ม Dialog เข้ามา
} from "@mui/material";
import ProductionWipForm from "./productionWipForm"; // นำเข้า Component ฟอร์ม (แก้ path ให้ตรงกับโปรเจกต์ของคุณ)

// --- Types ---
interface WipItem {
  id: number;
  wipId: string;
  timestamp: string;
  status: "รอรับ" | "รับแล้ว";
}

// ข้อมูลจำลองเบื้องต้น
const initialData: WipItem[] = [
  {
    id: 1,
    wipId: "WIP-1001",
    timestamp: "24/07/2026 10:15:23",
    status: "รอรับ",
  },
  {
    id: 2,
    wipId: "WIP-1002",
    timestamp: "24/07/2026 11:30:00",
    status: "รับแล้ว",
  },
];

export default function ProductionWip() {
  const [wipList, setWipList] = useState<WipItem[]>(initialData);
  const [openForm, setOpenForm] = useState(false); // State สำหรับควบคุมการเปิด/ปิด Popup

  // ฟังก์ชันกำหนดสีของสถานะ
  const getStatusChip = (status: string) => {
    switch (status) {
      case "รับแล้ว":
        return <Chip label={status} size="small" sx={{ bgcolor: "#10b981", color: "#fff", fontWeight: 600, minWidth: 80 }} />;
      case "รอรับ":
        return <Chip label={status} size="small" sx={{ bgcolor: "#f59e0b", color: "#fff", fontWeight: 600, minWidth: 80 }} />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  // ฟังก์ชันสำหรับบันทึกข้อมูลใหม่ลงตาราง
  const handleAddNewRecord = () => {
    // สร้าง ID ใหม่ต่อจากข้อมูลเดิม
    const newId = wipList.length > 0 ? wipList[wipList.length - 1].id + 1 : 1;
    
    // สุ่มรหัส WIP ใหม่
    const randomWipId = `WIP-${Math.floor(Math.random() * 9000) + 1000}`; 
    
    // สร้างเวลาปัจจุบัน
    const now = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // ข้อมูลใหม่ที่จำลองเพิ่มเข้าไป
    const newItem: WipItem = {
      id: newId,
      wipId: randomWipId,
      timestamp: timestamp,
      status: "รอรับ", // กำหนดค่าเริ่มต้นเป็น รอรับ
    };

    // อัปเดต State ให้ตารางแสดงผลข้อมูลใหม่ และปิด Popup
    setWipList([...wipList, newItem]);
    setOpenForm(false);
  };

  return (
    <Box sx={{ width: "100%", mt: 0 }}>
      {/* ส่วนปุ่ม + เพิ่ม ด้านบน */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-start" }}>
        <Button
          variant="contained"
          disableElevation
          onClick={() => setOpenForm(true)} // สั่งเปิด Popup
          sx={{
            bgcolor: "#4a90e2",
            color: "#fff",
            borderRadius: 2,
            fontWeight: 600,
            px: 4,
            textTransform: "none",
            "&:hover": {
              bgcolor: "#357abd",
            },
          }}
        >
          + เพิ่ม
        </Button>
      </Box>

      {/* ส่วนตาราง */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 1.5,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          border: "1px solid #e0e6ed",
          overflowX: "auto",
        }}
      >
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: "#ffffff" }}>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 700, color: "#1b2559" }}>
                ID
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: "#1b2559" }}>
                timestamp
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: "#1b2559" }}>
                สถานะ
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: 150 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wipList.map((row) => (
              <TableRow
                key={row.id}
                hover
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell align="center" sx={{ color: "#475467", fontWeight: 500 }}>
                  {row.wipId}
                </TableCell>
                <TableCell align="center" sx={{ color: "#475467" }}>
                  {row.timestamp}
                </TableCell>
                <TableCell align="center">
                  {getStatusChip(row.status)}
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="contained"
                    disableElevation
                    size="small"
                    sx={{
                      bgcolor: "#4a90e2",
                      color: "#fff",
                      borderRadius: 2,
                      fontWeight: 600,
                      px: 3,
                      textTransform: "none",
                      "&:hover": {
                        bgcolor: "#357abd",
                      },
                    }}
                  >
                    รายละเอียด
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* หน้าต่าง Popup (Dialog) สำหรับฟอร์ม */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="md"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: 3, p: 0, bgcolor: "transparent", boxShadow: "none" } }}
      >
        <ProductionWipForm 
          onClose={() => setOpenForm(false)} 
          onSave={handleAddNewRecord} 
        />
      </Dialog>
    </Box>
  );
}