import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  TextField, MenuItem, Button, Stack, Divider, Typography, Box, Chip, IconButton,
} from "@mui/material";
import { Add, Delete, History, Settings as CogIcon } from "@mui/icons-material";
import { toast } from "sonner";
import {
  machinesApi, employeeFullName,
  type ApiMachine,
  type ApiMachineJob,
  type ApiMachineType,
  type ApiEmployee,
  type ApiWork,
  type MachinePatch,
} from "@/lib/api-client";
import {
  MACHINE_STATUSES,
  machineStatusLabel,
  machineStatusTone,
  formatMachineDate,
  todayISO,
} from "@/lib/machinery";

// ฟอร์มเพิ่ม / แก้ไข / ลบเครื่องจักร + กล่องรายละเอียดเครื่องจักร
//
// พอร์ต UX มาจาก Machinery-maintenance:
//   - components/MachineDialogs.tsx  (AddMachineDialog / EditMachineDialog)
//   - routes/index.tsx               (MachineDetailDialog + ประวัติการทำงาน)
// แล้วประกอบใหม่ด้วย MUI ชุดเดียวกับกล่องอื่นๆ ของ FactoryFlow (เทียบ employee-dialog.tsx)
// การบันทึกจริงยิงผ่าน machinesApi ใน lib/api-client.ts

/** ค่าพิเศษของ dropdown — MUI Select ไม่รองรับค่าว่างเป็นตัวเลือกจริง จึงใช้คีย์แทน */
const NONE = "__none__";
const NEW_TYPE = "__new_type__";

type FormState = {
  id: string;
  name: string;
  status: string;
  hours: string;
  typeID: string;
  owner: string;
  ownerRole: string;
  currentJob: string;
  description: string;
};

const EMPTY: FormState = {
  id: "",
  name: "",
  status: "idle",
  hours: "0",
  typeID: "",
  owner: "",
  ownerRole: "",
  currentJob: "",
  description: "",
};

