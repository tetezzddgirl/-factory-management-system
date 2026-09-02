import React from "react";
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
} from "@mui/material";
import { EventItem } from "./productionEven";

interface ProductionEvenDetailProps {
  eventData: EventItem | null;
  orderID?: string;
  orderName?: string;
  onClose: () => void;
}

export default function ProductionEvenDetail({ eventData, orderID, orderName, onClose }: ProductionEvenDetailProps) {
  if (!eventData) return null;

  return (
    <Box>
      <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
        รายละเอียดเหตุการณ์
      </DialogTitle>
      <Divider />

      <DialogContent>
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

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">ประเภทเหตุการณ์</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {eventData.eventType}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">ผู้บันทึก</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {eventData.recordedBy || "-"}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">เวลาที่เริ่มเกิดเหตุ</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {new Date(eventData.startDateTime).toLocaleString("th-TH")}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">เวลาที่สิ้นสุด</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1e293b" }}>
              {eventData.endDateTime ? new Date(eventData.endDateTime).toLocaleString("th-TH") : "ยังไม่ระบุ"}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>รายละเอียดเหตุการณ์</Typography>
            <Box sx={{ p: 1.5, bgcolor: "#f1f5f9", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {eventData.description || "ไม่มีรายละเอียด"}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>ผลกระทบที่เกิดขึ้น</Typography>
            <Box sx={{ p: 1.5, bgcolor: "#f1f5f9", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {eventData.impact || "ไม่มีผลกระทบระบุไว้"}
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
          sx={{ bgcolor: "#4a90e2", color: "#fff", fontWeight: 600, px: 4, textTransform: "none", "&:hover": { bgcolor: "#357abd" }, }}
        >
          ปิดหน้าต่าง
        </Button>
      </DialogActions>
    </Box>
  );
}