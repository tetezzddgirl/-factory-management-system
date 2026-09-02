import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  CircularProgress,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import QualityQcFormItem, { ItemData } from "./qualityQcFormItem";

export interface InspectItemDetail {
  requirementID: string;
  parameterId: string;
  name: string;
  spec: string;
  unit: string;
}

export interface QcPointExtended {
  inspectionPointID: string;
  pointName: string;
  inspectItems?: InspectItemDetail[];
}

interface QualityQcFormProps {
  open?: boolean; // ปรับให้เป็น optional เพื่อรับค่าจาก Parent
  onClose: () => void;
  orderID: string;
  orderName?: string;
  points: QcPointExtended[];
  initialPointID?: string;
  onSuccess: () => void;
}

export default function QualityQcForm({
  open,
  onClose,
  orderID,
  orderName,
  points,
  initialPointID,
  onSuccess,
}: QualityQcFormProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [formData, setFormData] = useState({
    inspectionPointID: "",
    overallResult: "" as "Pass" | "Fail" | "",
    actionGuideline: "",
    remark: "",
    inspectedBy: "",
  });

  const [itemsData, setItemsData] = useState<Record<string, ItemData>>({});

  const selectedPointDetails = points.find(
    (p) => p.inspectionPointID === formData.inspectionPointID
  );
  const currentInspectItems = selectedPointDetails?.inspectItems || [];

  useEffect(() => {
    if (open) {
      const defaultPoint = initialPointID && initialPointID !== "all" ? initialPointID : "";
      setFormData({
        inspectionPointID: defaultPoint,
        overallResult: "",
        actionGuideline: "",
        remark: "",
        inspectedBy: "",
      });
      setItemsData({});
    }
  }, [open, initialPointID]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOverallResultChange = (
    _event: React.MouseEvent<HTMLElement>,
    newResult: "Pass" | "Fail" | null
  ) => {
    if (newResult !== null) {
      handleChange("overallResult", newResult);
      if (newResult === "Pass") {
        handleChange("actionGuideline", "");
      }
    }
  };

  const handleItemChange = (requirementID: string, field: keyof ItemData, value: string) => {
    setItemsData((prev) => ({
      ...prev,
      [requirementID]: {
        ...prev[requirementID],
        requirementID: requirementID,
        result: prev[requirementID]?.result || "",
        actualValue: prev[requirementID]?.actualValue || "",
        remark: prev[requirementID]?.remark || "",
        [field]: value,
      },
    }));
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.inspectionPointID) {
      alert("กรุณาเลือกจุดตรวจ");
      return;
    }

    if (currentInspectItems.length > 0) {
      const missingItems = currentInspectItems.filter((item) => {
        const data = itemsData[item.requirementID];
        return !data || data.result === "";
      });

      if (missingItems.length > 0) {
        alert("กรุณากดเลือก 'ผ่าน/ไม่ผ่าน' ให้ครบทุกรายการย่อย");
        return;
      }
    }

    if (formData.overallResult === "") {
      alert("กรุณาเลือก สรุปผลการประเมินจุดตรวจ (Overall Result) ด้านล่างสุด");
      return;
    }

    setConfirmOpen(true);
  };

  const executeSubmit = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      const token =
        localStorage.getItem("ff:token") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        "";

      // 1. จัดเตรียม Payload รายการที่ต้องตรวจสอบ (InspectionItems)
      const itemsPayload = currentInspectItems.map((item) => {
        const data = itemsData[item.requirementID];
        return {
          requirementID: item.requirementID,
          actualValue: data.actualValue,
          result: data.result,
          remark: data.remark,
        };
      });

      const inspectionPayload = {
        orderID: orderID,
        inspectionPointID: formData.inspectionPointID,
        overallResult: formData.overallResult,
        actionGuideline: formData.overallResult === "Fail" ? formData.actionGuideline : "",
        remark: formData.remark,
        inspectedBy: formData.inspectedBy,
        inspectionDateTime: new Date().toISOString(),
        status: formData.overallResult === "Fail" ? "Pending" : formData.overallResult,
        items: itemsPayload,
      };

      const resInspection = await fetch(`http://localhost:8090/api/quality/inspections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(inspectionPayload),
      });

      if (!resInspection.ok) throw new Error("บันทึกข้อมูล Inspection ไม่สำเร็จ");

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handlePreSubmit}>
        <DialogTitle sx={{ fontWeight: 700, color: "#1e293b", pb: 1 }}>
          บันทึกผลการตรวจคุณภาพ
        </DialogTitle>
        <Divider />

        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
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

          <Stack spacing={3}>
            <FormControl fullWidth required>
              <InputLabel id="point-select-label">จุดที่ทำการตรวจ</InputLabel>
              <Select
                labelId="point-select-label"
                value={formData.inspectionPointID}
                label="จุดที่ทำการตรวจ"
                onChange={(e) => handleChange("inspectionPointID", e.target.value)}
                sx={{ bgcolor: "#fff" }}
              >
                <MenuItem value="" disabled>
                  {points.length === 0
                    ? "ไม่มีจุดตรวจสำหรับใบสั่งผลิตนี้"
                    : "-- กรุณาเลือกจุดตรวจ --"}
                </MenuItem>
                {points.map((pt) => (
                  <MenuItem key={pt.inspectionPointID} value={pt.inspectionPointID}>
                    {pt.pointName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <QualityQcFormItem
              items={currentInspectItems}
              itemsData={itemsData}
              onChange={handleItemChange}
            />

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#334155" }}>
                สรุปผลการประเมินจุดตรวจ (Overall Result) *
              </Typography>
              <ToggleButtonGroup
                color="primary"
                value={formData.overallResult}
                exclusive
                onChange={handleOverallResultChange}
                fullWidth
                sx={{ bgcolor: "#fff" }}
              >
                <ToggleButton
                  value="Pass"
                  sx={{
                    py: 1.5,
                    fontWeight: "bold",
                    "&.Mui-selected": { bgcolor: "#dcfce7", color: "#166534", borderColor: "#22c55e" },
                  }}
                >
                  ✅ ผ่าน (Pass)
                </ToggleButton>
                <ToggleButton
                  value="Fail"
                  sx={{
                    py: 1.5,
                    fontWeight: "bold",
                    "&.Mui-selected": { bgcolor: "#fee2e2", color: "#991b1b", borderColor: "#ef4444" },
                  }}
                >
                  ❌ ไม่ผ่าน (Fail)
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {formData.overallResult === "Fail" && (
              <TextField
                label="แนวทางการดำเนินการ (Action Guideline)"
                fullWidth
                required
                multiline
                rows={2}
                value={formData.actionGuideline}
                onChange={(e) => handleChange("actionGuideline", e.target.value)}
                sx={{ bgcolor: "#fff" }}
                placeholder="ระบุแนวทางแก้ไข เช่น คัดแยกของเสีย, ปรับตั้งเครื่องจักร..."
                helperText="* ระบบจะบันทึกสถานะใบตรวจนี้เป็น Pending อัตโนมัติ เพื่อรอการแก้ไข"
              />
            )}

            <Stack direction={{ xs: "column", sm: "row" } as const} spacing={2}>
              <TextField
                label="ชื่อผู้ตรวจสอบ (Inspected By)"
                fullWidth
                required
                value={formData.inspectedBy}
                onChange={(e) => handleChange("inspectedBy", e.target.value)}
                sx={{ bgcolor: "#fff" }}
              />
              <TextField
                label="หมายเหตุภาพรวม (ถ้ามี)"
                fullWidth
                value={formData.remark}
                onChange={(e) => handleChange("remark", e.target.value)}
                sx={{ bgcolor: "#fff" }}
              />
            </Stack>
          </Stack>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading} color="inherit" sx={{ width: 100, color: "#4a90e2"}}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || points.length === 0 || !formData.inspectionPointID}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ width: 100 }}
          >
            {loading ? "กำลังประมวลผล..." : "บันทึก"}
          </Button>
        </DialogActions>
      </form>

      {/* Confirmation Dialog ยังต้องใช้อยู่ */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#1e293b" }}>
          ยืนยันการบันทึกข้อมูล
        </DialogTitle>
        <DialogContent>
          <Typography>
            คุณต้องการบันทึกผลการตรวจคุณภาพใช่หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" sx={{ width: 100, color: "#4a90e2"}}>
            ยกเลิก
          </Button>
          <Button
            onClick={executeSubmit}
            variant="contained"
            sx={{ width: 100 }}
          >
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}