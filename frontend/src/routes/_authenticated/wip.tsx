import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Layers, SouthWest, NorthEast, Refresh, SwapHoriz, Add } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography, Button, LinearProgress, Tabs, Tab } from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";
import { useRole } from "@/lib/roles";
import { getSession } from "@/lib/auth";
import { WipLocationsTable, LOCATION_MASTER } from "@/components/wip-locations-table";
import {
  wipApi, wipLocationsApi, wipRecordsApi, requisitionsApi, workOrdersApi, personnelApi,
  type ApiWorkInProcess, type ApiWipRecord, type ApiRequisitionSlip, type ApiWipLocation, type ApiWorkOrder, type ApiPersonnel,
} from "@/lib/api-client";
import { toast } from "sonner";
import { RequisitionDialog } from "@/components/requisition-dialog";

export const Route = createFileRoute("/_authenticated/wip")({
  head: () => ({
    meta: [
      { title: "คลังสินค้าระหว่างผลิต (WIP) — FactoryFlow" },
      { name: "description", content: "จัดการสินค้าระหว่างผลิต ตรวจสอบยอดคงเหลือ และบันทึกรายการรับเข้า โอนย้าย เบิกจ่าย คืน" },
      { property: "og:title", content: "คลังสินค้าระหว่างผลิต (WIP) — FactoryFlow" },
      { property: "og:description", content: "ยอดคงเหลือและรายการเคลื่อนไหวของสินค้าระหว่างผลิต" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WipPage,
});

const iconFor = (t: string) => t === "รับเข้า" ? SouthWest : t === "เบิกจ่าย" ? NorthEast : t === "โอนย้าย" ? SwapHoriz : Refresh;
const colorFor = (t: string) => t === "รับเข้า" ? "#10B981" : t === "เบิกจ่าย" ? "#4A90E2" : t === "โอนย้าย" ? "#8B5CF6" : "#F59E0B";
const bgFor = (t: string) => `${colorFor(t)}1F`;

function WipPage() {
  const { role } = useRole();
  const [workInProcess, setWorkInProcess] = useState<ApiWorkInProcess[]>([]);
  const [workInProcessRecord, setWorkInProcessRecord] = useState<ApiWipRecord[]>([]);
  const [wipLocations, setWipLocations] = useState<ApiWipLocation[]>([]);
  const [slips, setRequisitionSlips] = useState<ApiRequisitionSlip[]>([]);
  const [workOrders, setWorkOrders] = useState<ApiWorkOrder[]>([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personnel, setPersonnel] = useState<ApiPersonnel[]>([]);

  const personnelOptions = personnel.length
    ? personnel.map((p) => `${p.id} — ${p.name}`)
    : [];

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [wip, records, slips, locs, orders, people] = await Promise.all([
        wipApi.list(),
        wipRecordsApi.list(),
        requisitionsApi.list(),
        wipLocationsApi.list(),
        workOrdersApi.list(),
        personnelApi.list(),
      ]);
      setWorkInProcess(wip ?? []);
      setWorkInProcessRecord(records ?? []);
      setRequisitionSlips(slips ?? []);
      setWipLocations(locs ?? []);
      setWorkOrders(orders ?? []);
      setPersonnel(people ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูล WIP ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const orderOptions = workOrders.length
    ? workOrders.map((o) => `${o.orderID} - ${o.name}`)
    : ["-"];

  const currentUserEmail = getSession()?.email ?? "";
  const currentWarehouse = personnel.find(
    (p) => p.email?.toLowerCase() === currentUserEmail.toLowerCase());
  const currentHandler = currentWarehouse
    ? `${currentWarehouse.id} — ${currentWarehouse.name}` : "";

  async function autoFillRecord(values: Record<string, string>, changed: string): Promise<Partial<Record<string, string>> | void> {
  if (changed === "item") {
    const code = values.item.split(" — ")[0];
    const found = workInProcess.find((m) => m.wipID === code);
    if (found) return { unit: found.unit };
  }
  if (changed === "palletNumber" && values.palletNumber) {
    const loc = wipLocations.find(
      (l) => l.palletNumber.trim().toLowerCase() === values.palletNumber.trim().toLowerCase(),
    );
    if (loc) {
      const mat = workInProcess.find((m) => m.wipID === loc.wipID);
      return {
        location: loc.location,
        lotNumber: loc.lotNumber,
        ...(mat ? { item: `${mat.wipID} — ${mat.wip}`, unit: mat.unit } : {}),
      };
    }
    // pallet ใหม่ ไม่เคยมีในระบบ — preview เฉพาะกรณี "รับเข้า"/"คืน" เพราะมีแค่ 2 ประเภทนี้ที่จะสร้างตำแหน่งใหม่จริง
    if (values.type === "รับเข้า" || values.type === "คืน") {
      try {
        const orderID = values.orderID ? values.orderID.split(" - ")[0] : "";
        const res = await wipLocationsApi.previewNextCodes(orderID);
        return { lotNumber: res.lotNumber };
      } catch {
        return;
      }
    }
    return;
  }
  if (changed === "location" && values.location) {
    const code = values.item ? values.item.split(" — ")[0] : "";
    const loc = code
      ? wipLocations.find((l) => l.location === values.location && l.wipID === code)
      : wipLocations.find((l) => l.location === values.location);
    if (loc) {
      const mat = workInProcess.find((m) => m.wipID === loc.wipID);
      return {
        palletNumber: loc.palletNumber,
        lotNumber: loc.lotNumber,
        ...(mat ? { item: `${mat.wipID} — ${mat.wip}`, unit: mat.unit } : {}),
      };
    }
  }
}

  async function autoFillNewWip(values: Record<string, string>, changed: string): Promise<Partial<Record<string, string>> | void >{
    if (changed === "wipID" && values.wipID) {
      const found = workInProcess.find((m) => m.wipID.trim().toLowerCase() === values.wipID.trim().toLowerCase());
      if (found) return { wip: found.wip, unit: found.unit, max: String(found.max) };
    }
    if (changed === "palletNumber" && values.palletNumber) {
      const loc = wipLocations.find(
        (l) => l.palletNumber.trim().toLowerCase() === values.palletNumber.trim().toLowerCase(),
      );
      if (loc) {
        const mat = workInProcess.find((m) => m.wipID === loc.wipID);
        return {
          location: loc.location,
          lotNumber: loc.lotNumber,
          ...(mat ? { wipID: mat.wipID, wip: mat.wip, unit: mat.unit, max: String(mat.max) } : {}),
        };
      }
      try {
      const orderID = values.orderID ? values.orderID.split(" - ")[0] : "";
      const res = await wipLocationsApi.previewNextCodes(orderID);
      return { lotNumber: res.lotNumber };
    } catch {
      return; 
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
  return wipLocations.find((l) => {
    if (values.palletNumber) {
      return l.wipID === code && l.palletNumber.trim().toLowerCase() === values.palletNumber.trim().toLowerCase();
    }
    return l.wipID === code && l.location === values.location;
  });
}

function palletLocationConflict(
  palletNumber: string,
  targetLocation: string,
  excludeLocationID?: string,
): ApiWipLocation | undefined {
  if (!palletNumber.trim()) return undefined;
  return wipLocations.find(
    (l) =>
      l.palletNumber.trim().toLowerCase() === palletNumber.trim().toLowerCase() &&
      l.location !== targetLocation &&
      l.wipLocationID !== excludeLocationID,
  );
}

const STOCK_LIMITED_TYPES = ["เบิกจ่าย", "โอนย้าย"];

/** ข้อความใต้ช่อง "จำนวน": เตือนแบบเรียลไทม์ถ้าเบิกจ่ายเกินยอดที่ Pallet/Location นั้นมีอยู่จริง */
function amountHelperText(values: Record<string, string>): string | undefined {
  if (!STOCK_LIMITED_TYPES.includes(values.type)) return undefined;
  const loc = findFormLocation(values);
  if (!loc) return undefined;
  const code = values.item.split(" — ")[0];
  const unit = workInProcess.find((m) => m.wipID === code)?.unit ?? "";
  const qty = Number(values.amount) || 0;
  const label = loc.palletNumber ? `Pallet ${loc.palletNumber}` : loc.location;
  if (qty > loc.amount) {
    return `${label} เก็บไว้แค่ ${loc.amount.toLocaleString()} ${unit} (เกิน ${(qty - loc.amount).toLocaleString()} ${unit})`;
  }
  return `ที่ ${label} เก็บไว้ ${loc.amount.toLocaleString()} ${unit}`;
}

/** true = จำนวนที่กรอกเกินยอดที่ Pallet/Location นั้นมี ให้ขึ้นช่องสีแดง */
function amountIsOver(values: Record<string, string>): boolean {
  if (!STOCK_LIMITED_TYPES.includes(values.type)) return false;
  const loc = findFormLocation(values);
  if (!loc) return false;
  return (Number(values.amount) || 0) > loc.amount;
}

function isNegative(field: string) {
  return (values: Record<string, string>) => Number(values[field]) < 0;
}

  /** กรอกอัตโนมัติสำหรับ dialog "เพิ่มวัตถุดิบในรายการ": ถ้าพิมพ์รหัสวัตถุดิบที่มีอยู่แล้ว (เติมสต็อกเดิม) -> เติมชื่อ/หน่วยให้เอง */
  function autoFillNewItem(values: Record<string, string>, changed: string): Partial<Record<string, string>> | void {
  if (changed === "wipID" && values.wipID) {
    const found = workInProcess.find((m) => m.wipID.trim().toLowerCase() === values.wipID.trim().toLowerCase());
    if (found) return { workInProcess: found.wip, unit: found.unit, max: String(found.max) };
  }
  if (changed === "palletNumber" && values.palletNumber) {
    const loc = wipLocations.find(
      (l) => l.palletNumber.trim().toLowerCase() === values.palletNumber.trim().toLowerCase(),
    );
    if (loc) {
      const mat = workInProcess.find((m) => m.wipID === loc.wipID);
      return {
        location: loc.location,
        lotNumber: loc.lotNumber,
        ...(mat ? { rmID: mat.wipID, workInProcess: mat.wip, unit: mat.unit, max: String(mat.max) } : {}),
      };
    }
  }
}

  // ยอดที่เบิกจ่ายไปแล้วจริง (จากบันทึกรายการ ประเภท "เบิกจ่าย") ของวัตถุดิบหนึ่งตัว ต่อใบสั่งผลิตหนึ่งใบ
  // รวมทุกรายการเบิกจ่ายที่มี orderID+rmID ตรงกัน เผื่อเบิกหลายรอบกว่าจะครบ
  function withdrawnFor(orderID: string, wipID: string): number {
    return workInProcessRecord
      .filter((r) => r.orderID === orderID && r.wipID === wipID && r.type === "เบิกจ่าย")
      .reduce((sum, r) => sum + r.amount, 0);
  }

  async function handleAddNew(v: Record<string, string>) {
    const qty = Number(v.amount) || 0;
    const max = Number(v.max) || qty || 0;
    const code = v.wipID.trim();
    const existingWip = workInProcess.find((m) => m.wipID.toLowerCase() === code.toLowerCase());

    // ค้นหารายการตำแหน่งเดิม
const existingLoc = wipLocations.find((l) => {
  const isSameWip = l.wipID.trim().toLowerCase() === code.trim().toLowerCase();
  
  // ถ้ามีการระบุ Pallet Number ให้เทียบจาก Pallet เป็นหลัก
  if (v.palletNumber && v.palletNumber.trim()) {
    return isSameWip && l.palletNumber.trim().toLowerCase() === v.palletNumber.trim().toLowerCase();
  }

  if (v.palletNumber && v.type !== "โอนย้าย") {
    const conflict = palletLocationConflict(v.palletNumber, v.location);
    if (conflict) {
      toast.error(`Pallet ${v.palletNumber} ถูกใช้เก็บอยู่ที่ ${conflict.location} อยู่แล้ว (1 Pallet เก็บได้แค่ 1 ตำแหน่ง) กรุณาโอนย้าย Pallet เดิมก่อน หรือใช้หมายเลข Pallet อื่น`);
      return false;
    }
  }
  
  // ถ้าไม่ได้ระบุ Pallet ให้เทียบจาก Location
  return isSameWip && l.location.trim().toLowerCase() === v.location.trim().toLowerCase();
});
    try {
      let newTotal = qty;
      if (existingWip) {
        newTotal = existingWip.amount + qty;
        await wipApi.updateAmount(existingWip.wipID, newTotal);
      } else {
        await wipApi.create({ wipID: code, wip: v.wip, inStage: v.inStage, amount: qty, unit: v.unit, max });
      }

      let wipLocationID = "";

if (existingLoc) {
  // --- กรณีพบรายการเดิม: ทำการอัปเดต (ไม่สร้างใหม่) ---
  let updatedAmount = existingLoc.amount;

  if (v.type === "รับเข้า" || v.type === "คืน") {
    updatedAmount += qty;
  } else if (v.type === "เบิกจ่าย") {
    updatedAmount = Math.max(0, existingLoc.amount - qty);
  }

  // อัปเดตข้อมูลไปยังรายการเดิมที่มีอยู่แล้ว
  await wipLocationsApi.update(
    existingLoc.wipLocationID,
    updatedAmount,
    v.location || existingLoc.location
  );
  
  wipLocationID = existingLoc.wipLocationID;
} else if (v.location && (v.type === "รับเข้า" || v.type === "คืน")) {
  // --- กรณีไม่พบรายการเดิม และเป็นรายการรับเข้า/คืน: สร้างรายการใหม่ ---
  const loc = await wipLocationsApi.create({
    wipID: code,
    location: v.location,
    palletNumber: v.palletNumber || "",
    lotNumber: v.lotNumber || "",
    amount: qty,
    orderID: v.orderID.split(" - ")[0],
  });
  
  wipLocationID = loc.wipLocationID;
}

      await wipRecordsApi.create({
        wipID: code,
        orderID: v.orderID.split(" - ")[0],
        type: "รับเข้า",
        inStage: v.inStage || "-",
        amount: qty,
        leftAmount: newTotal,
        handler: v.handler,
        agency: v.agency,
        wipLocationID,
      });

      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เพิ่มสินค้าระหว่างผลิตไม่สำเร็จ");
      return false;
    }
  }

  async function handleRecordTransaction(v: Record<string, string>) {
    const qty = Number(v.amount) || 0;
    const code = v.item.split(" — ")[0];
    const target = workInProcess.find((i) => i.wipID === code);
    const sign = v.type === "เบิกจ่าย" ? -1 : v.type === "โอนย้าย" ? 0 : 1;

    if (sign === -1 && target && qty > target.amount) {
      toast.error(`เบิกจ่ายไม่สำเร็จ: คงเหลือ ${target.wip} เพียง ${target.amount.toLocaleString()} ${target.unit} (ขอเบิก ${qty.toLocaleString()})`);
      return false;
    }

    if (v.palletNumber && v.type !== "โอนย้าย") {
    const conflict = palletLocationConflict(v.palletNumber, v.location);
    if (conflict) {
      toast.error(`Pallet ${v.palletNumber} ถูกใช้เก็บอยู่ที่ ${conflict.location}แล้ว`);
      return false;
    }
  }

    if (v.type === "โอนย้าย") {
    const existingLoc = v.palletNumber
      ? wipLocations.find((l) => l.wipID === code && l.palletNumber.trim().toLowerCase() === v.palletNumber.trim().toLowerCase())
      : wipLocations.find((l) => l.wipID === code && l.location === v.location);
    if (existingLoc && qty > existingLoc.amount) {
      toast.error(`โอนย้ายไม่สำเร็จ: ต้นทางมีเพียง ${existingLoc.amount.toLocaleString()} ${target?.unit ?? ""} (ขอย้าย ${qty.toLocaleString()})`);
      return false;
    }
  }

    const newAmount = target ? Math.max(0, target.amount + sign * qty) : qty;

    const existingLoc = v.palletNumber
      ? wipLocations.find(
          (l) => l.wipID === code && l.palletNumber.trim().toLowerCase() === v.palletNumber.trim().toLowerCase()
        )
      : wipLocations.find((l) => l.wipID === code && l.location === v.location);

    try {
      if (target) {
        await wipApi.updateAmount(code, newAmount);
      }

      let wipLocationID = "";

      if (v.type === "เบิกจ่าย") {
        if (existingLoc) {
          const updated = Math.max(0, existingLoc.amount - qty);
          await wipLocationsApi.update(existingLoc.wipLocationID, updated, existingLoc.location);
          wipLocationID = existingLoc.wipLocationID;
        } else if (v.palletNumber) {
          toast.error("ไม่พบ Pallet นี้ในระบบ ไม่ได้อัปเดตตำแหน่งจัดเก็บ");
        }
      } else if (v.type === "โอนย้าย") {
        if (existingLoc) {
          await wipLocationsApi.update(existingLoc.wipLocationID, existingLoc.amount, v.location);
          wipLocationID = existingLoc.wipLocationID;
        } else if (v.palletNumber) {
          toast.error("ไม่พบ Pallet นี้ในระบบ ไม่ได้อัปเดตตำแหน่งจัดเก็บ");
        }
      } else if (v.location) {
        if (existingLoc) {
          const updated = existingLoc.amount + qty;
          await wipLocationsApi.update(existingLoc.wipLocationID, updated, v.location);
          wipLocationID = existingLoc.wipLocationID;
        } else {
          const loc = await wipLocationsApi.create({
            wipID: code,
            location: v.location,
            palletNumber: v.palletNumber,
            lotNumber: v.lotNumber,
            amount: qty,
            orderID: v.orderID.split(" - ")[0],
          });
          wipLocationID = loc.wipLocationID;
        }
      }

      await wipRecordsApi.create({
        wipID: code,
        orderID: v.orderID.split(" - ")[0] || "-",
        type: v.type,
        inStage: target?.inStage || "-",
        amount: qty,
        leftAmount: newAmount,
        handler: v.handler,
        agency: v.agency,
        wipLocationID,
      });

      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกรายการไม่สำเร็จ");
      return false;
    }
  }

  async function handleRequisition(v: Record<string, string>) {
    const qty = Number(v.amount) || 0;
    const code = v.item.split(" — ")[0];
    const target = workInProcess.find((i) => i.wipID === code);

    if (target && qty > target.amount) {
      toast.error(`เบิกจ่ายไม่สำเร็จ: คงเหลือ ${target.wip} เพียง ${target.amount.toLocaleString()} ${target.unit} (ขอเบิก ${qty.toLocaleString()})`);
      return false;
    }

    if (v.palletNumber && v.type !== "โอนย้าย") {
    const conflict = palletLocationConflict(v.palletNumber, v.location);
    if (conflict) {
      toast.error(`Pallet ${v.palletNumber} ถูกใช้เก็บอยู่ที่ ${conflict.location}แล้ว`);
      return false;
    }
  }

    try {
      await requisitionsApi.create({
        orderID: v.orderID.split(" - ")[0] || "-", wipID: code, amount: qty, handler: v.handler,
      });
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างใบเบิกจ่ายไม่สำเร็จ");
      return false;
    }
  }

  async function handleAssignLocation(
  wipID: string, 
  location: string, 
  amount: number, 
  wipLocationID?: string
) {
  if (wipLocationID) {
    //  กรณีมี wipLocationID (เป็นแถวเดิมในตาราง): อัปเดตตำแหน่งเดิม ไม่สร้างแถวใหม่
    await wipLocationsApi.update(wipLocationID, amount, location);
  } else {
    //  กรณีไม่มี wipLocationID (แถวรอจัดเก็บ Draft): สร้างรายการใหม่
    const loc = await wipLocationsApi.create({ 
      wipID, 
      location, 
      amount, 
      palletNumber: "", 
      lotNumber: "" 
    });
    
    await wipRecordsApi.create({
      wipID, 
      orderID: "-", 
      type: "รับเข้า", 
      inStage: "-",
      amount, 
      leftAmount: amount, 
      handler: currentHandler, 
      agency: "ฝ่ายคลัง WIP", 
      wipLocationID: loc.wipLocationID,
    });
  }

  await loadAll();
}

  const firstWip = workInProcess[0];

  return (
    <PageShell
      title="จัดการสินค้าระหว่างผลิต"
      description="ยอดคงเหลือสินค้าระหว่างผลิต (WIP) และรายการเคลื่อนไหว"
      icon={<Layers />}
      actions={
        <>
          {role === "warehouse" && (
            <>
              <AddItemDialog
                key={`new-wip-${currentHandler}`}
                title="เพิ่มสินค้าระหว่างผลิตในรายการ"
                description="ประเภทรายการถูกกำหนดเป็น 'รับเข้า' โดยระบบ"
                successMessage="เพิ่มสินค้าระหว่างผลิตแล้ว"
                trigger={<Button variant="outlined" startIcon={<Add />}>เพิ่มในรายการ</Button>}
                fields={[
                  { name: "type", label: "ประเภทรายการ", type: "select", options: ["รับเข้า"], defaultValue: "รับเข้า" },
                  { name: "orderID", label: "หมายเลขใบสั่งผลิต", type: "select", options: orderOptions, defaultValue: orderOptions[0] },
                  { name: "wipID", label: "รหัสสินค้าระหว่างผลิต", placeholder: "WIP-005", helperText: "หากกรอกรหัสที่มีอยู่แล้วในรายการสินค้าระหว่างผลิต ระบบจะเติมชื่อ/หน่วยให้อัตโนมัติ" },
                  { name: "wip", label: "ชื่อสินค้าระหว่างผลิต", placeholder: "ขวดติดฉลากแล้ว" },
                  { name: "inStage", label: "ขั้นตอนการผลิต", placeholder: "หลังติดฉลาก" },
                  { name: "amount", label: "จำนวน", type: "number", defaultValue: "0", error: isNegative("amount") },
                  { name: "unit", label: "หน่วย", defaultValue: "ชิ้น" },
                  { name: "location", label: "Location", type: "select", options: LOCATION_MASTER, defaultValue: LOCATION_MASTER[0] },
                  { name: "palletNumber", label: "Pallet Number", placeholder: "PLT-005" },
                  { name: "lotNumber", label: "Lot Number", placeholder: "LOT-005" },
                  { name: "handler", label: "ผู้บันทึกรายการ", type: "select", options: personnelOptions, defaultValue: currentHandler },
                  { name: "agency", label: "แผนกต้นทาง", defaultValue: "ฝ่ายผลิต" },
                ]}
                onAutoFill={autoFillNewWip}
                onSubmit={handleAddNew}
              />
              <AddItemDialog
                key={`record-wip-${currentHandler}`}
                title="บันทึกรายการสินค้าระหว่างผลิต"
                description="เลือกประเภทรายการและสินค้าในระบบ แล้วกรอกจำนวน"
                successMessage="บันทึกรายการสำเร็จ"
                trigger={<Button variant="contained">บันทึกรายการ</Button>}
                fields={[
                  { name: "type", label: "ประเภทรายการ", type: "select", options: ["รับเข้า", "โอนย้าย", "เบิกจ่าย", "คืน"], defaultValue: "รับเข้า" },
                  { name: "orderID", label: "หมายเลขใบสั่งผลิต", type: "select", options: orderOptions, defaultValue: orderOptions[0] },
                  { name: "item", label: "รหัส / ชื่อสินค้าระหว่างผลิต", type: "select", options: workInProcess.map((i) => `${i.wipID} — ${i.wip}`), defaultValue: firstWip ? `${firstWip.wipID} — ${firstWip.wip}` : "" },
                  { name: "amount", label: "จำนวน", type: "number", defaultValue: "0", helperText: amountHelperText,
                     error: (values: Record<string, string>) => amountIsOver(values) || isNegative("amount")(values), },
                  { name: "unit", label: "หน่วย", defaultValue: "ชิ้น" },
                  { name: "location", label: "Location", type: "select", options: LOCATION_MASTER, defaultValue: LOCATION_MASTER[0] },
                  { name: "palletNumber", label: "Pallet Number", placeholder: "PLT-005", helperText: "ถ้ากรอก Pallet ที่มีอยู่แล้ว ระบบจะดึง Location/Lot/รายการให้อัตโนมัติ" },
                  { name: "lotNumber", label: "Lot Number", placeholder: "LOT-005", required: false },
                  { name: "handler", label: "ชื่อผู้บันทึกรายการ", type: "select", options: personnelOptions, defaultValue: currentHandler },
                  { name: "agency", label: "แผนกปลายทาง", defaultValue: "ฝ่ายผลิต" },
                ]}
                onAutoFill={autoFillRecord}
                onSubmit={handleRecordTransaction}
              />
            </>
          )}

          {role === "operator" && (
            <RequisitionDialog onCreated={loadAll} />
          )}
        </>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="ยอดคงเหลือ WIP" />
        <Tab label="ตำแหน่ง WIP" />
      </Tabs>

      {loading ? (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : tab === 1 ? (
        <WipLocationsTable
          stocks={workInProcess.map((i) => ({ wipID: i.wipID, wip: i.wip, amount: i.amount, unit: i.unit }))}
          locations={wipLocations}
          onAssign={handleAssignLocation}
        />
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Grid container spacing={2}>
              {workInProcess.map((m, i) => {
                const pct = Math.min(100, Math.round((m.amount / m.max) * 100));
                return (
                  <Grid key={m.wipID} size={{ xs: 12, sm: 6 }}>
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -3 }}>
                      <Card>
                        <CardContent>
                          <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 600 }} noWrap>{m.wip}</Typography>
                              <Typography variant="caption" color="text.secondary">{m.wipID}</Typography>
                            </Box>
                            <Chip label={m.inStage} size="small" />
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
            <Card>
              <CardContent>
                <Typography sx={{ fontWeight: 600, mb: 2 }}>รายการเคลื่อนไหวล่าสุด</Typography>
                <Stack spacing={1.5}>
                  {workInProcessRecord.map((t, i) => {
                    const Icon = iconFor(t.type);
                    return (
                      <motion.div key={t.wipRecordID ?? i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.05)" }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", background: bgFor(t.type), color: colorFor(t.type) }}>
                            <Icon sx={{ fontSize: 18 }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{workInProcess.find((r) => r.wipID === t.wipID)?.wip ?? t.wipID}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t.type} • {new Date(t.timestamp).toLocaleString("th-TH")}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.amount}</Typography>
                        </Stack>
                      </motion.div>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </PageShell>
  );
}