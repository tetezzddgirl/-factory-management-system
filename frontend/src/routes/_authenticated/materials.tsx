import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Layers, Inventory2, Warning, SouthWest, NorthEast, Refresh, SwapHoriz, Add } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography, Button, LinearProgress, Tabs, Tab } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";
import { useRole } from "@/lib/roles";
import { RMLocationsTable, LOCATION_MASTER } from "@/components/material-locations-table";
import { materialsApi, materialLocationsApi, materialRecordsApi, workOrdersApi, personnelApi, productsApi, formulasApi, computeRequiredMaterials, resolveHandlerName, type ApiRawMaterial, type ApiRawMaterialRecord, type ApiRawMaterialLocation, type ApiWorkOrder, type ApiPersonnel, type ApiProduct, type ApiFormulaItem } from "@/lib/api-client";
import { getSession } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/materials")({
  head: () => ({ meta: [{ title: "วัตถุดิบ — FactoryFlow" }] }),
  component: MaterialsPage,
});

type RawMaterial = ApiRawMaterial;
type RawMaterialRecord = ApiRawMaterialRecord;

const iconFor = (t: string) => t === "รับเข้า" ? SouthWest : t === "เบิกจ่าย" ? NorthEast : Refresh;
const colorFor = (t: string) => t === "รับเข้า" ? "#10B981" : t === "เบิกจ่าย" ? "#4A90E2" : "#F59E0B";
const bgFor = (t: string) => t === "รับเข้า" ? "rgba(16,185,129,0.12)" : t === "เบิกจ่าย" ? "rgba(59,130,246,0.12)" : "rgba(245,158,11,0.12)";

