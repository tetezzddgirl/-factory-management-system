import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

// --- Mock Data ---
const machineData = [
  { id: 1, name: "เครื่องจักร1", status: "ปกติ", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 2, name: "เครื่องจักร1", status: "กำลังซ่อม", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 3, name: "เครื่องจักร1", status: "หยุด", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 4, name: "เครื่องจักร1", status: "ปกติ", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 5, name: "เครื่องจักร1", status: "ปกติ", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 6, name: "เครื่องจักร1", status: "ปกติ", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 7, name: "เครื่องจักร1", status: "ปกติ", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 8, name: "เครื่องจักร1", status: "ปกติ", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 9, name: "เครื่องจักร1", status: "ปกติ", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 10, name: "เครื่องจักร1", status: "ปกติ", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
];

export default function QualityProductionDetails() {
  // ฟังก์ชันกำหนดสีป้ายสถานะ (Chip) ให้ตรงกับรูปภาพ
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ปกติ":
        return { bgcolor: "#10b981", color: "#fff" }; // สีเขียว
      case "กำลังซ่อม":
        return { bgcolor: "#dde143", color: "#333" }; // สีเหลืองอมเขียว
      case "หยุด":
        return { bgcolor: "#ef4444", color: "#fff" }; // สีแดง
      default:
        return { bgcolor: "#e2e8f0", color: "#333" };
    }
  };

  // สไตล์ร่วมของ Card ด้านซ้าย
  const leftCardStyle = {
    bgcolor: "#ffffff", // สีพื้นหลังขาว
    borderRadius: 1.5,
    boxShadow: "none",
    border: "1px solid #e2e8f0",
  };

  return (
    <Box sx={{ width: "100%", pt: 2 }}>
      <Grid container spacing={3}>
        
        {/* === คอลัมน์ซ้าย: ข้อมูลรายละเอียด 3 กล่อง === */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            
            {/* กล่อง 1: ข้อมูลภาพรวมใบสั่งผลิต */}
            <Card sx={leftCardStyle}>
              <CardContent sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, color: "#1e293b", mb: 2 }}>
                  ข้อมูลภาพรวมใบสั่งผลิต
                </Typography>
                <Stack spacing={1.5} sx={{ color: "#334155", fontSize: "0.95rem" }}>
                  <Typography variant="body2">ชื่อสินค้า : ขวด PET 500ml</Typography>
                  <Typography variant="body2">รหัสใบสั่งผลิต : (JOB-2451)</Typography>
                  <Typography variant="body2">วันที่/เวลาที่เริ่มผลิต: 23 ก.ค. 2026 | 08:00 น.</Typography>
                  <Typography variant="body2">เวลาที่คาดว่าจะเสร็จสิ้น : 23 ก.ค. 2026 | 17:30 น.</Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* กล่อง 2: รายละเอียดวัตถุดิบที่ใช้ */}
            <Card sx={leftCardStyle}>
              <CardContent sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, color: "#1e293b", mb: 2 }}>
                  รายละเอียดวัตถุดิบที่ใช้
                </Typography>
                <Stack spacing={1.5} sx={{ color: "#334155", fontSize: "0.95rem" }}>
                  <Typography variant="body2">รายการวัตถุดิบหลัก: เม็ดพลาสติก PET เกรด A</Typography>
                  <Typography variant="body2">ล็อตวัตถุดิบ (Lot Number): LOT-690723</Typography>
                  <Typography variant="body2">ปริมาณที่ใช้ไป / ปริมาณที่เบิกมา: 80 กก. / 100 กก.</Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* กล่อง 3: สถานะและตัววัดประสิทธิภาพการผลิต */}
            <Card sx={leftCardStyle}>
              <CardContent sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, color: "#1e293b", mb: 2 }}>
                  สถานะและตัววัดประสิทธิภาพการผลิต
                </Typography>
                <Stack spacing={1.5} sx={{ color: "#334155", fontSize: "0.95rem" }}>
                  <Typography variant="body2">เป้าหมายการผลิต : 5,000 ชิ้น</Typography>
                  <Typography variant="body2">จำนวนที่ผลิตได้แล้ว : 3,900 ชิ้น (78%)</Typography>
                  <Typography variant="body2">จำนวนของดี : 3,850 ชิ้น</Typography>
                  <Typography variant="body2">จำนวนของเสีย : เช่น 50 ชิ้น (1.28%)</Typography>
                  <Typography variant="body2">ความเร็วในการผลิตปัจจุบัน : 120 ชิ้น/นาที</Typography>
                </Stack>
              </CardContent>
            </Card>

          </Stack>
        </Grid>

        {/* === คอลัมน์ขวา: ตารางสถานะเครื่องจักร === */}
        <Grid size={{ xs: 12, md: 8 }}>
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 1.5,
              boxShadow: "none",
              border: "1px solid #e2e8f0",
              height: "100%",
              bgcolor: "#ffffff", // เพิ่มพื้นหลังสีขาวให้ Container ตาราง
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {/* เพิ่ม bgcolor: "#ffffff" ลงในส่วนหัวตารางทุกช่อง */}
                  <TableCell align="center" sx={{ fontWeight: 600, color: "#475467", borderBottom: "2px solid #e2e8f0", bgcolor: "#ffffff" }}>
                    เครื่องจักร
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: "#475467", borderBottom: "2px solid #e2e8f0", bgcolor: "#ffffff" }}>
                    สถานะเครื่องจักร
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: "#475467", borderBottom: "2px solid #e2e8f0", bgcolor: "#ffffff" }}>
                    ผู้ควบคุมเครื่อง
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: "#475467", borderBottom: "2px solid #e2e8f0", bgcolor: "#ffffff" }}>
                    กะการทำงาน
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {machineData.map((row) => (
                  <TableRow key={row.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell align="center" sx={{ fontWeight: 600, color: "#334155" }}>
                      {row.name}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.status}
                        size="small"
                        sx={{
                          ...getStatusStyle(row.status),
                          fontWeight: 600,
                          minWidth: 90,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ color: "#475467" }}>
                      {row.operator}
                    </TableCell>
                    <TableCell align="center" sx={{ color: "#475467" }}>
                      {row.shift}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

      </Grid>
    </Box>
  );
}