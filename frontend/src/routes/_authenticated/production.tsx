import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Factory } from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Grid,
  Stack,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
} from "@mui/material";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/production")({
  head: () => ({ meta: [{ title: "การผลิต — FactoryFlow" }] }),
  component: ProductionPage,
});

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
    | "เสร็จสิ้น" 
    | "กำลังผลิต" 
    | "รอมอบหมาย" 
    | "หยุดชั่วคราว" 
    | "ยกเลิก"; 
  amount: number;
  machines: string;
  startDate: string;
  endDate: string;
  report?: ProductionReport;
}

function ProductionPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [fgTotals, setFgTotals] = useState<Record<string, number>>({}); // เก็บผลรวม FG ของแต่ละ OrderID
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const token =
        localStorage.getItem("ff:token") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token");

      if (!token) {
        throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบ");
      }

      const headers = { Authorization: `Bearer ${token}` };

      // ยิง API ดึง Order และ FG พร้อมกัน
      const [resOrders, resFg] = await Promise.all([
        fetch("http://localhost:8090/api/production/orders", { headers }),
        fetch("http://localhost:8090/api/production/finished-goods", { headers })
      ]);

      if (!resOrders.ok) throw new Error("ดึงข้อมูลคำสั่งผลิตไม่สำเร็จ");
      const dataOrders = await resOrders.json();
      setOrders(dataOrders || []);

      // จัดการข้อมูล FG เพื่อรวม quantity ตาม OrderID
      if (resFg.ok) {
        const dataFg = await resFg.json();
        const totals: Record<string, number> = {};
        
        (dataFg || []).forEach((fg: any) => {
          const oid = fg.orderID || fg.OrderID || fg.order_id;
          if (oid) {
            totals[oid] = (totals[oid] || 0) + (Number(fg.quantity) || 0);
          }
        });
        
        setFgTotals(totals);
      }

      setError(null);
    } catch (err: any) {
      if (!isSilent) setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(false);
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const getStatusChip = (status: ProductionOrder["status"]) => {
    switch (status) {
      case "กำลังผลิต":
        return <Chip label="กำลังผลิต" sx={{ bgcolor: "#10B981", color: "#fff", fontWeight: "bold", minWidth: 80 }} size="small" />;
      case "หยุดชั่วคราว":
        return <Chip label="หยุดชั่วคราว" sx={{ bgcolor: "#F59E0B", color: "#fff", fontWeight: "bold", minWidth: 80 }} size="small" />;
      case "เสร็จสิ้น":
        return <Chip label="เสร็จสิ้น" sx={{ bgcolor: "#4A90E2", color: "#fff", fontWeight: "bold", minWidth: 80 }} size="small" />;
      case "ยกเลิก":
        return <Chip label="ยกเลิก" sx={{ bgcolor: "#EF4444", color: "#fff", fontWeight: "bold", minWidth: 80 }} size="small" />;
      default:
        return <Chip label="รอมอบหมาย" sx={{ bgcolor: "#A4ABB6", color: "#fff", fontWeight: "bold", minWidth: 80 }} size="small" />;
    }
  };

  return (
    <PageShell
      title="การผลิต"
      description="ติดตามความคืบหน้าและเลือกรายการผลิตเพื่อจัดการรายละเอียด"
      icon={<Factory />}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {orders.map((order, i) => {
            // ดึงผลรวมยอด FG ของ Order นี้ ถ้าไม่มีให้เป็น 0
            const done = fgTotals[order.orderID] || 0;
            const target = order.amount || 1;
            const pct = Math.min(100, Math.round((done / target) * 100));

            return (
              <Grid key={order.orderID} size={{ xs: 12, md: 6 }}>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card sx={{ overflow: "hidden" }}>
                    <CardActionArea 
                      onClick={() => 
                        navigate({ 
                          to: '/sub/productionManagement', 
                          search: { id: order.orderID } 
                        } as any)
                      }
                    >
                      <Box
                        sx={{
                          height: 4,
                          background:
                            order.status === "กำลังผลิต"
                              ? "#10B981"
                              : order.status === "เสร็จสิ้น"
                              ? "#4A90E2"
                              : order.status === "หยุดชั่วคราว"
                              ? "#F59E0B"
                              : order.status === "ยกเลิก"
                              ? "#EF4444"
                              : "#A4ABB6",
                        }}
                      />
                      <CardContent>
                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: 2,
                          }}
                        >
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {order.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {order.orderID}
                            </Typography>
                          </Box>
                          {getStatusChip(order.status)}
                        </Stack>

                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ justifyContent: "space-between", mb: 1 }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            ความคืบหน้า
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {done.toLocaleString()} / {target.toLocaleString()}{" "}
                            <Box component="span" sx={{ color: "primary.main" }}>
                              ({pct}%)
                            </Box>
                          </Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={pct} sx={{ mb: 2 }} />

                      </CardContent>
                    </CardActionArea>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      )}
    </PageShell>
  );
}