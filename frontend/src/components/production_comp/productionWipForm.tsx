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

  // Form States
  const [formData, setFormData] = useState({
    paletteNumber: "",
    wipID: "",
    amount: "",
    createdBy: "",
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
      paletteNumber: "",
      wipID: "",
      amount: "",
      createdBy: "",
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
      const locationPayload = {
        paletteNumber: formData.paletteNumber,
        lotNumber: orderID,
        orderID: orderID,
        amount: Number(formData.amount),
        wipID: formData.wipID,
        location: "", // ส่งค่าว่างสำหรับ location
      };

      const locRes = await fetch("http://localhost:8090/api/wip/locations", {
        method: "POST",
        headers,
        body: JSON.stringify(locationPayload),
      });

      if (!locRes.ok) throw new Error("ไม่สามารถบันทึกข้อมูล WIP Location ได้");
      const locData = await locRes.json();
      
      // ดึง ID ออกมาเก็บไว้เผื่อต้องใช้ Rollback (เช็กหลายรูปแบบ key)
      generatedWipLocationID = locData.wipLocationID || locData.WipLocationID || locData.wip_location_id || locData.id;

      // -----------------------------------------------------------
      // 2. บันทึกตาราง Transfer Record
      // -----------------------------------------------------------
      try {
        const transferPayload = {
          transferID: `TRF-${Date.now()}`, // สร้างรหัสชั่วคราว
          transferType: "WIP",
          createdBy: formData.createdBy,
          createDateTime: new Date().toISOString(),
          status: "Pending",
          remark: `นำเข้าจากคำสั่งผลิต ${orderID}`,
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

        // หากสำเร็จทั้ง 2 ตาราง
        setConfirmOpen(false);
        resetForm();
        if (onSave) onSave();
        if (onClose) onClose();

      } catch (transferError: any) {
        // -----------------------------------------------------------
        // 3. Rollback: ถ้ายิง API ที่ 2 พลาด ให้ทำการลบข้อมูลที่ 1 ทิ้ง
        // -----------------------------------------------------------
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

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
          บันทึกข้อมูลสินค้าระหว่างผลิต (WIP)
        </DialogTitle>
        <Divider />

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* กล่องอ้างอิงข้อมูล */}
          <Box sx={{ mb: 3, p: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2 }}>
            <Stack direction="column" spacing={0.75}>
              <Typography sx={{ fontSize: "1rem", color: "text.secondary" }}>
                คำสั่งผลิต:{" "}
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

          {/* ช่องกรอกข้อมูล */}
          <Stack spacing={2.5}>
            <TextField
              required
              fullWidth
              label="รหัสพาเลท (Palette Number)"
              name="paletteNumber"
              value={formData.paletteNumber}
              onChange={handleChange}
              placeholder="เช่น PLT-001"
            />

            <TextField
              select
              required
              fullWidth
              label="ชื่อสินค้า (WIP Name)"
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
              label="จำนวน (Amount)"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="ระบุจำนวน"
            />

            <TextField
              required
              fullWidth
              label="พนักงานรับผิดชอบ (Created By)"
              name="createdBy"
              value={formData.createdBy}
              onChange={handleChange}
              placeholder="ระบุชื่อพนักงาน"
            />
          </Stack>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCancel} color="inherit" disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{ bgcolor: "#4a90e2", "&:hover": { bgcolor: "#357abd" } }}
          >
            บันทึกข้อมูล
          </Button>
        </DialogActions>
      </Box>

      {/* --- Popup ยืนยันการบันทึก --- */}
      <Dialog
        open={confirmOpen}
        onClose={() => !isSubmitting && setConfirmOpen(false)}
        sx={{ "& .MuiDialog-paper": { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
          ยืนยันการบันทึก
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            คุณตรวจสอบข้อมูลครบถ้วนแล้ว และต้องการบันทึกข้อมูล WIP และสร้าง Transfer Record ใหม่ใช่หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" disabled={isSubmitting}>
            กลับไปแก้ไข
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={isSubmitting}
            sx={{ bgcolor: "#4a90e2", "&:hover": { bgcolor: "#357abd" } }}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "ยืนยัน"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}