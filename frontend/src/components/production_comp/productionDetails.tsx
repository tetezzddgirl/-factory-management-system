import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Alert,
} from "@mui/material";
import {
  Inventory as InventoryIcon,
  CalendarToday as CalendarIcon,
  PrecisionManufacturing as MachineIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";

export interface ProductionOrder {
  timestamp: string;
  orderID: string;
  name: string;
  status: string;
  amount: number;
  machines: string;
  startDate: string;
  endDate: string;
  planID: string;
  refFormulaID: string;
}

interface ProductionDetailsProps {
  orderID: string;
  orderName?: string;
}

export default function ProductionDetails({ orderID, orderName }: ProductionDetailsProps) {
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderID) return;
      setLoading(true);
      try {
        const token =
          localStorage.getItem("ff:token") ||
          localStorage.getItem("auth_token") ||
          localStorage.getItem("token") ||
          "";

        const res = await fetch(`http://localhost:8090/api/production/orders/${orderID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("ไม่สามารถโหลดรายละเอียดคำสั่งผลิตได้");
        const data = await res.json();
        setOrder(data);
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderID]);

  const getStatusChip = (status?: string) => {
    switch (status) {
      case "กำลังผลิต":
        return <Chip label="กำลังผลิต" sx={{ bgcolor: "#10B981", color: "#fff", fontWeight: 700 }} size="small" />;
      case "หยุดชั่วคราว":
        return <Chip label="หยุดชั่วคราว" sx={{ bgcolor: "#F59E0B", color: "#fff", fontWeight: 700 }} size="small" />;
      case "เสร็จสิ้น":
        return <Chip label="เสร็จสิ้น" sx={{ bgcolor: "#4A90E2", color: "#fff", fontWeight: 700 }} size="small" />;
      case "ยกเลิก":
        return <Chip label="ยกเลิก" sx={{ bgcolor: "#EF4444", color: "#fff", fontWeight: 700 }} size="small" />;
      default:
        return <Chip label={status || "รอมอบหมาย"} sx={{ bgcolor: "#A4ABB6", color: "#fff", fontWeight: 700 }} size="small" />;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || "ไม่พบข้อมูลรายการผลิต"}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", p: 0 }}>
      <Grid container spacing={2.5}>
        {/* Box 2: รายละเอียดสินค้าและจำนวน */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 2.5, height: "100%", borderRadius: 2, border: "1px solid #e2e8f0" }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
              <InventoryIcon sx={{ color: "#4A90E2" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b" }}>
                ข้อมูลสินค้า & จำนวน
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">ชื่อสินค้า</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.name || orderName}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">จำนวนเป้าหมาย</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.amount?.toLocaleString()} ชิ้น</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">เวลาบันทึกเข้าระบบ</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(order.timestamp)}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Box 3: แผนงานและเอกสารอ้างอิง */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 2.5, height: "100%", borderRadius: 2, border: "1px solid #e2e8f0" }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
              <DescriptionIcon sx={{ color: "#4A90E2" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b" }}>
                แผนงานและสูตรการผลิต
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">รหัสแผนการผลิต (Plan ID)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.planID || "-"}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">รหัสสูตรอ้างอิง (Formula ID)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.refFormulaID || "-"}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Box 4: เครื่องจักรและสายการผลิต */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 2.5, height: "100%", borderRadius: 2, border: "1px solid #e2e8f0" }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
              <MachineIcon sx={{ color: "#4A90E2" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b" }}>
                เครื่องจักร / สายการผลิต
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">เครื่องจักรที่ได้รับมอบหมาย</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.machines || "-"}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Box 5: ช่วงเวลาการผลิต */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 2.5, height: "100%", borderRadius: 2, border: "1px solid #e2e8f0" }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
              <CalendarIcon sx={{ color: "#4A90E2" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b" }}>
                กำหนดการดำเนินงาน
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">วันที่เริ่มผลิต</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(order.startDate)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">กำหนดแล้วเสร็จ</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(order.endDate)}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}