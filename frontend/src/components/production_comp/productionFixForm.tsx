import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Divider,
  CircularProgress,
  Box,
  Tabs,
  Tab
} from "@mui/material";

import ProductionFixFormDetails from "./productionFixFormDetails";
import ProductionFixFormCorrection from "./productionFixFormCorrection";

interface CustomTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: CustomTabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface ProductionFixFormProps {
  open: boolean;
  onClose: () => void;
  inspectionID: string;
  orderID?: string;
  orderName?: string;
}

export default function ProductionFixForm({
  open,
  onClose,
  inspectionID,
  orderID,
  orderName
}: ProductionFixFormProps) {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [inspection, setInspection] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [correction, setCorrection] = useState<any>(null);

  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    action: "",
    correctedBy: "",
    remark: ""
  });

  useEffect(() => {
    if (open && inspectionID) {
      setTabValue(0);
      fetchDetailData();
    } else {
      setInspection(null);
      setItems([]);
      setCorrection(null);
      setFormData({ action: "", correctedBy: "", remark: "" });
    }
  }, [open, inspectionID]);

  const fetchDetailData = async () => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem("ff:token") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        ";";
      const headers = { Authorization: `Bearer ${token}` };

      const [resInsp, resItems, resCorr] = await Promise.all([
        fetch(`http://localhost:8090/api/quality/inspections/${inspectionID}`, { headers }),
        fetch(`http://localhost:8090/api/quality/inspections/${inspectionID}/items`, { headers }),
        fetch(`http://localhost:8090/api/quality/corrections/inspection/${inspectionID}`, { headers }).catch(() => null)
      ]);

      if (resInsp.ok) {
        const inspData = await resInsp.json();
        setInspection(inspData);
        setIsEditing(inspData.status !== "Completed" && inspData.status !== "Pass");
      }

      if (resItems.ok) setItems(await resItems.json());

      if (resCorr && resCorr.ok) {
        const corrData = await resCorr.json();
        setCorrection(corrData);
        setFormData({
          action: corrData.action || "",
          correctedBy: corrData.correctedBy || "",
          remark: corrData.remark || ""
        });
      } else {
        setCorrection(null);
      }
    } catch (error) {
      console.error("Error fetching detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveFix = async () => {
    setSaving(true);
    try {
      const token =
        localStorage.getItem("ff:token") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        "";

      const res = await fetch(`http://localhost:8090/api/quality/corrections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          inspectionID,
          action: formData.action,
          correctedBy: formData.correctedBy,
          remark: formData.remark,
          status: "Pass"
        }),
      });

      if (!res.ok) throw new Error("บันทึกข้อมูลการแก้ไขไม่สำเร็จ");

      alert("บันทึกผลการแก้ไขเรียบร้อยแล้ว");
      setIsEditing(false);
      await fetchDetailData();
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const isCompleted = inspection?.status === "Completed" || inspection?.status === "Pass";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: "#1b2559", pb: 1 }}>
        จัดการข้อบกพร่อง (ID: {inspectionID})
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="fix tabs">
          <Tab label="รายละเอียด" sx={{ fontWeight: tabValue === 0 ? 700 : 400 }} />
          <Tab
            label={(isCompleted && !isEditing) ? "ข้อมูลการแก้ไข" : "บันทึกผลการแก้ไข"}
            sx={{ fontWeight: tabValue === 1 ? 700 : 400 }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ bgcolor: "#f8fafc", px: { xs: 2, sm: 3 }, pb: 4 }}>
        <Box sx={{ mb: 2, p: 2, bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2 }}>
          <Stack direction="row" spacing={4}>
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

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress />
          </Box>
        ) : !inspection ? (
          <Typography color="error" align="center" sx={{ py: 5 }}>
            ไม่พบข้อมูลการตรวจนี้
          </Typography>
        ) : (
          <>
            <CustomTabPanel value={tabValue} index={0}>
              <ProductionFixFormDetails inspection={inspection} items={items} />
            </CustomTabPanel>

            <CustomTabPanel value={tabValue} index={1}>
              <ProductionFixFormCorrection
                correction={correction}
                inspectionStatus={inspection.status}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                formData={formData}
                handleFormChange={handleFormChange}
              />
            </CustomTabPanel>
          </>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          ปิดหน้าต่าง
        </Button>

        {/* แสดงปุ่มบันทึกเฉพาะแท็บ 2 และอยู่ในโหมดกำลังกรอกแบบฟอร์มเท่านั้น */}
        {tabValue === 1 && (!isCompleted || isEditing) && (
          <>
            {isCompleted && (
              <Button onClick={() => setIsEditing(false)} disabled={saving} variant="outlined" color="inherit">
                ยกเลิกการแก้ไข
              </Button>
            )}
            <Button
              onClick={handleSaveFix}
              variant="contained"
              disabled={saving || !formData.action || !formData.correctedBy}
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ bgcolor: "#4a90e2", "&:hover": { bgcolor: "#357abd" } }}
            >
              {saving ? "กำลังบันทึก..." : "บันทึกผลการแก้ไข"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}