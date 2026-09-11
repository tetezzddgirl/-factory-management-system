import { Link } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";

import DashboardIcon from "@mui/icons-material/Dashboard";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CategoryIcon from "@mui/icons-material/Category";
import InventoryIcon from "@mui/icons-material/Inventory";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { useStore } from "@/services/store";

export function DashboardPage() {
  const { stock, shipments, boms, products } = useStore();

  const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);
  const pendingShipments = shipments.filter((s) => s.status !== "shipped").length;
  const pendingBoms = boms.filter((b) => b.status === "pending").length;

  const cards = [
    {
      label: "สินค้าสำเร็จรูปในคลัง",
      value: totalStock.toLocaleString("th-TH"),
      unit: "ชิ้น",
      icon: InventoryIcon,
      color: "#4A90E2", // Blue (Standby, available)
      bgcolor: "#ebf4fe",
    },
    {
      label: "รายการจัดส่งที่ค้างอยู่",
      value: pendingShipments,
      unit: "รายการ",
      icon: LocalShippingIcon,
      color: "#F59E0B", // Orange (Serious, needs attention)
      bgcolor: "#fef3c7",
    },
    {
      label: "ผลิตภัณฑ์ทั้งหมด",
      value: products.length,
      unit: "ชนิด",
      icon: CategoryIcon,
      color: "#10B981", // Green (Normal, OK)
      bgcolor: "#d1fae5",
    },
    {
      label: "สูตรการผลิตรออนุมัติ",
      value: pendingBoms,
      unit: "สูตร",
      icon: HourglassEmptyIcon,
      color: "#F59E0B", // Orange (Needs attention)
      bgcolor: "#fffbeb",
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          sx={{
            bgcolor: "primary.main",
            width: 48,
            height: 48,
            boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
          }}
        >
          <DashboardIcon />
        </Avatar>
        <Box>
          <Typography
            variant="h5"
            color="text.primary"
            sx={{ fontWeight: 700 }}
          >
            แดชบอร์ด
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ภาพรวม 2 ระบบย่อยของระบบจัดการการผลิตในโรงงาน
          </Typography>
        </Box>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={2.5}>
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={c.label}>
              <Card
                elevation={0}
                sx={{
                  p: 1,
                  height: "100%",
                  bgcolor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 3,
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      {c.label}
                    </Typography>
                    <Avatar sx={{ bgcolor: c.bgcolor, color: c.color, width: 36, height: 36 }}>
                      <Icon fontSize="small" />
                    </Avatar>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                    <Typography
                      variant="h4"
                      color="text.primary"
                      sx={{ fontWeight: 700 }}
                    >
                      {c.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.unit}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Subsystem Navigation Cards */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              height: "100%",
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 4,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 12px 24px -4px rgba(0, 0, 0, 0.08)",
                borderColor: "primary.main",
              },
            }}
          >
            <CardActionArea
              component={Link}
              to="/warehouse"
              sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between" }}
            >
              <Box>
                <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", width: 48, height: 48, mb: 2 }}>
                  <LocalShippingIcon />
                </Avatar>
                <Typography
                  variant="h6"
                  color="text.primary"
                  gutterBottom
                  sx={{ fontWeight: 700 }}
                >
                  ระบบคลังสินค้าสำเร็จรูปและจัดส่งสินค้า
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  รับสินค้าเข้าคลัง เบิกจ่ายสินค้าสำเร็จรูป ตรวจสอบความถูกต้องก่อนจัดส่ง และดูประวัติการเคลื่อนไหวสต๊อก
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 3, color: "primary.main", fontWeight: 600, fontSize: "0.875rem" }}>
                <span>เข้าสู่ระบบคลังสินค้า</span>
                <ArrowForwardIcon fontSize="small" />
              </Box>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              height: "100%",
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 4,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 12px 24px -4px rgba(0, 0, 0, 0.08)",
                borderColor: "primary.main",
              },
            }}
          >
            <CardActionArea
              component={Link}
              to="/products-bom"
              sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between" }}
            >
              <Box>
                <Avatar sx={{ bgcolor: "#ede9fe", color: "#7c3aed", width: 48, height: 48, mb: 2 }}>
                  <CategoryIcon />
                </Avatar>
                <Typography
                  variant="h6"
                  color="text.primary"
                  gutterBottom
                  sx={{ fontWeight: 700 }}
                >
                  ระบบจัดการข้อมูลผลิตภัณฑ์ / สูตรการผลิต
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  จัดการสูตรการผลิต (BOM) วัตถุดิบและเครื่องจักร การขออนุมัติจากฝ่ายควบคุมคุณภาพ (QC) และการเพิ่มผลิตภัณฑ์ใหม่
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 3, color: "primary.main", fontWeight: 600, fontSize: "0.875rem" }}>
                <span>เข้าสู่ระบบผลิตภัณฑ์ & BOM</span>
                <ArrowForwardIcon fontSize="small" />
              </Box>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
