import { MenuItem, Select, Stack, Box, Typography } from "@mui/material";
import { useRole, ROLES } from "@/lib/roles";

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  return (
    <Select
      size="small"
      value={role}
      onChange={(e) => setRole(e.target.value as any)}
      sx={{
        minWidth: 220, fontSize: 13, fontWeight: 600,
        "& .MuiSelect-select": { py: 0.75 },
      }}
    >
      {ROLES.map((r) => (
        <MenuItem key={r.key} value={r.key}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: r.color }} />
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{r.short}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{r.label}</Typography>
            </Box>
          </Stack>
        </MenuItem>
      ))}
    </Select>
  );
}