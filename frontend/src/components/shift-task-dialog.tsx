import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  MenuItem,
  Button,
  Stack,
  Typography,
  Box,
  Avatar,
  IconButton,
} from "@mui/material";
import { Add, Close } from "@mui/icons-material";
import { EmployeeSearchInput } from "@/components/personnel-filters";
import type { ApiEmployee, ApiMachine, ApiWorkOrder, ApiWork } from "@/lib/api-client";
import {
  SHIFTS,
  shiftLabel,
  NO_MACHINE,
  matchesEmployeeQuery,
  fullName,
  type ShiftId,
} from "@/lib/factoryflow-personnel";

// FRESH-12 — "กำหนดงานในกะ": create a task and assign employees to it, ported 1:1
// (fields, wording, the cross-shift search, and the two confirm sub-flows) from
// the ORIGINAL FactoryFlow "บริหารบุคลากร" / shifts.tsx "เพิ่มงาน" dialog.
// Rebuilt with MUI. The two guarded sub-flows:
//   1. picking an employee who still has an unfinished task  -> "พนักงานคนนี้กำลังทำงานอยู่"
//   2. picking an employee whose shift ≠ the task's shift    -> "ต้องการย้ายกะพนักงานหรือไม่"

const TASK_MATCH_LIMIT = 6;

export interface OpenTaskRef {
  taskId: string;
  title: string;
  shift: ShiftId;
  machineName: string | null;
}

export interface ShiftTaskCreateResult {
  ok: boolean;
  error?: string;
  assigned?: number;
  requested?: number;
  detached?: number;
}

interface ShiftTaskDialogProps {
  open: boolean;
  defaultShift: ShiftId;
  employees: ApiEmployee[];
  machines: ApiMachine[];
  /** FRESH-13 — existing Friend data for the OPTIONAL production-origin picker */
  workOrders?: ApiWorkOrder[];
  works?: ApiWork[];
  openTasksForEmployee: (empId: string) => OpenTaskRef[];
  onClose: () => void;
  onMoveShift: (empId: string, shift: ShiftId) => Promise<boolean>;
  onCreate: (
    payload: {
      shift: ShiftId;
      title: string;
      machineId: string | null;
      assigneeIds: string[];
      /** FRESH-13 — Friend Work.workID, or null for an ad-hoc task */
      workId: string | null;
    },
    opts: { reassignEmployeeIds: string[] },
  ) => Promise<ShiftTaskCreateResult>;
}

