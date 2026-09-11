import { useEffect, useMemo, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Divider from "@mui/material/Divider";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Badge from "@mui/material/Badge";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";

import WarehouseIcon from "@mui/icons-material/Warehouse";
import InventoryIcon from "@mui/icons-material/Inventory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HistoryIcon from "@mui/icons-material/History";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MoveToInboxIcon from "@mui/icons-material/MoveToInbox";
import FactoryIcon from "@mui/icons-material/Factory";

import { Modal } from "@/components/Modal";
import { Field, SelectField } from "@/components/Field";
import { StatusBadge, type Tone } from "@/components/StatusBadge";
import { useStore } from "@/services/store";
import type { Customer, ShipmentStatus, TransactionType, Warehouse } from "@/interfaces";
import { getCustomers, getPendingFGTransfers, getWarehouses, receiveTransferApi, type PendingFGItem } from "@/services/https/api";

const statusMeta: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  shipped: { label: "จัดส่งแล้ว", tone: "success" },
  ready: { label: "เตรียมส่ง", tone: "info" },
  pending: { label: "รอตรวจ", tone: "warning" },
};

const emptyForm = {
  type: "issue" as TransactionType,
  code: "",
  name: "",
  quantity: "",
  location: "",
  palette: "",
  lot: "",
  remark: "",
};

