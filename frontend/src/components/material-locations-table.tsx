import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Box, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Button,
} from "@mui/material";
import { useRole } from "@/lib/roles";
import { toast } from "sonner";
import { materialLocationsApi, type ApiRawMaterialLocation } from "@/lib/api-client";

export type RawMaterial = { rmID: string; rawMaterial: string; amount: number; unit: string };

export const LOCATION_MASTER = [
  "A-01-01", "A-01-02", "A-02-01", "A-02-02", "A-03-01",
  "B-01-01", "B-01-02", "B-02-03", "B-03-02",
  "C-01-01", "C-02-01", "C-02-02",
];

type Row = {  key: string;  rmID: string; rawMaterial: string; unit: string; amount: number | null; 
  location: string | null;  pending: boolean; unallocated: number;  rmLocationID?: string;  };

export function RMLocationsTable({ stocks }: { stocks: RawMaterial[] }) {
  const [rawMaterialLocation, setRawMaterialLocation] = useState<ApiRawMaterialLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftAmount, setDraftAmount] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{ rmID: string; location: string; amount: number } | null>(null);
  const { role } = useRole();

  async function loadLocations() {
    setLoading(true);
    try {
      const data = await materialLocationsApi.list();
      setRawMaterialLocation(data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "โหลดตำแหน่งจัดเก็บไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  const unallocatedFor = (rmID: string, excludeId?: string) => {
    const stock = stocks.find((s) => s.rmID === rmID);
    if (!stock) return 0;
    const used = rawMaterialLocation
      .filter((a) => a.rmID === rmID && a.rmLocationID !== excludeId)
      .reduce((s, a) => s + a.amount, 0);
    return Math.max(0, stock.amount - used);
  };

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const s of stocks) {
      const mine = rawMaterialLocation.filter((a) => a.rmID === s.rmID);
      const used = mine.reduce((sum, a) => sum + a.amount, 0);
      const remaining = Math.max(0, s.amount - used);
      for (const a of mine) {
        out.push({
          key: a.rmLocationID, rmID: s.rmID, rawMaterial: s.rawMaterial, unit: s.unit,
          amount: a.amount, location: a.location, pending: false,
          unallocated: remaining, rmLocationID: a.rmLocationID,
        });
      }
    }
    // pending rows first
    return out.sort((a, b) => Number(b.pending) - Number(a.pending));
  }, [stocks, rawMaterialLocation]);

  const qtyValue = (row: Row) =>
    draftAmount[row.key] !== undefined
      ? draftAmount[row.key]
      : row.amount !== null
        ? String(row.amount)
        : "";

  function validateQty(row: Row, raw: string): number | null {
    const n = Number(raw);
    if (!raw.trim() || !Number.isFinite(n)) return null;
    if (n <= 0) {
      setErrors((e) => ({ ...e, [row.key]: "จำนวนต้องมากกว่า 0" }));
      return null;
    }
    const cap = row.unallocated + (row.amount ?? 0);
    if (n > cap) {
      setErrors((e) => ({ ...e, [row.key]: "จำนวนเกินกว่าที่เหลืออยู่" }));
      return null;
    }
    setErrors((e) => { const c = { ...e }; delete c[row.key]; return c; });
    return n;
  }

  async function commitQty(row: Row) {
    const raw = qtyValue(row);
    const n = validateQty(row, raw);
    if (n === null || !row.rmLocationID || !row.location) return;
    try {
      await materialLocationsApi.update(row.rmLocationID, n, row.location);
      setRawMaterialLocation((prev) => prev.map((a) => (a.rmLocationID === row.rmLocationID ? { ...a, amount: n } : a)));
      setDraftAmount((d) => { const c = { ...d }; delete c[row.key]; return c; });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกจำนวนไม่สำเร็จ");
    }
  }

  function saveAllocation(row: Row, location: string) {
    const raw = qtyValue(row) || String(row.unallocated);
    const n = validateQty(row, raw);
    if (n === null) {
      toast.error(errors[row.key] ?? "กรุณากรอกจำนวนให้ถูกต้อง");
      return;
    }
    const dup = rawMaterialLocation.some(
      (a) => a.rmID === row.rmID && a.location === location && a.rmLocationID !== row.rmLocationID,
    );
    if (dup) {
      setConfirm({ rmID: row.rmID, location, amount: n });
      return;
    }
    applySave(row, location, n);
  }

  async function applySave(row: Row, location: string, n: number) {
    try {
      if (row.rmLocationID) {
        await materialLocationsApi.update(row.rmLocationID, n, location);
        setRawMaterialLocation((prev) => prev.map((a) => (a.rmLocationID === row.rmLocationID ? { ...a, amount: n, location } : a)));
      } else {
        const created = await materialLocationsApi.create({
          rmID: row.rmID, amount: n, location, paletteNumber: "", lotNumber: "",
        });
        setRawMaterialLocation((prev) => [...prev, created]);
      }
      setDraftAmount((d) => { const c = { ...d }; delete c[row.key]; return c; });
      toast.success(`บันทึกตำแหน่ง ${location} จำนวน ${n.toLocaleString()} ${row.unit}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกตำแหน่งไม่สำเร็จ");
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: "center", py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, background: "rgba(74,144,226,0.07)" } }}>
              <TableCell sx={{ width: 120 }}>RM ID</TableCell>
              <TableCell>ชื่อวัตถุดิบ</TableCell>
              <TableCell sx={{ width: 190 }}>จำนวนที่เก็บใน location</TableCell>
              <TableCell sx={{ width: 230 }}>ตำแหน่งที่เก็บ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={row.key}
                component={motion.tr}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                sx={{ background: row.location == null ? "rgba(245,158,11,0.10)" : undefined }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.rmID}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="body2">{row.rawMaterial}</Typography>
                    {row.location ? (
                      <Chip size="small" label="จัดเก็บครบแล้ว" sx={{ bgcolor: "#10B981", color: "#fff", fontWeight: 600 }} />
                    ) : (
                      <Chip size="small" label="รอจัดเก็บ" sx={{ bgcolor: "#F59E0B", color: "#fff", fontWeight: 600 }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{qtyValue(row)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.location}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)}>
        <DialogTitle>ตำแหน่งนี้ถูกใช้อยู่แล้ว</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm?.rmID} มีการจัดเก็บที่ {confirm?.location} อยู่แล้ว — ต้องการบันทึกเพิ่มที่ตำแหน่งเดิมหรือไม่?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>ยกเลิก</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!confirm) return;
              const row = rows.find((r) => r.rmID === confirm.rmID && r.pending) ?? rows.find((r) => r.rmID === confirm.rmID);
              if (row) applySave(row, confirm.location, confirm.amount);
              setConfirm(null);
            }}
          >
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