function MaterialsPage() {
  const { role } = useRole();
  const [rawMaterial, setRawMaterial] = useState<RawMaterial[]>([]);
  const [rawMaterialRecord, setRawMaterialRecord] = useState<RawMaterialRecord[]>([]);
  const [rawMaterialLocation, setRawMaterialLocation] = useState<ApiRawMaterialLocation[]>([]);
  const [workOrders, setWorkOrders] = useState<ApiWorkOrder[]>([]);
  const [personnel, setPersonnel] = useState<ApiPersonnel[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [formulas, setFormulas] = useState<ApiFormulaItem[]>([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const personnelOptions = personnel.length
  ? personnel.map((p) => `${p.id} — ${p.name}`)
  : [];

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [materials, records, locations, orders, people, prods, forms] = await Promise.all([
        materialsApi.list(),
        materialRecordsApi.list(),
        materialLocationsApi.list(),
        workOrdersApi.list(),
        personnelApi.list(),
        productsApi.list(),
        formulasApi.list(),
      ]);
      setRawMaterial(materials ?? []);
      setRawMaterialRecord(records ?? []);
      setRawMaterialLocation(locations ?? []);
      setWorkOrders(orders ?? []);
      setPersonnel(people ?? []);
      setProducts(prods ?? []);
      setFormulas(forms ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลวัตถุดิบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // ตัวเลือก "หมายเลขใบสั่งผลิต" ดึงจากใบสั่งผลิตจริงในระบบ (ถ้ายังไม่มีใบสั่งผลิตเลย ใช้ "-" กันฟอร์มพัง)
  const orderOptions = workOrders.length
    ? workOrders.map((o) => `${o.orderID} - ${o.name}`)
    : ["-"];

  // ชื่อผู้บันทึกรายการ เติมจากบัญชีที่ล็อกอินอยู่ให้เองทุกฟอร์ม (ยังแก้ไขเองได้)
  // ถ้าบัญชีนี้ผูกกับรายชื่อในหน้า "บุคลากร" ไว้แล้ว (email ตรงกัน) จะใช้ชื่อ-สกุลจริงแทน email
  // const currentHandler = resolveHandlerName(personnel, getSession()?.email);
  const currentUserEmail = getSession()?.email ?? "";
  const currentWarehouse = personnel.find(
    (p) => p.email?.toLowerCase() === currentUserEmail.toLowerCase());
  const currentHandler = currentWarehouse
    ? `${currentWarehouse.id} — ${currentWarehouse.name}` : "";

  // วัตถุดิบที่ต้องใช้ต่อ "ใบสั่งผลิต" แต่ละใบ (คำนวณจากสูตรการผลิต x จำนวนที่สั่งผลิต) — เอาไว้โชว์เหนือรายการเคลื่อนไหว
  // เฉพาะใบสั่งที่ยังไม่เสร็จ/ยกเลิก เพราะเป็นตัวที่คลังต้องเตรียมของจริง
  const materialsPerOrder = workOrders
    .filter((o) => o.status !== "เสร็จสิ้น" && o.status !== "ยกเลิก")
    .map((o) => {
      const product = products.find((p) => p.name === o.name);
      const materials = product ? computeRequiredMaterials(formulas, rawMaterial, product.productID, o.amount) : [];
      return { order: o, materials };
    })
    .filter((x) => x.materials.length > 0);

  /** กรอกอัตโนมัติสำหรับ dialog "บันทึกรายการวัตถุดิบ": เลือกวัตถุดิบ -> เติมหน่วยให้เอง, พิมพ์ Pallet Number ที่มีอยู่แล้ว -> ดึง Location/Lot/วัตถุดิบให้เอง, เลือก Location -> ดึง Pallet/Lot/วัตถุดิบที่เก็บอยู่ตรงนั้นให้เอง */
  async function autoFillRecord(values: Record<string, string>, changed: string): Promise<Partial<Record<string, string>> | void> {
    if (changed === "item") {
      const code = values.item.split(" — ")[0];
      const found = rawMaterial.find((m) => m.rmID === code);
      if (found) return { unit: found.unit };
    }
    if (changed === "palletNumber" && values.palletNumber) {
      const loc = rawMaterialLocation.find(
        (l) => l.palletNumber.trim().toLowerCase() === values.palletNumber.trim().toLowerCase(),
      );
      if (loc) {
        const mat = rawMaterial.find((m) => m.rmID === loc.rmID);
        return {
          location: loc.location,
          lotNumber: loc.lotNumber,
          ...(mat  ? { item: `${mat.rmID} — ${mat.rawMaterial}`, unit: mat.unit } : {}),
        };
      }
      if (values.type === "รับเข้า" || values.type === "คืน") {
            try {
              const orderID = values.orderID ? values.orderID.split(" - ")[0] : "";
              const res = await materialLocationsApi.previewNextCodes(orderID);
              return { lotNumber: res.lotNumber };
            } catch {
              return;
            }
          }
        return;
    }
    if (changed === "location" && values.location) {
      const code = values.item ? values.item.split(" — ")[0] : "";
      // ถ้าเลือกวัตถุดิบไว้แล้ว ให้หา pallet ของวัตถุดิบนั้นที่ location นี้ก่อน ไม่งั้นเอา pallet แรกที่เจอใน location นี้
      const loc = code
        ? rawMaterialLocation.find((l) => l.location === values.location && l.rmID === code)
        : rawMaterialLocation.find((l) => l.location === values.location);
      if (loc) {
        const mat = rawMaterial.find((m) => m.rmID === loc.rmID);
        return {
          palletNumber: loc.palletNumber,
          lotNumber: loc.lotNumber,
          ...(mat ? { item: `${mat.rmID} — ${mat.rawMaterial}`, unit: mat.unit } : {}),
        };
      }
    }
  }

  /**
 * หา Location/Pallet ที่ตรงกับค่าที่กรอกในฟอร์มตอนนี้
 * ใช้ตรรกะเดียวกันทั้งตอนคำนวณ helper text (real-time) และตอน submit จริง
 * เพื่อไม่ให้สองที่นี้ขัดกันเอง (เช่น helper text บอกไม่เกิน แต่ submit ดันฟ้อง error)
 */
function findFormLocation(values: Record<string, string>) {
  const code = values.item ? values.item.split(" — ")[0] : "";
  if (!code) return undefined;
  return rawMaterialLocation.find((l) => {
    if (values.palletNumber) {
      return l.rmID === code && l.palletNumber.trim().toLowerCase() === values.palletNumber.trim().toLowerCase();
    }
    return l.rmID === code && l.location === values.location;
  });
}

function palletLocationConflict(
  palletNumber: string,
  targetLocation: string,
  excludeLocationID?: string,
): ApiRawMaterialLocation | undefined {
  if (!palletNumber.trim()) return undefined;
  return rawMaterialLocation.find(
    (l) =>
      l.palletNumber.trim().toLowerCase() === palletNumber.trim().toLowerCase() &&
      l.location !== targetLocation &&
      l.rmLocationID !== excludeLocationID,
  );
}

/** ข้อความใต้ช่อง "จำนวน": เตือนแบบเรียลไทม์ถ้าเบิกจ่ายเกินยอดที่ Pallet/Location นั้นมีอยู่จริง */
function amountHelperText(values: Record<string, string>): string | undefined {
  if (values.type !== "เบิกจ่าย") return undefined;
  const loc = findFormLocation(values);
  if (!loc) return undefined;
  const code = values.item.split(" — ")[0];
  const unit = rawMaterial.find((m) => m.rmID === code)?.unit ?? "";
  const qty = Number(values.amount) || 0;
  const label = loc.palletNumber ? `Pallet ${loc.palletNumber}` : loc.location;
  if (qty > loc.amount) {
    return `${label} เก็บไว้แค่ ${loc.amount.toLocaleString()} ${unit} (เกิน ${(qty - loc.amount).toLocaleString()} ${unit})`;
  }
  return `ที่ ${label} เก็บไว้ ${loc.amount.toLocaleString()} ${unit}`;
}

/** true = จำนวนที่กรอกเกินยอดที่ Pallet/Location นั้นมี ให้ขึ้นช่องสีแดง */
function amountIsOver(values: Record<string, string>): boolean {
  if (values.type !== "เบิกจ่าย") return false;
  const loc = findFormLocation(values);
  if (!loc) return false;
  return (Number(values.amount) || 0) > loc.amount;
}

  /** กรอกอัตโนมัติสำหรับ dialog "เพิ่มวัตถุดิบในรายการ": ถ้าพิมพ์รหัสวัตถุดิบที่มีอยู่แล้ว (เติมสต็อกเดิม) -> เติมชื่อ/หน่วยให้เอง */
  async function autoFillNewItem(values: Record<string, string>, changed: string): Promise<Partial<Record<string, string>> | void> {
  if (changed === "rmID" && values.rmID) {
    const found = rawMaterial.find((m) => m.rmID.trim().toLowerCase() === values.rmID.trim().toLowerCase());
    if (found) return { rawMaterial: found.rawMaterial, unit: found.unit, max: String(found.max), min: String(found.min) };
  }
  if (changed === "palletNumber" && values.palletNumber) {
    const loc = rawMaterialLocation.find(
      (l) => l.palletNumber.trim().toLowerCase() === values.palletNumber.trim().toLowerCase(),
    );
    if (loc) {
      const mat = rawMaterial.find((m) => m.rmID === loc.rmID);
      return {
        location: loc.location,
        lotNumber: loc.lotNumber,
        ...(mat ? { rmID: mat.rmID, rawMaterial: mat.rawMaterial, unit: mat.unit, max: String(mat.max), min: String(mat.min) } : {}),
      };
    }
    try {
      const orderID = values.orderID ? values.orderID.split(" - ")[0] : "";
      const res = await materialLocationsApi.previewNextCodes(orderID);
      return { lotNumber: res.lotNumber };
    } catch {
      return;
    }
  }
}

  // ยอดที่เบิกจ่ายไปแล้วจริง (จากบันทึกรายการ ประเภท "เบิกจ่าย") ของวัตถุดิบหนึ่งตัว ต่อใบสั่งผลิตหนึ่งใบ
  // รวมทุกรายการเบิกจ่ายที่มี orderID+rmID ตรงกัน เผื่อเบิกหลายรอบกว่าจะครบ
  function withdrawnFor(orderID: string, rmID: string): number {
    return rawMaterialRecord
      .filter((r) => r.orderID === orderID && r.rmID === rmID && r.type === "เบิกจ่าย")
      .reduce((sum, r) => sum + r.amount, 0);
  }

  return (
    <PageShell
      title="จัดการวัตถุดิบ"
      description="ตรวจสอบสต็อก บันทึกการรับ-จ่าย และแจ้งเตือนของหมด"
      icon={<Layers />}
      actions={
        role === "warehouse" && (
        <>
          <AddItemDialog
            key={`new-material-${currentHandler}`}
            title="เพิ่มวัตถุดิบในรายการ"
            description="ประเภทรายการถูกกำหนดเป็น 'รับเข้า' โดยระบบ"
            successMessage="เพิ่มวัตถุดิบแล้ว"
            trigger={<Button variant="outlined" startIcon={<Add />}>เพิ่มในรายการ</Button>}
            fields={[
              { name: "type", label: "ประเภทรายการ", type: "select", options: ["รับเข้า"], defaultValue: "รับเข้า" },
              { name: "orderID", label: "หมายเลขใบสั่งผลิต", type: "select", options: orderOptions, defaultValue: orderOptions[0] },
              { name: "rmID", label: "รหัสวัตถุดิบ", placeholder: "RM-005", helperText: "หากกรอกรหัสวัตถุดิบที่มีอยู่ในรายการวัตถุดิบ ระบบจะดึงชื่อ/หน่วย/จำนวนสูงสุดและจำนวนสำรองให้โดยอัตโนมัติ" },
              { name: "rawMaterial", label: "ชื่อวัตถุดิบ", placeholder: "HDPE Resin" },
              { name: "amount", label: "จำนวน", type: "number", defaultValue: "0" },
              { name: "unit", label: "หน่วย", defaultValue: "ชิ้น" },
              { name: "max", label: "จำนวนสูงสุดที่เก็บได้", type: "number", defaultValue: "10000" },
              { name: "min", label: "จำนวนที่ต้องสำรอง", type: "number", defaultValue: "0" },
              { name: "location", label: "Location", type: "select", options: LOCATION_MASTER, defaultValue: LOCATION_MASTER[0] },
              { name: "palletNumber", label: "Pallet Number", placeholder: "PLT-005", helperText: "หากกรอกหมายเลข Pallet ที่มีในฐานข้อมูล ระบบจะดึงข้อมูล Location/Lot/วัตถุดิบให้โดยอัตโนมัติ"},
              { name: "lotNumber", label: "Lot Number", placeholder: "LOT-005", required: false },
              { name: "handler", label: "ผู้บันทึกรายการ", type: "select", options: personnelOptions, defaultValue: currentHandler },
              { name: "agency", label: "แผนกต้นทาง", defaultValue: "Supplier A" },
            ]}
            onAutoFill={autoFillNewItem}
onSubmit={async (v) => {
  const qty = Number(v.amount) || 0;
  const code = v.rmID.split(" — ")[0];
  const target = rawMaterial.find((i) => i.rmID === code);
  const sign = v.type === "เบิกจ่าย" ? -1 : v.type === "โอนย้าย" ? 0 : 1;

  if (sign === -1 && target && qty > target.amount) {
    toast.error(`เบิกจ่ายไม่สำเร็จ: คงเหลือ ${target.rawMaterial} เพียง ${target.amount.toLocaleString()} ${target.unit} (ขอเบิก ${qty.toLocaleString()})`);
    return false;
  }
  if (v.palletNumber && v.type !== "โอนย้าย") {
    const conflict = palletLocationConflict(v.palletNumber, v.location);
    if (conflict) {
      toast.error(`Pallet ${v.palletNumber} ถูกใช้เก็บอยู่ที่ ${conflict.location} แล้ว`);
      return false;
    }
  }

  const newAmount = target ? Math.max(0, target.amount + sign * qty) : qty;

  // หา location เดิมของวัตถุดิบตัวนี้ที่ pallet ตรงกับที่กรอก (ถ้ากรอก pallet มา)
  const existingLoc = v.palletNumber
    ? rawMaterialLocation.find(
        (l) => l.rmID === code && l.palletNumber.trim().toLowerCase() === v.palletNumber.trim().toLowerCase(),
      )
    : undefined;

  try {
    if (target) {
      // วัตถุดิบมีอยู่แล้ว -> อัปเดตยอดเดิม
      await materialsApi.updateStock(code, newAmount);
      setRawMaterial((prev) => prev.map((i) => (i.rmID === code ? { ...i, amount: newAmount } : i)));
    } else {
      // ✅ วัตถุดิบยังไม่มีในระบบ -> สร้างใหม่ก่อน ค่อยไปสร้าง location
      const created = await materialsApi.create({
        rmID: code,
        rawMaterial: v.rawMaterial,
        amount: newAmount,
        unit: v.unit,
        max: Number(v.max) || 0,
        min: Number(v.min) || 0,
      });
      setRawMaterial((prev) => [created, ...prev]);
    }

    let rmLocationID = "";

    if (v.type === "เบิกจ่าย") {
      // เบิกจ่าย: ลดจำนวนที่ pallet เดิม ไม่สร้าง location ใหม่
      if (existingLoc) {
        const updated = Math.max(0, existingLoc.amount - qty);
        await materialLocationsApi.update(existingLoc.rmLocationID, updated, existingLoc.location);
        setRawMaterialLocation((prev) =>
          prev.map((l) => (l.rmLocationID === existingLoc.rmLocationID ? { ...l, amount: updated } : l)),
        );
        rmLocationID = existingLoc.rmLocationID;
      } else if (v.palletNumber) {
        toast.error("ไม่พบ Pallet นี้ในระบบ ไม่ได้อัปเดตตำแหน่งจัดเก็บ");
      }
    } else if (v.type === "โอนย้าย") {
      // โอนย้าย: ย้าย pallet เดิมไป location ใหม่ จำนวนไม่เปลี่ยน
      if (existingLoc) {
        await materialLocationsApi.update(existingLoc.rmLocationID, existingLoc.amount, v.location);
        setRawMaterialLocation((prev) =>
          prev.map((l) => (l.rmLocationID === existingLoc.rmLocationID ? { ...l, location: v.location } : l)),
        );
        rmLocationID = existingLoc.rmLocationID;
      } else if (v.palletNumber) {
        toast.error("ไม่พบ Pallet นี้ในระบบ ไม่ได้อัปเดตตำแหน่งจัดเก็บ");
      }
    } else if (v.location) {
      // รับเข้า / คืน: ถ้า pallet นี้มีอยู่แล้วให้บวกเพิ่ม ไม่สร้างซ้ำ
      if (existingLoc) {
        const updated = existingLoc.amount + qty;
        await materialLocationsApi.update(existingLoc.rmLocationID, updated, v.location);
        setRawMaterialLocation((prev) =>
          prev.map((l) => (l.rmLocationID === existingLoc.rmLocationID ? { ...l, amount: updated, location: v.location } : l)),
        );
        rmLocationID = existingLoc.rmLocationID;
      } else {
        const loc = await materialLocationsApi.create({
          rmID: code, amount: qty, location: v.location,
          palletNumber: v.palletNumber, lotNumber: v.lotNumber,
        });
        setRawMaterialLocation((prev) => [loc, ...prev]);
        rmLocationID = loc.rmLocationID;
      }
    }

    const rec = await materialRecordsApi.create({
      rmID: code, orderID: v.orderID.split(" - ")[0], type: v.type, amount: qty,
      leftAmount: newAmount, handler: v.handler, agency: v.agency, rmLocationID,
    });
    setRawMaterialRecord((prev) => [rec, ...prev]);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "บันทึกรายการไม่สำเร็จ");
    return false;
  }
}}
          />
          <AddItemDialog
            key={`record-material-${currentHandler}`}
            title="บันทึกรายการวัตถุดิบ"
            description="บันทึกการรับเข้า เบิกจ่าย หรือคืนวัตถุดิบ"
            successMessage="บันทึกรายการสำเร็จ"
            trigger={<Button variant="contained">บันทึกรายการ</Button>}
            fields={[
              { name: "type", label: "ประเภทรายการ", type: "select", options: ["รับเข้า", "โอนย้าย", "เบิกจ่าย", "คืน"], defaultValue: "รับเข้า" },
              { name: "orderID", label: "หมายเลขใบสั่งผลิต", type: "select", options: orderOptions, defaultValue: orderOptions[0] },
              { name: "item", label: "รหัส / ชื่อวัตถุดิบ", type: "select", options: rawMaterial.map((i) => `${i.rmID} — ${i.rawMaterial}`), defaultValue: rawMaterial[0] ? `${rawMaterial[0].rmID} — ${rawMaterial[0].rawMaterial}` : "" },
              { name: "amount", label: "จำนวน", type: "number", defaultValue: "0", helperText: amountHelperText, error: amountIsOver },
              { name: "unit", label: "หน่วย", defaultValue: "ชิ้น" },    // ระบบจะเติม unit ให้โดยอัตโนมัติตามวัตถุดิบที่เลือก
              { name: "location", label: "Location", type: "select", options: LOCATION_MASTER, defaultValue: LOCATION_MASTER[0] },
              { name: "palletNumber", label: "Pallet Number", placeholder: "PLT-005", helperText: "หากกรอกหมายเลข Pallet ที่มีในฐานข้อมูล ระบบจะดึงข้อมูล Location/Lot/วัตถุดิบให้โดยอัตโนมัติ" }, // หากกรอกหมายเลข Pallet ที่มีในฐานข้อมูล ระบบจะดึงข้อมูล Location/Lot/วัตถุดิบให้โดยอัตโนมั
              { name: "lotNumber", label: "Lot Number", placeholder: "LOT-005" },
              { name: "handler", label: "ผู้บันทึกรายการ", type: "select", options: personnelOptions, defaultValue: currentHandler, },
              { name: "agency", label: "แผนกปลายทาง", defaultValue: "ฝ่ายผลิต" },
            ]}
            onAutoFill={autoFillRecord}
            onSubmit={async (v) => {
  const qty = Number(v.amount) || 0;
  const code = v.item.split(" — ")[0];
  const target = rawMaterial.find((i) => i.rmID === code);
  const sign = v.type === "เบิกจ่าย" ? -1 : v.type === "โอนย้าย" ? 0 : 1;

  // ค้นหา Location/Pallet เดิมก่อน
  const existingLoc = rawMaterialLocation.find((l) => {
    if (v.palletNumber) {
      return l.rmID === code && l.palletNumber.trim().toLowerCase() === v.palletNumber.trim().toLowerCase();
    }
    return l.rmID === code && l.location === v.location;
  });

  if (v.palletNumber && v.type !== "โอนย้าย") {
    const conflict = palletLocationConflict(v.palletNumber, v.location);
    if (conflict) {
      toast.error(`Pallet ${v.palletNumber} ถูกใช้เก็บอยู่ที่ ${conflict.location} แล้ว`);
      return false;
    }
  }

    // (1) เบิกจ่าย/โอนย้าย ต้องระบุ pallet/location ที่มีอยู่จริงก่อนเสมอ ไม่งั้นไม่รู้จะตัดยอดจากไหน
  if (v.type === "เบิกจ่าย" || v.type === "โอนย้าย") {
    if (!existingLoc) {
      toast.error("ไม่พบ Pallet/Location นี้ในระบบ กรุณาระบุ Pallet Number หรือ Location ที่มีวัตถุดิบนี้จัดเก็บอยู่จริง");
      return false;
    }
  }

  // (2) เช็คยอดที่ "ตำแหน่งนั้น" ไม่ใช่ยอดรวม
  if (v.type === "เบิกจ่าย" && existingLoc && qty > existingLoc.amount) {
    toast.error(
      `เบิกจ่ายไม่สำเร็จ: ตำแหน่ง ${existingLoc.location}${existingLoc.palletNumber ? ` (Pallet ${existingLoc.palletNumber})` : ""} มีเพียง ${existingLoc.amount.toLocaleString()} ${target?.unit ?? ""} (ขอเบิก ${qty.toLocaleString()})`,
    );
    return false;
  }
  
  if (sign === -1 && target && qty > target.amount) {
    toast.error(`เบิกจ่ายไม่สำเร็จ: คงเหลือ ${target.rawMaterial} เพียง ${target.amount.toLocaleString()} ${target.unit} (ขอเบิก ${qty.toLocaleString()})`);
    return false;
  }

  const newAmount = target ? Math.max(0, target.amount + sign * qty) : qty;

  try {
    await materialsApi.updateStock(code, newAmount);
    setRawMaterial((prev) => prev.map((i) => (i.rmID === code ? { ...i, amount: newAmount } : i)));

    let rmLocationID = "";

    if (v.type === "เบิกจ่าย") {
      // เบิกจ่าย: ลดจำนวนจาก Pallet/Location เดิม
      if (existingLoc) {
        const updated = Math.max(0, existingLoc.amount - qty);
        await materialLocationsApi.update(existingLoc.rmLocationID, updated, existingLoc.location);
        setRawMaterialLocation((prev) =>
          prev.map((l) => (l.rmLocationID === existingLoc.rmLocationID ? { ...l, amount: updated } : l))
        );
        rmLocationID = existingLoc.rmLocationID;
      }
    } else if (v.type === "โอนย้าย") {
      // โอนย้าย: ย้าย Location ของ Pallet เดิม
      if (existingLoc) {
        await materialLocationsApi.update(existingLoc.rmLocationID, existingLoc.amount, v.location);
        setRawMaterialLocation((prev) =>
          prev.map((l) => (l.rmLocationID === existingLoc.rmLocationID ? { ...l, location: v.location } : l))
        );
        rmLocationID = existingLoc.rmLocationID;
      }
    } else if (v.location) {
      // รับเข้า / คืน: ถ้ามี Pallet/Location เดิมให้บวกเพิ่ม ถ้าไม่มีค่อยสร้างใหม่
      if (existingLoc) {
        const updated = existingLoc.amount + qty;
        await materialLocationsApi.update(existingLoc.rmLocationID, updated, v.location);
        setRawMaterialLocation((prev) =>
          prev.map((l) => (l.rmLocationID === existingLoc.rmLocationID ? { ...l, amount: updated, location: v.location } : l))
        );
        rmLocationID = existingLoc.rmLocationID;
      } else {
        const loc = await materialLocationsApi.create({
          rmID: code, amount: qty, location: v.location,
          palletNumber: v.palletNumber, lotNumber: v.lotNumber,
        });
        setRawMaterialLocation((prev) => [loc, ...prev]);
        rmLocationID = loc.rmLocationID;
      }
    }

    const rec = await materialRecordsApi.create({
      rmID: code, orderID: v.orderID.split(" - ")[0], type: v.type, amount: qty,
      leftAmount: newAmount, handler: v.handler, agency: v.agency, rmLocationID,
    });
    setRawMaterialRecord((prev) => [rec, ...prev]);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "บันทึกรายการไม่สำเร็จ");
    return false;
  }
}}
            />
        </>
  )}
    >
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="ยอดคงเหลือวัตถุดิบ" />
        <Tab label="ตำแหน่งวัตถุดิบ" />
      </Tabs>

      {loading && (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      )}
      {!loading && error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !error && (
      tab === 1 ? (
        <RMLocationsTable
          stocks={rawMaterial.map((i) => ({ rmID: i.rmID, rawMaterial: i.rawMaterial, amount: i.amount, unit: i.unit }))}
           />
      ) : (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid container spacing={2}>
            {rawMaterial.map((m, i) => {
              const pct = Math.min(100, Math.round((m.amount / m.max) * 100));
              return (
                <Grid key={m.rmID} size={{ xs: 12, sm: 6 }}>
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -3 }}>
                    <Card>
                      <CardContent>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600 }} noWrap>{m.rawMaterial}</Typography>
                            <Typography variant="caption" color="text.secondary">{m.rmID}</Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">คงเหลือ</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{m.amount.toLocaleString()} {m.unit}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={pct} />
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              );
            })}
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            {materialsPerOrder.length > 0 && (
              <Card>
                <CardContent>
                  <Typography sx={{ fontWeight: 600, mb: 2 }}>วัตถุดิบที่ต้องใช้ต่อใบสั่งผลิต</Typography>
                  <Stack spacing={2}>
                    {materialsPerOrder.map(({ order, materials }) => (
                      <Box key={order.orderID}>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{order.orderID} — {order.name}</Typography>
                          <Chip size="small" label={`${order.amount.toLocaleString()} หน่วย`} />
                        </Stack>
                        <Stack spacing={0.5}>
                          {materials.map((m) => {
  const isEnough = m.available >= m.required; // เช็คว่าวัตถุดิบมีพอใช้งานหรือไม่
  const withdrawn = withdrawnFor(order.orderID, m.rmID); // ยอดที่เบิกจ่ายไปแล้วจริงของวัตถุดิบนี้ในใบสั่งนี้
  const fulfilled = withdrawn >= m.required; // เบิกครบตามที่สูตรกำหนดแล้ว -> ขีดฆ่า

  return (
    <Stack key={m.rmID} direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        sx={fulfilled ? { textDecoration: "line-through", opacity: 0.5 } : undefined}
      >
        {m.name}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          // 🛠️ ถ้าพอใช้ให้เป็นสีเขียว (success.main) ถ้าไม่พอให้เป็นสีแดง (error.main)
          color: isEnough ? "success.main" : "error.main",
          whiteSpace: "nowrap",
          ...(fulfilled ? { textDecoration: "line-through", opacity: 0.5 } : {}),
        }}
      >
        {m.available.toLocaleString()} / {m.required.toLocaleString()} {m.unit}
      </Typography>
    </Stack>
  );
})}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
            <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 600, mb: 2 }}>รายการเคลื่อนไหวล่าสุด</Typography>
              <Stack spacing={1.5}>
                {rawMaterialRecord.map((t, i) => {
                  const Icon = iconFor(t.type);
                  return (
                    <motion.div key={t.rmRecordID} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.05)" }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", background: bgFor(t.type), color: colorFor(t.type) }}>
                          <Icon sx={{ fontSize: 18 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{rawMaterial.find((r) => r.rmID === t.rmID)?.rawMaterial ?? t.rmID}</Typography>
                          <Typography variant="caption" color="text.secondary">{t.type} • {new Date(t.timestamp).toLocaleString("th-TH")}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.amount}</Typography>
                      </Stack>
                    </motion.div>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
          </Stack>
        </Grid>
      </Grid>
      )
      )}
    </PageShell>
  );
}
