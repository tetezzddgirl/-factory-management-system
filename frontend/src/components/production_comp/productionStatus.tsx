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
  DialogContent,
  DialogActions,
} from "@mui/material";

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
  initialStatus = "รอมอบหมาย",
  onSave,
  onCancel,
}: ProductionStatusProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Map สถานะภาษาไทย ไปเป็น สี
  const getStatusDisplay = (status: string, isActive: boolean = true) => {
    const label = status || "รอมอบหมาย";

    if (!isActive) {
      return { label, bgcolor: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1" };
    }

    switch (status) {
      case "กำลังผลิต":
        return { label, bgcolor: "#10B981", color: "#fff", border: "1px solid #10B981" };
      case "หยุดชั่วคราว":
        return { label, bgcolor: "#F59E0B", color: "#fff", border: "1px solid #F59E0B" };
      case "เสร็จสิ้น":
        return { label, bgcolor: "#4A90E2", color: "#fff", border: "1px solid #4A90E2" };
      case "ยกเลิก":
        return { label, bgcolor: "#EF4444", color: "#fff", border: "1px solid #EF4444" };
      default:
        return { label: "รอมอบหมาย", bgcolor: "#A4ABB6", color: "#fff", border: "1px solid #A4ABB6" };
    }
  };

  // เปลี่ยน Value ที่จะบันทึกลงฐานข้อมูลให้เป็นภาษาไทยตรงๆ
  const availableStatuses = ["กำลังผลิต", "หยุดชั่วคราว", "เสร็จสิ้น", "ยกเลิก"];

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

        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 1.5,
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

      <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", gap: 1, bgcolor: "#fafafa" }}>
        <Button onClick={onCancel} sx={{ width: 100, color: "#4a90e2"}}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={() => setConfirmOpen(true)}
          disabled={selectedStatus === initialStatus}
          sx={{ width: 100 }}
        >
          บันทึก
        </Button>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        sx={{ "& .MuiDialog-paper": { borderRadius: 2, p: 1 } }}
      >
        <DialogContent>
          <Typography color="text.secondary">
            คุณต้องการเปลี่ยนสถานะเป็น "{getStatusDisplay(selectedStatus, true).label}" ใช่หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmOpen(false)} 
            color="inherit" 
            sx={{ width: 100, color: "#4a90e2" }}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              onSave(selectedStatus);
            }}
            variant="contained"
            sx={{ width: 100, bgcolor: "#4a90e2", "&:hover": { bgcolor: "#357abd" } }}
          >
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}