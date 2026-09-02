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

interface TransferRecord {
  transferID: string;
  transferType: string;
  status: string;
  wipLocationID?: string;
  WIPLocationID?: string;
  wip_location_id?: string;
  createDateTime: string;
  createdBy: string;
  remark: string;
}

interface WipLocationItem {
  wipLocationID?: string;
  WipLocationID?: string;
  wip_location_id?: string;
  location?: string;
  palletNumber?: string;
  PalletNumber?: string;
  pallet_number?: string;
  paletteNumber?: string;
  palette_number?: string;
  lotNumber?: string;
  amount?: number;
  Amount?: number;
  wipID?: string;
  WipID?: string;
  wip_id?: string;
}

interface WorkInProcessItem {
  wipID: string;
  wip: string;
  unit?: string;
}

interface ProductionWipProps {
  orderID?: string;
  orderName?: string;
}

export default function ProductionWip({ orderID, orderName }: ProductionWipProps) {
  const [transferList, setTransferList] = useState<TransferRecord[]>([]);
  const [locationMap, setLocationMap] = useState<Record<string, WipLocationItem>>({});
  const [wipMap, setWipMap] = useState<Record<string, string>>({});
  const [unitMap, setUnitMap] = useState<Record<string, string>>({});
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

      const [resTransfers, resLocations, resWip] = await Promise.all([
        fetch(`http://localhost:8090/api/production/orders/${orderID}/transfers`, { headers }),
        fetch(`http://localhost:8090/api/wip/locations`, { headers }),
        fetch(`http://localhost:8090/api/wip`, { headers }),
      ]);

      if (resWip.ok) {
        const wipData: WorkInProcessItem[] = await resWip.json();
        const mapping: Record<string, string> = {};
        const uMapping: Record<string, string> = {};
        (wipData || []).forEach((item) => {
          mapping[item.wipID] = item.wip;
          uMapping[item.wipID] = item.unit || "-";
        });
        setWipMap(mapping);
        setUnitMap(uMapping);
      }

      if (resLocations.ok) {
        const locData = await resLocations.json();
        const mapping: Record<string, WipLocationItem> = {};
        (locData || []).forEach((loc: any) => {
          const id = loc.wipLocationID || loc.WipLocationID || loc.wip_location_id || loc.id;
          if (id) mapping[String(id)] = loc;
        });
        setLocationMap(mapping);
      }

      if (resTransfers.ok) {
        const trfData = await resTransfers.json();
        const trfArray: TransferRecord[] = Array.isArray(trfData) ? trfData : [];
        
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
    if (!status || status === "Pending") {
      return <Chip label="รอรับ" size="small" sx={{ bgcolor: "#f59e0b", color: "#fff", fontWeight: 600, minWidth: 80 }} />;
    }
    if (status === "Received" || status === "Completed") {
      return <Chip label="รับแล้ว" size="small" sx={{ bgcolor: "#10b981", color: "#fff", fontWeight: 600, minWidth: 80 }} />;
    }
    if (status === "Canceled" || status === "Cancelled") {
      return <Chip label="ยกเลิก" size="small" sx={{ bgcolor: "#ef4444", color: "#fff", fontWeight: 600, minWidth: 80 }} />;
    }
    return <Chip label={status} size="small" sx={{ bgcolor: "#A4ABB6", color: "#fff", fontWeight: 600, minWidth: 80 }} />;
  };

  return (
    <Box sx={{ width: "100%", mt: 0 }}>
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
          + เพิ่ม WIP
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 1.5, border: "1px solid #e0e6ed" }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 700, width: "20%" }}>รหัสพาเลท</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "25%" }}>ชื่อสินค้า</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "10%" }}>จำนวน</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "10%" }}>หน่วย</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "15%" }}>สถานะ</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: "20%", minWidth: 120 }}>จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : transferList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  ยังไม่มีการบันทึกข้อมูล WIP สำหรับงานผลิตนี้
                </TableCell>
              </TableRow>
            ) : (
              transferList.map((transfer: any) => {
                const fkLocationID = transfer.wipLocationID || transfer.WIPLocationID || transfer.wip_location_id || "";
                const locationData = locationMap[String(fkLocationID)] || ({} as WipLocationItem);
                
                const displayPallet = locationData.palletNumber || locationData.PalletNumber || locationData.pallet_number || locationData.paletteNumber || locationData.palette_number || "-";
                const displayAmount = locationData.amount ?? locationData.Amount ?? 0;
                const locWipID = locationData.wipID || locationData.WipID || locationData.wip_id || "";
                const productName = wipMap[locWipID] || locWipID || "-";
                const productUnit = unitMap[locWipID] || "-";

                return (
                  <TableRow key={transfer.transferID} hover>
                    <TableCell align="center" sx={{ fontWeight: 500 }}>
                      {displayPallet}
                    </TableCell>
                    
                    <TableCell align="center">
                      {productName}
                    </TableCell>
                    
                    <TableCell align="center">
                      {displayAmount ? displayAmount.toLocaleString() : "0"}
                    </TableCell>

                    <TableCell align="center">
                      {productUnit}
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

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth 
        sx={{ "& .MuiDialog-paper": { borderRadius: 2, p: 0} }}
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

      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth 
        sx={{ "& .MuiDialog-paper": { borderRadius: 2, p: 0 } }}
      >
        {selectedTransfer && (() => {
          const fkLocationID = selectedTransfer.wipLocationID || selectedTransfer.WIPLocationID || selectedTransfer.wip_location_id || "";
          const locationData = locationMap[String(fkLocationID)] || ({} as WipLocationItem);
          
          const displayPallet = locationData.palletNumber || locationData.PalletNumber || locationData.pallet_number || locationData.paletteNumber || locationData.palette_number || "-";
          const displayAmount = locationData.amount ?? locationData.Amount ?? 0;
          const locWipID = locationData.wipID || locationData.WipID || locationData.wip_id || "";
          const productName = wipMap[locWipID] || locWipID || "-";

          return (
            <ProductionWipDetails
              transferData={selectedTransfer}
              PalletNumber={displayPallet}
              wipName={productName}
              amount={displayAmount}
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