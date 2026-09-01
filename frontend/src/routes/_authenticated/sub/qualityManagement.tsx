import { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  Box, Typography, Chip, LinearProgress, Stack, 
  Avatar, Tabs, Tab, CircularProgress, Alert
} from "@mui/material";
import { VerifiedUser, Person, Settings as CogIcon } from "@mui/icons-material";
import { PageShell } from "@/components/page-shell";
import QualityQcPoint from "@/components/quality_comp/qualityQcPoint";
import QualityQc from "@/components/quality_comp/qualityQc";

interface ProductionReport {
  reportId?: string;
  goodQuantity?: number;
  actualQuantity?: number;
  scrapQuantity?: number;
}

interface ProductionOrder {
  orderID: string;
  timestamp: string;
  name: string;
  status:
    | "success"   // เสร็จสิ้น
    | "info"      // กำลังผลิต
    | "default"   // รอมอบหมาย
    | "warning"   // หยุดชั่วคราว
    | "error";    // error  
  amount: number;
  machines: string;
  startDate: string;
  endDate: string;
  report?: ProductionReport;
}

type QualityManagementSearch = {
  id: string;
};

export const Route = createFileRoute('/_authenticated/sub/qualityManagement')({
  validateSearch: (search: Record<string, unknown>): QualityManagementSearch => {
    return {
      id: (search.id as string) || "",
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id: orderID } = Route.useSearch() as QualityManagementSearch;

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const fetchOrderDetails = useCallback(async (isSilent = false) => {
    if (!orderID) return;
    try {
      if (!isSilent) setLoading(true);
      const token = localStorage.getItem("ff:token") || localStorage.getItem("auth_token") || localStorage.getItem("token");

      const res = await fetch(`http://localhost:8090/api/production/orders/${orderID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("ดึงข้อมูลรายละเอียดงานผลิตไม่สำเร็จ");
      const data = await res.json();
      setOrder(data);
      setError(null);
    } catch (err: any) {
      if (!isSilent) setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [orderID]);

  useEffect(() => {
    if (orderID) {
      fetchOrderDetails(false);
      const interval = setInterval(() => {
        fetchOrderDetails(true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [orderID, fetchOrderDetails]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusChipProps = (status: string) => {
    switch (status) {
      case "info": 
        return { label: "กำลังผลิต", sx: { bgcolor: "#10B981", color: "#fff", fontWeight: "bold", minWidth: 80 } };
      case "warning": 
        return { label: "หยุดชั่วคราว", sx: { bgcolor: "#F59E0B", color: "#fff", fontWeight: "bold", minWidth: 80 } };
      case "success": 
        return { label: "เสร็จสิ้น", sx: { bgcolor: "#4A90E2", color: "#fff", fontWeight: "bold", minWidth: 80 } };
      case "error":
        return { label: "ยกเลิก", sx: { bgcolor: "#EF4444", color: "#fff", fontWeight: "bold", minWidth: 80 } };
      default:
        return { label: "รอมอบหมาย", sx: { bgcolor: "#A4ABB6", color: "#fff", fontWeight: "bold", minWidth: 80 } };
    }
  };

  if (loading) {
    return (
      <PageShell title="จัดการควบคุมคุณภาพ" description="" icon={<VerifiedUser />}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  }

  if (error || !order) {
    return (
      <PageShell title="จัดการควบคุมคุณภาพ" description="" icon={<VerifiedUser />}>
        <Alert severity="error">{error || "ไม่พบข้อมูลคำสั่งผลิต"}</Alert>
      </PageShell>
    );
  }

  const done = order.report?.goodQuantity || 0;
  const target = order.amount || 1;
  const progressPct = Math.min(100, Math.round((done / target) * 100));
  const chipProps = getStatusChipProps(order.status);

  return (
    <PageShell title="" description="">
      <Box sx={{ p: 2 }}>

        <Box 
          sx={{ 
            mt: -6, 
            mb: 2, 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 4, 
            alignItems: { xs: 'flex-start', md: 'center' } 
          }}
        >
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <Avatar sx={{ bgcolor: '#E3F2FD', width: 52, height: 52 }}> 
              <VerifiedUser sx={{ color: 'primary.main', fontSize: 28 }} /> 
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {order.name}
                </Typography> 
                <Chip 
                  label={chipProps.label} 
                  sx={chipProps.sx} 
                  size="small" 
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {order.orderID}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">ความคืบหน้า</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {done.toLocaleString()} / {target.toLocaleString()}{" "}
                <Box component="span" sx={{ color: 'primary.main' }}>({progressPct}%)</Box>
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progressPct} sx={{ height: 8, borderRadius: 4, mb: 1.5 }} />
            
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">Operator</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CogIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">{order.machines || "-"}</Typography>
              </Box>
            </Box>
          </Box>

        </Box>

        <Box sx={{ mb: -1, borderBottom: 1, borderColor: 'divider', mt: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="quality management tabs">
            <Tab label="รายละเอียด" sx={{ fontWeight: tabValue === 0 ? 'bold' : 'normal' }} />
            <Tab label="จุดตรวจ" sx={{ fontWeight: tabValue === 1 ? 'bold' : 'normal' }} />
            <Tab label="ผลตรวจ" sx={{ fontWeight: tabValue === 2 ? 'bold' : 'normal' }} />
          </Tabs>
        </Box>

        <Box sx={{ pt: 3 }}>
          {tabValue === 0 && (
            <Box>
              <Typography variant="body1" color="text.secondary">
                รายละเอียดคำสั่งผลิต: {order.name} (ID: {order.orderID})
              </Typography>
            </Box>
          )}
        {tabValue === 1 && (
          <QualityQcPoint 
            orderID={order.orderID} 
            orderName={order.name} 
          />
        )}
          {tabValue === 2 && (
            <QualityQc 
            orderID={order.orderID} 
            orderName={order.name} 
          />
          )}
        </Box>
      </Box>
    </PageShell>
  );
}