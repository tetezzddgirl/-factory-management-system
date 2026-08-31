import React from "react";
import {
  Box,
  Button,
  Typography,
  Stack,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from "@mui/material";
import { QcPointItem } from "./qualityQcPoint";

// ✅ แก้ไขฟิลด์ให้ตรงกับ Struct `InspectItemResponse` จาก Golang
export interface InspectItemDetail {
  requirementID?: string;
  parameterId?: string;
  name: string;
  spec: string;
  unit: string;
}

export interface QcPointDetailData extends QcPointItem {
  description?: string;
  inspectItems?: InspectItemDetail[];
  createdAt?: string; // ถ้า Backend ส่งกลับมาเป็น string date
}

interface QualityQcPointDetailProps {
  pointData: QcPointDetailData | null;
  orderName?: string;
  onClose: () => void;
}

export default function QualityQcPointDetails({
  pointData,
  orderName,
  onClose,
}: QualityQcPointDetailProps) {
  if (!pointData) return null;

  return (
    <>
      <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
        รายละเอียดจุดตรวจคุณภาพ
      </DialogTitle>
      <Divider />

      <DialogContent>
        {/* ข้อมูลคำสั่งผลิต */}
        <Box sx={{ mb: 3, p: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2 }}>
          <Stack direction="column" spacing={0.75}>
            <Typography sx={{ fontSize: "1rem", color: "text.secondary" }}>
              คำสั่งผลิต:{" "}
              <Box component="span" sx={{ fontWeight: 600, color: "#1e293b" }}>
                {orderName || "ไม่ระบุชื่อ"}
              </Box>
            </Typography>
            <Typography sx={{ fontSize: "1rem", color: "text.secondary" }}>
              ID:{" "}
              <Box component="span" sx={{ fontWeight: 600, color: "#1e293b" }}>
                {pointData.orderID || "-"}
              </Box>
            </Typography>
          </Stack>
        </Box>

        <Stack spacing={2.5}>
          {/* ข้อมูลทั่วไปของจุดตรวจ */}
          <Box 
            sx={{ 
              display: "flex", 
              flexDirection: { xs: "column", sm: "row" }, 
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 1
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                ชื่อจุดตรวจ
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
                {pointData.pointName}
              </Typography>
            </Box>
            <Chip 
              label={pointData.status || "Active"} 
              color={pointData.status === "Inactive" ? "default" : "success"} 
              size="small" 
            />
          </Box>

          <Divider />

          {/* รายการสิ่งที่ต้องตรวจ */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "#1e293b" }}>
              รายการสิ่งที่ต้องตรวจ ({pointData.inspectItems?.length || pointData.itemsToInspect || 0} รายการ)
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: "10%" }}>ลำดับ</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: "40%" }}>สิ่งที่ต้องตรวจ</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: "30%" }}>ข้อกำหนด (Spec)</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: "20%" }}>หน่วย</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pointData.inspectItems && pointData.inspectItems.length > 0 ? (
                    pointData.inspectItems.map((item, idx) => (
                      // ✅ เปลี่ยน key จาก item.id เป็น item.requirementID
                      <TableRow key={item.requirementID || idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                        <TableCell>{item.spec}</TableCell>
                        <TableCell>{item.unit || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 2, color: "text.secondary" }}>
                        ไม่มีรายการย่อย หรือตรวจตามมาตรฐานทั่วไป
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* รายละเอียดเพิ่มเติม */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              รายละเอียดเพิ่มเติม / คำอธิบาย
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: "#fafafa" }}>
              <Typography variant="body2" sx={{ color: pointData.description ? "#334155" : "text.secondary", whiteSpace: "pre-wrap" }}>
                {pointData.description || "ไม่มีรายละเอียดเพิ่มเติม"}
              </Typography>
            </Paper>
          </Box>

          {/* สถิติใบตรวจ */}
          <Box sx={{ display: "flex", gap: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                จำนวนใบตรวจทั้งหมด
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {pointData.inspectionSheets || 0} ใบ
              </Typography>
            </Box>
            {pointData.createdAt && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  วันที่สร้าง
                </Typography>
                <Typography variant="body2">
                  {new Date(pointData.createdAt).toLocaleString("th-TH")}
                </Typography>
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: "#4a90e2", "&:hover": { bgcolor: "#357abd" } }}>
          ปิดหน้าต่าง
        </Button>
      </DialogActions>
    </>
  );
}