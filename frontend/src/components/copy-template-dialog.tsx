import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  TextField, MenuItem, Alert,
} from "@mui/material";
import type { PlanRow } from "./plan-detail-dialog";
import {
  computeRequiredMaterials, formulaOptions, formulaOptionFor, bomIDFromOption,
  type ApiProduct, type ApiFormulaItem, type ApiRawMaterial, type ApiProductionLine,
} from "@/lib/api-client";

export type TemplateResult = { planID: string;  name: string; product: string; bom: string; target: number; priority: string; start: string; due: string };

interface Props {
  open: boolean;
  plans: PlanRow[];
  /** ข้อมูลอ้างอิงไว้ทำ dropdown สินค้า/สูตรการผลิต/สายการผลิต และคำนวณวัตถุดิบที่ต้องใช้อัตโนมัติ เหมือนตอน "สร้างแผนการผลิตใหม่" */
  products: ApiProduct[];
  formulas: ApiFormulaItem[];
  rawMaterial: ApiRawMaterial[];
  productionLines: ApiProductionLine[];
  onClose: () => void;
  onSubmit: (r: TemplateResult) => void;
}

export function CopyTemplateDialog({ open, plans, products, formulas, rawMaterial, productionLines, onClose, onSubmit }: Props) {
  const [sourceId, setSourceId] = useState("");
  const [planID, setPlanID] = useState("");
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [bom, setBom] = useState("");
  const [target, setTarget] = useState("");
  const [priority, setPriority] = useState("ปกติ");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");
  const [requiredMaterials, setRequiredMaterials] = useState("");

  useEffect(() => {
    if (!open) return;
    setSourceId(""); setPlanID(""); setName("");  setProduct(""); setBom("");
    setTarget("");  setStart(""); setDue(""); setRequiredMaterials("");
  }, [open]);

  /** คำนวณวัตถุดิบที่ต้องใช้ใหม่ (เหมือนตอนสร้างแผนการผลิตใหม่) ทุกครั้งที่สินค้าหรือจำนวนที่ผลิตเปลี่ยน */
  function recomputeMaterials(productName: string, targetStr: string) {
    const productID = products.find((p) => p.name === productName)?.productID;
    const amount = Number(targetStr) || 0;
    if (!productID || !amount) {
      setRequiredMaterials("");
      return;
    }
    const need = computeRequiredMaterials(formulas, rawMaterial, productID, amount);
    setRequiredMaterials(
      need.length
        ? need.map((m) => `${m.name} ${m.required.toLocaleString()} ${m.unit} (คงเหลือ ${m.available.toLocaleString()} ${m.unit})`).join(" | ")
        : "ยังไม่มีสูตรการผลิตของสินค้านี้ในระบบ",
    );
  }

  function pick(id: string) {
    setSourceId(id);
    const src = plans.find((p) => p.planID === id);
    if (src) {
      setPlanID(`${src.planID}-COPY`);
      setName(src.name);
      setProduct(src.name);
      const rawBomID = src.bomID || (typeof src.bom === "string" && src.bom !== "-" ? src.bom : "");
      const matchedOption = formulaOptionFor(formulas, products, rawBomID);
    setBom(matchedOption);
      setTarget(String(src.amount));
      setPriority(src.priority ?? "ปกติ");
      // startDate/dueDate ของแผนต้นทางเป็นข้อความไทยที่จัดรูปแบบไว้แสดงผลแล้ว (เช่น "01 ก.ค. 2568")
      // ไม่ใช่รูปแบบ YYYY-MM-DD ที่ <input type="date"> อ่านได้ จึงเว้นว่างไว้ให้เลือกวันที่ใหม่แทน
      setStart("");
      setDue("");
      recomputeMaterials(src.name, String(src.amount));
    }
  }

  function handleProductChange(v: string) {
    setProduct(v);
    const productID = products.find((p) => p.name === v)?.productID;
    const bomID = productID ? formulas.find((f) => f.productID === productID)?.bomID ?? "" : "";
    setBom(formulaOptionFor(formulas, products, bomID));
    recomputeMaterials(v, target);
  }

  function handleTargetChange(v: string) {
    setTarget(v);
    recomputeMaterials(product, v);
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
              <MenuItem key={p.planID} value={p.planID}>{p.planID} — {p.name}</MenuItem>
            ))}
          </TextField>
          {sourceId && <Alert severity="info">ดึงข้อมูลจากแผน {sourceId} มาแล้ว แก้ไขได้ตามต้องการ</Alert>}
          <TextField label="หมายเลขแผนการผลิต" value={planID} onChange={(e) => setPlanID(e.target.value)} />
          <TextField label="ชื่อแผนการผลิต" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField select label="สินค้า" value={product} onChange={(e) => handleProductChange(e.target.value)}>
            {products.map((p) => <MenuItem key={p.productID} value={p.name}>{p.name}</MenuItem>)}
          </TextField>
          <TextField select label="สูตรการผลิต" value={bom} onChange={(e) => setBom(e.target.value)} >
            {formulaOptions(formulas, products).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
          <TextField label="จำนวนที่ผลิต" type="number" value={target} onChange={(e) => handleTargetChange(e.target.value)} />
          <TextField
            label="วัตถุดิบที่ต้องใช้ (คำนวณจากสูตร x จำนวน)" value={requiredMaterials}
            multiline minRows={3} slotProps={{ input: { readOnly: true } }}
            helperText="คำนวณอัตโนมัติจากสูตรการผลิตของสินค้าที่เลือก เทียบกับยอดคงเหลือปัจจุบัน"
          />
          <TextField select label="ลำดับความสำคัญ" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {["สูง", "ปกติ", "ต่ำ"].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth label="วันที่เริ่มผลิต" type="date" value={start}
            onChange={(e) => setStart(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            fullWidth label="กำหนดเสร็จ" type="date" value={due}
            onChange={(e) => setDue(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button
          variant="contained"
          disabled={!sourceId || !product || !target}
          onClick={() => onSubmit({ planID, name, product, bom: bomIDFromOption(bom), target: Number(target) || 0, priority, start, due })}
        >
          บันทึก
        </Button>
      </DialogActions>
    </Dialog>
  );
}
