import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Divider,
  Dialog,
  CircularProgress,
} from "@mui/material";

// --- Types ---
export interface StatusHistory {
  historyId: string;
  previousStatus: string;
  newStatus: string;
  changedDateTime: string;
  reason: string;
  changedBy: string;
}

interface ProductionStatusProps {
  orderId: string;
  orderName: string;
  initialStatus?: string;
  onSave: (newStatus: string) => void;
  onCancel: () => void;
}

export default function ProductionStatus({
  orderId,
  orderName,
  initialStatus = "InProgress",
  onSave,
  onCancel,
}: ProductionStatusProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ดึงประวัติจาก Backend (จาก ProductionOrder)
  useEffect(() => {
    const fetchHistory = async () => {
      if (!orderId) return;
      setLoadingHistory(true);
      try {
        const token = localStorage.getItem("ff:token") || localStorage.getItem("auth_token") || localStorage.getItem("token");
        const res = await fetch(`http://localhost:8090/api/production/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          // ดึงเฉพาะ array statusHistory มาแสดง ย้อนลำดับให้ล่าสุดอยู่บน
          const histories = data.statusHistory || [];
          setHistory(histories.reverse());
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [orderId]);

  // Map รหัสสถานะ (English) เป็น ข้อความ/สี (Thai)
  const getStatusDisplay = (status: string, isActive: boolean = true) => {
    if (!isActive) return { label: status, bgcolor: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1" };

    switch (status) {
      case "InProgress":
        return { label: "กำลังผลิต", bgcolor: "#10B981", color: "#fff", border: "1px solid #10B981" };
      case "Paused":
        return { label: "หยุดชั่วคราว", bgcolor: "#F59E0B", color: "#fff", border: "1px solid #F59E0B" };
      case "Completed":
        return { label: "เสร็จสิ้น", bgcolor: "#4A90E2", color: "#fff", border: "1px solid #4A90E2" };
      case "Cancelled":
        return { label: "ยกเลิก", bgcolor: "#EF4444", color: "#fff", border: "1px solid #EF4444" };
      default:
        return { label: status, bgcolor: "#A4ABB6", color: "#fff", border: "1px solid #A4ABB6" };
    }
  };

  // ตัวเลือกสถานะที่กดได้ (ข้าม Cancelled ไปก่อน หรือใส่เพิ่มได้ถ้าต้องการ)
  const availableStatuses = ["InProgress", "Paused", "Completed"];

  return (
    <Box sx={{ width: "100%", p: 0 }}>
      {/* ส่วนหัว */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1b2559" }}>
          แก้ไขสถานะการผลิต
        </Typography>
        <Typography variant="body2" sx={{ color: "#475467", mt: 0.5 }}>
          {orderName} • {orderId}
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ p: 3 }}>
        {/* กลุ่มปุ่มเลือกสถานะ */}
        <Stack direction="row" spacing={2} sx={{ mb: 4, justifyContent: "center" }}>
          {availableStatuses.map((statusKey) => {
            const isSelected = selectedStatus === statusKey;
            const display = getStatusDisplay(statusKey, isSelected);

            return (
              <Button
                key={statusKey}
                onClick={() => setSelectedStatus(statusKey)}
                disableElevation
                sx={{
                  flex: 1,
                  maxWidth: 180,
                  py: 1.5,
                  borderRadius: 1.5,
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  bgcolor: display.bgcolor,
                  color: display.color,
                  border: display.border,
                  "&:hover": {
                    bgcolor: isSelected ? display.bgcolor : "#e2e8f0",
                  },
                }}
              >
                {display.label}
              </Button>
            );
          })}
        </Stack>

        {/* ตารางประวัติการเปลี่ยนสถานะ */}
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 3,
            border: "1px solid #e0e6ed",
            boxShadow: "none",
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 600, color: "#475467", bgcolor: "#fafafa" }}>
                  ประวัติการเปลี่ยนสถานะ
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: "#475467", bgcolor: "#fafafa" }}>
                  ผู้ดำเนินการ
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: "#475467", bgcolor: "#fafafa" }}>
                  วันเวลา
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingHistory ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ color: "#94a3b8", py: 3 }}>
                    ไม่มีประวัติการเปลี่ยนสถานะ
                  </TableCell>
                </TableRow>
              ) : (
                history.map((row) => (
                  <TableRow key={row.historyId}>
                    <TableCell align="center">
                      <Chip
                        label={getStatusDisplay(row.newStatus, true).label}
                        size="small"
                        sx={{
                          bgcolor: getStatusDisplay(row.newStatus, true).bgcolor,
                          color: "#fff",
                          fontWeight: "bold",
                          minWidth: 100,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ color: "#334155" }}>
                      {row.changedBy}
                    </TableCell>
                    <TableCell align="center" sx={{ color: "#334155" }}>
                      {new Date(row.changedDateTime).toLocaleString("th-TH")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Divider />

      {/* ส่วนปุ่มกดยืนยันด้านล่าง */}
      <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", gap: 2, bgcolor: "#fafafa" }}>
        <Button onClick={onCancel} sx={{ fontWeight: 600, color: "#4a90e2", textTransform: "none" }}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={() => setConfirmOpen(true)}
          disabled={selectedStatus === initialStatus} // ป้องกันการกดบันทึกถ้าไม่ได้เปลี่ยนสถานะ
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
          คุณต้องการเปลี่ยนสถานะเป็น "{getStatusDisplay(selectedStatus, true).label}" ใช่หรือไม่?
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
              setConfirmOpen(false);
              onSave(selectedStatus);
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