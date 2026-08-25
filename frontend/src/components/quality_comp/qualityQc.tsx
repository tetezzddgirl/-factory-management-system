import React, { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Dialog,
} from "@mui/material";
import QualityQcForm from "./qualityQcForm";

// ข้อมูลเริ่มต้น
const initialData = [
  {
    id: 1,
    code: "AQA123",
    recorder: "นายจอ",
    datetime: "24/07/2026 10:15:23",
  },
];

export default function QualityQc() {
  const [filterType, setFilterType] = useState("วัตถุดิบ");
  const [openForm, setOpenForm] = useState(false);
  
  // เปลี่ยนตารางมาใช้ State เพื่อให้เพิ่มข้อมูลได้
  const [tableData, setTableData] = useState(initialData);

  const handleFilterChange = (event: SelectChangeEvent) => {
    setFilterType(event.target.value);
  };

  // ฟังก์ชันสร้างข้อมูลใหม่และเพิ่มลงตาราง
  const handleAddNewRecord = () => {
    const newId = tableData.length > 0 ? tableData[tableData.length - 1].id + 1 : 1;
    const randomCode = `AQA${Math.floor(Math.random() * 900) + 100}`; // สุ่มรหัสเช่น AQA456
    
    // สร้าง Timestamp ปัจจุบัน (DD/MM/YYYY HH:MM:SS)
    const now = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newRecord = {
      id: newId,
      code: randomCode,
      recorder: "วิสร ย.", // กำหนดชื่อผู้บันทึกอัตโนมัติ
      datetime: timestamp,
    };

    // อัปเดตข้อมูลตารางและปิด Popup
    setTableData([...tableData, newRecord]);
    setOpenForm(false);
  };

  return (
    <Box sx={{ width: "100%", pt: 2 }}>
      {/* ส่วนควบคุมด้านบน */}
      <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <Select
            value={filterType}
            onChange={handleFilterChange}
            sx={{
              bgcolor: "#ffffff",
              borderRadius: 1.5,
              fontWeight: 500,
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            }}
          >
            <MenuItem value="วัตถุดิบ">วัตถุดิบ</MenuItem>
            <MenuItem value="สินค้าระหว่างผลิต">สินค้าระหว่างผลิต</MenuItem>
            <MenuItem value="สินค้าสำเร็จรูป">สินค้าสำเร็จรูป</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained"
          disableElevation
          onClick={() => setOpenForm(true)}
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
          + เพิ่ม
        </Button>
      </Stack>

      {/* ตารางข้อมูล */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 1.5,
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
          border: "1px solid #f1f5f9",
          bgcolor: "#ffffff",
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: 80 }}></TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: "#1e293b" }}>
                รหัสสุ่มตรวจ
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: "#1e293b" }}>
                ผู้บันทึก
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: "#1e293b" }}>
                วันเวลา
              </TableCell>
              <TableCell align="center" sx={{ width: 160 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* ดึงข้อมูลจาก State tableData มาแสดง */}
            {tableData.map((row) => (
              <TableRow key={row.id}>
                <TableCell align="center" sx={{ color: "#475467" }}>
                  {row.id}
                </TableCell>
                <TableCell align="center" sx={{ color: "#475467" }}>
                  {row.code}
                </TableCell>
                <TableCell align="center" sx={{ color: "#475467" }}>
                  {row.recorder}
                </TableCell>
                <TableCell align="center" sx={{ color: "#475467" }}>
                  {row.datetime}
                </TableCell>
                <TableCell align="center">
                  <Button
                    variant="contained"
                    disableElevation
                    sx={{
                      bgcolor: "#4a90e2",
                      color: "#fff",
                      borderRadius: 2,
                      fontWeight: 600,
                      textTransform: "none",
                      "&:hover": { bgcolor: "#357abd" },
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

      {/* หน้าต่าง Popup สำหรับแสดงฟอร์ม */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="md"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: 3, p: 0, bgcolor: "transparent", boxShadow: "none" } }}
      >
        <QualityQcForm 
          onClose={() => setOpenForm(false)} 
          onSave={handleAddNewRecord} // เรียกฟังก์ชันเพิ่มข้อมูลเมื่อกดยืนยันในฟอร์ม
        />
      </Dialog>
    </Box>
  );
}