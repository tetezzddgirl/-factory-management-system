import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Stack,
  Grid,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
} from "@mui/material";
<<<<<<< HEAD
import { employeesApi, type ApiEmployee, employeeFullName } from "@/lib/api-client";
=======
import { personnelApi, type ApiPersonnel } from "@/lib/api-client";
>>>>>>> origin/diw-test2

export interface TransferRecord {
  transferType: string;
  status: string;
  createDateTime: string;
  createdBy: string;
  transferDateTime?: string;
  receivedBy?: string;
  remark: string;
}

interface ProductionWipDetailProps {
  transferData: TransferRecord | null;
  PalletNumber: string;
  wipName: string;
  amount: number;
  orderID?: string;
  orderName?: string;
  onClose: () => void;
}

export default function ProductionWipDetails({
  transferData,
  PalletNumber,
  wipName,
  amount,
  orderID,
  orderName,
  onClose,
}: ProductionWipDetailProps) {
  const [personnelMap, setPersonnelMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
<<<<<<< HEAD
        const people = await employeesApi.list();
        const map: Record<string, string> = {};
        (people ?? []).forEach((e: ApiEmployee) => {
          if (e.employeeId) {
            map[e.employeeId] = `${e.employeeId} — ${employeeFullName(e)}`;
=======
        const people = await personnelApi.list();
        const map: Record<string, string> = {};
        (people ?? []).forEach((p: ApiPersonnel) => {
          if (p.id) {
            map[p.id] = `${p.id} — ${p.name}`;
>>>>>>> origin/diw-test2
          }
        });
        setPersonnelMap(map);
      } catch (e) {
        console.error("Failed to load personnel list:", e);
      }
    })();
  }, []);

  if (!transferData) return null;

  const getPersonnelDisplay = (idOrName?: string) => {
    if (!idOrName) return "-";
    // ถ้าใน DB เก็บแค่ ID (เช่น PSN-003) ให้เอามาแปลงเปรียบเทียบกับ Map
    const cleanId = idOrName.split(" — ")[0].trim();
    return personnelMap[cleanId] || idOrName;
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

  const isValidDate = (dateString?: string) => {
    if (!dateString) return false;
    return !dateString.startsWith("0001-01-01");
  };

  return (
    <Box>
      <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
        รายละเอียดการโอนย้าย WIP
      </DialogTitle>
      <Divider />

      <DialogContent>
        {/* --- ส่วนแสดงรายละเอียด Order --- */}
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

        {/* --- ส่วนแสดงรายละเอียดการโอนย้าย --- */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">รหัสพาเลท (Palette)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {PalletNumber || "-"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">ชื่อสินค้า (WIP Name)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {wipName || "-"}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">จำนวน (Amount)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {amount ? amount.toLocaleString() : "0"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>สถานะ (Status)</Typography>
            {getStatusChip(transferData.status)}
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">เวลาที่บันทึก (Create Date)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {isValidDate(transferData.createDateTime) 
                ? new Date(transferData.createDateTime).toLocaleString("th-TH") 
                : "-"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">ผู้บันทึก (Created By)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {getPersonnelDisplay(transferData.createdBy)}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">เวลาที่รับ (Transfer Date)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {isValidDate(transferData.transferDateTime)
                ? new Date(transferData.transferDateTime!).toLocaleString("th-TH") 
                : "ยังไม่ระบุเวลา"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">ผู้รับ (Received By)</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {getPersonnelDisplay(transferData.receivedBy)}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>หมายเหตุ (Remark)</Typography>
            <Box sx={{ p: 1.5, bgcolor: "#f1f5f9", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {transferData.remark || "ไม่มีหมายเหตุ"}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          disableElevation
        >
          ปิดหน้าต่าง
        </Button>
      </DialogActions>
    </Box>
  );
}