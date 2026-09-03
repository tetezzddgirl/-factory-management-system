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
import ProductionEvenForm, { EventData } from "./productionEvenForm";
import ProductionEvenDetail from "./productionEvenDetail";

export interface EventItem {
  id?: number;
  orderID: string;
  eventType: string;
  startDateTime: string;
  endDateTime?: string;
  description: string;
  impact: string;
  recordedBy?: string;
}

interface ProductionEvenProps {
  orderID?: string;
  orderName?: string;
}

export default function ProductionEven({ orderID, orderName }: ProductionEvenProps) {
  const [eventList, setEventList] = useState<EventItem[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const handleOpenDetail = (event: EventItem) => {
    setSelectedEvent(event);
    setDetailDialogOpen(true);
  };
  
  const fetchEvents = useCallback(async () => {
    if (!orderID) return;
    try {
      const token = localStorage.getItem("ff:token") || localStorage.getItem("auth_token") || "";
      const res = await fetch(`http://localhost:8090/api/production/orders/${orderID}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEventList(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch events", error);
    }
  }, [orderID]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSaveData = async (newData: EventData) => {
    if (!orderID) return alert("ไม่พบรหัสใบสั่งผลิต");
    setLoading(true);

    try {
      const token = localStorage.getItem("ff:token") || localStorage.getItem("auth_token") || "";

      const payload = {
        orderId: orderID,
        eventType: newData.eventType,
        startDateTime: newData.startTime ? new Date(newData.startTime).toISOString() : new Date().toISOString(),
        endDateTime: newData.endTime ? new Date(newData.endTime).toISOString() : null,
        description: newData.description, 
        impact: newData.impact,
        recordedBy: newData.recordedBy,
      };

      const res = await fetch(`http://localhost:8090/api/production/events`, {
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

      await fetchEvents();
      setOpenDialog(false);

    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: "100%", mt: 0 }}>
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
          + เพิ่มเหตุการณ์
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 1.5, border: "1px solid #e0e6ed" }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 700, width: "25%" }}>
                ประเภทเหตุการณ์
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "20%" }}>
                เวลาเริ่ม
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "20%" }}>
                เวลาจบ
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "20%" }}>
                ผู้บันทึก
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "15%", minWidth: 120 }}>
                จัดการ
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eventList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  ยังไม่มีการบันทึกเหตุการณ์
                </TableCell>
              </TableRow>
            ) : (
              eventList.map((row, index) => (
                <TableRow key={row.id || index} hover>
                  <TableCell align="center">{row.eventType}</TableCell>
                  
                  <TableCell align="center">
                    {new Date(row.startDateTime).toLocaleString('th-TH')}
                  </TableCell>
                  
                  <TableCell align="center">
                    {row.endDateTime ? new Date(row.endDateTime).toLocaleString('th-TH') : "ยังไม่ระบุ"}
                  </TableCell>
                  
                  <TableCell align="center">{row.recordedBy || "ยังไม่ระบุ"}</TableCell>
                  
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

      <Dialog open={openDialog} onClose={() => !loading && setOpenDialog(false)} maxWidth="sm" fullWidth sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}>
        <ProductionEvenForm
          orderID={orderID}
          orderName={orderName}
          onSave={handleSaveData}
          onCancel={() => setOpenDialog(false)}
          loading={loading}
        />
      </Dialog>

      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth 
        sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
      >
        <ProductionEvenDetail 
          eventData={selectedEvent} 
          orderID={orderID}
          orderName={orderName} 
          onClose={() => setDetailDialogOpen(false)} 
        />
      </Dialog>
    </Box>
  );
}