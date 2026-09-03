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
  Dialog,
} from "@mui/material";

import QualityQcPointAdd from "./qualityQcPointAdd";
import QualityQcPointDetails from "./qualityQcPointDetails";

export interface QcPointItem {
  id?: number;
  orderID: string;
  pointName: string;        // ชื่อจุดตรวจ
  itemsToInspect: number;   // จำนวนสิ่งที่ต้องตรวจ
  inspectionSheets: number; // จำนวนใบตรวจ
  status: string;
}

interface QualityQcPointProps {
  orderID?: string;
  orderName?: string;
}

export default function QualityQcPoint({ orderID, orderName }: QualityQcPointProps) {
  const [qcPointList, setQcPointList] = useState<QcPointItem[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<QcPointItem | null>(null);

  const handleOpenDetail = (point: QcPointItem) => {
    setSelectedPoint(point);
    setDetailDialogOpen(true);
  };
  
  const fetchQcPoints = useCallback(async () => {
    if (!orderID) return;
    try {
      const token = localStorage.getItem("ff:token") || localStorage.getItem("auth_token") || "";
      const res = await fetch(`http://localhost:8090/api/quality/orders/${orderID}/points`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQcPointList(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch QC points", error);
    }
  }, [orderID]);

  useEffect(() => {
    fetchQcPoints();
  }, [fetchQcPoints]);

  const handleSaveData = async (newData: any) => { 
    if (!orderID) return alert("ไม่พบรหัสคำสั่งผลิต");
    setLoading(true);

    try {
      const token = localStorage.getItem("ff:token") || localStorage.getItem("auth_token") || "";
      
      const payload = {
        orderId: orderID,
        pointName: newData.pointName,
        description: newData.description,
        inspectItems: newData.inspectItems
      };

      const res = await fetch(`http://localhost:8090/api/quality/points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("บันทึกข้อมูลไม่สำเร็จ");
      }

      await fetchQcPoints();
      setOpenDialog(false);

    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: "100%", mt: 0 }}>
      {/* ส่วนปุ่ม + เพิ่มจุดตรวจ */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-start" }}>
        <Button
          variant="contained"
          disableElevation
          onClick={() => setOpenDialog(true)}
          sx={{
            bgcolor: "#4a90e2", color: "#fff", fontWeight: 600, px: 4,
            textTransform: "none", "&:hover": { bgcolor: "#357abd" },
          }}
        >
          + เพิ่มจุดตรวจ
        </Button>
      </Box>

      {/* ตารางแสดงผล */}
      <TableContainer component={Paper} sx={{ borderRadius: 1.5, border: "1px solid #e0e6ed" }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 700, width: "30%" }}>
                ชื่อจุดตรวจ
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "25%" }}>
                จำนวนสิ่งที่ต้องตรวจ
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "25%" }}>
                จำนวนใบตรวจ
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "20%", minWidth: 120 }}>
                จัดการ
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {qcPointList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  ยังไม่มีการระบุจุดตรวจคุณภาพ
                </TableCell>
              </TableRow>
            ) : (
              qcPointList.map((row, index) => (
                <TableRow key={row.id || index} hover>
                  <TableCell align="center" sx={{ fontWeight: 500 }}>
                    {row.pointName}
                  </TableCell>
                  
                  <TableCell align="center">
                    {row.itemsToInspect || 0}
                  </TableCell>
                  
                  <TableCell align="center">
                    {row.inspectionSheets || 0}
                  </TableCell>
                  
                  <TableCell align="center">
                    <Button variant="outlined" size="small" onClick={() => handleOpenDetail(row)}>
                      รายละเอียด
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Popup Form */}
{/* Popup Form เพิ่มจุดตรวจ */}
      <Dialog 
        open={openDialog} 
        onClose={() => !loading && setOpenDialog(false)} 
        maxWidth="md" 
        fullWidth 
        sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
      >
        <QualityQcPointAdd
          orderID={orderID}
          orderName={orderName}
          onSave={handleSaveData}
          onCancel={() => setOpenDialog(false)}
          loading={loading}
        />
      </Dialog>

      {/* Popup Detail รายละเอียดจุดตรวจ */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="md" 
        fullWidth 
        sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
      >
        <QualityQcPointDetails
          pointData={selectedPoint} 
          orderName={orderName} 
          onClose={() => setDetailDialogOpen(false)} 
        />
      </Dialog>
    </Box>
  );
}