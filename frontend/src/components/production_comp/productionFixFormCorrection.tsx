import React from "react";
import { Box, Typography, Paper, Stack, Divider, Button, TextField } from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";

interface ProductionFixFormCorrectionProps {
  correction: any;
  inspectionStatus: string;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  formData: { action: string; correctedBy: string; remark: string };
  handleFormChange: (field: string, value: string) => void;
}

export default function ProductionFixFormCorrection({
  correction,
  inspectionStatus,
  isEditing,
  setIsEditing,
  formData,
  handleFormChange
}: ProductionFixFormCorrectionProps) {

  const isCompleted = inspectionStatus === "Completed" || inspectionStatus === "Pass";

  if (isCompleted && !isEditing) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: "#fff" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography sx={{ fontWeight: 700, color: "#1e293b", fontSize: "1.1rem" }}>
            รายละเอียดผลการแก้ไข
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            onClick={() => setIsEditing(true)}
            sx={{ textTransform: "none", borderRadius: 1.5 }}
          >
            แก้ไขข้อมูล
          </Button>
        </Box>

        <Stack spacing={2.5}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                รหัสใบแจ้งแก้ไข
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b" }}>
                {(correction && correction.correctionID) ? correction.correctionID : "-"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                วันเวลาที่บันทึก
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b" }}>
                {(correction && correction.correctionDateTime)
                  ? new Date(correction.correctionDateTime).toLocaleString("th-TH")
                  : "-"}
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              การดำเนินการแก้ไข (Action Taken)
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: "#f8fafc", borderRadius: 1.5 }}>
              <Typography variant="body2" sx={{ color: "#334155", whiteSpace: "pre-wrap" }}>
                {(correction && correction.action) ? correction.action : "-"}
              </Typography>
            </Paper>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                ผู้บันทึกการแก้ไข
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#1e293b" }}>
                {(correction && correction.correctedBy) ? correction.correctedBy : "-"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                หมายเหตุ
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, color: "#334155" }}>
                {(correction && correction.remark) ? correction.remark : "-"}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: "#fff" }}>
      <Typography sx={{ fontWeight: 700, mb: 3, color: "#1e293b" }}>
        ฟอร์มบันทึกผลการดำเนินการแก้ไข
      </Typography>

      <Stack spacing={3}>
        <TextField
          label="การดำเนินการแก้ไข (Action Taken)"
          required
          multiline
          rows={3}
          fullWidth
          value={formData.action}
          onChange={(e) => handleFormChange("action", e.target.value)}
          placeholder="ระบุสิ่งที่ได้ดำเนินการแก้ไขไปแล้ว..."
        />

        <TextField
          label="ผู้บันทึกการแก้ไข (Corrected By)"
          required
          fullWidth
          value={formData.correctedBy}
          onChange={(e) => handleFormChange("correctedBy", e.target.value)}
        />

        <TextField
          label="หมายเหตุเพิ่มเติม (ถ้ามี)"
          multiline
          rows={2}
          fullWidth
          value={formData.remark}
          onChange={(e) => handleFormChange("remark", e.target.value)}
        />
      </Stack>
    </Paper>
  );
}