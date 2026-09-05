import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert,
  InputAdornment,
} from "@mui/material";

interface ProductionFgFormProps {
  orderID: string;
  orderName?: string;
  onClose?: () => void;
  onSave?: () => void;
}

interface ProductItem {
  productID: string;
  name: string;
  unit: string;
}

export default function ProductionFgForm({
  orderID,
  orderName,
  onClose,
  onSave,
}: ProductionFgFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [displayUnit, setDisplayUnit] = useState("ชิ้น");

  // Form States
  const [formData, setFormData] = useState({
    palletNumber: "",
    productName: orderName || "",
    quantity: "",
    createdBy: "",
    remark: "",
  });

  // ค้นหาชื่อสินค้าและหน่วยอัตโนมัติ
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!orderName) return;
      setFetchingProduct(true);

      try {
        const token = localStorage.getItem("ff:token") || localStorage.getItem("token") || "";
        const res = await fetch("http://localhost:8090/api/products", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const products: ProductItem[] = await res.json();
          const targetProduct = (products || []).find(
            (p) => p.name.trim().toLowerCase() === orderName.trim().toLowerCase()
          );

          if (targetProduct) {
            setFormData((prev) => ({ ...prev, productName: targetProduct.name }));
            setDisplayUnit(targetProduct.unit || "ชิ้น");
          } else {
            setFormData((prev) => ({ ...prev, productName: orderName }));
            setDisplayUnit("ชิ้น");
          }
        }
      } catch (err) {
        console.error("Failed to fetch product details:", err);
      } finally {
        setFetchingProduct(false);
      }
    };
    fetchProductDetails();
  }, [orderName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName) {
      setError("กรุณาระบุชื่อสินค้าสำเร็จรูป (FG Name)");
      return;
    }
    setError(null);
    setConfirmOpen(true);
  };

  const resetForm = () => {
    setFormData({
      palletNumber: "",
      productName: orderName || "",
      quantity: "",
      createdBy: "",
      remark: "",
    });
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    const token = localStorage.getItem("ff:token") || localStorage.getItem("token") || "";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // ✅ 1. สร้าง ID ไว้ล่วงหน้า ป้องกันเป็น null
    const timestamp = Date.now();
    const generatedFgID = `FG-${timestamp}`; 

    try {
      // -----------------------------------------------------------
      // 1. บันทึกตาราง Finished Goods (FG)
      // -----------------------------------------------------------
      const fgPayload = {
        // ✅ ส่งทุกรูปแบบที่ Go Struct อาจจะร้องขอ
        finishedGoodsId: generatedFgID,
        FinishedGoodsID: generatedFgID,
        finished_goods_id: generatedFgID,
        palletNumber: formData.palletNumber,
        pallet_number: formData.palletNumber,
        productName: formData.productName,
        product_name: formData.productName,
        quantity: Number(formData.quantity),
        orderID: orderID,
        OrderID: orderID,
        order_id: orderID,
      };

      // ✅ อัปเดต Path ให้มี /production ตามที่ฝั่ง Go เขียนไว้
      const fgRes = await fetch("http://localhost:8090/api/production/finished-goods", {
        method: "POST",
        headers,
        body: JSON.stringify(fgPayload),
      });

      if (!fgRes.ok) throw new Error("ไม่สามารถบันทึกข้อมูล Finished Goods ได้");
      const fgData = await fgRes.json().catch(() => ({}));
      
      const finalFgID = fgData.finishedGoodsId || fgData.FinishedGoodsID || fgData.finished_goods_id || fgData.id || generatedFgID;

      // -----------------------------------------------------------
      // 2. บันทึกตาราง Transfer Record
      // -----------------------------------------------------------
      try {
        const transferPayload = {
          transferID: `TRF-FG-${timestamp}`,
          transferType: "FG",
          createdBy: formData.createdBy,
          createDateTime: new Date().toISOString(),
          status: "Pending",
          remark: formData.remark ? `นำเข้าจากใบสั่งผลิต ${orderID} (${formData.remark})` : `นำเข้าจากใบสั่งผลิต ${orderID}`,
          
          // ✅ ส่งค่า OrderID และ FinishedGoodsID ให้ครบทุกท่า
          order_id: orderID,
          OrderID: orderID,
          orderID: orderID,
          finished_goods_id: finalFgID,
          FinishedGoodsID: finalFgID,
          finishedGoodsId: finalFgID,
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
        // Rollback: ถ้าบันทึก Transfer พลาด ให้ลบ FG ที่เพิ่งสร้างทิ้ง
        if (finalFgID) {
          await fetch(`http://localhost:8090/api/production/finished-goods/${finalFgID}`, { // ✅ อัปเดต Path ลบข้อมูล
            method: "DELETE",
            headers,
          }).catch((err) => console.error("Rollback FG ล้มเหลว:", err));
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
          เพิ่มสินค้าสำเร็จรูป (FG)
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
              label="รหัสพาเลท (Pallet Number)"
              name="palletNumber"
              value={formData.palletNumber}
              onChange={handleChange}
              placeholder="เช่น PLT-001"
            />

            <TextField
              required
              fullWidth
              label="ชื่อสินค้าสำเร็จรูป"
              name="productName"
              value={formData.productName}
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: fetchingProduct ? <CircularProgress size={20} /> : null,
                },
              }}
              sx={{ bgcolor: "#f9fafb" }}
              helperText="* ดึงข้อมูลชื่อสินค้าอัตโนมัติตามชื่อคำสั่งผลิต"
            />

            <TextField
              required
              fullWidth
              type="number"
              label="จำนวน"
              name="quantity"
              value={formData.quantity}
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
            disabled={isSubmitting || fetchingProduct}
            sx={{ width: 100 }}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Box>

      {/* Dialog ยืนยันการบันทึก */}
      <Dialog
        open={confirmOpen}
        onClose={() => !isSubmitting && setConfirmOpen(false)}
        sx={{ "& .MuiDialog-paper": { borderRadius: 2, p: 1 } }}
      >
        <DialogContent>
          <Typography color="text.secondary">
            คุณต้องการเพิ่มสินค้าสำเร็จรูป (FG) ใหม่ใช่หรือไม่?
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