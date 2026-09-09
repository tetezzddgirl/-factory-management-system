// FRESH-12 — shared filter widgets for the ported "บุคลากร" page and the
// assignee picker in "งานและการมอบหมาย".
//
// Ported 1:1 in BEHAVIOUR and WORDING from the original FactoryFlow
// `components/personnel-filters.tsx` (`DepartmentTabs`, `EmployeeSearchInput`),
// re-expressed with MUI primitives (Chip, TextField) instead of the original's
// Tailwind buttons — the final app is MUI.

import { Search } from "@mui/icons-material";
import { Box, Chip, InputAdornment, TextField } from "@mui/material";
import { DEPARTMENTS, ALL_DEPARTMENTS, type DeptFilter } from "@/lib/factoryflow-personnel";

/** แถบเลือกแผนก: "ทั้งหมด (N)" + ปุ่มต่อแผนกพร้อมตัวเลขนับ — เหมือนต้นฉบับ */
export function DepartmentTabs({
  value,
  onChange,
  counts,
  total,
}: {
  value: DeptFilter;
  onChange: (v: DeptFilter) => void;
  counts: Record<string, number>;
  total: number;
}) {
  const items: { key: DeptFilter; label: string; count: number }[] = [
    { key: ALL_DEPARTMENTS, label: "ทั้งหมด", count: total },
    ...DEPARTMENTS.map((d) => ({ key: d, label: d, count: counts[d] ?? 0 })),
  ];
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {items.map((it) => {
        const active = value === it.key;
        return (
          <Chip
            key={it.key}
            label={`${it.label} (${it.count})`}
            onClick={() => onChange(it.key)}
            color={active ? "primary" : "default"}
            variant={active ? "filled" : "outlined"}
            sx={{ fontWeight: active ? 700 : 500, borderRadius: 2 }}
          />
        );
      })}
    </Box>
  );
}

/** ช่องค้นหาพนักงาน — placeholder/พฤติกรรมเหมือนต้นฉบับ */
export function EmployeeSearchInput({
  value,
  onChange,
  placeholder = "ค้นหาชื่อ นามสกุล หรือ Employee ID",
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  return (
    <TextField
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      size="small"
      fullWidth
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
