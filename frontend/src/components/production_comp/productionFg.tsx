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
import ProductionFgForm from "./productionFgForm";
import ProductionFgDetails, { TransferRecord as FgTransferRecord } from "./productionFgDetails";

interface TransferRecord {
  transferID: string;
  transferType: string;
  status: string;
  wipLocationID?: string;
  WIPLocationID?: string;
  finishedGoodsId?: string; // อัปเดตให้ตรงกับ DB ใหม่
  FinishedGoodsID?: string; // อัปเดตให้ตรงกับ DB ใหม่
  createDateTime: string;
  createdBy: string;
  remark: string;
  transferDateTime?: string;
  receivedBy?: string;
}

interface FinishedGoodsItem {
  finishedGoodsId: string;
  palletNumber: string;
  quantity: number;
  productName: string;
}

interface ProductionFgProps {
  orderID?: string;
  orderName?: string;
}

export default function ProductionFg({ orderID, orderName }: ProductionFgProps) {
  const [transferList, setTransferList] = useState<TransferRecord[]>([]);
  const [fgMap, setFgMap] = useState<Record<string, FinishedGoodsItem>>({});
  const [loading, setLoading] = useState<boolean>(true);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRecord | null>(null);

  const fetchFgData = useCallback(async () => {
    if (!orderID) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("ff:token") || localStorage.getItem("token") || "";
      const headers = { Authorization: `Bearer ${token}` };

      const [resTransfers, resFg] = await Promise.all([
        fetch(`http://localhost:8090/api/production/orders/${orderID}/transfers`, { headers }),
        fetch(`http://localhost:8090/api/production/finished-goods`, { headers }), // อัปเดต Endpoint
      ]);

      if (resFg.ok) {
        const fgData: FinishedGoodsItem[] = await resFg.json();
        const mapping: Record<string, FinishedGoodsItem> = {};
        (fgData || []).forEach((item: any) => {
          const id = item.finishedGoodsId || item.FinishedGoodsID || item.id;
          if (id) mapping[id] = item;
        });
        setFgMap(mapping);
      }

      if (resTransfers.ok) {
        const trfData = await resTransfers.json();
        const trfArray: TransferRecord[] = Array.isArray(trfData) ? trfData : [];
        
        const filteredTransfers = trfArray.filter((item: any) => {
          const type = (item.transferType || item.TransferType || "").toString().trim().toUpperCase();
          return type === "FG";
        });
        
        setTransferList(filteredTransfers);
      } else {
        setTransferList([]);
      }
    } catch (error) {
      console.error("Failed to fetch FG production data:", error);
      setTransferList([]);
    } finally {
      setLoading(false);
    }
  }, [orderID]);

  useEffect(() => {
    fetchFgData();
  }, [fetchFgData]);

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
          + เพิ่มสินค้าสำเร็จรูป
        </Button>
      </Box>

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
                  ยังไม่มีการบันทึกข้อมูลสินค้าสำเร็จรูป (FG) สำหรับงานผลิตนี้
                </TableCell>
              </TableRow>
            ) : (
              transferList.map((transfer) => {
                const fgID = transfer.finishedGoodsId || transfer.FinishedGoodsID || "";
                const fgInfo = fgMap[fgID] || ({} as Partial<FinishedGoodsItem>);
                const productName = fgInfo.productName || "-";

                return (
                  <TableRow key={transfer.transferID} hover>
                    <TableCell align="center" sx={{ fontWeight: 500 }}>
                      {fgInfo.palletNumber || "-"}
                    </TableCell>
                    <TableCell align="center">
                      {productName}
                    </TableCell>
                    <TableCell align="center">
                      {fgInfo.quantity ? fgInfo.quantity.toLocaleString() : "0"}
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
        sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
      >
        <ProductionFgForm 
          orderID={orderID || ""}
          orderName={orderName}
          onClose={() => setOpenDialog(false)} 
          onSave={() => {
            fetchFgData(); 
            setOpenDialog(false);
          }} 
        />
      </Dialog>

      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth 
        sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
      >
        {selectedTransfer && (() => {
          const fgID = selectedTransfer.finishedGoodsId || selectedTransfer.FinishedGoodsID || "";
          const fgInfo = fgMap[fgID] || ({} as Partial<FinishedGoodsItem>);
          const productName = fgInfo.productName || "-";

          return (
            <ProductionFgDetails
              transferData={selectedTransfer as FgTransferRecord}
              palletNumber={fgInfo.palletNumber || "-"}
              productName={productName}
              quantity={fgInfo.quantity || 0}
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