import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  InputLabel
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import QualityQcForm, { QcPointExtended } from "./qualityQcForm";
import QualityQcDetail from "./qualityQcDetail"; // 👈 นำเข้า Component หน้าต่างรายละเอียด

export interface InspectionRecord {
  inspectionID: string;
  inspectionPointID: string;
  pointName?: string;
  inspectionDateTime: string;
  inspectedBy: string;
  status: string;
}

interface QualityQcProps {
  orderID: string;
  orderName?: string;
}

export default function QualityQc({ orderID, orderName }: QualityQcProps) {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [points, setPoints] = useState<QcPointExtended[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // 👈 เพิ่ม State สำหรับควบคุมหน้าต่างรายละเอียด
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInspectionID, setSelectedInspectionID] = useState<string>("");

  const fetchData = useCallback(async () => {
    if (!orderID) return;
    setLoading(true);
    try {
      const token =
        localStorage.getItem("ff:token") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        "";
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const resPoints = await fetch(`http://localhost:8090/api/quality/orders/${orderID}/points`, { headers });
        if (resPoints.ok) {
          const data = await resPoints.json();
          const pointsData = Array.isArray(data) ? data : data.data || data.points || [];
          setPoints(pointsData);
        }
      } catch (e) {
        console.error("Error fetching points:", e);
      }

      try {
        const resInspections = await fetch(`http://localhost:8090/api/quality/orders/${orderID}/inspections`, { headers });
        if (resInspections.ok) {
          const data = await resInspections.json();
          const inspectionList = Array.isArray(data) ? data : data.data || [];
          setInspections(inspectionList);
        }
      } catch (e) {
        console.error("Error fetching inspections:", e);
      }
    } finally {
      setLoading(false);
    }
  }, [orderID]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pointNameMap = points.reduce<Record<string, string>>((acc, pt) => {
    acc[pt.inspectionPointID] = pt.pointName;
    return acc;
  }, {});

  const filteredInspections =
    selectedPoint === "all"
      ? inspections
      : inspections.filter((item) => item.inspectionPointID === selectedPoint);

  // 👈 ฟังก์ชันเปิดหน้าต่างรายละเอียด
  const handleOpenDetail = (inspectionID: string) => {
    setSelectedInspectionID(inspectionID);
    setDetailOpen(true);
  };

  const renderStatusChip = (status: string) => {
    switch (status) {
      case "PendingCorrection":
      case "Pending":
        return (
          <Chip
            label="รอแก้ไข"
            size="small"
            sx={{
              bgcolor: "#F59E0B",
              color: "#fff",
              fontWeight: 600,
              minWidth: 80
            }}
          />
        );
      case "Completed":
        return (
          <Chip
            label="แก้ไขเสร็จสิ้น"
            size="small"
            sx={{
              bgcolor: "#10B981",
              color: "#fff",
              fontWeight: 600,
              minWidth: 80
            }}
          />
        );
      case "Pass":
        return (
          <Chip
            label="ผ่าน"
            size="small"
            sx={{
              bgcolor: "#10B981",
              color: "#fff",
              fontWeight: 600,
              minWidth: 80
            }}
          />
        );
      case "Fail":
        return (
          <Chip
            label="ไม่ผ่าน"
            size="small"
            sx={{
              bgcolor: "#EF4444",
              color: "#fff",
              fontWeight: 600,
              minWidth: 80
            }}
          />
        );
      default:
        return (
          <Chip
            label={status || "-"}
            size="small"
            sx={{
              fontWeight: 600,
              minWidth: 80
            }}
          />
        );
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="select-point-label" sx={{ fontWeight: 600 }}>
            เลือกจุดตรวจ
          </InputLabel>
          <Select
            labelId="select-point-label"
            value={selectedPoint}
            label="เลือกจุดตรวจ"
            onChange={(e) => setSelectedPoint(e.target.value)}
            sx={{ bgcolor: "#fff", borderRadius: 1.5 }}
          >
            <MenuItem value="all" sx={{ fontWeight: "bold" }}>
              แสดงทั้งหมด ({points.length} จุดตรวจ)
            </MenuItem>
            {points.map((pt) => (
              <MenuItem key={pt.inspectionPointID} value={pt.inspectionPointID}>
                {pt.pointName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            bgcolor: "#4a90e2",
            "&:hover": { bgcolor: "#357abd" },
            textTransform: "none",
            borderRadius: 2
          }}
          onClick={() => setIsFormOpen(true)}
        >
          เพิ่มผลตรวจ
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 1.5, border: "1px solid #e0e6ed" }}>
        <Table size="medium">
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 700, width: "8%" }}>ลำดับ</TableCell>
              {selectedPoint === "all" && (
                <TableCell align="center" sx={{ fontWeight: 700, width: "22%" }}>จุดตรวจ</TableCell>
              )}
              <TableCell align="center" sx={{ fontWeight: 700, width: "22%" }}>วัน-เวลาที่ตรวจ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "18%" }}>ผู้ตรวจ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "15%" }}>สถานะ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "15%" }}>จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={selectedPoint === "all" ? 6 : 5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : filteredInspections.length > 0 ? (
              filteredInspections.map((row, index) => (
                <TableRow key={row.inspectionID || index} hover>
                  <TableCell align="center">{index + 1}</TableCell>
                  {selectedPoint === "all" && (
                    <TableCell align="center" sx={{ fontWeight: 500, color: "#334155" }}>
                      {pointNameMap[row.inspectionPointID] || row.pointName || row.inspectionPointID || "-"}
                    </TableCell>
                  )}
                  <TableCell align="center">
                    {row.inspectionDateTime ? new Date(row.inspectionDateTime).toLocaleString("th-TH") : "-"}
                  </TableCell>
                  <TableCell align="center">{row.inspectedBy || "-"}</TableCell>
                  <TableCell align="center">
                    {renderStatusChip(row.status)}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: "none", borderRadius: 1.5 }}
                      onClick={() => handleOpenDetail(row.inspectionID)} // 👈 เรียกใช้งานที่นี่
                    >
                      รายละเอียด
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={selectedPoint === "all" ? 6 : 5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  ไม่มีประวัติการบันทึกผลตรวจสำหรับจุดตรวจนี้
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <QualityQcForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        orderID={orderID}
        orderName={orderName}
        points={points}
        initialPointID={selectedPoint}
        onSuccess={fetchData}
      />

      {/* 👈 เพิ่ม Component นี้ไว้ด้านล่างสุด */}
      <QualityQcDetail
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        orderID={orderID}
        orderName={orderName}
        inspectionID={selectedInspectionID}
      />
    </Box>
  );
}