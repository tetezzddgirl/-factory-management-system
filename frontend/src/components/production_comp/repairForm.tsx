import { useEffect, useState } from "react";
import {
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { toast } from "sonner";
import {
  maintenanceApi,
  type ApiEmployee,
  type ApiMachine,
  type ApiMaintenanceOrder,
} from "@/lib/api-client";
import {
  MAINTENANCE_STATUSES,
  maintenanceStatusLabel,
  todayISO,
} from "@/lib/machinery";

type FormState = {
  machineID: string;
  technician: string;
  date: string;
  detail: string;
  status: string;
  cost: string;
};

const EMPTY: FormState = {
  machineID: "",
  technician: "",
  date: todayISO(),
  detail: "",
  status: "pending",
  cost: "0",
};

export interface OrderFormDialogProps {
  type: "CM" | "PM";
  editing: ApiMaintenanceOrder | null;
  machines: ApiMachine[];
  technicians: ApiEmployee[];
  onCancel: () => void;
  onSaved: () => Promise<void>;
}

export function OrderFormDialog({
  type,
  editing,
  machines = [],
  technicians = [],
  onCancel,
  onSaved,
}: OrderFormDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        machineID: editing.machineID || "",
        technician: editing.technician || "",
        date: editing.date || todayISO(),
        detail: editing.detail || "",
        status: editing.status || "pending",
        cost: "0",
      });
      setCode(editing.code || "");
      return;
    }
    
    setForm(EMPTY);
    setCode("");
    
    try {
      if (maintenanceApi && typeof maintenanceApi.getNextCode === "function") {
        maintenanceApi
          .getNextCode()
          .then((r) => setCode(r?.code || ""))
          .catch(() => setCode(""));
      }
    } catch (err) {
      console.warn("ไม่สามารถดึงรหัสใบงานได้:", err);
      setCode("");
    }
  }, [editing]);

  const closingNow = editing !== null && form.status === "done" && editing.status !== "done";

  async function save() {
    if (!form.machineID || !form.technician.trim() || !form.date) {
      toast.error("กรุณาเลือกเครื่องจักร ผู้รับผิดชอบ และวันที่ดำเนินงานให้ครบ");
      return;
    }
    const cost = Number(form.cost.replace(/,/g, ""));
    if (closingNow && (Number.isNaN(cost) || cost < 0)) {
      toast.error("ค่าใช้จ่ายต้องเป็นตัวเลขที่ไม่ติดลบ");
      return;
    }

    setSaving(true);
    try {
      if (!editing) {
        await maintenanceApi.create({
          machineID: form.machineID,
          technician: form.technician.trim(),
          date: form.date,
          type,
          detail: form.detail.trim(),
        });
        toast.success(type === "CM" ? "บันทึกการแจ้งซ่อมแล้ว" : "บันทึกรายการซ่อมบำรุงแล้ว");
      } else {
        await maintenanceApi.update(editing.id, {
          machineID: form.machineID,
          technician: form.technician.trim(),
          date: form.date,
          detail: form.detail.trim(),
          ...(closingNow ? {} : { status: form.status }),
        });
        if (closingNow) {
          await maintenanceApi.complete(editing.id, {
            staff: form.technician.trim(),
            description: form.detail.trim(),
            totalCost: cost,
          });
          toast.success("ปิดงานซ่อมแล้ว — บันทึกประวัติการซ่อมบำรุงให้อัตโนมัติ");
        } else {
          toast.success("แก้ไขใบงานซ่อมบำรุงแล้ว");
        }
      }
      await onSaved();
      onCancel();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกใบงานซ่อมบำรุงไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const title = editing
    ? "แก้ไขข้อมูลการซ่อมบำรุง"
    : type === "CM"
      ? "แจ้งการซ่อมเครื่องจักรเชิงแก้ไข (CM)"
      : "บันทึกการบำรุงรักษาเครื่องจักรตามกำหนด (PM)";

  return (
    <>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {type === "CM"
            ? "ใช้เมื่อเครื่องจักรเสียและต้องซ่อมทันที — ระบบจะปรับสถานะเครื่องเป็น “เสีย” ให้"
            : "ใช้บันทึกงานบำรุงรักษาตามแผน — ระบบจะปรับสถานะเครื่องเป็น “บำรุงรักษา” เมื่อถึงวันนัด"}
        </DialogContentText>
        <Stack spacing={2}>
          <TextField
            label="รหัสการซ่อม"
            value={code || "สร้างอัตโนมัติเมื่อบันทึก"}
            slotProps={{ input: { readOnly: true } }}
            helperText="ระบบออกรหัสให้อัตโนมัติ"
          />
          
          <TextField
            select
            label="เครื่องจักร"
            value={form.machineID}
            onChange={(e) => setForm({ ...form, machineID: e.target.value })}
          >
            {machines?.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.id} — {m.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select={technicians?.length > 0}
            label="ผู้รับผิดชอบ"
            placeholder="ชื่อผู้รับผิดชอบ"
            value={form.technician}
            onChange={(e) => setForm({ ...form, technician: e.target.value })}
            helperText={(!technicians || technicians.length === 0) ? "โหลดรายชื่อบุคลากรไม่ได้ — พิมพ์ชื่อเอง" : undefined}
          >
            {technicians?.map((t) => (
              <MenuItem key={t.employeeId} value={`${t.firstName} ${t.lastName}`}>
                {t.employeeId} — {`${t.firstName} ${t.lastName}`}
              </MenuItem>
            ))}
            {form.technician && technicians && !technicians.some((t) => `${t.firstName} ${t.lastName}` === form.technician) && (
              <MenuItem value={form.technician}>{form.technician}</MenuItem>
            )}
          </TextField>
          
          <TextField
            type="date"
            label="วันที่ดำเนินงาน"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="คำอธิบายการซ่อมแซม"
            multiline
            minRows={2}
            value={form.detail}
            onChange={(e) => setForm({ ...form, detail: e.target.value })}
          />

          {editing && (
            <>
              <Divider />
              <TextField
                select
                label="สถานะการซ่อมแซม"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                disabled={editing.status === "done"}
                helperText={
                  editing.status === "done"
                    ? "ใบงานนี้ปิดไปแล้ว เปลี่ยนสถานะไม่ได้"
                    : "เลือก “เสร็จสิ้น” เพื่อปิดงานซ่อมและคืนสถานะเครื่องจักรเป็น “ทำงาน”"
                }
              >
                {MAINTENANCE_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {maintenanceStatusLabel(s)}
                  </MenuItem>
                ))}
              </TextField>
              {closingNow && (
                <TextField
                  label="ค่าใช้จ่ายในการซ่อม"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">บาท</InputAdornment> },
                  }}
                  helperText="บันทึกลงประวัติการซ่อมบำรุงของเครื่องนี้"
                />
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>ยกเลิก</Button>
        <Button variant="contained" disabled={saving} onClick={save}>
          บันทึก
        </Button>
      </DialogActions>
    </>
  );
}