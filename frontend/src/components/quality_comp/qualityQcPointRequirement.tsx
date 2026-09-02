import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  IconButton,
  Paper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";

export interface RequirementOption {
  requirementID: string; // ใช้เป็น parameterId ในฝั่ง backend
  checkItem: string;
  unit: string;
}

export interface InspectItemInput {
  requirementID: string;
  checkItem: string;
  specification: string;
  unit: string;
}

interface QualityQcPointRequirementProps {
  inspectItems: InspectItemInput[];
  onChange: (items: InspectItemInput[]) => void;
}

export default function QualityQcPointRequirement({ inspectItems, onChange }: QualityQcPointRequirementProps) {
  const [reqOptions, setReqOptions] = useState<RequirementOption[]>([]);

  // ดึง Master Data ของ Parameter มาแสดงใน Dropdown
  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const token = localStorage.getItem("ff:token") || localStorage.getItem("auth_token") || localStorage.getItem("token") || "";
        const res = await fetch(`http://localhost:8090/api/quality/requirements`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReqOptions(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch requirements", error);
      }
    };
    fetchRequirements();
  }, []);

  const handleAddItem = () => {
    onChange([...inspectItems, { requirementID: "", checkItem: "", specification: "", unit: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (inspectItems.length > 1) {
      const newItems = inspectItems.filter((_, i) => i !== index);
      onChange(newItems);
    }
  };

  const handleSelectChange = (index: number, e: SelectChangeEvent) => {
    const value = e.target.value;
    const newItems = [...inspectItems];
    
    if (value === "OTHER") {
      newItems[index] = { requirementID: "OTHER", checkItem: "", specification: "", unit: "" };
    } else {
      const selectedOpt = reqOptions.find(opt => opt.requirementID === value);
      if (selectedOpt) {
        newItems[index] = {
          requirementID: selectedOpt.requirementID,
          checkItem: selectedOpt.checkItem,
          specification: "", // Spec ให้กรอกใหม่ราย Order
          unit: selectedOpt.unit
        };
      }
    }
    onChange(newItems);
  };

  const handleItemTextChange = (index: number, field: keyof InspectItemInput, value: string) => {
    const newItems = [...inspectItems];
    newItems[index][field] = value;
    onChange(newItems);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#1e293b" }}>
        สิ่งที่ต้องตรวจ
      </Typography>
      <Stack spacing={2}>
        {inspectItems.map((item, index) => {
          const isCustom = item.requirementID === "OTHER";
          return (
            <Paper key={index} variant="outlined" sx={{ p: 2, bgcolor: "#fafafa", borderRadius: 1.5 }}>
              <Box 
                sx={{ 
                  display: "flex", 
                  flexDirection: { xs: "column", sm: "row" }, 
                  alignItems: "center", 
                  gap: 2 
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                  #{index + 1}
                </Typography>
                
                <FormControl size="small" fullWidth required>
                  <InputLabel>เลือกสิ่งที่ต้องตรวจ</InputLabel>
                  <Select
                    value={item.requirementID}
                    label="เลือกสิ่งที่ต้องตรวจ"
                    onChange={(e) => handleSelectChange(index, e)}
                  >
                    {reqOptions.map((opt) => (
                      <MenuItem key={opt.requirementID} value={opt.requirementID}>
                        {opt.checkItem}
                      </MenuItem>
                    ))}
                    <MenuItem value="OTHER">อื่นๆ (ระบุเอง)</MenuItem>
                  </Select>
                </FormControl>

                {isCustom && (
                  <TextField
                    required
                    fullWidth
                    size="small"
                    label="ระบุสิ่งที่ต้องตรวจ"
                    value={item.checkItem}
                    onChange={(e) => handleItemTextChange(index, "checkItem", e.target.value)}
                    placeholder="ระบุรายการ..."
                  />
                )}

                <TextField
                  required
                  fullWidth
                  size="small"
                  label="ข้อกำหนด"
                  value={item.specification}
                  onChange={(e) => handleItemTextChange(index, "specification", e.target.value)}
                  placeholder="เช่น ไม่มีรอยเกิน 2 จุด"
                />

                <TextField
                  required
                  fullWidth
                  size="small"
                  label="หน่วย"
                  value={item.unit}
                  onChange={(e) => handleItemTextChange(index, "unit", e.target.value)}
                  placeholder="เช่น จุด, mm"
                  disabled={!isCustom && item.requirementID !== ""}
                />

                <IconButton 
                  color="error" 
                  onClick={() => handleRemoveItem(index)}
                  disabled={inspectItems.length === 1} 
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Paper>
          );
        })}
        
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddItem}
          sx={{ borderStyle: "dashed", borderRadius: 2, textTransform: "none", py: 1 }}
        >
          เพิ่มสิ่งที่ต้องตรวจ
        </Button>
      </Stack>
    </Box>
  );
}