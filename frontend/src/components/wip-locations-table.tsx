// import { useMemo, useState } from "react";
// import { motion } from "framer-motion";
// import {
//   Autocomplete, Box, Chip, Paper, Table, TableBody, TableCell, TableContainer,
//   TableHead, TableRow, TextField, Typography, Dialog, DialogTitle,
//   DialogContent, DialogContentText, DialogActions, Button,
// } from "@mui/material";
// import { useRole } from "@/lib/roles";
// import { toast } from "sonner";

// export type WorkInProcess = { wipID: string; wip: string; amount: number; unit: string };
// export type WipLocation = { wipLocationID: string; wipID: string; location: string; palletNumber: string; lotNumber: string; amount: number };

// /** Location master */
// export const LOCATION_MASTER = [
//   "A-01-01", "A-01-02", "A-02-01", "A-02-02", "A-03-01",
//   "B-01-01", "B-01-02", "B-02-03", "B-03-02",
//   "C-01-01", "C-02-01", "C-02-02",
// ];

// type Row = {
//   key: string; wipID: string; wip: string; unit: string; amount: number | null;
//   location: string | null; pending: boolean; unallocated: number; wipLocationID?: string;
// };

// /**
//  * ตารางตำแหน่ง WIP — ควบคุมทั้งหมดจาก props (locations มาจาก backend ผ่าน wipLocationsApi)
//  * ไม่มี mock state ภายในตัวเองอีกต่อไป การกด assign ตำแหน่งจะเรียก onAssign
//  * ให้ parent (wip.tsx) เป็นคนยิง API แล้ว reload ข้อมูลจริงกลับมาแสดง
//  */
// export function WipLocationsTable({
//   stocks,
//   locations,
//   onAssign,
// }: {
//   stocks: WorkInProcess[];
//   locations: WipLocation[];
//   onAssign: (wipID: string, location: string, amount: number) => Promise<void>;
// }) {
//   const [draftAmount, setDraftAmount] = useState<Record<string, string>>({});
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [confirm, setConfirm] = useState<{ wipID: string; location: string; amount: number } | null>(null);
//   const [saving, setSaving] = useState<string | null>(null);
//   const { role } = useRole();

//   const rows: Row[] = useMemo(() => {
//     const out: Row[] = [];
//     for (const s of stocks) {
//       const mine = locations.filter((a) => a.wipID === s.wipID);
//       const used = mine.reduce((sum, a) => sum + a.amount, 0);
//       const remaining = Math.max(0, s.amount - used);
//       for (const a of mine) {
//         out.push({
//           key: a.wipLocationID, wipID: s.wipID, wip: s.wip, unit: s.unit,
//           amount: a.amount, location: a.location, pending: false,
//           unallocated: remaining, wipLocationID: a.wipLocationID,
//         });
//       }
//       if (remaining > 0) {
//         out.push({
//           key: `draft-${s.wipID}`, wipID: s.wipID, wip: s.wip, unit: s.unit,
//           amount: null, location: null, pending: true, unallocated: remaining,
//         });
//       }
//     }
//     // แถวที่ยังไม่ได้จัดเก็บ (pending) ขึ้นก่อน
//     return out.sort((a, b) => Number(b.pending) - Number(a.pending));
//   }, [stocks, locations]);

//   const qtyValue = (row: Row) =>
//     draftAmount[row.key] !== undefined
//       ? draftAmount[row.key]
//       : row.amount !== null
//         ? String(row.amount)
//         : "";

//   function validateQty(row: Row, raw: string): number | null {
//     const n = Number(raw);
//     if (!raw.trim() || !Number.isFinite(n)) return null;
//     if (n <= 0) {
//       setErrors((e) => ({ ...e, [row.key]: "จำนวนต้องมากกว่า 0" }));
//       return null;
//     }
//     const cap = row.unallocated + (row.amount ?? 0);
//     if (n > cap) {
//       setErrors((e) => ({ ...e, [row.key]: "จำนวนเกินกว่าที่เหลืออยู่" }));
//       return null;
//     }
//     setErrors((e) => { const c = { ...e }; delete c[row.key]; return c; });
//     return n;
//   }

