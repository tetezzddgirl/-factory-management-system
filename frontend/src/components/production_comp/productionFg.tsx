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
  Dialog,
} from "@mui/material";
import ProductionFgForm from "./productionFgForm"; // 1. เปลี่ยนมา Import ฟอร์ม FG

// --- Types ---
interface FgItem {
  id: number;
  fgId: string;
  timestamp: string;
  status: "รอรับ" | "รับแล้ว";
}

// ข้อมูลจำลองเบื้องต้นของ FG
const initialData: FgItem[] = [
  {
    id: 1,
    fgId: "FG-1001",
    timestamp: "24/07/2026 10:15:23",
    status: "รอรับ",
  },
  {
    id: 2,
    fgId: "FG-1002",
    timestamp: "24/07/2026 11:30:00",
    status: "รับแล้ว",
  },
];

export default function ProductionFg() {
  const [fgList, setFgList] = useState<FgItem[]>(initialData);
  const [openForm, setOpenForm] = useState(false);

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

  // ฟังก์ชันสำหรับบันทึกข้อมูลใหม่ลงตาราง FG
  const handleAddNewRecord = () => {
    const newId = fgList.length > 0 ? fgList[fgList.length - 1].id + 1 : 1;
    
    // สุ่มรหัส FG ใหม่ หรือกำหนดตามต้องการ
    const randomFgId = `FG-${Math.floor(Math.random() * 9000) + 1000}`; 
    
    const now = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newItem: FgItem = {
      id: newId,
      fgId: randomFgId,
      timestamp: timestamp,
      status: "รอรับ", // ค่าเริ่มต้น
    };

    setFgList([...fgList, newItem]);
    setOpenForm(false); // ปิด Popup หลังจากบันทึก
  };

  return (
    <Box sx={{ width: "100%", mt: 0 }}>
      {/* ส่วนปุ่ม + เพิ่ม ด้านบน */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-start" }}>
        <Button
          variant="contained"
          disableElevation
          onClick={() => setOpenForm(true)} // เปิด Popup ฟอร์ม FG
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
            {fgList.map((row) => (
              <TableRow
                key={row.id}
                hover
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell align="center" sx={{ color: "#475467", fontWeight: 500 }}>
                  {row.fgId}
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

      {/* หน้าต่าง Popup (Dialog) เรียกใช้ ProductionFgForm */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="md"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: 3, p: 0, bgcolor: "transparent", boxShadow: "none" } }}
      >
        <ProductionFgForm 
          onClose={() => setOpenForm(false)} 
          onSave={handleAddNewRecord} 
        />
      </Dialog>
    </Box>
  );
}