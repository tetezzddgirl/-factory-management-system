import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  TextField, MenuItem, Alert,
} from "@mui/material";
import type { PlanRow } from "./plan-detail-dialog";

export type TemplateResult = { planID: string;  name: string; product: string; bom: string; target: number; line:string; priority: string; start: string; due: string };

interface Props {
  open: boolean;
  plans: PlanRow[];
  onClose: () => void;
  onSubmit: (r: TemplateResult) => void;
}

export function CopyTemplateDialog({ open, plans, onClose, onSubmit }: Props) {
  const [sourceId, setSourceId] = useState("");
  const [planID, setPlanID] = useState("");
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [bom, setBom] = useState("");
  const [target, setTarget] = useState("");
  const [line, setMachine] = useState("");
  const [priority, setPriority] = useState("ปกติ");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");

  useEffect(() => {
    if (!open) return;
    setSourceId(""); setPlanID(""); setName("");  setProduct(""); setBom("");
    setTarget(""); setMachine("");  setStart(""); setDue("");
  }, [open]);

  function pick(id: string) {
    setSourceId(id);
    const src = plans.find((p) => p.id === id);
    if (src) {
      setPlanID(`${src.id}-COPY`);
      setName(src.product);
      setProduct(src.product);
      setBom(src.bom);
      setTarget(String(src.target));
      setMachine(src.line ?? "");
      setPriority(src.priority ?? "ปกติ");
      setStart(src.start ?? "");
      setDue(src.due);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>ปรับแต่งแผนการผลิตเดิม (Copy as Template)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            select label="เลือกหมายเลข / ชื่อแผนการผลิต" value={sourceId}
            onChange={(e) => pick(e.target.value)}
          >
            {plans.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.id} — {p.product}</MenuItem>
            ))}
          </TextField>
          {sourceId && <Alert severity="info">ดึงข้อมูลจากแผน {sourceId} มาแล้ว แก้ไขได้ตามต้องการ</Alert>}
          <TextField label="หมายเลขแผนการผลิต" value={planID} onChange={(e) => setPlanID(e.target.value)} />
          <TextField label="ชื่อแผนการผลิต" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="สินค้า" value={product} onChange={(e) => setProduct(e.target.value)} />
          <TextField label="สูตรการผลิต" value={bom} onChange={(e) => setBom(e.target.value)} />
          <TextField label="จำนวนที่ผลิต" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
          <TextField label="ลำดับสายการผลิตที่ใช้งาน" value={line} onChange={(e) => setMachine(e.target.value)} />
          <TextField select label="ลำดับความสำคัญ" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {["สูง", "ปกติ", "ต่ำ"].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
          <TextField label="วันที่เริ่มผลิต" value={start} onChange={(e) => setStart(e.target.value)} />
          <TextField label="กำหนดเสร็จ" value={due} onChange={(e) => setDue(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button
          variant="contained"
          disabled={!sourceId || !product || !target}
          onClick={() => onSubmit({ planID, name, product, bom, target: Number(target) || 0,line, priority, start, due})}
        >
          บันทึก
        </Button>
      </DialogActions>
    </Dialog>
  );
}