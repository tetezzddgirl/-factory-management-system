import { useEffect, useState } from "react";
import { 
  Button, 
  Grid, 
  TextField, 
  Box, 
  Typography, 
  Autocomplete, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Divider, 
  Stack, 
  Dialog, 
  CircularProgress 
} from "@mui/material";
import { toast } from "sonner";
import { LOCATION_MASTER } from "@/components/wip-locations-table";
import { getSession } from "@/lib/auth";
import {
  wipApi, wipLocationsApi, requisitionsApi, workOrdersApi, personnelApi,
  type ApiWorkInProcess, type ApiWipLocation, type ApiWorkOrder, type ApiPersonnel, type ApiRequisitionSlip,
} from "@/lib/api-client";

interface RequisitionFormProps {
  orderID?: string;
  orderName?: string;
  onCreated?: (slip: ApiRequisitionSlip) => void;
  onCancel?: () => void;
}

export function RequisitionForm({ orderID, orderName, onCreated, onCancel }: RequisitionFormProps) {
  const [workInProcess, setWorkInProcess] = useState<ApiWorkInProcess[]>([]);
  const [wipLocations, setWipLocations] = useState<ApiWipLocation[]>([]);
  const [workOrders, setWorkOrders] = useState<ApiWorkOrder[]>([]);
  const [personnel, setPersonnel] = useState<ApiPersonnel[]>([]);
  
  const [formData, setFormData] = useState({
    orderID: "",
    item: "",
    location: LOCATION_MASTER[0] || "",
    amount: "0",
    unit: "ชิ้น",
    palletNumber: "",
    lotNumber: "",
    handler: "",
    agency: "ฝ่ายคลังสินค้าระหว่างผลิต",
  });
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [wip, locs, orders, people] = await Promise.all([
          wipApi.list(), wipLocationsApi.list(), workOrdersApi.list(), personnelApi.list(),
        ]);
        setWorkInProcess(wip ?? []);
        setWipLocations(locs ?? []);
        setWorkOrders(orders ?? []);
        setPersonnel(people ?? []);

        const currentUserEmail = getSession()?.email ?? "";
        const currentHandlerRow = (people ?? []).find((p) => p.email?.toLowerCase() === currentUserEmail.toLowerCase());
        const defaultHandler = currentHandlerRow ? `${currentHandlerRow.id} — ${currentHandlerRow.name}` : "";
        const defaultItem = wip && wip[0] ? `${wip[0].wipID} — ${wip[0].wip}` : "";
        
        let initialOrder = "";
        if (orderID && orderName) {
          initialOrder = `${orderID} - ${orderName}`;
        } else if (orderID) {
          const found = (orders ?? []).find(o => o.orderID === orderID);
          initialOrder = found ? `${found.orderID} - ${found.name}` : orderID;
        } else if (orders && orders.length > 0) {
          initialOrder = `${orders[0].orderID} - ${orders[0].name}`;
        }

        setFormData(prev => ({
          ...prev,
          orderID: initialOrder,
          handler: defaultHandler,
          item: defaultItem,
        }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "โหลดข้อมูลสำหรับใบเบิกจ่ายไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderID, orderName]);

  const orderOptions = workOrders.map((o) => `${o.orderID} - ${o.name}`);
  const personnelOptions = personnel.map((p) => `${p.id} — ${p.name}`);
  const itemOptions = workInProcess.map((i) => `${i.wipID} — ${i.wip}`);

  function findLoc(values: typeof formData) {
    const code = values.item ? values.item.split(" — ")[0] : "";
    if (!code) return undefined;
    return wipLocations.find((l) => {
      if (values.palletNumber) {
        return l.wipID === code && l.palletNumber.trim().toLowerCase() === values.palletNumber.trim().toLowerCase();
      }
      return l.wipID === code && l.location === values.location;
    });
  }

  const helperInfo = (() => {
    const loc = findLoc(formData);
    if (!loc) return null;
    const code = formData.item.split(" — ")[0];
    const unit = workInProcess.find((m) => m.wipID === code)?.unit ?? formData.unit;
    const qty = Number(formData.amount) || 0;
    const label = loc.palletNumber ? `Pallet ${loc.palletNumber}` : loc.location;
    const isOver = qty > loc.amount;
    
    return {
      text: isOver 
        ? `${label} เก็บไว้แค่ ${loc.amount.toLocaleString()} ${unit} (เกิน ${(qty - loc.amount).toLocaleString()} ${unit})`
        : `ที่ ${label} เก็บไว้ ${loc.amount.toLocaleString()} ${unit}`,
      isOver
    };
  })();

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === "item") {
        const code = value.split(" — ")[0];
        const found = workInProcess.find((m) => m.wipID === code);
        if (found) next.unit = found.unit;
      }
      if (field === "location" && value) {
        const code = next.item ? next.item.split(" — ")[0] : "";
        const loc = code
          ? wipLocations.find((l) => l.location === value && l.wipID === code)
          : wipLocations.find((l) => l.location === value);
        if (loc) {
          next.palletNumber = loc.palletNumber;
          next.lotNumber = loc.lotNumber;
          const mat = workInProcess.find((m) => m.wipID === loc.wipID);
          if (mat) {
            next.item = `${mat.wipID} — ${mat.wip}`;
            next.unit = mat.unit;
          }
        }
      }
      if (field === "palletNumber" && value) {
        const loc = wipLocations.find((l) => l.palletNumber.trim().toLowerCase() === value.trim().toLowerCase());
        if (loc) {
          next.location = loc.location;
          next.lotNumber = loc.lotNumber;
          const mat = workInProcess.find((m) => m.wipID === loc.wipID);
          if (mat) {
            next.item = `${mat.wipID} — ${mat.wip}`;
            next.unit = mat.unit;
          }
        }
      }
      return next;
    });
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(formData.amount) || 0;
    const code = formData.item.split(" — ")[0];
    const target = workInProcess.find((i) => i.wipID === code);
    const loc = findLoc(formData);

    if (target && qty > target.amount) {
      toast.error(`เบิกจ่ายไม่สำเร็จ: คงเหลือ ${target.wip} เพียง ${target.amount.toLocaleString()} ${target.unit}`);
      return;
    }
    if (loc && qty > loc.amount) {
      toast.error(`เบิกจ่ายไม่สำเร็จ: ตำแหน่งที่เลือกมีเพียง ${loc.amount.toLocaleString()} ${target?.unit ?? ""}`);
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    const qty = Number(formData.amount) || 0;
    const code = formData.item.split(" — ")[0];

    try {
      const slip = await requisitionsApi.create({
        orderID: formData.orderID.split(" - ")[0] || "-", 
        wipID: code, 
        amount: qty, 
        handler: formData.handler,
      });
      toast.success("สร้างใบเบิกจ่ายสำเร็จ");
      setConfirmOpen(false);
      onCreated?.(slip);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างใบเบิกจ่ายไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box component="form" onSubmit={handleInitialSubmit}>
        <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
          สร้างใบเบิกจ่าย
        </DialogTitle>
        <Divider />
        
        <DialogContent>
          <Box sx={{ mb: 3, p: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Stack direction="column" spacing={0.75}>
              <Typography sx={{ fontSize: "1rem", color: "text.secondary" }}>
                ใบสั่งผลิต:{" "}
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

          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={orderOptions}
                  value={formData.orderID}
                  onChange={(_, v) => handleChange("orderID", v || "")}
                  renderInput={(params) => <TextField {...params} label="หมายเลขใบสั่งผลิต" required />}
                />
              </Grid>
              
              <Grid size={{ xs: 12}}>
                <Autocomplete
                  options={itemOptions}
                  value={formData.item}
                  onChange={(_, v) => handleChange("item", v || "")}
                  renderInput={(params) => <TextField {...params} label="รหัส / ชื่อสินค้าระหว่างผลิต" required />}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  label="จำนวนที่ต้องการเบิก"
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                  error={helperInfo?.isOver}
                  helperText={helperInfo?.text}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="หน่วย"
                  value={formData.unit}
                  onChange={(e) => handleChange("unit", e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Pallet Number"
                  placeholder="PLT-005"
                  helperText="เลือก Location หรือกรอก Pallet ระบบจะดึงข้อมูลให้อัตโนมัติ"
                  value={formData.palletNumber}
                  onChange={(e) => handleChange("palletNumber", e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Lot Number"
                  placeholder="LOT-005"
                  value={formData.lotNumber}
                  onChange={(e) => handleChange("lotNumber", e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={personnelOptions}
                  value={formData.handler}
                  onChange={(_, v) => handleChange("handler", v || "")}
                  renderInput={(params) => <TextField {...params} label="ชื่อผู้บันทึกรายการ" required />}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="แผนกปลายทาง"
                  value={formData.agency}
                  onChange={(e) => handleChange("agency", e.target.value)}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCancel} color="inherit" disabled={isSubmitting} sx={{ width: 100, color: "#4a90e2"}}>
            ยกเลิก
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isSubmitting || helperInfo?.isOver}
            sx={{ width: 100 }}
          >
            ขอเบิก
          </Button>
        </DialogActions>
      </Box>

      {/* Dialog ยืนยันการเบิก */}
      <Dialog
        open={confirmOpen}
        onClose={() => !isSubmitting && setConfirmOpen(false)}
        sx={{ "& .MuiDialog-paper": { borderRadius: 2, p: 1 } }}
      >
        <DialogContent>
          <Typography color="text.secondary">
            คุณต้องการยืนยันการเบิกจ่ายวัตถุดิบ/สินค้า ใช่หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" disabled={isSubmitting} sx={{ width: 100, color: "#4a90e2"}}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            variant="contained"
            disabled={isSubmitting}
            sx={{ width: 100, bgcolor: "#4a90e2", "&:hover": { bgcolor: "#357abd" } }}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "ยืนยัน"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}