//   async function doAssign(row: Row, location: string, n: number) {
//     setSaving(row.key);
//     try {
//       await onAssign(row.wipID, location, n);
//       setDraftAmount((d) => { const c = { ...d }; delete c[row.key]; return c; });
//       toast.success(`บันทึกตำแหน่ง ${location} จำนวน ${n.toLocaleString()} ${row.unit}`);
//     } catch (e) {
//       toast.error(e instanceof Error ? e.message : "บันทึกตำแหน่งไม่สำเร็จ");
//     } finally {
//       setSaving(null);
//     }
//   }

//   function saveAllocation(row: Row, location: string) {
//     const raw = qtyValue(row) || String(row.unallocated);
//     const n = validateQty(row, raw);
//     if (n === null) {
//       toast.error(errors[row.key] ?? "กรุณากรอกจำนวนให้ถูกต้อง");
//       return;
//     }
//     const dup = locations.some(
//       (a) => a.wipID === row.wipID && a.location === location && a.wipLocationID !== row.wipLocationID,
//     );
//     if (dup) {
//       setConfirm({ wipID: row.wipID, location, amount: n });
//       return;
//     }
//     void doAssign(row, location, n);
//   }

//   return (
//     <>
//       <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
//         <Table size="small">
//           <TableHead>
//             <TableRow sx={{ "& th": { fontWeight: 700, background: "rgba(74,144,226,0.07)" } }}>
//               <TableCell sx={{ width: 120 }}>WIP ID</TableCell>
//               <TableCell>WIP (ชื่อสินค้า)</TableCell>
//               <TableCell sx={{ width: 190 }}>จำนวนที่เก็บใน location</TableCell>
//               <TableCell sx={{ width: 230 }}>ตำแหน่งที่เก็บ</TableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {rows.map((row, i) => (
//               <TableRow
//                 key={row.key}
//                 component={motion.tr}
//                 initial={{ opacity: 0, y: 6 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ delay: Math.min(i * 0.03, 0.3) }}
//                 sx={{ background: row.location == null ? "rgba(245,158,11,0.10)" : undefined }}
//               >
//                 <TableCell>
//                   <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.wipID}</Typography>
//                 </TableCell>
//                 <TableCell>
//                   <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
//                     <Typography variant="body2">{row.wip}</Typography>
//                     {row.location ? (
//                       <Chip size="small" label="จัดเก็บครบแล้ว" sx={{ bgcolor: "#10B981", color: "#fff", fontWeight: 600 }} />
//                     ) : (
//                       <Chip size="small" label="รอจัดเก็บ" sx={{ bgcolor: "#F59E0B", color: "#fff", fontWeight: 600 }} />
//                     )}
//                   </Box>
//                 </TableCell>
//                 <TableCell>
//                   <Typography variant="body2" sx={{ fontWeight: 600 }}>{qtyValue(row)}</Typography>
//                 </TableCell>
//                 <TableCell>
//                   <Autocomplete
//                     size="small"
//                     options={LOCATION_MASTER}
//                     value={row.location}
//                     disabled={role !== "warehouse" || saving === row.key}
//                     onChange={(_, v) => { if (v) saveAllocation(row, v); }}
//                     renderInput={(params) => (
//                       <TextField
//                         {...params}
//                         variant="standard"
//                         placeholder="คลิกเพื่อระบุตำแหน่ง"
//                       />
//                     )}
//                     sx={{ width: 200 }}
//                   />
//                 </TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </TableContainer>

//       <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)}>
//         <DialogTitle>ตำแหน่งนี้ถูกใช้อยู่แล้ว</DialogTitle>
//         <DialogContent>
//           <DialogContentText>
//             {confirm?.wipID} มีการจัดเก็บที่ {confirm?.location} อยู่แล้ว — ต้องการบันทึกเพิ่มที่ตำแหน่งเดิมหรือไม่?
//           </DialogContentText>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setConfirm(null)}>ยกเลิก</Button>
//           <Button
//             variant="contained"
//             onClick={() => {
//               if (!confirm) return;
//               const row = rows.find((r) => r.wipID === confirm.wipID && r.pending) ?? rows.find((r) => r.wipID === confirm.wipID);
//               if (row) void doAssign(row, confirm.location, confirm.amount);
//               setConfirm(null);
//             }}
//           >
//             ยืนยัน
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </>
//   );
// }

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Autocomplete, Box, Chip, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Button,
} from "@mui/material";
import { useRole } from "@/lib/roles";
import { toast } from "sonner";

