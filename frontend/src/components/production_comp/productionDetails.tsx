import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

interface MachineStatus {
  id: number;
  name: string;
  status: "normal" | "maintenance" | "stopped";
  operator: string;
  shift: string;
}

const machineList: MachineStatus[] = [
  { id: 1, name: "เครื่องจักร1", status: "normal", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 2, name: "เครื่องจักร1", status: "maintenance", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 3, name: "เครื่องจักร1", status: "stopped", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 4, name: "เครื่องจักร1", status: "normal", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
  { id: 5, name: "เครื่องจักร1", status: "normal", operator: "สมชาย ก.", shift: "กะเช้า: 08:00 - 16:00 น." },
];

export default function ProductionDetails() {
  const getStatusChip = (status: MachineStatus["status"]) => {
    switch (status) {
      case "normal":
        return <Chip label="ปกติ" sx={{ bgcolor: "#00E200", color: "#fff", fontWeight: "bold", minWidth: 80 }} size="small" />;
      case "maintenance":
        return <Chip label="กำลังซ่อม" sx={{ bgcolor: "#FAD800", color: "#333", fontWeight: "bold", minWidth: 80 }} size="small" />;
      case "stopped":
        return <Chip label="หยุด" sx={{ bgcolor: "#ff5252", color: "#fff", fontWeight: "bold", minWidth: 80 }} size="small" />;
    }
  };

  return (
    <Box sx={{ p: 2, bgcolor: "#f4f7fe", width: "100%" }}>
    </Box>
  );
}