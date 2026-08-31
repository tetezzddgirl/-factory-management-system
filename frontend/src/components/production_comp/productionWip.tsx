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
  Dialog,
  CircularProgress,
  Typography,
} from "@mui/material";
import ProductionWipForm from "./productionWipForm";
import ProductionWipDetails from "./productionWipDetails";

// --- Types ---
interface TransferRecord {
  transferID: string;
  transferType: string;
  status: string;
  wipLocationID?: string;
  WIPLocationID?: string;
  createDateTime: string;
  createdBy: string;
  remark: string;
}

interface WipLocationItem {
  wipLocationID: string; // Primary Key ของตาราง Location
  location: string;
  PalletNumber: string;
  lotNumber: string;
  amount: number;
  wipID: string;         // FK ที่ชี้ไปหาชื่อสินค้า
}

interface WorkInProcessItem {
  wipID: string;
  wip: string;
}

interface ProductionWipProps {
  orderID?: string;
  orderName?: string;
}

export default function ProductionWip({ orderID, orderName }: ProductionWipProps) {
  const [transferList, setTransferList] = useState<TransferRecord[]>([]);
  const [locationMap, setLocationMap] = useState<Record<string, WipLocationItem>>({});
  const [wipMap, setWipMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRecord | null>(null);

  const fetchWipData = useCallback(async () => {
    if (!orderID) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("ff:token") || localStorage.getItem("token") || "";
      const headers = { Authorization: `Bearer ${token}` };

      // ยิง API ดึงข้อมูล 3 ตารางพร้อมกัน
      const [resTransfers, resLocations, resWip] = await Promise.all([
        fetch(`http://localhost:8090/api/production/orders/${orderID}/transfers`, { headers }),
        fetch(`http://localhost:8090/api/wip/locations`, { headers }),
        fetch(`http://localhost:8090/api/wip`, { headers }),
      ]);

      // 1. ดึงชื่อสินค้า (WIP Master) มาเก็บเป็น Map { wipID: "ชื่อสินค้า" }
      if (resWip.ok) {
        const wipData: WorkInProcessItem[] = await resWip.json();
        const mapping: Record<string, string> = {};
        (wipData || []).forEach((item) => {
          mapping[item.wipID] = item.wip;
        });
        setWipMap(mapping);
      }

      // 2. ดึง WIP Location มาเก็บเป็น Map { wipLocationID: ข้อมูลLocation }
      if (resLocations.ok) {
        const locData = await resLocations.json();
        const mapping: Record<string, WipLocationItem> = {};
        (locData || []).forEach((loc: any) => {
          const id = loc.wipLocationID || loc.WipLocationID || loc.wip_location_id || loc.id;
          if (id) mapping[id] = loc;
        });
        setLocationMap(mapping);
      }

      // 3. ดึง Transfer Records และกรองเอาเฉพาะประเภท WIP
      if (resTransfers.ok) {
        const trfData = await resTransfers.json();
        const trfArray: TransferRecord[] = Array.isArray(trfData) ? trfData : [];
        
        // กรองข้อมูลตั้งแต่ตรงนี้
        const filteredTransfers = trfArray.filter((item: any) => {
          const type = (item.transferType || item.TransferType || "").toString().trim().toUpperCase();
          return type === "WIP";
        });
        
        setTransferList(filteredTransfers);
      } else {
        setTransferList([]);
      }
    } catch (error) {
      console.error("Failed to fetch production data:", error);
      setTransferList([]);
    } finally {
      setLoading(false);
    }
  }, [orderID]);

  useEffect(() => {
    fetchWipData();
  }, [fetchWipData]);

  const handleOpenDetail = (transfer: TransferRecord) => {
    setSelectedTransfer(transfer);
    setDetailDialogOpen(true);
  };

const getStatusChip = (status?: string) => {
    if (!status || status === "Pending" || status === "รอรับ") {
      return <Chip label="รอรับ" size="small" sx={{ bgcolor: "#f59e0b", color: "#fff", fontWeight: 600, minWidth: 80 }} />;
    }
    if (status === "Received" || status === "รับแล้ว" || status === "Completed") {
      return <Chip label="รับแล้ว" size="small" sx={{ bgcolor: "#10b981", color: "#fff", fontWeight: 600, minWidth: 80 }} />;
    }
    return <Chip label={status} size="small" sx={{ bgcolor: "#A4ABB6", color: "#fff", fontWeight: 600, minWidth: 80 }} />;
  };

  return (
    <Box sx={{ width: "100%", mt: 0 }}>
      {/* ปุ่มเพิ่มข้อมูล */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-start" }}>
        <Button
          variant="contained"
          disableElevation
          onClick={() => setOpenDialog(true)}
          sx={{
            bgcolor: "#4a90e2", color: "#fff", borderRadius: 2, fontWeight: 600, px: 4,
            textTransform: "none", "&:hover": { bgcolor: "#357abd" },
          }}
        >
          + เพิ่ม
        </Button>
      </Box>

      {/* ตารางแสดงผล */}
      <TableContainer component={Paper} sx={{ borderRadius: 1.5, border: "1px solid #e0e6ed" }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 700, width: "20%" }}>รหัสพาเลท</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "30%" }}>ชื่อสินค้า</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "15%" }}>จำนวน</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "15%" }}>สถานะ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "20%", minWidth: 120 }}>จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : transferList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  ยังไม่มีการบันทึกข้อมูล WIP สำหรับงานผลิตนี้
                </TableCell>
              </TableRow>
            ) : (
              // ลูปแสดงผลจาก Transfer Records ที่ผ่านการกรองแล้ว
              transferList.map((transfer) => {
                
                // 1. ดึงค่า FK จากตาราง Transfer
                const fkLocationID = transfer.wipLocationID || transfer.WIPLocationID || "";
                
                // 2. นำ FK ไปดึงข้อมูล Location (เพื่อเอารหัสพาเลท, จำนวน, และ wipID)
                const locationData = locationMap[fkLocationID] || ({} as Partial<WipLocationItem>);
                
                // 3. นำ wipID ไปดึงชื่อสินค้ามาแสดง
                const productName = wipMap[locationData.wipID || ""] || locationData.wipID || "-";

                return (
                  <TableRow key={transfer.transferID} hover>
                    <TableCell align="center" sx={{ fontWeight: 500 }}>
                      {locationData.PalletNumber || "-"}
                    </TableCell>
                    
                    <TableCell align="center">
                      {productName}
                    </TableCell>
                    
                    <TableCell align="center">
                      {locationData.amount ? locationData.amount.toLocaleString() : "0"}
                    </TableCell>
                    
                    <TableCell align="center">
                      {getStatusChip(transfer.status)}
                    </TableCell>
                    
                    <TableCell align="center">
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => handleOpenDetail(transfer)}
                      >
                        รายละเอียด
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Popup เพิ่มข้อมูล */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth 
        sx={{ "& .MuiDialog-paper": { borderRadius: 3, p: 0} }}
      >
        <ProductionWipForm 
          orderID={orderID || ""}
          orderName={orderName}
          onClose={() => setOpenDialog(false)} 
          onSave={() => {
            fetchWipData(); 
            setOpenDialog(false);
          }} 
        />
      </Dialog>

      {/* Popup Detail View */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth 
        sx={{ "& .MuiDialog-paper": { borderRadius: 3, p: 0 } }}
      >
        {selectedTransfer && (() => {
          // ดึงข้อมูลมารอไว้เพื่อส่งเป็น Props
          const fkLocationID = selectedTransfer.wipLocationID || selectedTransfer.WIPLocationID || "";
          const locationData = locationMap[fkLocationID] || ({} as Partial<WipLocationItem>);
          const productName = wipMap[locationData.wipID || ""] || locationData.wipID || "-";

          return (
            <ProductionWipDetails
              transferData={selectedTransfer}
              PalletNumber={locationData.PalletNumber || "-"}
              wipName={productName}
              amount={locationData.amount || 0}
              orderID={orderID}
              orderName={orderName}
              onClose={() => setDetailDialogOpen(false)}
            />
          );
        })()}
      </Dialog>
    </Box>
  );
}