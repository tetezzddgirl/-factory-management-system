import React from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack
} from "@mui/material";

interface ProductionFixFormDetailsProps {
  inspection: any;
  items: any[];
}

export default function ProductionFixFormDetails({ inspection, items }: ProductionFixFormDetailsProps) {
  const renderStatusChip = (status: string) => {
    if (status === "Pending" || status === "PendingCorrection") {
      return <Chip label="รอแก้ไข" size="small" sx={{ bgcolor: "#F59E0B", color: "#fff", fontWeight: 600 }} />;
    }
    if (status === "Pass" || status === "Completed") {
      return <Chip label="แก้ไขเสร็จสิ้น" size="small" sx={{ bgcolor: "#10B981", color: "#fff", fontWeight: 600 }} />;
    }
    if (status === "Fail") {
      return <Chip label="ไม่ผ่าน" size="small" sx={{ bgcolor: "#EF4444", color: "#fff", fontWeight: 600 }} />;
    }
    return <Chip label={status || "-"} size="small" />;
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography sx={{ fontWeight: 600, color: "#1e293b", mb: 1.5 }}>
          ข้อมูลทั่วไป
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: "#fff" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              รหัสจุดตรวจ:{" "}
              <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>
                {inspection.inspectionPointID}
              </Box>
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              วันเวลาที่ตรวจ:{" "}
              <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>
                {new Date(inspection.inspectionDateTime).toLocaleString("th-TH")}
              </Box>
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              ผู้ตรวจ:{" "}
              <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>
                {inspection.inspectedBy}
              </Box>
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 1 }}>
              สถานะ: {renderStatusChip(inspection.status)}
            </Typography>

            <Typography variant="body2" sx={{ gridColumn: { xs: "span 1", sm: "span 2" }, color: "text.secondary" }}>
              ผลประเมินภาพรวม:{" "}
              <Box component="span" sx={{ color: inspection.overallResult === "Pass" ? "#10B981" : "#EF4444", fontWeight: 700 }}>
                {inspection.overallResult === "Pass" ? "ผ่าน (Pass)" : "ไม่ผ่าน (Fail)"}
              </Box>
            </Typography>

            {inspection.overallResult === "Fail" && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                แนวทางการแก้ไข (เบื้องต้น):{" "}
                <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>
                  {inspection.actionGuideline || "-"}
                </Box>
              </Typography>
            )}

            <Typography variant="body2" sx={{ gridColumn: { xs: "span 1", sm: "span 2" }, color: "text.secondary" }}>
              หมายเหตุ:{" "}
              <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>
                {inspection.remark || "-"}
              </Box>
            </Typography>
          </Box>
        </Paper>
      </Box>

      <Box>
        <Typography sx={{ fontWeight: 600, color: "#1e293b", mb: 1.5 }}>
          รายการตรวจสอบ ({items.length} รายการ)
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: "30%" }}>รหัสข้อกำหนด</TableCell>
                <TableCell sx={{ fontWeight: 600, width: "25%" }}>ค่าที่วัดได้</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: "15%" }}>ผล</TableCell>
                <TableCell sx={{ fontWeight: 600, width: "30%" }}>หมายเหตุ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.itemID}>
                    <TableCell sx={{ color: "text.secondary" }}>{item.requirementID}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{item.actualValue || "-"}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={item.result === "Pass" ? "ผ่าน" : "ไม่ผ่าน"}
                        size="small"
                        sx={{
                          bgcolor: item.result === "Pass" ? "#d1fae5" : "#fee2e2",
                          color: item.result === "Pass" ? "#065f46" : "#991b1b",
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{item.remark || "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    ไม่มีรายการตรวจสอบย่อย
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Stack>
  );
}