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
import { getSession } from "@/lib/auth";
import {
  issuesApi, workOrdersApi, personnelApi,
  type ApiWorkOrder, type ApiPersonnel, type ApiIssue,
} from "@/lib/api-client";

interface IssuesFormProps {
  orderID?: string;
  orderName?: string;
  onCreated?: (issue: ApiIssue) => void;
  onCancel?: () => void;
}

export function IssuesForm({ orderID, orderName, onCreated, onCancel }: IssuesFormProps) {
  const [workOrders, setWorkOrders] = useState<ApiWorkOrder[]>([]);
  const [personnel, setPersonnel] = useState<ApiPersonnel[]>([]);
  
  const [formData, setFormData] = useState({
    orderID: "",
    reporterID: "",
    problem: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [orders, people] = await Promise.all([
          workOrdersApi.list(), personnelApi.list(),
        ]);
        setWorkOrders(orders ?? []);
        setPersonnel(people ?? []);

        // ตั้งค่าผู้แจ้งปัญหาอัตโนมัติจากเซสชันปัจจุบัน
        const currentUserEmail = getSession()?.email ?? "";
        const currentReporterRow = (people ?? []).find((p) => p.email?.toLowerCase() === currentUserEmail.toLowerCase());
        const defaultReporter = currentReporterRow ? `${currentReporterRow.id} — ${currentReporterRow.name}` : "";
        
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
          reporterID: defaultReporter,
        }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderID, orderName]);

  const orderOptions = workOrders.map((o) => `${o.orderID} - ${o.name}`);
  const personnelOptions = personnel.map((p) => `${p.id} — ${p.name}`);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);

    try {
      const selectedOrderID = formData.orderID.split(" - ")[0] || "-";
      const selectedReporterID = formData.reporterID.split(" — ")[0] || "-";

      const newIssue = await issuesApi.create({
        orderID: selectedOrderID,
        reporter_id: selectedReporterID,
        issue: formData.problem,
        description_id: formData.description,
        status: "รอแก้ไข",
      });
      
      toast.success("แจ้งปัญหาสำเร็จ");
      setConfirmOpen(false);
      onCreated?.(newIssue as ApiIssue);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "แจ้งปัญหาไม่สำเร็จ");
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
          แจ้งปัญหาการผลิต
        </DialogTitle>
        <Divider />
        
        <DialogContent>
          <Box sx={{ mb: 3, p: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Stack direction="column" spacing={0.75}>
              <Typography sx={{ fontSize: "1rem", color: "text.secondary" }}>
                ใบสั่งผลิต:{" "}
                <Box component="span" sx={{ fontWeight: 600, color: "#1e293b" }}>
                  {orderName || "เลือกจากรายการ"}
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
                  disabled={!!orderID} // ถ้าส่ง orderID มาแล้วให้ล็อกช่องนี้ไว้
                />
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={personnelOptions}
                  value={formData.reporterID}
                  onChange={(_, v) => handleChange("reporterID", v || "")}
                  renderInput={(params) => <TextField {...params} label="เจ้าหน้าที่ผู้แจ้งปัญหา" placeholder="PSN-001 สมชาย ใจดี" required />}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="ปัญหาที่พบ"
                  placeholder="เครื่องจักรหยุดกลางคัน, วัตถุดิบมีปัญหา..."
                  required
                  value={formData.problem}
                  onChange={(e) => handleChange("problem", e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="รายละเอียดปัญหา"
                  placeholder="อธิบายสถานการณ์ที่พบเพิ่มเติม..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
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
            disabled={isSubmitting || !formData.orderID || !formData.problem}
            sx={{ width: 100 }}
          >
            แจ้งปัญหา
          </Button>
        </DialogActions>
      </Box>

      {/* Dialog ยืนยันการแจ้งปัญหา */}
      <Dialog
        open={confirmOpen}
        onClose={() => !isSubmitting && setConfirmOpen(false)}
        sx={{ "& .MuiDialog-paper": { borderRadius: 2, p: 1 } }}
      >
        <DialogContent>
          <Typography color="text.secondary">
            คุณต้องการส่งเรื่องแจ้งปัญหานี้ใช่หรือไม่?
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