export type WorkInProcess = { wipID: string; wip: string; amount: number; unit: string };
export type WipLocation = { wipLocationID: string; wipID: string; location: string; palletNumber: string; lotNumber: string; amount: number };

/** Location master */
export const LOCATION_MASTER = [
  "A-01-01", "A-01-02", "A-02-01", "A-02-02", "A-03-01",
  "B-01-01", "B-01-02", "B-02-03", "B-03-02",
  "C-01-01", "C-02-01", "C-02-02",
];

type Row = {
  key: string; wipID: string; wip: string; unit: string; amount: number | null;
  location: string | null; pending: boolean; unallocated: number; wipLocationID?: string;
};

export function WipLocationsTable({
  stocks,
  locations,
  onAssign,
}: {
  stocks: WorkInProcess[];
  locations: WipLocation[];
  //  เพิ่ม wipLocationID?: string ใน Type Signature
  onAssign: (wipID: string, location: string, amount: number, wipLocationID?: string) => Promise<void>;
}) {
  const [draftAmount, setDraftAmount] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{ wipID: string; location: string; amount: number } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const { role } = useRole();

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const s of stocks) {
      const mine = locations.filter((a) => a.wipID === s.wipID);
      const used = mine.reduce((sum, a) => sum + a.amount, 0);
      const remaining = Math.max(0, s.amount - used);
      for (const a of mine) {
        out.push({
          key: a.wipLocationID, wipID: s.wipID, wip: s.wip, unit: s.unit,
          amount: a.amount, location: a.location, pending: false,
          unallocated: remaining, wipLocationID: a.wipLocationID,
        });
      }
      if (remaining > 0) {
        out.push({
          key: `draft-${s.wipID}`, wipID: s.wipID, wip: s.wip, unit: s.unit,
          amount: null, location: null, pending: true, unallocated: remaining,
        });
      }
    }
    return out.sort((a, b) => Number(b.pending) - Number(a.pending));
  }, [stocks, locations]);

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

  async function doAssign(row: Row, location: string, n: number) {
    setSaving(row.key);
    try {
      //  ส่ง row.wipLocationID ไปด้วย
      await onAssign(row.wipID, location, n, row.wipLocationID);
      setDraftAmount((d) => { const c = { ...d }; delete c[row.key]; return c; });
      toast.success(`บันทึกตำแหน่ง ${location} จำนวน ${n.toLocaleString()} ${row.unit}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกตำแหน่งไม่สำเร็จ");
    } finally {
      setSaving(null);
    }
  }

  function saveAllocation(row: Row, location: string) {
    const raw = qtyValue(row) || String(row.unallocated);
    const n = validateQty(row, raw);
    if (n === null) {
      toast.error(errors[row.key] ?? "กรุณากรอกจำนวนให้ถูกต้อง");
      return;
    }
    const dup = locations.some(
      (a) => a.wipID === row.wipID && a.location === location && a.wipLocationID !== row.wipLocationID,
    );
    if (dup) {
      setConfirm({ wipID: row.wipID, location, amount: n });
      return;
    }
    void doAssign(row, location, n);
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, background: "rgba(74,144,226,0.07)" } }}>
              <TableCell sx={{ width: 120 }}>WIP ID</TableCell>
              <TableCell>WIP (ชื่อสินค้า)</TableCell>
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
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.wipID}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="body2">{row.wip}</Typography>
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
                  <Autocomplete
                    size="small"
                    options={LOCATION_MASTER}
                    value={row.location}
                    disabled={role !== "warehouse" || saving === row.key}
                    onChange={(_, v) => { if (v) saveAllocation(row, v); }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="standard"
                        placeholder="คลิกเพื่อระบุตำแหน่ง"
                      />
                    )}
                    sx={{ width: 200 }}
                  />
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
            {confirm?.wipID} มีการจัดเก็บที่ {confirm?.location} อยู่แล้ว — ต้องการบันทึกเพิ่มที่ตำแหน่งเดิมหรือไม่?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>ยกเลิก</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!confirm) return;
              const row = rows.find((r) => r.wipID === confirm.wipID && r.pending) ?? rows.find((r) => r.wipID === confirm.wipID);
              if (row) void doAssign(row, confirm.location, confirm.amount);
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