export function MachineFormDialog({
  open,
  machine,
  machines,
  types,
  owners,
  works,
  onClose,
  onSaved,
  onTypesChanged,
}: {
  open: boolean;
  /** null = โหมดเพิ่มเครื่องใหม่ */
  machine: ApiMachine | null;
  machines: ApiMachine[];
  types: ApiMachineType[];
  owners: ApiEmployee[];
  works: ApiWork[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onTypesChanged: () => void | Promise<void>;
}) {
  const isEdit = machine !== null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [newType, setNewType] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewType(null);
    setConfirmDelete(false);
    setForm(
      machine
        ? {
            id: machine.id,
            name: machine.name,
            status: machine.status || "idle",
            hours: String(Math.round(machine.hours)),
            typeID: machine.typeID ? String(machine.typeID) : "",
            owner: machine.staff,
            ownerRole: machine.ownerRole,
            currentJob: machine.currentJob,
            description: machine.description,
          }
        : EMPTY,
    );
  }, [open, machine]);

  // ตัวเลือก "งานปัจจุบัน" — งานจากใบสั่งผลิต บวกค่าที่เครื่องนี้ถืออยู่ (เผื่อเป็นงานเก่าที่ถูกลบไปแล้ว)
  const jobOptions = useMemo(() => {
    const codes = new Set(works.map((w) => w.workID));
    if (form.currentJob) codes.add(form.currentJob);
    return [...codes].sort();
  }, [works, form.currentJob]);

  function pickOwner(name: string) {
  if (name === NONE) {
    setForm((f) => ({ ...f, owner: "", ownerRole: "" }));
    return;
  }
  const person = owners.find((o) => employeeFullName(o) === name);
  setForm((f) => ({ ...f, owner: name, ownerRole: person?.role ?? f.ownerRole }));
}

  async function saveNewType() {
    const name = (newType ?? "").trim();
    if (!name) return;
    try {
      const created = await machinesApi.createType(name);
      await onTypesChanged();
      setForm((f) => ({ ...f, typeID: String(created.type_id) }));
      setNewType(null);
      toast.success("เพิ่มประเภทเครื่องจักรแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เพิ่มประเภทเครื่องจักรไม่สำเร็จ");
    }
  }

  async function save() {
    const id = form.id.trim();
    const name = form.name.trim();
    const hours = Number(form.hours.replace(/,/g, ""));

    if (!id || !name || !form.typeID) {
      toast.error("กรุณากรอกรหัสเครื่อง ชื่อเครื่อง และประเภทเครื่องจักรให้ครบ");
      return;
    }
    if (Number.isNaN(hours) || hours < 0) {
      toast.error("ชั่วโมงทำงานต้องเป็นตัวเลขที่ไม่ติดลบ");
      return;
    }
    if (!isEdit && machines.some((m) => m.id.toUpperCase() === id.toUpperCase())) {
      toast.error("รหัสเครื่องนี้มีอยู่แล้ว");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        status: form.status,
        hours,
        typeID: Number(form.typeID),
        description: form.description.trim(),
        staff: form.owner.trim(),
        ownerRole: form.ownerRole.trim(),
        currentJob: form.currentJob.trim(),
      };
      if (isEdit) {
        await machinesApi.update(machine.id, payload satisfies MachinePatch);
        toast.success("แก้ไขข้อมูลเครื่องจักรแล้ว");
      } else {
        await machinesApi.create({ id, ...payload });
        toast.success("เพิ่มเครื่องจักรแล้ว");
      }
      await onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกข้อมูลเครื่องจักรไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!machine) return;
    setSaving(true);
    try {
      await machinesApi.remove(machine.id);
      toast.success("ลบเครื่องจักรแล้ว");
      await onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบเครื่องจักรไม่สำเร็จ");
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isEdit ? "แก้ไขข้อมูลเครื่องจักร" : "เพิ่มเครื่องจักรใหม่"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {isEdit
            ? "แก้ไขข้อมูล สถานะ และงานปัจจุบันของเครื่องจักร"
            : "กรอกข้อมูลเครื่องจักรที่ต้องการเพิ่มเข้าระบบ"}
        </DialogContentText>
        <Stack spacing={2}>
          <TextField
            label="รหัสเครื่อง"
            placeholder="M-07"
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
            // รหัสเครื่องเป็นคีย์ที่ใบแจ้งซ่อม/ประวัติอ้างอิงอยู่ จึงแก้ไม่ได้หลังสร้างแล้ว
            slotProps={{ input: { readOnly: isEdit } }}
            helperText={isEdit ? "รหัสเครื่องแก้ไขไม่ได้หลังสร้างแล้ว" : undefined}
          />
          <TextField
            label="ชื่อเครื่อง"
            placeholder="เครื่องขึ้นรูปฝาขวด"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            select
            label="สถานะ"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {MACHINE_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{machineStatusLabel(s)}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="ชั่วโมงทำงานสะสม"
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
          />

          <TextField
            select
            label="ประเภทเครื่องจักร"
            value={form.typeID}
            onChange={(e) => {
              if (e.target.value === NEW_TYPE) {
                setNewType("");
                return;
              }
              setForm({ ...form, typeID: e.target.value });
            }}
          >
            {types.map((t) => (
              <MenuItem key={t.type_id} value={String(t.type_id)}>{t.type_name}</MenuItem>
            ))}
            <MenuItem value={NEW_TYPE}>+ เพิ่มประเภทใหม่</MenuItem>
          </TextField>
          {newType !== null && (
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                label="ชื่อประเภทเครื่องจักรใหม่"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              />
              <Button variant="contained" onClick={saveNewType}>เพิ่ม</Button>
              <Button onClick={() => setNewType(null)}>ยกเลิก</Button>
            </Stack>
          )}

          <TextField select label="ผู้ดูแล" value={form.owner || NONE} onChange={(e) => pickOwner(e.target.value)}>
  <MenuItem value={NONE}>ยังไม่กำหนด</MenuItem>
  {owners.map((o) => (
    <MenuItem key={o.employeeId} value={employeeFullName(o)}>
      {/* {employeeFullName(o)} — {o.role} */}
      {o.employeeId} — {employeeFullName(o)}
    </MenuItem>
  ))}
</TextField>
          <TextField
            label="ตำแหน่งผู้ดูแล"
            value={form.ownerRole}
            onChange={(e) => setForm({ ...form, ownerRole: e.target.value })}
            helperText="เติมให้อัตโนมัติเมื่อเลือกผู้ดูแล — แก้ไขเองได้"
          />

          {isEdit && (
            <TextField
              select
              label="งานปัจจุบัน"
              value={form.currentJob || NONE}
              onChange={(e) =>
                setForm({ ...form, currentJob: e.target.value === NONE ? "" : e.target.value })
              }
              helperText="รายการงานมาจากใบสั่งผลิต"
            >
              <MenuItem value={NONE}>ยังไม่มอบหมายงาน</MenuItem>
              {jobOptions.map((w) => (
                <MenuItem key={w} value={w}>{w}</MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="คำอธิบาย"
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {confirmDelete && (
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(239,68,68,0.08)" }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                ยืนยันการลบเครื่องจักร {machine?.id}?
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ใบแจ้งซ่อมและประวัติที่ผูกกับเครื่องนี้จะยังอยู่ แต่จะไม่ผูกกับเครื่องจักรอีกต่อไป
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button size="small" color="error" variant="contained" disabled={saving} onClick={remove}>
                  ลบเครื่องจักร
                </Button>
                <Button size="small" onClick={() => setConfirmDelete(false)}>ยกเลิก</Button>
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: isEdit ? "space-between" : "flex-end" }}>
        {isEdit && (
          <Button color="error" startIcon={<Delete />} onClick={() => setConfirmDelete(true)}>
            ลบเครื่องจักร
          </Button>
        )}
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>ยกเลิก</Button>
          <Button variant="contained" disabled={saving} onClick={save}>บันทึก</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

/** กล่องรายละเอียดเครื่องจักร: ข้อมูลสรุป + ประวัติการทำงาน (บันทึกเพิ่ม/ลบได้) */
export function MachineDetailDialog({
  machine,
  jobs,
  owners,
  onClose,
  onEdit,
  onJobsChanged,
}: {
  machine: ApiMachine | null;
  jobs: ApiMachineJob[];
  owners: ApiEmployee[];
  onClose: () => void;
  onEdit: (m: ApiMachine) => void;
  onJobsChanged: () => void | Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [job, setJob] = useState({ finishedAt: todayISO(), owner: "", detail: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAdding(false);
    setJob({ finishedAt: todayISO(), owner: "", detail: "" });
  }, [machine]);

  const history = useMemo(
    () =>
      machine
        ? jobs
            .filter((j) => j.machineID === machine.id)
            .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
        : [],
    [jobs, machine],
  );

  if (!machine) return null;

  async function saveJob() {
    if (!machine) return;
    if (!job.finishedAt) {
      toast.error("กรุณาเลือกวันที่ทำเสร็จ");
      return;
    }
    setBusy(true);
    try {
      await machinesApi.createJob({
        machineID: machine.id,
        finishedAt: job.finishedAt,
        owner: job.owner.trim() || machine.staff,
        detail: job.detail.trim(),
      });
      await onJobsChanged();
      setJob({ finishedAt: todayISO(), owner: "", detail: "" });
      setAdding(false);
      toast.success("บันทึกประวัติการทำงานแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกประวัติการทำงานไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function removeJob(historyID: string) {
    setBusy(true);
    try {
      await machinesApi.removeJob(historyID);
      await onJobsChanged();
      toast.success("ลบประวัติการทำงานแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบประวัติการทำงานไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>รายละเอียดเครื่องจักร</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", p: 2, borderRadius: 2, background: "rgba(74,144,226,0.08)" }}
          >
            <Box
              sx={{
                width: 48, height: 48, borderRadius: 2.5, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                background: "linear-gradient(135deg,#7FB4EE,#4A90E2)",
              }}
            >
              <CogIcon />
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>{machine.name}</Typography>
              <Typography variant="caption" color="text.secondary">{machine.id}</Typography>
            </Box>
            <Chip
              size="small"
              label={machineStatusLabel(machine.status)}
              color={machineStatusTone(machine.status)}
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <DetailBox label="ชั่วโมงทำงาน" value={`${Math.round(machine.hours).toLocaleString()} ชม.`} />
            <DetailBox label="งานปัจจุบัน" value={machine.currentJob || "-"} />
            <DetailBox label="สายการผลิต" value={machine.productionLine || "-"} />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <DetailBox label="ประเภท" value={machine.type || "-"} />
            <DetailBox label="ผู้ดูแล" value={machine.staff || "-"} />
            <DetailBox label="ตำแหน่ง" value={machine.ownerRole || "-"} />
          </Stack>
          <Box>
            <Typography variant="caption" color="text.secondary">คำอธิบาย</Typography>
            <Typography variant="body2">{machine.description || "-"}</Typography>
          </Box>

          <Divider />

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <History fontSize="small" />
              <Typography sx={{ fontWeight: 600 }}>ประวัติการทำงาน</Typography>
            </Stack>
            <Button size="small" startIcon={<Add />} onClick={() => setAdding((v) => !v)}>
              เพิ่มประวัติ
            </Button>
          </Stack>

          {adding && (
            <Stack spacing={1.5} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <TextField
                size="small"
                type="date"
                label="วันที่ทำเสร็จ"
                value={job.finishedAt}
                onChange={(e) => setJob({ ...job, finishedAt: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
  size="small"
  select
  label="ผู้ดูแลงาน"
  value={job.owner || NONE}
  onChange={(e) => setJob({ ...job, owner: e.target.value === NONE ? "" : e.target.value })}
>
  <MenuItem value={NONE}>ใช้ผู้ดูแลเครื่อง ({machine.staff || "ยังไม่กำหนด"})</MenuItem>
  {owners.map((o) => (
    <MenuItem key={o.employeeId} value={employeeFullName(o)}>{employeeFullName(o)}</MenuItem>
  ))}
</TextField>
              <TextField
                size="small"
                label="รายละเอียดงาน"
                value={job.detail}
                onChange={(e) => setJob({ ...job, detail: e.target.value })}
              />
              <Box>
                <Button variant="contained" size="small" disabled={busy} onClick={saveJob}>
                  บันทึกประวัติ
                </Button>
              </Box>
            </Stack>
          )}

          {history.length === 0 ? (
            <Typography variant="body2" color="text.secondary">ยังไม่มีประวัติการทำงาน</Typography>
          ) : (
            <Stack spacing={1}>
              {history.map((j) => (
                <Box key={j.id} sx={{ p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.06)" }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 700 }}>{j.jobCode}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      เสร็จเมื่อ {formatMachineDate(j.finishedAt)}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="caption" color="text.secondary">ผู้ดูแล: {j.owner || "-"}</Typography>
                    <IconButton size="small" color="error" disabled={busy} onClick={() => removeJob(j.id)}>
                      <Delete fontSize="inherit" />
                    </IconButton>
                  </Stack>
                  <Typography variant="body2">{j.detail || "-"}</Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>ปิด</Button>
        <Button variant="contained" onClick={() => onEdit(machine)}>แก้ไข</Button>
      </DialogActions>
    </Dialog>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.06)", minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 600 }} noWrap>{value}</Typography>
    </Box>
  );
}
