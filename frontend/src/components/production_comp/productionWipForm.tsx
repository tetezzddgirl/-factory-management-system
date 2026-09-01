import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert,
  InputAdornment, 
} from "@mui/material";

interface ProductionWipFormProps {
  orderID: string;
  orderName?: string;
  onClose?: () => void;
  onSave?: () => void;
}

interface WorkInProcessItem {
  wipID: string;
  wip: string;
  unit?: string;
}

export default function ProductionWipForm({
  orderID,
  orderName,
  onClose,
  onSave,
}: ProductionWipFormProps) {
  const [wipOptions, setWipOptions] = useState<WorkInProcessItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Form States (เพิ่ม remark)
  const [formData, setFormData] = useState({
    PalletNumber: "",
    wipID: "",
    amount: "",
    createdBy: "",
    remark: "",
  });

  // ดึงข้อมูล Work In Process เพื่อทำเป็นตัวเลือก Dropdown
  useEffect(() => {
    const fetchWipOptions = async () => {
      try {
        const token = localStorage.getItem("ff:token") || localStorage.getItem("token") || "";
        const res = await fetch("http://localhost:8090/api/wip", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setWipOptions(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch WIP options:", err);
      }
    };
    fetchWipOptions();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.wipID) {
      setError("กรุณาเลือกชื่อสินค้า (WIP Name)");
      return;
    }
    setError(null);
    setConfirmOpen(true);
  };

  const resetForm = () => {
    setFormData({
      PalletNumber: "",
      wipID: "",
      amount: "",
      createdBy: "",
      remark: "", // รีเซ็ต remark
    });
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    let generatedWipLocationID = null;
    const token = localStorage.getItem("ff:token") || localStorage.getItem("token") || "";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    try {
      // -----------------------------------------------------------
      // 1. บันทึกตาราง WIP Location
      // -----------------------------------------------------------
      const timestamp = Date.now();
      const generatedLotNumber = `${orderID}-${timestamp}`; 

      const locationPayload = {
        PalletNumber: formData.PalletNumber,
        palletNumber: formData.PalletNumber, 
        pallet_number: formData.PalletNumber, 
        lotNumber: generatedLotNumber,
        LotNumber: generatedLotNumber, 
        lot_number: generatedLotNumber, 
        orderID: orderID,
        amount: Number(formData.amount),
        wipID: formData.wipID,
        location: "", 
      };

      const locRes = await fetch("http://localhost:8090/api/wip/locations", {
        method: "POST",
        headers,
        body: JSON.stringify(locationPayload),
      });

      if (!locRes.ok) throw new Error("ไม่สามารถบันทึกข้อมูล WIP Location ได้");
      const locData = await locRes.json();
      
      generatedWipLocationID = locData.wipLocationID || locData.WipLocationID || locData.wip_location_id || locData.id;

      // -----------------------------------------------------------
      // 2. บันทึกตาราง Transfer Record
      // -----------------------------------------------------------
      try {
        const transferPayload = {
          transferID: `TRF-${timestamp}`,
          transferType: "WIP",
          createdBy: formData.createdBy,
          createDateTime: new Date().toISOString(),
          status: "Pending",
          // ถ้าระบุหมายเหตุมา ให้ต่อท้ายประโยคเริ่มต้น
          remark: formData.remark ? `นำเข้าจากใบสั่งผลิต ${orderID} (${formData.remark})` : `นำเข้าจากใบสั่งผลิต ${orderID}`,
          order_id: orderID,
          OrderID: orderID,
          wipLocationID: generatedWipLocationID,
          WIPLocationID: generatedWipLocationID,
        };

        const trfRes = await fetch("http://localhost:8090/api/production/transfers", {
          method: "POST",
          headers,
          body: JSON.stringify(transferPayload),
        });

        if (!trfRes.ok) {
          const errText = await trfRes.text();
          throw new Error(`บันทึก Transfer Record ไม่สำเร็จ: ${errText}`);
        }

        setConfirmOpen(false);
        resetForm();
        if (onSave) onSave();
        if (onClose) onClose();

      } catch (transferError: any) {
        if (generatedWipLocationID) {
          await fetch(`http://localhost:8090/api/wip/locations/${generatedWipLocationID}`, {
            method: "DELETE",
            headers,
          }).catch((err) => console.error("Rollback ล้มเหลว:", err));
        }
        
        throw new Error(
          `การบันทึกไม่สมบูรณ์ ข้อมูลจึงถูกยกเลิกทั้งหมด (สาเหตุ: ${transferError.message})`
        );
      }

    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      setConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onClose) onClose();
    resetForm();
  };

  const selectedWip = wipOptions.find((w) => w.wipID === formData.wipID);
  const displayUnit = selectedWip?.unit || "";

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
          เพิ่มสินค้าระหว่างผลิต (WIP)
        </DialogTitle>
        <Divider />

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

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
            <TextField
              required
              fullWidth
              label="รหัสพาเลท"
              name="PalletNumber"
              value={formData.PalletNumber}
              onChange={handleChange}
              placeholder="เช่น PLT-001"
            />

            <TextField
              select
              required
              fullWidth
              label="ชื่อสินค้า"
              name="wipID"
              value={formData.wipID}
              onChange={handleChange}
            >
              <MenuItem value="" disabled>
                <em>-- เลือกสินค้า WIP --</em>
              </MenuItem>
              {wipOptions.map((wip) => (
                <MenuItem key={wip.wipID} value={wip.wipID}>
                  {wip.wipID} - {wip.wip}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              required
              fullWidth
              type="number"
              label="จำนวน"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="ระบุจำนวน"
              slotProps={{
                input: {
                  endAdornment: displayUnit ? (
                    <InputAdornment position="end">{displayUnit}</InputAdornment>
                  ) : undefined,
                },
              }}
            />

            <TextField
              required
              fullWidth
              label="พนักงานรับผิดชอบ"
              name="createdBy"
              value={formData.createdBy}
              onChange={handleChange}
              placeholder="ระบุชื่อพนักงาน"
            />
            
            {/* ฟิลด์สำหรับกรอกหมายเหตุ */}
            <TextField
              fullWidth
              multiline
              rows={2}
              label="หมายเหตุ"
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              placeholder="ระบุหมายเหตุ (ถ้ามี)"
            />
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
            disabled={isSubmitting}
            sx={{ width: 100 }}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={() => !isSubmitting && setConfirmOpen(false)}
        sx={{ "& .MuiDialog-paper": { borderRadius: 2, p: 1 } }}
      >
        <DialogContent>
          <Typography color="text.secondary">
            คุณต้องการเพิ่ม WIP ใหม่ใช่หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" disabled={isSubmitting} sx={{ width: 100, color: "#4a90e2"}}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={isSubmitting}
            sx={{ width: 100 }}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "ยืนยัน"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}