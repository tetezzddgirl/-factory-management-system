import React from "react";
import {
  Box,
  Button,
  Typography,
  Stack,
  Grid,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
} from "@mui/material";

export interface TransferRecord {
  transferType: string;
  status: string;
  createDateTime: string;
  createdBy: string;
  transferDateTime?: string;
  receivedBy?: string;
  remark: string;
}

interface ProductionWipDetailProps {
  transferData: TransferRecord | null;
  paletteNumber: string;
  wipName: string;
  amount: number;
  orderID?: string;
  orderName?: string;
  onClose: () => void;
}

export default function ProductionWipDetails({
  transferData,
  paletteNumber,
  wipName,
  amount,
  orderID,
  orderName,
  onClose,
}: ProductionWipDetailProps) {
  if (!transferData) return null;

  // 👇 ปรับปรุงฟังก์ชันแสดงผลสถานะที่นี่
  const getStatusChip = (status?: string) => {
    // ถ้าสถานะเป็น Pending, รอรับ หรือไม่มีค่ามา
    if (!status || status === "Pending" || status === "รอรับ") {
      return (
        <Chip 
          label="รอรับ" 
          size="small" 
          sx={{ bgcolor: "#f59e0b", color: "#fff", fontWeight: 600, minWidth: 80 }} 
        />
      );
    } 
    // ถ้าสถานะเป็น Received, รับแล้ว หรือ Completed
    else if (status === "Received" || status === "รับแล้ว" || status === "Completed") {
      return (
        <Chip 
          label="รับแล้ว" 
          size="small" 
          sx={{ bgcolor: "#10b981", color: "#fff", fontWeight: 600, minWidth: 80 }} 
        />
      );
    } 
    // กรณีสถานะอื่นๆ ที่เราไม่ได้คาดคิด
    else {
      return (
        <Chip 
          label={status} 
          size="small" 
          sx={{ bgcolor: "#A4ABB6", color: "#fff", fontWeight: 600, minWidth: 80 }} 
        />
      );
    }
  };

  const isValidDate = (dateString?: string) => {
    if (!dateString) return false;
    return !dateString.startsWith("0001-01-01");
  };

  return (
    <Box>
      <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
        รายละเอียดการโอนย้าย WIP
      </DialogTitle>
      <Divider />

      <DialogContent>
        {/* --- ส่วนแสดงรายละเอียด Order --- */}
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
                {orderID || "-"}
              </Box>
            </Typography>
          </Stack>
        </Box>

        {/* --- ส่วนแสดงรายละเอียดการโอนย้าย --- */}
        <Grid container spacing={3}>
          {/* แถว 1: รหัสพาเลท และ ชื่อสินค้า */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">รหัสพาเลท (Palette)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {paletteNumber || "-"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">ชื่อสินค้า (WIP Name)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {wipName || "-"}
            </Typography>
          </Grid>

          {/* แถว 2: จำนวน และ สถานะ */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">จำนวน (Amount)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {amount ? amount.toLocaleString() : "0"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>สถานะ (Status)</Typography>
            {getStatusChip(transferData.status)}
          </Grid>

          {/* แถว 3: เวลาบันทึก และ ผู้บันทึก */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">เวลาที่บันทึก (Create Date)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {isValidDate(transferData.createDateTime) 
                ? new Date(transferData.createDateTime).toLocaleString("th-TH") 
                : "-"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">ผู้บันทึก (Created By)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {transferData.createdBy || "-"}
            </Typography>
          </Grid>

          {/* แถว 4: เวลาที่รับ และ ผู้รับ (Transfer Data) */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">เวลาที่รับ (Transfer Date)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {isValidDate(transferData.transferDateTime)
                ? new Date(transferData.transferDateTime!).toLocaleString("th-TH") 
                : "ยังไม่ระบุเวลา"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">ผู้รับ (Received By)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {transferData.receivedBy || "-"}
            </Typography>
          </Grid>

          {/* แถว 5: หมายเหตุ */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>หมายเหตุ (Remark)</Typography>
            <Box sx={{ p: 1.5, bgcolor: "#f1f5f9", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {transferData.remark || "ไม่มีหมายเหตุ"}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          disableElevation
          sx={{ bgcolor: "#475467", "&:hover": { bgcolor: "#344054" } }}
        >
          ปิดหน้าต่าง
        </Button>
      </DialogActions>
    </Box>
  );
}