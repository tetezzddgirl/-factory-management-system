import React from "react";
import {
  Box,
  Button,
  Typography,
  Stack,
  Grid, // ถ้าใช้ MUI v6 จะใช้ Grid แบบมี size
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import { EventItem } from "./productionEven"; // ดึง Type มาจากไฟล์หลัก

interface ProductionEvenDetailProps {
  eventData: EventItem | null;
  orderName?: string;
  onClose: () => void;
}

export default function ProductionEvenDetail({ eventData, orderName, onClose }: ProductionEvenDetailProps) {
  if (!eventData) return null;

  return (
    <Box>
      <DialogTitle sx={{ fontWeight: 700, color: "#1b2559" }}>
        รายละเอียดเหตุการณ์
      </DialogTitle>
      <Divider />

      <DialogContent>
        {/* --- ส่วนแสดงรายละเอียด Order --- */}
        <Box sx={{ mb: 3, p: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2 }}>
          <Stack direction="column" spacing={0.75}>
            <Typography sx={{ fontSize: "1rem", color: "text.secondary" }}>
              คำสั่งผลิต:{" "}
              <Box component="span" sx={{ fontWeight: 600, color: "#1e293b" }}>
                {orderName || "ไม่ระบุชื่อ"}
              </Box>
            </Typography>
            <Typography sx={{ fontSize: "1rem", color: "text.secondary" }}>
              ID:{" "}
              <Box component="span" sx={{ fontWeight: 600, color: "#1e293b" }}>
                {eventData.orderId || "-"}
              </Box>
            </Typography>
          </Stack>
        </Box>

        {/* --- ส่วนแสดงรายละเอียดเหตุการณ์ --- */}
        <Grid container spacing={3}>
          {/* แถว 1: ประเภท และ ผู้บันทึก */}
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

          {/* แถว 2: เวลาเริ่ม และ เวลาจบ */}
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

          {/* แถว 3: รายละเอียด */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>รายละเอียดเหตุการณ์</Typography>
            <Box sx={{ p: 1.5, bgcolor: "#f1f5f9", borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {eventData.description || "ไม่มีรายละเอียด"}
              </Typography>
            </Box>
          </Grid>

          {/* แถว 4: ผลกระทบ */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>ผลกระทบที่เกิดขึ้น</Typography>
            <Box sx={{ p: 1.5, bgcolor: "#fef2f2", borderRadius: 1.5, border: "1px solid #fecaca" }}>
              <Typography variant="body2" sx={{ color: "#991b1b", whiteSpace: "pre-wrap" }}>
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
          sx={{ bgcolor: "#475467", "&:hover": { bgcolor: "#344054" } }}
        >
          ปิดหน้าต่าง
        </Button>
      </DialogActions>
    </Box>
  );
}