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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from "@mui/material";

interface QualityQcDetailProps {
  open: boolean;
  onClose: () => void;
  inspectionID: string;
  orderID?: string;
  orderName?: string;
}

export default function QualityQcDetail({ 
  open, 
  onClose, 
  inspectionID, 
  orderID, 
  orderName 
}: QualityQcDetailProps) {
  const [loading, setLoading] = useState(false);
  const [inspection, setInspection] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [correction, setCorrection] = useState<any>(null);

  useEffect(() => {
    if (open && inspectionID) {
      fetchDetailData();
    } else {
      setInspection(null);
      setItems([]);
      setCorrection(null);
    }
  }, [open, inspectionID]);

  const fetchDetailData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("ff:token") || localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
      const headers = { Authorization: `Bearer ${token}` };

      const [resInsp, resItems, resCorr] = await Promise.all([
        fetch(`http://localhost:8090/api/quality/inspections/${inspectionID}`, { headers }),
        fetch(`http://localhost:8090/api/quality/inspections/${inspectionID}/items`, { headers }),
        fetch(`http://localhost:8090/api/quality/corrections/inspection/${inspectionID}`, { headers }).catch(() => null)
      ]);

      if (resInsp.ok) setInspection(await resInsp.json());
      if (resItems.ok) setItems(await resItems.json());
      if (resCorr && resCorr.ok) setCorrection(await resCorr.json());
      
    } catch (error) {
      console.error("Error fetching detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusChip = (status: string) => {
    if (status === "Pending" || status === "PendingCorrection") {
      return <Chip label="รอแก้ไข" size="small" sx={{ bgcolor: "#F59E0B", color: "#fff", fontWeight: 600 }} />;
    }
    if (status === "Pass" || status === "Completed") {
      return <Chip label="เสร็จสิ้น" size="small" sx={{ bgcolor: "#10B981", color: "#fff", fontWeight: 600 }} />;
    }
    if (status === "Fail") {
      return <Chip label="ไม่ผ่าน" size="small" sx={{ bgcolor: "#EF4444", color: "#fff", fontWeight: 600 }} />;
    }
    return <Chip label={status || "-"} size="small" />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
        รายละเอียดผลการตรวจ (ID: {inspectionID})
      </DialogTitle>
      <Divider />

      <DialogContent>
        {/* ส่วนแสดงข้อมูลใบสั่งผลิต แบบเดียวกับหน้า Add */}
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

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress />
          </Box>
        ) : !inspection ? (
          <Typography color="error" align="center" sx={{ py: 5 }}>
            ไม่พบข้อมูลการตรวจนี้
          </Typography>
        ) : (
          <Stack spacing={3}>
            {/* 1. ข้อมูลทั่วไป */}
            <Box>
              <Typography sx={{ fontWeight: 600, color: "#1e293b", mb: 1.5 }}>
                ข้อมูลทั่วไป
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: "#fff" }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    รหัสจุดตรวจ: <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>{inspection.inspectionPointID}</Box>
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    วันเวลาที่ตรวจ: <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>{new Date(inspection.inspectionDateTime).toLocaleString("th-TH")}</Box>
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    ผู้ตรวจ: <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>{inspection.inspectedBy}</Box>
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 1 }}>
                    สถานะ: {renderStatusChip(inspection.status)}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ gridColumn: { xs: "span 1", sm: "span 2" }, color: "text.secondary" }}>
                    ผลประเมินภาพรวม:{" "}
                    <Box component="span" sx={{ color: inspection.overallResult === "Pass" ? "#10B981" : "#EF4444", fontWeight: 700 }}>
                      {inspection.overallResult === "Pass" ? "ผ่าน (Pass)" : "ไม่ผ่าน (Fail)"}
                    </Box>
                  </Typography>

                  {inspection.overallResult === "Fail" && (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      แนวทางการแก้ไข (เบื้องต้น): <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>{inspection.actionGuideline || "-"}</Box>
                    </Typography>
                  )}
                  
                  <Typography variant="body2" sx={{ gridColumn: { xs: "span 1", sm: "span 2" }, color: "text.secondary" }}>
                    หมายเหตุ: <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>{inspection.remark || "-"}</Box>
                  </Typography>
                </Box>
              </Paper>
            </Box>

            {/* 2. รายการที่ต้องตรวจสอบ (InspectionItems) */}
            <Box>
              <Typography sx={{ fontWeight: 600, color: "#1e293b", mb: 1.5 }}>
                รายการตรวจสอบ ({items.length} รายการ)
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "#f8fafc" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: "30%" }}>รหัสข้อกำหนด</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: "25%" }}>ค่าที่วัดได้</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, width: "15%" }}>ผล</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: "30%" }}>หมายเหตุ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length > 0 ? items.map((item) => (
                      <TableRow key={item.itemID}>
                        <TableCell sx={{ color: "text.secondary" }}>{item.requirementID}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{item.actualValue || "-"}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={item.result === "Pass" ? "ผ่าน" : "ไม่ผ่าน"} 
                            size="small" 
                            sx={{ 
                              bgcolor: item.result === "Pass" ? "#10B981" : "#EF4444", 
                              color: item.result === "Pass" ? "#fff" : "#fff",
                              fontWeight: 600 
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>{item.remark || "-"}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          ไม่มีรายการตรวจสอบย่อย
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* 3. ข้อมูลการแก้ไข (CorrectionRecord) ถ้ามี */}
            {correction && (
              <Box>
                <Typography sx={{ fontWeight: 600, color: "#854d0e", mb: 1.5 }}>
                  ใบแจ้งแก้ไข (Correction Record: {correction.correctionID})
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: "#fefce8", borderColor: "#fef08a" }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      การดำเนินการแก้ไข (Action): <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>{correction.action || "รอการระบุ"}</Box>
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      ผู้แก้ไข: <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>{correction.correctedBy || "-"}</Box>
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      สถานะการแก้ไข: <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>{correction.status || "-"}</Box>
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      หมายเหตุการแก้ไข: <Box component="span" sx={{ color: "#1e293b", fontWeight: 500 }}>{correction.remark || "-"}</Box>
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained">
          ปิดหน้าต่าง
        </Button>
      </DialogActions>
    </Dialog>
  );
}