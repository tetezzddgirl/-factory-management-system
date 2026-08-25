import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

interface MachineStatus {
  id: number;
  name: string;
  status: "normal" | "maintenance" | "stopped";
  operator: string;
  shift: string;
}

const machineList: MachineStatus[] = [
  { id: 1, name: "เครื่องจักร1", status: "normal", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 2, name: "เครื่องจักร1", status: "maintenance", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 3, name: "เครื่องจักร1", status: "stopped", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 4, name: "เครื่องจักร1", status: "normal", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 5, name: "เครื่องจักร1", status: "normal", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
];

export default function ProductionDetails() {
  const getStatusChip = (status: MachineStatus["status"]) => {
    switch (status) {
      case "normal":
        return <Chip label="ปกติ" sx={{ bgcolor: "#00E200", color: "#fff", fontWeight: "bold", minWidth: 80 }} size="small" />;
      case "maintenance":
        return <Chip label="กำลังซ่อม" sx={{ bgcolor: "#FAD800", color: "#333", fontWeight: "bold", minWidth: 80 }} size="small" />;
      case "stopped":
        return <Chip label="หยุด" sx={{ bgcolor: "#ff5252", color: "#fff", fontWeight: "bold", minWidth: 80 }} size="small" />;
    }
  };

  return (
    <Box sx={{ p: 2, bgcolor: "#f4f7fe", width: "100%" }}>
      <Grid container spacing={2.5}>
        {/* ฝั่งซ้าย: Cards (ขนาด 4 ส่วน) */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            <Card sx={{ borderRadius: 1.5, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: "#1b2559" }}>
                  ข้อมูลภาพรวมใบสั่งผลิต
                </Typography>
                <Stack spacing={0.8} sx={{ color: "#475467" }}>
                  <Typography variant="body2"><strong>ชื่อสินค้า :</strong> ขวด PET 500ml</Typography>
                  <Typography variant="body2"><strong>รหัสใบสั่งผลิต :</strong> (JOB-2451)</Typography>
                  <Typography variant="body2"><strong>วันที่/เวลาที่เริ่มผลิต :</strong> 23 ก.ค. 2026 | 08:00 น.</Typography>
                  <Typography variant="body2"><strong>เวลาที่คาดว่าจะเสร็จสิ้น :</strong> 23 ก.ค. 2026 | 17:30 น.</Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 1.5, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: "#1b2559" }}>
                  รายละเอียดวัตถุดิบที่ใช้
                </Typography>
                <Stack spacing={0.8} sx={{ color: "#475467" }}>
                  <Typography variant="body2"><strong>รายการวัตถุดิบหลัก :</strong> เม็ดพลาสติก PET เกรด A</Typography>
                  <Typography variant="body2"><strong>ล็อตวัตถุดิบ (Lot Number) :</strong> LOT-690723</Typography>
                  <Typography variant="body2"><strong>ปริมาณที่ใช้ไป / ปริมาณที่เบิกมา :</strong> 80 กก. / 100 กก.</Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 1.5, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: "#1b2559" }}>
                  สถานะและตัววัดประสิทธิภาพการผลิต
                </Typography>
                <Stack spacing={0.8} sx={{ color: "#475467" }}>
                  <Typography variant="body2"><strong>เป้าหมายการผลิต :</strong> 5,000 ชิ้น</Typography>
                  <Typography variant="body2"><strong>จำนวนที่ผลิตได้แล้ว :</strong> 3,900 ชิ้น (78%)</Typography>
                  <Typography variant="body2"><strong>จำนวนของดี :</strong> 3,850 ชิ้น</Typography>
                  <Typography variant="body2"><strong>จำนวนของเสีย :</strong> 50 ชิ้น (1.28%)</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* ฝั่งขวา: ตารางเครื่องจักร (ขนาด 8 ส่วน) */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <TableContainer component={Paper} sx={{ borderRadius: 1.5, boxShadow: "0 2px 12px rgba(0,0,0,0.04)", overflowX: "auto" }}>
            <Table sx={{ minWidth: 600 }}>
              <TableHead sx={{ bgcolor: "#fafafa" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: "#475467", whiteSpace: "nowrap" }}>เครื่องจักร</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: "#475467", whiteSpace: "nowrap" }}>สถานะเครื่องจักร</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: "#475467", whiteSpace: "nowrap" }}>ผู้ควบคุมเครื่อง</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: "#475467", whiteSpace: "nowrap" }}>กะการทำงาน</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {machineList.map((row) => (
                  <TableRow key={row.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 600, color: "#1b2559", whiteSpace: "nowrap" }}>{row.name}</TableCell>
                    <TableCell align="center">{getStatusChip(row.status)}</TableCell>
                    <TableCell align="center" sx={{ color: "#475467", whiteSpace: "nowrap" }}>{row.operator}</TableCell>
                    <TableCell align="center" sx={{ color: "#475467", whiteSpace: "nowrap" }}>{row.shift}</TableCell>
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