import { useState, useEffect, useCallback } from 'react';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { 
  Box, Typography, Button, Chip, LinearProgress, Stack, Grid, 
  Avatar, Tabs, Tab, Dialog, CircularProgress, Alert, DialogContent,
} from '@mui/material';
import { Factory, Person, Settings as CogIcon } from '@mui/icons-material';
import { PageShell } from "@/components/page-shell";

import ProductionDetails from "@/components/production_comp/productionDetails";
import ProductionFix from "@/components/production_comp/productionFix";
import ProductionEven from "@/components/production_comp/productionEven";
import ProductionReport from "@/components/production_comp/productionReport";
import ProductionStatus from "@/components/production_comp/productionStatus";
import ProductionWip from "@/components/production_comp/productionWip";
import ProductionFg from "@/components/production_comp/productionFg";
import { RequisitionForm } from "@/components/production_comp/requisitionForm";

import { RequisitionDialog } from "@/components/requisition-dialog";

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
    | "กำลังผลิต"
    | "หยุดชั่วคราว"
    | "เสร็จสิ้น"
    | "ยกเลิก"
    | "รอมอบหมาย";
  amount: number;
  machines: string;
  startDate: string;
  endDate: string;
  report?: ProductionReport;
}

type ProductionManagementSearch = {
  id: string;
};

