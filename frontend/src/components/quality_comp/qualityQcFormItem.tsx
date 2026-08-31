import React from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { InspectItemDetail } from "./qualityQcForm";

export interface ItemData {
  requirementID: string;
  actualValue: string;
  result: "Pass" | "Fail" | "";
  remark: string;
}

interface QualityQcFormItemProps {
  items: InspectItemDetail[];
  itemsData: Record<string, ItemData>;
  onChange: (requirementID: string, field: keyof ItemData, value: string) => void;
}

export default function QualityQcFormItem({
  items,
  itemsData,
  onChange,
}: QualityQcFormItemProps) {
  if (!items || items.length === 0) return null;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "#334155" }}>
        รายการที่ต้องตรวจสอบ ({items.length} รายการ)
      </Typography>
      <Stack spacing={2}>
        {items.map((item, idx) => (
          <Paper key={item.requirementID} variant="outlined" sx={{ p: 2, bgcolor: "#fff", borderRadius: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start' }} >
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {idx + 1}. {item.name}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {item.spec} {item.unit}
                </Typography>
              </Box>

              <TextField
                size="small"
                label="ค่าที่วัดได้ (Actual Value)"
                value={itemsData[item.requirementID]?.actualValue || ""}
                onChange={(e) => onChange(item.requirementID, "actualValue", e.target.value)}
                sx={{ width: { xs: "100%", md: 150 } }}
              />

              <ToggleButtonGroup
                size="small"
                value={itemsData[item.requirementID]?.result || ""}
                exclusive
                onChange={(_e, val) => val && onChange(item.requirementID, "result", val)}
                sx={{ height: 40 }}
              >
                <ToggleButton
                  value="Pass"
                  sx={{
                    px: 2,
                    color: "success.main",
                    "&.Mui-selected": { bgcolor: "success.light", color: "success.dark" },
                  }}
                >
                  ผ่าน
                </ToggleButton>
                <ToggleButton
                  value="Fail"
                  sx={{
                    px: 2,
                    color: "error.main",
                    "&.Mui-selected": { bgcolor: "error.light", color: "error.dark" },
                  }}
                >
                  ไม่ผ่าน
                </ToggleButton>
              </ToggleButtonGroup>

              <TextField
                size="small"
                label="หมายเหตุ"
                value={itemsData[item.requirementID]?.remark || ""}
                onChange={(e) => onChange(item.requirementID, "remark", e.target.value)}
                sx={{ flex: 1, minWidth: { xs: "100%", md: 150 } }}
              />
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}