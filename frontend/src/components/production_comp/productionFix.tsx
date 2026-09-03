import React, { useState, useEffect, useCallback } from "react";
import {
  CircularProgress,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button
} from "@mui/material";

import ProductionFixForm from "./productionFixForm";

interface InspectionRecord {
  inspectionID: string;
  inspectionPointID: string;
  pointName?: string;
  inspectionDateTime: string;
  inspectedBy: string;
  overallResult?: string;
  status: string;
}

interface ProductionFixProps {
  orderID: string;
  orderName: string;
}

export default function ProductionFix({ orderID, orderName }: ProductionFixProps) {
  const [loading, setLoading] = useState(false);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);

  // State สำหรับเปิดหน้าต่างรายละเอียด / บันทึกผล
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInspectionID, setSelectedInspectionID] = useState("");

  const fetchInspections = useCallback(async () => {
    if (!orderID) return;
    setLoading(true);
    try {
      const token =
        localStorage.getItem("ff:token") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        "";
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`http://localhost:8090/api/quality/orders/${orderID}/inspections`, { headers });
      if (res.ok) {
        const data = await res.json();
        const rawList: InspectionRecord[] = Array.isArray(data) ? data : data.data || [];
        
        // กรองเอาเฉพาะรายการที่ผลการประเมินภาพรวมไม่ผ่าน (Fail)
        const failedList = rawList.filter((item) => 
          item.overallResult === "Fail" || 
          item.status === "Pending" || 
          item.status === "PendingCorrection" || 
          item.status === "Fail"
        );
        setInspections(failedList);
      }
    } catch (e) {
      console.error("Error fetching inspections:", e);
    } finally {
      setLoading(false);
    }
  }, [orderID]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const handleOpenAction = (id: string) => {
    setSelectedInspectionID(id);
    setDetailOpen(true);
  };

  const renderStatusChip = (status: string) => {
    if (status === "Pending" || status === "PendingCorrection") {
      return <Chip label="รอแก้ไข" size="small" sx={{ bgcolor: "#F59E0B", color: "#fff", fontWeight: 600 }} />;
    }
    if (status === "Pass" || status === "Completed") {
      return <Chip label="แก้ไขเสร็จสิ้น" size="small" sx={{ bgcolor: "#10B981", color: "#fff", fontWeight: 600 }} />;
    }
    if (status === "Fail") {
      return <Chip label="ไม่ผ่าน" size="small" sx={{ bgcolor: "#EF4444", color: "#fff", fontWeight: 600 }} />;
    }
    return <Chip label={status || "-"} size="small" />;
  };

  return (
    <Box sx={{ width: "100%", mt: 0 }}>
      {/* ตารางแสดงผล */}
      <TableContainer component={Paper} sx={{ borderRadius: 1.5, border: "1px solid #e0e6ed"}}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 700, width: "10%" }}>ลำดับ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "40%" }}>ชื่อจุดตรวจ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "25%" }}>สถานะ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "25%", minWidth: 150 }}>จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : inspections.length > 0 ? (
              inspections.map((row, index) => (
                <TableRow key={row.inspectionID} hover>
                  <TableCell align="center">{index + 1}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 500, color: "#334155" }}>
                    {row.pointName || row.inspectionPointID || "-"}
                  </TableCell>
                  <TableCell align="center">
                    {renderStatusChip(row.status)}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: "none", borderRadius: 1.5 }}
                      onClick={() => handleOpenAction(row.inspectionID)}
                    >
                      รายละเอียด/บันทึก
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  ไม่พบประวัติข้อบกพร่องที่ไม่ผ่านการตรวจสอบ
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* หน้าต่างจัดการข้อบกพร่อง (รายละเอียด + บันทึกผล) */}
      <ProductionFixForm
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          fetchInspections(); // รีเฟรชตารางเมื่อปิด Popup
        }}
        inspectionID={selectedInspectionID}
        orderID={orderID}
        orderName={orderName}
      />
    </Box>
  );
}