export const Route = createFileRoute('/_authenticated/sub/productionManagement')({
  validateSearch: (search: Record<string, unknown>): ProductionManagementSearch => {
    return {
      id: (search.id as string) || "",
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id: orderID } = useSearch({ from: '/_authenticated/sub/productionManagement' });

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openReqDialog, setOpenReqDialog] = useState(false); // 👈 เพิ่ม State คุม Dialog ขอเบิก

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

  const handleSaveStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem("ff:token") || localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch(`http://localhost:8090/api/production/orders/${orderID}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          reason: `Updated to ${newStatus} via Management UI`,
          changedBy: "Operator",
        }),
      });

      if (!res.ok) throw new Error("อัปเดตสถานะไม่สำเร็จ");
      
      setOrder((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      setOpenStatusDialog(false); 
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusChipProps = (status: string) => {
    switch (status) {
      case "กำลังผลิต": 
        return { label: "กำลังผลิต", sx: { bgcolor: "#10B981", color: "#fff", fontWeight: "bold", minWidth: 80 } };
      case "หยุดชั่วคราว": 
        return { label: "หยุดชั่วคราว", sx: { bgcolor: "#F59E0B", color: "#fff", fontWeight: "bold", minWidth: 80 } };
      case "เสร็จสิ้น": 
        return { label: "เสร็จสิ้น", sx: { bgcolor: "#4A90E2", color: "#fff", fontWeight: "bold", minWidth: 80 } };
      case "ยกเลิก":
        return { label: "ยกเลิก", sx: { bgcolor: "#EF4444", color: "#fff", fontWeight: "bold", minWidth: 80 } };
      default:
        return { label: "รอมอบหมาย", sx: { bgcolor: "#A4ABB6", color: "#fff", fontWeight: "bold", minWidth: 80 } };
    }
  };

  if (loading) {
    return (
      <PageShell title="จัดการผลิต" description="" icon={<Factory />}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PageShell>
    );
  }

  if (error || !order) {
    return (
      <PageShell title="จัดการผลิต" description="" icon={<Factory />}>
        <Alert severity="error">{error || "ไม่พบข้อมูลคำสั่งผลิต"}</Alert>
      </PageShell>
    );
  }

  const done = 0;
  const target = order.amount || 1;
  const progressPct = Math.min(100, Math.round((done / target) * 100));

  const chipProps = getStatusChipProps(order.status);

  return (
    <PageShell title="" description="">
      <Box sx={{ p: 2 }}>
        
        <Grid container spacing={3} sx={{ mt: -6, mb: 1, alignItems: 'flex-start' }}>
          
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={2}> 
              
              <Stack direction="row" spacing={2}>
                <Avatar sx={{ bgcolor: '#E3F2FD', width: 48, height: 48 }}> 
                  <Factory sx={{ color: 'primary.main', fontSize: 24 }} /> 
                </Avatar>
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Stack direction="row" spacing={2} sx={{ mb: 0.5, alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {order.name}
                    </Typography> 
                    <Chip 
                      label={chipProps.label} 
                      sx={chipProps.sx}
                      size="small" 
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {order.orderID}
                  </Typography>
                </Box>
              </Stack>

              <Box>
                <Stack direction="row" sx={{ mb: 1, justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">ความคืบหน้า</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {done.toLocaleString()} / {target.toLocaleString()} <Box component="span" sx={{ color: 'primary.main' }}>({progressPct}%)</Box>
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={progressPct} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
                
                <Stack direction="row" spacing={3}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Person fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">Operator</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <CogIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">{order.machines || "-"}</Typography>
                  </Stack>
                </Stack>
              </Box>

            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  color="primary" 
                  onClick={() => setOpenStatusDialog(true)}
                >
                  แก้ไขสถานะ
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}><Button fullWidth variant="contained" color="primary">แจ้งเสีย</Button></Grid>
              <Grid size={{ xs: 6 }}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  color="primary" 
                  onClick={() => setOpenReqDialog(true)}
                >
                  ขอเบิก
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}><Button fullWidth variant="contained" color="primary">แจ้งปัญหา</Button></Grid>
            </Grid>
          </Grid>

        </Grid>

        <Box sx={{ mb: -1, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="production detail tabs">
            <Tab label="รายละเอียด" sx={{ fontWeight: tabValue === 0 ? 'bold' : 'normal' }} />
            <Tab label="แก้ไขข้อบกพร่อง" sx={{ fontWeight: tabValue === 1 ? 'bold' : 'normal' }} />
            <Tab label="บันทึกเหตุการณ์" sx={{ fontWeight: tabValue === 2 ? 'bold' : 'normal' }} />
            <Tab label="บันทึกผล" sx={{ fontWeight: tabValue === 3 ? 'bold' : 'normal' }} />
            <Tab label="WIP" sx={{ fontWeight: tabValue === 4 ? 'bold' : 'normal' }} />
            <Tab label="สินค้าสำเร็จรูป" sx={{ fontWeight: tabValue === 5 ? 'bold' : 'normal' }} />
          </Tabs>
        </Box>

        <Box sx={{ pt: 3 }}>
          {tabValue === 0 && (
            <ProductionDetails 
              orderID={order.orderID} 
            />
          )}
          {tabValue === 1 && (
          <ProductionFix 
              orderID={order.orderID} 
              orderName={order.name} 
            />
          )}
          {tabValue === 2 && (
            <ProductionEven 
              orderID={order.orderID} 
              orderName={order.name} 
            />
          )}
          {tabValue === 3 && (
            <ProductionReport 
              orderID={order.orderID}
              orderName={order.name}
            />
          )}
          {tabValue === 4 && (
            <ProductionWip 
              orderID={order.orderID}
              orderName={order.name}
            />
          )}
          {tabValue === 5 && (
            <ProductionFg 
              orderID={order.orderID}
              orderName={order.name}
            />
          )}
        </Box>

      </Box>

      {/* Dialog แก้ไขสถานะ */}
      <Dialog
        open={openStatusDialog}
        onClose={() => setOpenStatusDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
      >
        <ProductionStatus
          orderId={order.orderID}
          orderName={order.name}
          initialStatus={order.status}
          onSave={handleSaveStatus}
          onCancel={() => setOpenStatusDialog(false)}
        />
      </Dialog>

      <Dialog
        open={openReqDialog}
        onClose={() => setOpenReqDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
      >
        <DialogContent sx={{ p: 0 }}>
          {order && (
            <RequisitionForm 
              orderID={order.orderID} 
              orderName={order.name} 
              onCancel={() => setOpenReqDialog(false)}
              onCreated={() => setOpenReqDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

    </PageShell>
  );
}