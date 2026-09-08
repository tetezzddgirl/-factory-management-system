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
  Divider,
  CircularProgress,
} from "@mui/material";

export interface StatusHistory {
  historyId: string;
  previousStatus: string;
  newStatus: string;
  changedDateTime: string;
  reason: string;
  changedBy: string;
}

interface ProductionStatusHistoryProps {
  orderId: string;
  orderName?: string;
  onClose?: () => void;
}

export default function ProductionStatusHistory({
  orderId,
  orderName,
  onClose,
}: ProductionStatusHistoryProps) {
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!orderId) return;
      setLoadingHistory(true);
      try {
        const token =
          localStorage.getItem("ff:token") ||
          localStorage.getItem("auth_token") ||
          localStorage.getItem("token");

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

  const getStatusDisplay = (status: string) => {
    const label = status || "รอมอบหมาย";

    switch (status) {
      case "กำลังผลิต":
        return { label, bgcolor: "#10B981" };
      case "หยุดชั่วคราว":
        return { label, bgcolor: "#F59E0B" };
      case "เสร็จสิ้น":
        return { label, bgcolor: "#4A90E2" };
      case "ยกเลิก":
        return { label, bgcolor: "#EF4444" };
      default:
        return { label: "รอมอบหมาย", bgcolor: "#A4ABB6" };
    }
  };

  return (
    <Box sx={{ width: "100%", p: 0 }}>
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1b2559" }}>
          ประวัติการเปลี่ยนสถานะการผลิต
        </Typography>
        <Typography variant="body2" sx={{ color: "#475467", mt: 0.5 }}>
          {orderName ? `${orderName} • ` : ""}{orderId}
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ p: 3 }}>
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 1.5,
            border: "1px solid #e0e6ed",
            boxShadow: "none",
            maxHeight: 350,
            overflowY: "auto",
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 600, color: "#475467", bgcolor: "#fafafa" }}>
                  สถานะ
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
                  <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ color: "#94a3b8", py: 4 }}>
                    ไม่มีประวัติการเปลี่ยนสถานะ
                  </TableCell>
                </TableRow>
              ) : (
                history.map((row) => {
                  const statusInfo = getStatusDisplay(row.newStatus);
                  return (
                    <TableRow key={row.historyId}>
                      <TableCell align="center">
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          sx={{
                            bgcolor: statusInfo.bgcolor,
                            color: "#fff",
                            fontWeight: "bold",
                            minWidth: 90,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ color: "#334155" }}>
                        {row.changedBy || "-"}
                      </TableCell>
                      <TableCell align="center" sx={{ color: "#334155" }}>
                        {row.changedDateTime
                          ? new Date(row.changedDateTime).toLocaleString("th-TH")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {onClose && (
        <>
          <Divider />
          <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", bgcolor: "#fafafa" }}>
            <Button onClick={onClose} variant="contained">
              ปิดหน้าต่าง
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}