export function ShiftTaskDialog({
  open,
  defaultShift,
  employees,
  machines,
  workOrders = [],
  works = [],
  openTasksForEmployee,
  onClose,
  onMoveShift,
  onCreate,
}: ShiftTaskDialogProps) {
  const [taskShift, setTaskShift] = useState<ShiftId>(defaultShift);
  const [title, setTitle] = useState("");
  const [machineId, setMachineId] = useState(""); // "" = ไม่มี
  const [workOrderId, setWorkOrderId] = useState(""); // FRESH-13 — "" = no reference
  const [workId, setWorkId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [reassignIds, setReassignIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [shiftConfirm, setShiftConfirm] = useState<{
    emp: ApiEmployee;
    from: ShiftId;
    to: ShiftId;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [busyConfirm, setBusyConfirm] = useState<{ emp: ApiEmployee; open: OpenTaskRef[] } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    setTaskShift(defaultShift);
    setTitle("");
    setMachineId("");
    setWorkOrderId("");
    setWorkId("");
    setAssigneeIds([]);
    setQuery("");
    setReassignIds([]);
    setError("");
    setBusy(false);
    setShiftConfirm(null);
    setBusyConfirm(null);
  }, [open, defaultShift]);

  const empById = useMemo(() => {
    const m = new Map<string, ApiEmployee>();
    for (const e of employees) m.set(e.employeeId, e);
    return m;
  }, [employees]);

  const worksForOrder = useMemo(
    () => (workOrderId ? works.filter((w) => w.orderID === workOrderId) : []),
    [workOrderId, works],
  );

  // changing / clearing the Work Order resets the Work selection
  function onWorkOrderChange(orderId: string) {
    setWorkOrderId(orderId);
    setWorkId("");
  }

  // picking a Work item pre-fills the title ONLY when the user has not typed one
  function onWorkChange(id: string) {
    setWorkId(id);
    if (id && !title.trim()) {
      const w = works.find((x) => x.workID === id);
      if (w?.work) setTitle(w.work);
    }
  }

  const selectedAssignees = assigneeIds.flatMap((id) => {
    const e = empById.get(id);
    return e ? [e] : [];
  });

  const q = query.trim();
  const taskMatches = q
    ? employees.filter((e) => !assigneeIds.includes(e.employeeId) && matchesEmployeeQuery(e, q))
    : employees.filter((e) => !assigneeIds.includes(e.employeeId) && e.shift === taskShift);

  function commitAssignee(e: ApiEmployee) {
    if (e.shift === taskShift) {
      setAssigneeIds((prev) => (prev.includes(e.employeeId) ? prev : [...prev, e.employeeId]));
      setQuery("");
      return;
    }
    setShiftConfirm({ emp: e, from: e.shift as ShiftId, to: taskShift });
  }

  function chooseAssignee(e: ApiEmployee) {
    if (!reassignIds.includes(e.employeeId)) {
      const open = openTasksForEmployee(e.employeeId);
      if (open.length > 0) {
        setBusyConfirm({ emp: e, open });
        return;
      }
    }
    commitAssignee(e);
  }

  function removeAssignee(id: string) {
    setAssigneeIds((prev) => prev.filter((x) => x !== id));
    setReassignIds((prev) => prev.filter((x) => x !== id));
  }

  function confirmBusyMove() {
    if (!busyConfirm) return;
    const emp = busyConfirm.emp;
    setReassignIds((prev) => (prev.includes(emp.employeeId) ? prev : [...prev, emp.employeeId]));
    setBusyConfirm(null);
    commitAssignee(emp);
  }

  async function confirmShiftMove() {
    if (!shiftConfirm) return;
    setConfirmBusy(true);
    const ok = await onMoveShift(shiftConfirm.emp.employeeId, shiftConfirm.to);
    setConfirmBusy(false);
    if (!ok) return;
    setAssigneeIds((prev) =>
      prev.includes(shiftConfirm.emp.employeeId) ? prev : [...prev, shiftConfirm.emp.employeeId],
    );
    setQuery("");
    setShiftConfirm(null);
  }

  async function submit() {
    if (!title.trim() || assigneeIds.length === 0) {
      setError("กรุณากรอกชื่องานและเลือกผู้รับผิดชอบอย่างน้อย 1 คน");
      return;
    }
    setBusy(true);
    setError("");
    const res = await onCreate(
      {
        shift: taskShift,
        title: title.trim(),
        machineId: machineId || null,
        assigneeIds,
        workId: workId || null,
      },
      { reassignEmployeeIds: reassignIds },
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "เพิ่มงานไม่สำเร็จ");
      return;
    }
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={busy ? undefined : onClose}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          กำหนดงานในกะ
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
            เลือกกะของงาน แล้วมอบหมายผู้รับผิดชอบ
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="กะของงาน"
              fullWidth
              value={taskShift}
              onChange={(e) => setTaskShift(e.target.value as ShiftId)}
            >
              {SHIFTS.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.time})
                </MenuItem>
              ))}
            </TextField>

            {/* FRESH-13 — optional production origin (read-only reuse of Friend Work Order + Work data) */}
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                อ้างอิงงานจากใบสั่งผลิต (ไม่บังคับ)
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  select
                  fullWidth
                  label="ใบสั่งผลิต"
                  value={workOrderId}
                  onChange={(e) => onWorkOrderChange(e.target.value)}
                >
                  <MenuItem value="">— ไม่อ้างอิง (งานทั่วไป) —</MenuItem>
                  {workOrders.map((o) => (
                    <MenuItem key={o.orderID} value={o.orderID}>
                      {o.orderID} — {o.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  label="งาน (Work)"
                  value={workId}
                  onChange={(e) => onWorkChange(e.target.value)}
                  disabled={!workOrderId}
                  helperText={!workOrderId ? "เลือกใบสั่งผลิตก่อน" : undefined}
                >
                  <MenuItem value="">— ไม่ระบุ —</MenuItem>
                  {worksForOrder.map((w) => (
                    <MenuItem key={w.workID} value={w.workID}>
                      {w.workID} — {w.work}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>

            <TextField
              label="ชื่องาน"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ตรวจเช็ควัตถุดิบก่อนเข้าไลน์"
            />

            <Box>
              <TextField
                select
                label="เครื่องจักร"
                fullWidth
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
              >
                <MenuItem value="">{NO_MACHINE}</MenuItem>
                {machines.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}
                  </MenuItem>
                ))}
              </TextField>
              {machines.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  ยังไม่มีรายการเครื่องจักรจากระบบเครื่องจักร
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                มอบหมายให้
              </Typography>

              {selectedAssignees.length > 0 && (
                <Stack spacing={1} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    พนักงานที่เลือก ({selectedAssignees.length})
                  </Typography>
                  {selectedAssignees.map((e) => {
                    const diff = e.shift !== taskShift;
                    return (
                      <Stack
                        key={e.employeeId}
                        direction="row"
                        spacing={1.5}
                        sx={{
                          alignItems: "center",
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "primary.main",
                          bgcolor: "primary.50",
                          p: 1,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: "primary.light",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {fullName(e).charAt(0)}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {fullName(e)}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: "block" }}
                          >
                            <Box component="span" sx={{ fontFamily: "monospace" }}>
                              {e.employeeId}
                            </Box>
                            {" · "}
                            {e.position || "—"}
                            {" · "}
                            {e.department}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: diff ? "warning.main" : "text.secondary",
                              fontWeight: diff ? 700 : 400,
                            }}
                          >
                            {shiftLabel(e.shift as ShiftId)}
                            {diff && " · ต่างกะ"}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => removeAssignee(e.employeeId)}
                          aria-label={`เอา ${fullName(e)} ออก`}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Stack>
                    );
                  })}
                </Stack>
              )}

              <EmployeeSearchInput
                id="task-emp-search"
                value={query}
                onChange={setQuery}
                placeholder="ค้นหาชื่อ นามสกุล หรือ Employee ID (ค้นข้ามกะได้)"
              />

              <Box
                sx={{
                  mt: 1,
                  maxHeight: 200,
                  overflowY: "auto",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 0.75,
                }}
              >
                {taskMatches.length === 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", textAlign: "center", py: 1.5 }}
                  >
                    {q
                      ? "ไม่พบพนักงานที่ตรงกับการค้นหา"
                      : "ไม่มีพนักงานในกะนี้ — พิมพ์ชื่อหรือรหัสเพื่อค้นหาข้ามกะ"}
                  </Typography>
                )}
                {taskMatches.slice(0, TASK_MATCH_LIMIT).map((e) => {
                  const diff = e.shift !== taskShift;
                  return (
                    <Box
                      key={e.employeeId}
                      role="button"
                      onClick={() => chooseAssignee(e)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1,
                        borderRadius: 1.5,
                        border: "1px solid",
                        borderColor: "divider",
                        mb: 0.75,
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: "primary.light",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {fullName(e).charAt(0)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          {fullName(e)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ display: "block" }}
                        >
                          <Box component="span" sx={{ fontFamily: "monospace" }}>
                            {e.employeeId}
                          </Box>
                          {" · "}
                          {e.position || "—"}
                          {" · "}
                          {e.department}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: diff ? "warning.main" : "text.secondary",
                            fontWeight: diff ? 700 : 400,
                          }}
                        >
                          {shiftLabel(e.shift as ShiftId)}
                          {diff && " · ต่างกะ"}
                        </Typography>
                      </Box>
                      <Add fontSize="small" color="primary" />
                    </Box>
                  );
                })}
                {taskMatches.length > TASK_MATCH_LIMIT && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", textAlign: "center", py: 0.5 }}
                  >
                    และอีก {taskMatches.length - TASK_MATCH_LIMIT} รายการ — พิมพ์ให้เจาะจงขึ้น
                  </Typography>
                )}
              </Box>
            </Box>

            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={busy}>
            ยกเลิก
          </Button>
          <Button variant="contained" onClick={submit} disabled={busy}>
            {busy ? "กำลังบันทึก…" : "เพิ่มงาน"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ยืนยันการย้ายกะพนักงาน */}
      <Dialog
        open={!!shiftConfirm}
        onClose={() => !confirmBusy && setShiftConfirm(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>ต้องการย้ายกะพนักงานหรือไม่</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: shiftConfirm ? 1.5 : 0 }}>
            พนักงานคนนี้อยู่คนละกะกับงานที่กำลังสร้าง หากยืนยัน ระบบจะเปลี่ยนกะของพนักงานใน Backend
            ก่อนมอบหมายงาน
          </DialogContentText>
          {shiftConfirm && (
            <Stack spacing={0.5} sx={{ fontSize: 14 }}>
              <div>
                <Box component="span" sx={{ color: "text.secondary" }}>
                  พนักงาน:{" "}
                </Box>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {fullName(shiftConfirm.emp)}
                </Box>{" "}
                <Box
                  component="span"
                  sx={{ fontFamily: "monospace", fontSize: 12, color: "text.secondary" }}
                >
                  {shiftConfirm.emp.employeeId}
                </Box>
              </div>
              <div>
                <Box component="span" sx={{ color: "text.secondary" }}>
                  กะปัจจุบัน:{" "}
                </Box>
                {shiftLabel(shiftConfirm.from)}
              </div>
              <div>
                <Box component="span" sx={{ color: "text.secondary" }}>
                  กะที่เลือกสำหรับงาน:{" "}
                </Box>
                {shiftLabel(shiftConfirm.to)}
              </div>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShiftConfirm(null)} disabled={confirmBusy}>
            ไม่ / ยกเลิก
          </Button>
          <Button variant="contained" onClick={confirmShiftMove} disabled={confirmBusy}>
            {confirmBusy ? "กำลังย้าย…" : "ใช่ / ย้ายกะ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* พนักงานมีงานที่กำลังทำอยู่ */}
      <Dialog open={!!busyConfirm} onClose={() => setBusyConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>พนักงานคนนี้กำลังทำงานอยู่</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: busyConfirm ? 1.5 : 0 }}>
            พนักงานที่เลือกยังมีงานที่ยังไม่เสร็จ หากยืนยัน ระบบจะถอนพนักงานออกจากงานเดิม
            (เฉพาะงานที่ยังไม่เสร็จ) แล้วมอบหมายให้งานใหม่ — บันทึกลง Backend จริงเมื่อกด "เพิ่มงาน"
          </DialogContentText>
          {busyConfirm && (
            <Stack spacing={1.25} sx={{ fontSize: 14 }}>
              <div>
                <Box component="span" sx={{ color: "text.secondary" }}>
                  พนักงาน:{" "}
                </Box>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {fullName(busyConfirm.emp)}
                </Box>{" "}
                <Box
                  component="span"
                  sx={{ fontFamily: "monospace", fontSize: 12, color: "text.secondary" }}
                >
                  {busyConfirm.emp.employeeId}
                </Box>
              </div>
              <Typography variant="body2" color="text.secondary">
                กำลังทำงานอยู่ ({busyConfirm.open.length} งาน):
              </Typography>
              <Stack spacing={1}>
                {busyConfirm.open.map((t) => (
                  <Box
                    key={t.taskId}
                    sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider", p: 1 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {t.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <Box component="span" sx={{ fontFamily: "monospace" }}>
                        {t.taskId}
                      </Box>
                      {" · "}
                      {shiftLabel(t.shift)}
                      {t.machineName ? ` · เครื่องจักร: ${t.machineName}` : ""}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ต้องการย้ายพนักงานคนนี้ไปทำงานอื่นหรือไม่?
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBusyConfirm(null)}>ยกเลิก</Button>
          <Button variant="contained" onClick={confirmBusyMove}>
            ยืนยัน / ย้ายไปงานใหม่
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