export function WarehousePage() {
  const {
    stock,
    shipments,
    submitTransaction,
    verifyShipment,
    addShipment,
    updateShipment,
    deleteShipment,
    transactions,
  } = useStore();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyShip = { customer: "", address: "", productName: "", quantity: "", eta: "" };
  const [shipForm, setShipForm] = useState(emptyShip);
  const [shipSearch, setShipSearch] = useState("");
  const [shipSort, setShipSort] = useState<"newest" | "oldest" | "status" | "customer">("newest");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("ALL");
  const [destWarehouseMap, setDestWarehouseMap] = useState<Record<string, string>>({});
  const [pendingFg, setPendingFg] = useState<PendingFGItem[]>([]);
  const [fgDialogOpen, setFgDialogOpen] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [loadingFg, setLoadingFg] = useState(false);

  // Menu anchor for shipment item options
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeShipmentId, setActiveShipmentId] = useState<string | null>(null);

  // โหลดรายการสินค้าสำเร็จรูปรอรับจากฝ่ายผลิต
  const loadPendingFg = useCallback(async () => {
    setLoadingFg(true);
    try {
      const data = await getPendingFGTransfers();
      setPendingFg(data || []);
    } catch (e) {
      console.error("Error loading pending FG:", e);
    } finally {
      setLoadingFg(false);
    }
  }, []);

  // โหลดข้อมูลลูกค้า, คลังสินค้า และสินค้าสำเร็จรูปรอรับ
  useEffect(() => {
    getCustomers().then((data) => {
      if (data) setCustomers(data);
    });
    getWarehouses().then((data) => {
      if (data && data.length > 0) setWarehouses(data);
    });
    loadPendingFg();
    const interval = setInterval(loadPendingFg, 5000);
    return () => clearInterval(interval);
  }, [loadPendingFg]);

  // กรองสต็อกตาม Warehouse ที่เลือก
  const displayedStock = useMemo(() => {
    if (selectedWarehouseId === "ALL") return stock;
    return stock.filter((s) => s.warehouseId === selectedWarehouseId);
  }, [stock, selectedWarehouseId]);

  const totalStockQuantity = useMemo(() => {
    return displayedStock.reduce((sum, s) => sum + s.quantity, 0);
  }, [displayedStock]);

  const verifying = useMemo(() => shipments.find((s) => s.id === verifyId), [shipments, verifyId]);

  const filteredShipments = useMemo(() => {
    const result = shipments.filter((s) => {
      const q = shipSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        s.customer.toLowerCase().includes(q) ||
        s.productName.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
      );
    });

    return result.sort((a, b) => {
      if (shipSort === "status") {
        const order: Record<ShipmentStatus, number> = { pending: 1, ready: 2, shipped: 3 };
        return (order[a.status] || 99) - (order[b.status] || 99);
      }
      if (shipSort === "customer") {
        return a.customer.localeCompare(b.customer, "th");
      }
      if (shipSort === "oldest") {
        return a.id.localeCompare(b.id);
      }
      return b.id.localeCompare(a.id);
    });
  }, [shipments, shipSearch, shipSort]);

  const openForm = (type: TransactionType) => {
    setForm({ ...emptyForm, type });
    setError("");
    setFormOpen(true);
  };

  const save = () => {
    const qty = Number(form.quantity.replace(/[^\d.]/g, ""));
    if (!form.code.trim() || !form.name.trim()) {
      setError("กรุณากรอกรหัสสินค้าและชื่อสินค้า");
      return;
    }
    if (!qty || qty <= 0) {
      setError("กรุณากรอกจำนวนที่ถูกต้อง (มากกว่า 0)");
      return;
    }

    if (form.type === "issue") {
      const existing = stock.find(
        (s) => s.code.toLowerCase() === form.code.toLowerCase() || s.name === form.name,
      );
      if (!existing || existing.quantity < qty) {
        setError(
          `สินค้าในสต็อกมีไม่เพียงพอ (คงเหลือ ${existing ? existing.quantity.toLocaleString("th-TH") : 0} ชิ้น)`,
        );
        return;
      }
    }

    const result = submitTransaction({
      type: form.type,
      code: form.code,
      name: form.name,
      quantity: qty,
      location: form.location,
      palette: form.palette,
      lot: form.lot,
      remark: form.remark,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setFormOpen(false);
    setToast(result.message);
  };

  const handleReceiveFg = async (item: PendingFGItem) => {
    setReceivingId(item.transferID);
    try {
      const code = item.finishedGoodsId || (item.palletNumber ? `FG-${item.palletNumber}` : `FG-${item.orderID}`);
      const chosenWhId = destWarehouseMap[item.transferID] || warehouses[0]?.warehouse_id || "WH-01";
      const targetWh = warehouses.find((w) => w.warehouse_id === chosenWhId);
      const whName = targetWh?.warehouse_name || chosenWhId;
      const whLocation = targetWh?.location ? targetWh.location : (item.palletNumber ? `พาเลท ${item.palletNumber}` : "คลังสินค้าสำเร็จรูป");

      const res = submitTransaction({
        type: "receive",
        code: code,
        name: item.productName,
        quantity: item.quantity,
        location: item.palletNumber ? `${whLocation} (พาเลท ${item.palletNumber})` : whLocation,
        palette: item.palletNumber || "-",
        lot: item.orderID || item.finishedGoodsId,
        warehouseId: chosenWhId,
        warehouseName: whName,
        remark: `รับสินค้าสำเร็จรูปเข้า ${whName} จากใบสั่งผลิต ${item.orderID} (ผู้ส่ง: ${item.createdBy || "-"})`,
      });

      if (!res.ok) {
        setError(res.message);
        return;
      }

      await receiveTransferApi(item.transferID, "เจ้าหน้าที่ฝ่ายคลังสินค้า");
      setPendingFg((prev) => prev.filter((p) => p.transferID !== item.transferID));
      setToast(`รับเข้า ${whName} เรียบร้อย: ${item.productName} จำนวน ${item.quantity.toLocaleString("th-TH")} ชิ้น`);
    } catch (e) {
      console.error("Error receiving FG:", e);
      setError("เกิดข้อผิดพลาดในการรับสินค้าเข้าคลัง");
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
      {/* Toast Notification */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={() => setToast("")} severity="success" sx={{ width: "100%", borderRadius: 2 }}>
          {toast}
        </Alert>
      </Snackbar>

      {/* Page Header */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48, boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)" }}>
            <WarehouseIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>
              คลังสินค้า & การจัดส่ง
            </Typography>
            <Typography variant="body2" color="text.secondary">
              สต๊อกสินค้าสำเร็จรูปและประวัติการจัดส่ง
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Badge badgeContent={pendingFg.length} color="error">
            <Button
              variant="contained"
              color="primary"
              startIcon={<MoveToInboxIcon />}
              onClick={() => {
                loadPendingFg();
                setFgDialogOpen(true);
              }}
              sx={{ px: 3, py: 1, fontWeight: 600 }}
            >
              รับสินค้าจากฝ่ายผลิต
            </Button>
          </Badge>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => openForm("issue")}
            sx={{ px: 3, py: 1, borderColor: "#cbd5e1" }}
          >
            เบิกจ่ายสินค้า
          </Button>
        </Box>
      </Box>

      {/* Main Content Grid: Stock (Left) + Shipments (Right) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Left Column: Finished Goods Stock */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, flexWrap: "wrap", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <InventoryIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700 }}>
                  สต๊อกสินค้าสำเร็จรูป ({displayedStock.length} รายการ)
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                {/* ตัวเลือกคลังสินค้า (Warehouse Dropdown) */}
                <Select
                  size="small"
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  sx={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    bgcolor: "#f8fafc",
                    borderRadius: 2,
                    minWidth: 210,
                    height: 34,
                  }}
                >
                  <MenuItem value="ALL" sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                    🏢 ทุกคลังสินค้า (All Warehouses)
                  </MenuItem>
                  {warehouses.map((w) => (
                    <MenuItem key={w.warehouse_id} value={w.warehouse_id} sx={{ fontSize: "0.8125rem" }}>
                      📍 {w.warehouse_name} ({w.warehouse_id})
                    </MenuItem>
                  ))}
                </Select>

                <Chip
                  label={`คงเหลือรวม ${totalStockQuantity.toLocaleString("th-TH")} ชิ้น`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: "0.75rem", borderRadius: 2 }}
                />
              </Box>
            </Box>

            {displayedStock.length > 0 ? (
              <Grid container spacing={2}>
                {displayedStock.map((item) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
                    <Card
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        transition: "all 0.2s",
                        "&:hover": {
                          borderColor: "primary.main",
                          bgcolor: "#f0f9ff",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {item.code}
                          </Typography>
                          {item.warehouseName && (
                            <Chip
                              label={item.warehouseName.split(" ")[0] || item.warehouseId}
                              size="small"
                              sx={{ height: 18, fontSize: "0.6875rem", bgcolor: "#e0f2fe", color: "#0284c7", fontWeight: 600 }}
                            />
                          )}
                        </Box>
                        <StatusBadge tone="muted">{item.location}</StatusBadge>
                      </Box>
                      <Typography variant="subtitle1" color="text.primary" sx={{ mt: 1, fontWeight: 700 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {item.quantity.toLocaleString("th-TH")} {item.unit}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box
                sx={{
                  p: 4,
                  borderRadius: 3,
                  bgcolor: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  ไม่มีรายการสินค้าสำเร็จรูปในคลังสินค้านี้
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Shipments List */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              height: "100%",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <LocalShippingIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700 }}>
                  รายการจัดส่ง
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon fontSize="small" />}
                onClick={() => {
                  setEditingId(null);
                  setShipForm(emptyShip);
                  setShipOpen(true);
                }}
                sx={{ px: 2, py: 0.5, fontSize: "0.75rem" }}
              >
                จัดส่งใหม่
              </Button>
            </Box>

            {/* Filter & Sort Controls */}
            <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="ค้นหาลูกค้า, สินค้า, รหัส..."
                value={shipSearch}
                onChange={(e) => setShipSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
              />
              <Select
                size="small"
                value={shipSort}
                onChange={(e) => setShipSort(e.target.value as any)}
                sx={{ borderRadius: 2.5, minWidth: 130, fontSize: "0.8125rem" }}
              >
                <MenuItem value="newest">🕒 ล่าสุด</MenuItem>
                <MenuItem value="oldest">🕒 เก่าสุด</MenuItem>
                <MenuItem value="status">📌 สถานะ</MenuItem>
                <MenuItem value="customer">🏢 ลูกค้า</MenuItem>
              </Select>
            </Box>

            {/* Shipment Items List */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 420, overflowY: "auto", pr: 0.5 }}>
              {filteredShipments.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    ไม่พบรายการจัดส่งที่ตรงกับคำค้นหา
                  </Typography>
                </Box>
              ) : (
                filteredShipments.map((sh) => (
                  <Card
                    key={sh.id}
                    elevation={0}
                    onClick={() => setVerifyId(sh.id)}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      bgcolor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      position: "relative",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: "#f0f9ff",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", pr: 4 }}>
                      <Typography variant="subtitle2" color="text.primary" sx={{ fontWeight: 700 }}>
                        {sh.customer}
                      </Typography>
                      <StatusBadge tone={statusMeta[sh.status].tone}>
                        {statusMeta[sh.status].label}
                      </StatusBadge>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      {sh.code} • {sh.productName} × {sh.quantity.toLocaleString("th-TH")}
                    </Typography>
                    {sh.address ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.3, fontStyle: "italic" }}>
                        📍 {sh.address}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" color="primary.main" sx={{ display: "block", mt: 0.5, fontWeight: 600 }}>
                      ETA: {sh.eta}
                    </Typography>

                    {/* More options button */}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchorEl(e.currentTarget);
                        setActiveShipmentId(sh.id);
                      }}
                      sx={{ position: "absolute", top: 8, right: 8 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Card>
                ))
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Action Menu for Shipment items */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => {
          setMenuAnchorEl(null);
          setActiveShipmentId(null);
        }}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 140 } } }}
      >
        <MenuItem
          onClick={() => {
            const sh = shipments.find((s) => s.id === activeShipmentId);
            if (sh) {
              setEditingId(sh.id);
              setShipForm({
                customer: sh.customer,
                address: sh.address || "",
                productName: sh.productName,
                quantity: String(sh.quantity),
                eta: sh.eta,
              });
              setShipOpen(true);
            }
            setMenuAnchorEl(null);
            setActiveShipmentId(null);
          }}
          sx={{ fontSize: "0.875rem", gap: 1 }}
        >
          <EditIcon fontSize="small" color="action" /> แก้ไข
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (activeShipmentId) {
              deleteShipment(activeShipmentId);
              setToast("ลบรายการจัดส่งแล้ว");
            }
            setMenuAnchorEl(null);
            setActiveShipmentId(null);
          }}
          sx={{ fontSize: "0.875rem", gap: 1, color: "error.main" }}
        >
          <DeleteIcon fontSize="small" color="error" /> ลบ
        </MenuItem>
      </Menu>

      {/* Transaction History (Always Displayed at the Bottom) */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            mb: 2.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar sx={{ bgcolor: "#ebf4fe", color: "#4A90E2", width: 38, height: 38 }}>
              <HistoryIcon fontSize="small" />
            </Avatar>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700 }}>
                  ประวัติการทำรายการสต๊อก (Stock Movement History)
                </Typography>
                <Chip
                  label={`${transactions.length} รายการ`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: "#f1f5f9",
                    color: "text.secondary",
                    fontSize: "0.75rem",
                    height: 22,
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                บันทึกประวัติการรับเข้าและเบิกจ่ายสินค้าสำเร็จรูปทั้งหมด
              </Typography>
            </Box>
          </Box>
        </Box>

        {transactions.length > 0 ? (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ borderRadius: 3, border: "1px solid #e2e8f0", overflowX: "auto" }}
          >
            <Table size="medium">
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8125rem", py: 1.5 }}>
                    วัน-เวลาทำรายการ
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8125rem", py: 1.5 }}>
                    ประเภท
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8125rem", py: 1.5 }}>
                    รหัส - ชื่อสินค้า
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8125rem", py: 1.5 }}>
                    จำนวน
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8125rem", py: 1.5 }}>
                    ตำแหน่ง / พาเลท / Lot
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8125rem", py: 1.5 }}>
                    หมายเหตุ
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                    <TableCell sx={{ fontSize: "0.8125rem", color: "text.secondary", whiteSpace: "nowrap" }}>
                      {tx.createdAt}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={tx.type === "receive" ? "success" : "warning"}>
                        {tx.type === "receive" ? "รับเข้า" : "เบิกจ่าย"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                        {tx.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tx.code}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          color: tx.type === "receive" ? "#10B981" : "#F59E0B",
                          fontWeight: 700,
                        }}
                      >
                        {tx.type === "receive" ? "+" : "-"} {tx.quantity.toLocaleString("th-TH")} ชิ้น
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {tx.location ? (
                          <Chip label={`📍 ${tx.location}`} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.75rem" }} />
                        ) : null}
                        {tx.palette ? (
                          <Chip label={`📦 ${tx.palette}`} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.75rem" }} />
                        ) : null}
                        {tx.lot ? (
                          <Chip label={`🏷️ Lot: ${tx.lot}`} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.75rem" }} />
                        ) : null}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
                      {tx.remark || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box
            sx={{
              p: 4,
              borderRadius: 3,
              bgcolor: "#f8fafc",
              border: "1px dashed #cbd5e1",
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              ยังไม่มีประวัติการทำรายการสต๊อก
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.5 }}>
              เมื่อมีการบันทึกรับเข้าหรือเบิกจ่ายสินค้า ประวัติจะแสดงที่นี่โดยอัตโนมัติ
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Modal: Issue Stock */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="เบิกจ่ายสินค้าสำเร็จรูป"
        subtitle="บันทึกการเบิกจ่ายสินค้าสำเร็จรูปออกจากสต๊อก"
        footer={
          <>
            <Button variant="text" color="inherit" onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="contained" color="warning" onClick={save} sx={{ px: 4 }}>
              บันทึกการเบิกจ่าย
            </Button>
          </>
        }
      >
        <SelectField
          label="เลือกสินค้าจากสต็อกที่ต้องการเบิกจ่าย *"
          value={form.code}
          onChange={(e) => {
            const selectedCode = e.target.value;
            const selectedItem = stock.find((s) => s.code === selectedCode);
            if (selectedItem) {
              setForm({
                ...form,
                code: selectedItem.code,
                name: selectedItem.name,
                location: selectedItem.location || "",
                palette: selectedItem.palette || "",
                lot: selectedItem.lot || "",
              });
            }
          }}
        >
          <option value="" disabled>
            -- เลือกสินค้าที่ต้องการเบิกจ่าย --
          </option>
          {stock.map((item) => (
            <option key={item.id} value={item.code}>
              {item.name} ({item.code}) — คงเหลือ {item.quantity.toLocaleString("th-TH")} {item.unit}
            </option>
          ))}
        </SelectField>

        <Field
          label="จำนวนที่ต้องการเบิกจ่าย *"
          placeholder="จำนวน (เช่น 5000)"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
        <Field
          label="ตำแหน่งที่จัดเก็บ (Location)"
          placeholder="ตำแหน่ง (เช่น Zone A, A-01, B-02)"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <Field
          label="หมายเลขพาเลท (Palette No.)"
          placeholder="Palette number (เช่น PL-001)"
          value={form.palette}
          onChange={(e) => setForm({ ...form, palette: e.target.value })}
        />
        <Field
          label="หมายเลขล็อต (Lot No.)"
          placeholder="Lot number (เช่น LOT-20260901)"
          value={form.lot}
          onChange={(e) => setForm({ ...form, lot: e.target.value })}
        />
        <Field
          label="หมายเหตุ / เหตุผลในการเบิกจ่าย"
          placeholder="ระบุเหตุผลการเบิกจ่าย (เช่น ส่งมอบลูกค้า, เบิกทดสอบคุณภาพ, ชำรุด)"
          value={form.remark}
          onChange={(e) => setForm({ ...form, remark: e.target.value })}
        />

        {error ? (
          <Alert severity="error" sx={{ borderRadius: 2, mt: 1 }}>
            {error}
          </Alert>
        ) : null}
      </Modal>

      {/* Modal: Create/Edit Shipment */}
      <Modal
        open={shipOpen}
        onClose={() => {
          setShipOpen(false);
          setEditingId(null);
        }}
        title={editingId ? "แก้ไขรายการจัดส่ง" : "เพิ่มรายการจัดส่งใหม่"}
        subtitle="ระบุรายละเอียดลูกค้าและสินค้าที่ต้องการจัดส่ง"
        footer={
          <>
            <Button
              variant="text"
              color="inherit"
              onClick={() => {
                setShipOpen(false);
                setEditingId(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (!shipForm.customer || !shipForm.productName || !shipForm.quantity) return;
                const qty = Number(shipForm.quantity.replace(/[^\d.]/g, ""));
                if (qty <= 0) {
                  setError("กรุณาระบุจำนวนที่มากกว่า 0");
                  return;
                }

                const targetItem = stock.find((s) => s.name === shipForm.productName);

                if (!editingId && targetItem && targetItem.quantity < qty) {
                  setError(
                    `สินค้าในสต็อกมีไม่เพียงพอ (คงเหลือเพียง ${targetItem.quantity.toLocaleString("th-TH")} ${targetItem.unit})`,
                  );
                  return;
                }

                const payload = {
                  customer: shipForm.customer,
                  address: shipForm.address,
                  productName: shipForm.productName,
                  quantity: qty,
                  eta: shipForm.eta,
                };

                if (editingId) {
                  updateShipment(editingId, payload);
                  setToast("แก้ไขรายการจัดส่งแล้ว");
                } else {
                  addShipment(payload);
                  if (targetItem) {
                    targetItem.quantity -= qty;
                  }
                  setToast("เพิ่มรายการจัดส่งและตัดสต็อกสินค้าเรียบร้อยแล้ว");
                }
                setShipOpen(false);
                setEditingId(null);
                setError("");
              }}
              sx={{ px: 4 }}
            >
              บันทึก
            </Button>
          </>
        }
      >
        {error ? (
          <Alert severity="error" sx={{ borderRadius: 2, mb: 1 }}>
            {error}
          </Alert>
        ) : null}

        <Field
          label="ชื่อลูกค้า / บริษัทปลายทาง"
          placeholder="ระบุชื่อลูกค้าหรือชื่อบริษัท (เช่น บริษัท โออิชิ กรุ๊ป จำกัด)"
          value={shipForm.customer}
          onChange={(e) => setShipForm({ ...shipForm, customer: e.target.value })}
        />

        <Field
          label="ที่อยู่สำหรับจัดส่ง (Shipping Address)"
          placeholder="ระบุที่อยู่จัดส่ง ปลายทาง หรือสาขา"
          value={shipForm.address}
          onChange={(e) => setShipForm({ ...shipForm, address: e.target.value })}
        />

        <SelectField
          label="ชนิดขวด / สินค้าสำเร็จรูปในสต็อก"
          value={shipForm.productName}
          onChange={(e) => setShipForm({ ...shipForm, productName: e.target.value })}
        >
          <option value="" disabled>
            -- เลือกชนิดสินค้าจากสต็อก --
          </option>
          {stock.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name} ({item.code}) — คงเหลือ {item.quantity.toLocaleString("th-TH")} {item.unit}
            </option>
          ))}
        </SelectField>

        <Field
          label="จำนวนที่จัดส่ง"
          placeholder="จำนวน (เช่น 5000)"
          value={shipForm.quantity}
          onChange={(e) => setShipForm({ ...shipForm, quantity: e.target.value })}
        />

        <Field
          label="วันที่จัดส่ง (ETA)"
          type="date"
          value={shipForm.eta}
          onChange={(e) => setShipForm({ ...shipForm, eta: e.target.value })}
        />
      </Modal>

      {/* Modal: Verify Shipment */}
      <Modal
        open={Boolean(verifying)}
        onClose={() => setVerifyId(null)}
        title="ตรวจสอบความถูกต้องก่อนจัดส่ง"
        footer={
          <>
            <Button variant="text" color="inherit" onClick={() => setVerifyId(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (verifying) verifyShipment(verifying.id);
                setVerifyId(null);
                setToast("บันทึกการจัดส่งแล้ว สถานะเปลี่ยนเป็น “จัดส่งแล้ว”");
              }}
              sx={{ px: 4 }}
            >
              ยืนยันการจัดส่ง
            </Button>
          </>
        }
      >
        {verifying ? (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700 }}>
              {verifying.customer}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {verifying.code} • {verifying.productName} × {verifying.quantity.toLocaleString("th-TH")} ชิ้น
            </Typography>
            {verifying.address ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: "italic" }}>
                📍 ที่อยู่จัดส่ง: {verifying.address}
              </Typography>
            ) : null}
            <Typography variant="body2" color="primary.main" sx={{ mt: 1.5, fontWeight: 600 }}>
              กำหนดส่ง (ETA): {verifying.eta}
            </Typography>
          </Paper>
        ) : null}
      </Modal>

      {/* Modal: Receive Finished Goods from Production */}
      <Modal
        open={fgDialogOpen}
        onClose={() => setFgDialogOpen(false)}
        title="รับสินค้าสำเร็จรูปจากฝ่ายผลิต (Finished Goods)"
        subtitle="รายการสินค้าที่ผลิตเสร็จแล้วและส่งมอบมาจากฝ่ายผลิต (สถานะ: รอรับเข้าคลัง)"
        maxWidth="md"
        footer={
          <Button variant="outlined" color="inherit" onClick={() => setFgDialogOpen(false)}>
            ปิดหน้าต่าง
          </Button>
        }
      >
        {loadingFg ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={36} />
          </Box>
        ) : pendingFg.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <MoveToInboxIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }} />
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600 }}>
              ไม่มีรายการสินค้าสำเร็จรูปรอรับเข้าคลัง
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              เมื่อเจ้าหน้าที่ฝ่ายผลิตกด "เพิ่มสินค้าสำเร็จรูป" จากหน้าการผลิต รายการจะมาปรากฏที่นี่โดยอัตโนมัติ
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {pendingFg.map((item) => {
              const currentWhId = destWarehouseMap[item.transferID] || warehouses[0]?.warehouse_id || "WH-01";
              return (
                <Card
                  key={item.transferID}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "primary.main", bgcolor: "#f0f9ff" },
                  }}
                >
                  <Box sx={{ minWidth: 260, flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700 }}>
                        {item.productName}
                      </Typography>
                      {item.palletNumber && item.palletNumber !== "-" && (
                        <Chip
                          label={`พาเลท ${item.palletNumber}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 600, height: 22, fontSize: "0.75rem" }}
                        />
                      )}
                      <Chip
                        label="รอรับเข้าคลัง"
                        size="small"
                        color="warning"
                        sx={{ fontWeight: 600, height: 22, fontSize: "0.75rem" }}
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      จำนวน: <b>{item.quantity.toLocaleString("th-TH")}</b> ชิ้น • รหัสคำสั่งผลิต: <b>{item.orderID || "-"}</b>
                    </Typography>

                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                      ผู้ส่งมอบ: {item.createdBy || "ฝ่ายผลิต"} • {item.createDateTime ? new Date(item.createDateTime).toLocaleString("th-TH") : "-"}
                    </Typography>

                    {/* Warehouse Destination Selector */}
                    <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>
                        คลังสินค้าที่จะจัดเก็บ:
                      </Typography>
                      <Select
                        size="small"
                        value={currentWhId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDestWarehouseMap((prev) => ({ ...prev, [item.transferID]: val }));
                        }}
                        sx={{
                          height: 32,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          bgcolor: "#ffffff",
                          borderRadius: 2,
                          minWidth: 250,
                        }}
                      >
                        {warehouses.map((w) => (
                          <MenuItem key={w.warehouse_id} value={w.warehouse_id} sx={{ fontSize: "0.8125rem" }}>
                            📍 {w.warehouse_name} ({w.warehouse_id})
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>
                  </Box>

                  <Button
                    variant="contained"
                    color="success"
                    startIcon={receivingId === item.transferID ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                    disabled={receivingId === item.transferID}
                    onClick={() => handleReceiveFg(item)}
                    sx={{
                      px: 3,
                      py: 1,
                      bgcolor: "#10b981",
                      color: "#ffffff",
                      fontWeight: 600,
                      "&:hover": { bgcolor: "#059669" },
                    }}
                  >
                    รับเข้าคลัง
                  </Button>
                </Card>
              );
            })}
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
