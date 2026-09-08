import React, { useState, useEffect, useCallback } from "react";
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Stack, 
  TextField, 
  Typography, 
  DialogContent,
  DialogActions, 
  Divider, 
  Dialog,
  MenuItem,
  CircularProgress,
  Grid
} from "@mui/material";
import { toast } from "sonner";
import { useRole } from "@/lib/roles";

interface ProductionReportProps {
  orderID?: string;
  orderName?: string;
}

export default function ProductionReport({ orderID, orderName }: ProductionReportProps) {
  const { role } = useRole();
  const canAccess = role === "operator" || role === "admin";

  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [reportId, setReportId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    actualStartDateTime: "",
    actualEndDateTime: "",
    actualQuantity: "",
    goodQuantity: "",
    scrapQuantity: "",
    palletQuantity: "",
    productionResult: "Pass",
    remark: "",
    recordedBy: "นายสมมติ ทดสอบ (Mock)",
  });

  const fetchReport = useCallback(async () => {
    if (!orderID) return;
    try {
      const token = localStorage.getItem("ff:token") || localStorage.getItem("auth_token") || "";
      const res = await fetch(`http://localhost:8080/api/production/orders/${orderID}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const report = data[0];
          
          setReportId(report.reportId);
          
          const formatDateTime = (isoString: string) => isoString ? new Date(isoString).toISOString().slice(0, 16) : "";

          setFormData({
            actualStartDateTime: formatDateTime(report.actualStartDateTime),
            actualEndDateTime: formatDateTime(report.actualEndDateTime),
            actualQuantity: report.actualQuantity?.toString() || "",
            goodQuantity: report.goodQuantity?.toString() || "",
            scrapQuantity: report.scrapQuantity?.toString() || "",
            palletQuantity: report.palletQuantity?.toString() || "",
            productionResult: report.productionResult || "Pass",
            remark: report.remark || "",
            recordedBy: report.recordedBy || "นายสมมติ ทดสอบ (Mock)",
          });
          setIsSaved(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch report", error);
    }
  }, [orderID]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // รองรับทั้ง HTMLInputElement และ HTMLTextAreaElement
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ดักการพิมพ์ตัวเลขไม่ให้ใส่ค่าลบหรือสัญลักษณ์แปลกปลอม
  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // ตรวจสอบว่ากรอกครบทุกช่องก่อนเปิด Dialog
  const handleValidateAndOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.actualStartDateTime ||
      !formData.actualEndDateTime ||
      formData.actualQuantity === "" ||
      formData.goodQuantity === "" ||
      formData.scrapQuantity === "" ||
      formData.palletQuantity === "" ||
      !formData.productionResult ||
      !formData.remark.trim()
    ) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง");
      return;
    }

    setConfirmOpen(true);
  };

  const handleSave = async () => {
    if (!orderID) {
      toast.error("ไม่พบรหัสใบสั่งผลิต");
      return;
    }
    setLoading(true);

    try {
      const token = localStorage.getItem("ff:token") || localStorage.getItem("auth_token") || "";
      
      const payload = {
        orderId: orderID,
        actualStartDateTime: new Date(formData.actualStartDateTime).toISOString(),
        actualEndDateTime: new Date(formData.actualEndDateTime).toISOString(),
        actualQuantity: parseInt(formData.actualQuantity) || 0,
        goodQuantity: parseInt(formData.goodQuantity) || 0,
        scrapQuantity: parseInt(formData.scrapQuantity) || 0,
        palletQuantity: parseInt(formData.palletQuantity) || 0,
        productionResult: formData.productionResult,
        remark: formData.remark,
        recordedBy: formData.recordedBy,
      };

      const url = reportId 
        ? `http://localhost:8080/api/production/reports/${reportId}` 
        : `http://localhost:8080/api/production/reports`;
      const method = reportId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(reportId ? "แก้ไขข้อมูลไม่สำเร็จ" : "บันทึกข้อมูลไม่สำเร็จ");

      toast.success(reportId ? "แก้ไขรายงานสำเร็จ" : "บันทึกรายงานผลการผลิตสำเร็จ");
      setIsSaved(true);
      fetchReport();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsSaved(false);
  };

  return (
    <Box sx={{ width: "100%", mt: 0 }}>
      <Card
        sx={{
          borderRadius: 2,
          border: "1px solid #e0e6ed",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Box sx={{ p: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
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

            <Divider />

            {isSaved ? (
              <Box sx={{ bgcolor: "#f8fafc", p: 2.5, borderRadius: 2, border: "1px dashed #cbd5e1" }}>
                <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 2, fontSize: "1rem" }}>
                  ผลการบันทึกข้อมูล
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography sx={{ lineHeight: 1.8, color: "#334155", fontSize: "0.875rem" }}>
                      <strong>เวลาเริ่มผลิต:</strong> {formData.actualStartDateTime ? new Date(formData.actualStartDateTime).toLocaleString("th-TH") : "-"}<br />
                      <strong>เวลาผลิตเสร็จ:</strong> {formData.actualEndDateTime ? new Date(formData.actualEndDateTime).toLocaleString("th-TH") : "-"}<br />
                      <strong>ยอดผลิตรวม:</strong> {formData.actualQuantity || "0"} ชิ้น<br />
                      <strong>จำนวนพาเลท:</strong> {formData.palletQuantity || "0"} พาเลท
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography sx={{ lineHeight: 1.8, color: "#334155", fontSize: "0.875rem" }}>
                      <strong>ยอดของดี (Accept):</strong> {formData.goodQuantity || "0"} ชิ้น<br />
                      <strong>ยอดของเสีย (Reject):</strong> {formData.scrapQuantity || "0"} ชิ้น<br />
                      <strong>ผลการผลิต:</strong> {formData.productionResult || "-"}<br />
                      <strong>หมายเหตุ:</strong> {formData.remark || "-"}<br />
                      <strong>ผู้บันทึก:</strong> {formData.recordedBy}
                    </Typography>
                  </Grid>
                </Grid>
                
                {canAccess && (
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2.5 }}>
                    <Button variant="outlined" size="small" onClick={handleEdit} sx={{ borderRadius: 2, textTransform: "none" }}>
                      แก้ไขข้อมูล
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <>
                {canAccess ? (
                  <Box component="form" onSubmit={handleValidateAndOpenConfirm}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField 
                          fullWidth 
                          required 
                          size="small" 
                          type="datetime-local" 
                          label="เวลาเริ่มผลิตจริง" 
                          name="actualStartDateTime" 
                          value={formData.actualStartDateTime} 
                          onChange={handleChange} 
                          slotProps={{ inputLabel: { shrink: true } }} 
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField 
                          fullWidth 
                          required 
                          size="small" 
                          type="datetime-local" 
                          label="เวลาผลิตเสร็จจริง" 
                          name="actualEndDateTime" 
                          value={formData.actualEndDateTime} 
                          onChange={handleChange} 
                          slotProps={{ inputLabel: { shrink: true } }} 
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField 
                          fullWidth 
                          required 
                          size="small" 
                          type="number" 
                          label="ยอดผลิตรวม" 
                          name="actualQuantity" 
                          value={formData.actualQuantity} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || Number(val) >= 0) handleChange(e);
                          }}
                          onKeyDown={handleNumberKeyDown}
                          slotProps={{ htmlInput: { min: 0 } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField 
                          fullWidth 
                          required 
                          size="small" 
                          type="number" 
                          label="ยอดของดี" 
                          name="goodQuantity" 
                          value={formData.goodQuantity} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || Number(val) >= 0) handleChange(e);
                          }}
                          onKeyDown={handleNumberKeyDown}
                          slotProps={{ htmlInput: { min: 0 } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField 
                          fullWidth 
                          required 
                          size="small" 
                          type="number" 
                          label="ยอดของเสีย" 
                          name="scrapQuantity" 
                          value={formData.scrapQuantity} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || Number(val) >= 0) handleChange(e);
                          }}
                          onKeyDown={handleNumberKeyDown}
                          slotProps={{ htmlInput: { min: 0 } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField 
                          fullWidth 
                          required 
                          size="small" 
                          type="number" 
                          label="จำนวนพาเลท" 
                          name="palletQuantity" 
                          value={formData.palletQuantity} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || Number(val) >= 0) handleChange(e);
                          }}
                          onKeyDown={handleNumberKeyDown}
                          slotProps={{ htmlInput: { min: 0 } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField 
                          select 
                          fullWidth 
                          required 
                          size="small" 
                          label="ผลการผลิต" 
                          name="productionResult" 
                          value={formData.productionResult} 
                          onChange={handleChange}
                        >
                          <MenuItem value="Pass">Pass (ผ่าน)</MenuItem>
                          <MenuItem value="Fail">Fail (ไม่ผ่าน)</MenuItem>
                          <MenuItem value="Partial">Partial (ผ่านบางส่วน)</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField 
                          fullWidth 
                          required 
                          multiline 
                          rows={3} 
                          size="small" 
                          label="หมายเหตุ / สาเหตุของเสีย" 
                          name="remark" 
                          value={formData.remark} 
                          onChange={handleChange} 
                          placeholder="ระบุหมายเหตุเพิ่มเติม (จำเป็นต้องกรอก)..." 
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField fullWidth disabled size="small" label="ผู้บันทึก" name="recordedBy" value={formData.recordedBy} slotProps={{ input: { readOnly: true } }} helperText="* ข้อมูลผู้บันทึกจะถูกดึงจากระบบอัตโนมัติ" />
                      </Grid>
                    </Grid>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                      <Button
                        type="submit"
                        variant="contained"
                        disableElevation
                        sx={{
                          bgcolor: "#4a90e2", color: "#fff", fontWeight: 600,
                          px: 3.5, py: 0.8, fontSize: "0.875rem", textTransform: "none", "&:hover": { bgcolor: "#357abd" },
                        }}
                      >
                        บันทึกผล
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography sx={{ color: "text.secondary" }}>
                      ยังไม่มีการบันทึกรายงานผลการผลิต
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {canAccess && (
        <Dialog
          open={confirmOpen}
          onClose={() => !loading && setConfirmOpen(false)}
          sx={{ "& .MuiDialog-paper": { borderRadius: 2, p: 1 } }}
        >
          <DialogContent>
            <Typography color="text.secondary">
              คุณต้องการบันทึกข้อมูลนี้ใช่หรือไม่?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)} color="inherit" disabled={loading} sx={{ width: 100, color: "#4a90e2"}}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => { setConfirmOpen(false); handleSave(); }}
              variant="contained"
              disabled={loading}
              sx={{ width: 100 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "ยืนยัน"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}