import { useEffect, useState } from "react";
import { Add } from "@mui/icons-material";
import { Button } from "@mui/material";
import { toast } from "sonner";
import { AddItemDialog } from "@/components/add-item-dialog";
import { LOCATION_MASTER } from "@/components/wip-locations-table";
import { getSession } from "@/lib/auth";
import {
  wipApi, wipLocationsApi, requisitionsApi, workOrdersApi, personnelApi,
  type ApiWorkInProcess, type ApiWipLocation, type ApiWorkOrder, type ApiPersonnel, type ApiRequisitionSlip,
} from "@/lib/api-client";

interface RequisitionDialogProps {
  defaultOrderID?: string;
  trigger?: React.ReactNode;
  onCreated?: (slip: ApiRequisitionSlip) => void;
}

export function RequisitionDialog({ defaultOrderID, trigger, onCreated }: RequisitionDialogProps) {
  const [workInProcess, setWorkInProcess] = useState<ApiWorkInProcess[]>([]);
  const [wipLocations, setWipLocations] = useState<ApiWipLocation[]>([]);
  const [workOrders, setWorkOrders] = useState<ApiWorkOrder[]>([]);
  const [personnel, setPersonnel] = useState<ApiPersonnel[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [wip, locs, orders, people] = await Promise.all([
          wipApi.list(), wipLocationsApi.list(), workOrdersApi.list(), personnelApi.list(),
        ]);
        setWorkInProcess(wip ?? []);
        setWipLocations(locs ?? []);
        setWorkOrders(orders ?? []);
        setPersonnel(people ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "โหลดข้อมูลสำหรับใบเบิกจ่ายไม่สำเร็จ");
      }
    })();
  }, []);

  const orderOptions = workOrders.length ? workOrders.map((o) => `${o.orderID} - ${o.name}`) : ["-"];
  const personnelOptions = personnel.map((p) => `${p.id} — ${p.name}`);
  const currentUserEmail = getSession()?.email ?? "";
  const currentHandlerRow = personnel.find((p) => p.email?.toLowerCase() === currentUserEmail.toLowerCase());
  const currentHandler = currentHandlerRow ? `${currentHandlerRow.id} — ${currentHandlerRow.name}` : "";
  const firstWip = workInProcess[0];
  const defaultOrderOption = defaultOrderID
    ? orderOptions.find((o) => o.startsWith(`${defaultOrderID} -`)) ?? orderOptions[0]
    : orderOptions[0];

  function findLoc(values: Record<string, string>) {
    const code = values.item ? values.item.split(" — ")[0] : "";
    if (!code) return undefined;
    return wipLocations.find((l) => {
      if (values.palletNumber) {
        return l.wipID === code && l.palletNumber.trim().toLowerCase() === values.palletNumber.trim().toLowerCase();
      }
      return l.wipID === code && l.location === values.location;
    });
  }

  function amountHelperText(values: Record<string, string>): string | undefined {
    const loc = findLoc(values);
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

  function amountIsOver(values: Record<string, string>): boolean {
    const loc = findLoc(values);
    if (!loc) return false;
    return (Number(values.amount) || 0) > loc.amount;
  }

  async function autoFillRequisition(values: Record<string, string>, changed: string): Promise<Partial<Record<string, string>> | void> {
    if (changed === "item") {
      const code = values.item.split(" — ")[0];
      const found = workInProcess.find((m) => m.wipID === code);
      if (found) return { unit: found.unit };
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
    }
  }

  return (
    <AddItemDialog
      key={`requisition-${currentHandler}`}
      title="สร้างใบเบิกจ่าย"
      description="บันทึกคำขอเบิกวัตถุดิบ/สินค้าระหว่างผลิตไปยังฝ่ายผลิต"
      successMessage="สร้างใบเบิกจ่ายแล้ว"
      trigger={trigger ?? <Button variant="contained" startIcon={<Add />}>ใบเบิกจ่าย</Button>}
      fields={[
        { name: "orderID", label: "หมายเลขใบสั่งผลิต", type: "select", options: orderOptions, defaultValue: defaultOrderOption },
        { name: "item", label: "รหัส / ชื่อสินค้าระหว่างผลิต", type: "select", options: workInProcess.map((i) => `${i.wipID} — ${i.wip}`), defaultValue: firstWip ? `${firstWip.wipID} — ${firstWip.wip}` : "" },
        { name: "location", label: "Location", type: "select", options: LOCATION_MASTER, defaultValue: LOCATION_MASTER[0] },
        { name: "amount", label: "จำนวนที่ต้องการเบิก", type: "number", defaultValue: "0", helperText: amountHelperText, error: amountIsOver },
        { name: "unit", label: "หน่วย", defaultValue: "ชิ้น" },
        { name: "palletNumber", label: "Pallet Number", placeholder: "PLT-005", helperText: "เลือก Location หรือกรอก Pallet ที่มีอยู่แล้ว ระบบจะดึงข้อมูลที่เหลือให้อัตโนมัติ" },
        { name: "lotNumber", label: "Lot Number", placeholder: "LOT-005" },
        { name: "handler", label: "ชื่อผู้บันทึกรายการ", type: "select", options: personnelOptions, defaultValue: currentHandler },
        { name: "agency", label: "แผนกปลายทาง", defaultValue: "ฝ่ายคลังสินค้าระหว่างผลิต" },
      ]}
      onAutoFill={autoFillRequisition}
      onSubmit={async (v) => {
        const qty = Number(v.amount) || 0;
        const code = v.item.split(" — ")[0];
        const target = workInProcess.find((i) => i.wipID === code);
        const loc = findLoc(v);

        if (target && qty > target.amount) {
          toast.error(`เบิกจ่ายไม่สำเร็จ: คงเหลือ ${target.wip} เพียง ${target.amount.toLocaleString()} ${target.unit} (ขอเบิก ${qty.toLocaleString()})`);
          return false;
        }
        if (loc && qty > loc.amount) {
          toast.error(`เบิกจ่ายไม่สำเร็จ: ตำแหน่งที่เลือกมีเพียง ${loc.amount.toLocaleString()} ${target?.unit ?? ""} (ขอเบิก ${qty.toLocaleString()})`);
          return false;
        }

        try {
          const slip = await requisitionsApi.create({
            orderID: v.orderID.split(" - ")[0] || "-", wipID: code, amount: qty, handler: v.handler,
          });
          onCreated?.(slip);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "สร้างใบเบิกจ่ายไม่สำเร็จ");
          return false;
        }
      }}
    />
  );
}