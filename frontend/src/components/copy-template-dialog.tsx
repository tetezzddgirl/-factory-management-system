import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  TextField, MenuItem, Alert,
} from "@mui/material";
import type { PlanRow } from "./plan-detail-dialog";
import {
  computeRequiredMaterials, formulaOptions, formulaOptionFor, formulaIDFromOption,
  type ApiProduct, type ApiFormulaItem, type ApiRawMaterial, type ApiProductionLine,
} from "@/lib/api-client";
import { plansApi } from "@/lib/api-client";
import { Today } from "@mui/icons-material";

export type TemplateResult = { planID: string;  name: string; product: string; formula: string; target: number; priority: string; start: string; due: string };

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
  const [formula, setFormula] = useState("");
  const [target, setTarget] = useState("");
  const [priority, setPriority] = useState("ปกติ");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");
  const [requiredMaterials, setRequiredMaterials] = useState("");

  function getToday() {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  }

  useEffect(() => {
    if (!open) return;
    const today = getToday();
    setSourceId(""); setPlanID(""); setName("");  setProduct(""); setFormula("");
    setTarget("");  setStart(today); setDue(today); setRequiredMaterials("");

    plansApi
    .getNextID()
    .then((res) => setPlanID(res.planID))
    .catch(() => {});
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
    const today = getToday();
    if (src) {
      setName(src.name);
      setProduct(src.name);
      const rawFormulaID = src.formulaID || (typeof src.formula === "string" && src.formula !== "-" ? src.formula : "");
      const matchedOption = formulaOptionFor(formulas, products, rawFormulaID);
    setFormula(matchedOption);
      setTarget(String(src.amount));
      setPriority(src.priority ?? "ปกติ");
      // startDate/dueDate ของแผนต้นทางเป็นข้อความไทยที่จัดรูปแบบไว้แสดงผลแล้ว (เช่น "01 ก.ค. 2568")
      // ไม่ใช่รูปแบบ YYYY-MM-DD ที่ <input type="date"> อ่านได้ จึงเว้นว่างไว้ให้เลือกวันที่ใหม่แทน
      setStart(today);
      setDue(today);
      recomputeMaterials(src.name, String(src.amount));
    }
  }

  function handleProductChange(v: string) {
    setProduct(v);
    const productID = products.find((p) => p.name === v)?.productID;
    const formulaID = productID ? formulas.find((f) => f.productID === productID)?.formulaID ?? "" : "";
    setFormula(formulaOptionFor(formulas, products, formulaID));
    recomputeMaterials(v, target);
  }

  function handleTargetChange(v: string) {
    setTarget(v);
    recomputeMaterials(product, v);
  }

  // วันที่กำหนดเสร็จต้องไม่มาก่อนวันที่เริ่มผลิต
  const dateError = Boolean(start && due && due < start);

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
          <TextField label="หมายเลขแผนการผลิต" value={planID} disabled helperText="ระบบกำหนดให้อัตโนมัติ" />
          <TextField label="ชื่อแผนการผลิต" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField select label="สินค้า" value={product} onChange={(e) => handleProductChange(e.target.value)}>
            {products.map((p) => <MenuItem key={p.productID} value={p.name}>{p.name}</MenuItem>)}
          </TextField>
          <TextField select label="สูตรการผลิต" value={formula} onChange={(e) => setFormula(e.target.value)} >
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
            error={dateError}
            helperText={dateError ? "ต้องไม่มาก่อนวันที่เริ่มผลิต" : undefined}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button
          variant="contained"
          disabled={!sourceId || !product || !target || dateError}
          onClick={() => onSubmit({ planID, name, product, formula: formulaIDFromOption(formula), target: Number(target) || 0, priority, start, due })}
        >
          บันทึก
        </Button>
      </DialogActions>
    </Dialog>
  );
}
