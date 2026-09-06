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
  Autocomplete,
} from "@mui/material";
import { getSession } from "@/lib/auth";
import { personnelApi, type ApiPersonnel } from "@/lib/api-client";

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
  const [personnel, setPersonnel] = useState<ApiPersonnel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [formData, setFormData] = useState({
    PalletNumber: "",
    wipID: "",
    amount: "",
    createdBy: "",
    remark: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("ff:token") || localStorage.getItem("token") || "";
        
        const [wipRes, peopleRes] = await Promise.all([
          fetch("http://localhost:8090/api/wip", { headers: { Authorization: `Bearer ${token}` } }),
          personnelApi.list()
        ]);

        if (wipRes.ok) {
          const data = await wipRes.json();
          setWipOptions(data || []);
        }

        const people = peopleRes ?? [];
        setPersonnel(people);

        // ตั้งค่าผู้บันทึกอัตโนมัติจากเซสชัน
        const currentUserEmail = getSession()?.email ?? "";
        const currentUserRow = people.find((p) => p.email?.toLowerCase() === currentUserEmail.toLowerCase());
        const defaultUser = currentUserRow ? `${currentUserRow.id} — ${currentUserRow.name}` : "";

        setFormData((prev) => ({ ...prev, createdBy: defaultUser }));
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    fetchData();
  }, []);

  const personnelOptions = personnel.map((p) => `${p.id} — ${p.name}`);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleAutocompleteChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.PalletNumber.trim() || !formData.wipID || !formData.amount || !formData.createdBy.trim() || !formData.remark.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง");
      return;
    }
    setError(null);
    setConfirmOpen(true);
  };

  const resetForm = () => {
    setFormData((prev) => ({
      PalletNumber: "",
      wipID: "",
      amount: "",
      createdBy: prev.createdBy, // คงค่าคนบันทึกไว้
      remark: "", 
    }));
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

      try {
        const transferPayload = {
          transferID: `TRF-${timestamp}`,
          transferType: "WIP",
          createdBy: formData.createdBy.split(" — ")[0] || formData.createdBy, // ส่งแค่รหัสพนักงาน
          createDateTime: new Date().toISOString(),
          status: "Pending",
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
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || Number(val) > 0) {
                  handleChange(e);
                }
              }}
              onKeyDown={(e) => {
                if (["-", "+", "e", "E"].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              placeholder="ระบุจำนวน"
              slotProps={{
                htmlInput: { min: 1 },
                input: {
                  endAdornment: displayUnit ? (
                    <InputAdornment position="end">{displayUnit}</InputAdornment>
                  ) : undefined,
                },
              }}
            />

            <Autocomplete
              options={personnelOptions}
              value={formData.createdBy}
              onChange={(_, v) => handleAutocompleteChange("createdBy", v || "")}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="พนักงานรับผิดชอบ" 
                  placeholder="ระบุชื่อพนักงาน" 
                  required 
                />
              )}
            />
            
            <TextField
              required
              fullWidth
              multiline
              rows={2}
              label="หมายเหตุ"
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              placeholder="ระบุหมายเหตุ (จำเป็นต้องกรอก)"
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