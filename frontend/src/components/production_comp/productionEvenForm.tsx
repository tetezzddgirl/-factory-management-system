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
  Autocomplete,
} from "@mui/material";
import { toast } from "sonner";
import { employeesApi, type ApiEmployee, employeeOptions } from "@/lib/api-client";

export interface EventData {
  eventType: string;
  startTime: string;
  endTime: string;
  description: string;
  impact: string;
  recordedBy: string;
}

interface ProductionEvenFormProps {
  orderID?: string;
  orderName?: string;
  onSave: (data: EventData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const eventTypes = [
  "เครื่องจักรขัดข้อง/เสีย",
  "ขาดแคลนวัตถุดิบ",
  "อุบัติเหตุระหว่างผลิต",
  "ไฟตก/ไฟดับ",
  "อื่นๆ"
];

export default function ProductionEvenForm({ orderID, orderName, onSave, onCancel, loading }: ProductionEvenFormProps) {
  const [personnel, setPersonnel] = useState<ApiEmployee[]>([]);
  const [formData, setFormData] = useState<EventData>({
    eventType: "",
    startTime: "",
    endTime: "",
    description: "", 
    impact: "",
    recordedBy: "", // เริ่มต้นเป็นค่าว่าง ไม่ดึงจาก Session ใดๆ
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const people = await employeesApi.list();
        setPersonnel(people ?? []);
      } catch (e) {
        console.error("Failed to load personnel:", e);
      }
    })();
  }, []);

  const personnelOptions = employeeOptions(personnel);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePersonnelChange = (value: string) => {
    setFormData((prev) => ({ ...prev, recordedBy: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.eventType ||
      !formData.startTime ||
      // เอา !formData.endTime ออกตรงนี้
      !formData.description.trim() ||
      !formData.impact.trim() ||
      !formData.recordedBy.trim()
    ) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง");
      return;
    }

    setConfirmOpen(true);
  };

  const resetForm = () => {
    setFormData({
      eventType: "",
      startTime: "",
      endTime: "",
      description: "",
      impact: "",
      recordedBy: "",
    });
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onSave(formData);
    resetForm();
  };

  const handleCancel = () => {
    onCancel();
    resetForm();
  };

  const isFormInvalid =
    !formData.eventType ||
    !formData.startTime ||
    !formData.description.trim() ||
    !formData.impact.trim() ||
    !formData.recordedBy.trim();

  return (
    <>
      <Box component="form" onSubmit={handleSubmit} autoComplete="off">
        <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
          บันทึกเหตุการณ์ใหม่
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
            <TextField
              select
              required
              fullWidth
              label="ประเภทเหตุการณ์"
              name="eventType"
              value={formData.eventType}
              onChange={handleChange}
            >
              {eventTypes.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                required
                fullWidth
                type="datetime-local"
                label="เวลาที่เริ่มเกิดเหตุ"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                type="datetime-local"
                label="เวลาที่สิ้นสุด"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <TextField
              required
              fullWidth
              multiline
              rows={3}
              label="รายละเอียดเหตุการณ์"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="อธิบายสิ่งที่เกิดขึ้น (จำเป็นต้องกรอก)..."
            />

            <TextField
              required
              fullWidth
              multiline
              rows={2}
              label="ผลกระทบที่เกิดขึ้น"
              name="impact"
              value={formData.impact}
              onChange={handleChange}
              placeholder="เช่น เสียเวลาผลิต 2 ชั่วโมง, สินค้าเสียหาย 10 ชิ้น (จำเป็นต้องกรอก)..."
            />

            <Autocomplete
              options={personnelOptions}
              value={formData.recordedBy || null}
              onChange={(_, v) => handlePersonnelChange(v || "")}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="ผู้บันทึก" 
                  placeholder="เลือกผู้บันทึกรายการ" 
                  required 
                  autoComplete="off"
                />
              )}
            />
          </Stack>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCancel} color="inherit" disabled={loading} sx={{ width: 100, color: "#4a90e2" }}>
            ยกเลิก
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || isFormInvalid}
            sx={{ width: 100 }}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={() => !loading && setConfirmOpen(false)}
        sx={{ "& .MuiDialog-paper": { borderRadius: 2, p: 1 } }}
      >
        <DialogContent>
          <Typography color="text.secondary">
            คุณต้องการบันทึกเหตุการณ์นี้ใช่หรือไม่?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" disabled={loading} sx={{ width: 100, color: "#4a90e2" }}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading}
            sx={{ width: 100, bgcolor: "#4a90e2", "&:hover": { bgcolor: "#357abd" } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "ยืนยัน"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}