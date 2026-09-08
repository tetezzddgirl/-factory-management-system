import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  TaskAlt,
  Add,
  DeleteOutlined,
  Edit,
  GroupAdd,
  CalendarMonth,
  RadioButtonUnchecked,
  CheckCircle,
  WbSunny,
  WbTwilight,
  DarkMode,
} from "@mui/icons-material";
import { PageShell } from "@/components/page-shell";
import {
  ShiftTaskDialog,
  type OpenTaskRef,
  type ShiftTaskCreateResult,
} from "@/components/shift-task-dialog";
import { TaskDialog, type TaskDialogSubmit } from "@/components/task-dialog";
import { TaskAssignmentDialog } from "@/components/task-assignment-dialog";
import {
  tasksApi,
  employeesApi,
  machinesApi,
  workOrdersApi,
  workApi,
  productionLinesApi,
  plansApi,
  type ApiTaskAssignment,
  type ApiEmployee,
  type ApiMachine,
  type ApiWorkOrder,
  type ApiWork,
  type ApiProductionLine,
  type ApiProductionPlan,
} from "@/lib/api-client";
import {
  listAllTaskAssignments,
  listTasksWithWork,
  createTaskWithWork,
  updateTaskWithWork,
  type ApiTaskWithWork,
} from "@/lib/factoryflow-personnel-api";
import { SHIFTS, SHIFT_NAME, fullName, type ShiftId } from "@/lib/factoryflow-personnel";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "งานและการมอบหมาย — FactoryFlow" }] }),
  component: TasksPage,
});

const shiftIcon: Record<ShiftId, typeof WbSunny> = {
  morning: WbSunny,
  afternoon: WbTwilight,
  night: DarkMode,
};

function parseApiError(e: unknown): string {
  if (!(e instanceof Error)) return "";
  try {
    const j = JSON.parse(e.message) as { error?: string };
    if (j && typeof j.error === "string") return j.error;
  } catch {
    /* not JSON */
  }
  return e.message;
}
function apiErrorMessage(e: unknown, fallback: string): string {
  const m = parseApiError(e);
  if (!m || m === "Unauthorized") return fallback;
  return m;
}

function TasksPage() {
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [tasks, setTasks] = useState<ApiTaskWithWork[]>([]);
  const [assignments, setAssignments] = useState<ApiTaskAssignment[]>([]);
  const [machines, setMachines] = useState<ApiMachine[]>([]);
  const [workOrders, setWorkOrders] = useState<ApiWorkOrder[]>([]);
  const [works, setWorks] = useState<ApiWork[]>([]);
  const [lines, setLines] = useState<ApiProductionLine[]>([]);
  const [plans, setPlans] = useState<ApiProductionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState<ShiftId>("morning");
  const [shiftDialog, setShiftDialog] = useState<{
    id: string;
    name: string;
    shift: ShiftId;
  } | null>(null);
  const [pickShift, setPickShift] = useState<ShiftId>("afternoon");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiTaskWithWork | null>(null);
  const [assignTarget, setAssignTarget] = useState<ApiTaskWithWork | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiTaskWithWork | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [emps, taskList, asgs, mach, wos, wks, lns, pls] = await Promise.all([
        employeesApi.list(),
        listTasksWithWork(),
        listAllTaskAssignments(),
        machinesApi.list().catch(() => [] as ApiMachine[]),
        workOrdersApi.list().catch(() => [] as ApiWorkOrder[]),
        workApi.list().catch(() => [] as ApiWork[]),
        productionLinesApi.list().catch(() => [] as ApiProductionLine[]),
        plansApi.list().catch(() => [] as ApiProductionPlan[]),
      ]);
      setEmployees(emps ?? []);
      setTasks(taskList ?? []);
      setAssignments(asgs ?? []);
      setMachines(mach ?? []);
      setWorkOrders(wos ?? []);
      setWorks(wks ?? []);
      setLines(lns ?? []);
      setPlans(pls ?? []);
    } catch (e) {
      setError(apiErrorMessage(e, "โหลดข้อมูลงาน/เครื่องจักรจาก backend ไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const machineNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of machines) m.set(x.id, x.name);
    return m;
  }, [machines]);

  // FRESH-13 — lookup maps for the Task -> Work -> Work Order trace (read-only,
  // never persisted onto the Task).
  const workById = useMemo(() => {
    const m = new Map<string, ApiWork>();
    for (const w of works) m.set(w.workID, w);
    return m;
  }, [works]);
  const workOrderById = useMemo(() => {
    const m = new Map<string, ApiWorkOrder>();
    for (const o of workOrders) m.set(o.orderID, o);
    return m;
  }, [workOrders]);
  // สายการผลิตและความสำคัญของใบสั่งผลิต — เดิมอ่านจากคอลัมน์ `machines` ("L-01::สูง")
  // ที่ backend เลิกใช้ไปแล้ว จึงเปลี่ยนมาอ่านจากแหล่งจริง: production_line_id ของใบสั่งผลิต
  // และ priority ของแผนการผลิตที่ใบสั่งนั้นอ้างอิงอยู่
  const lineNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const l of lines) m.set(l.id, l.name);
    return m;
  }, [lines]);
  const planPriorityById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of plans) m.set(p.planID, p.priority);
    return m;
  }, [plans]);

  /** resolve a task's optional origin. Degrades gracefully when the Work / WO
   *  can no longer be found (deleted upstream). */
  const resolveOrigin = useCallback(
    (workId: string | null | undefined) => {
      if (!workId) return null;
      const work = workById.get(workId) ?? null;
      const wo = work ? (workOrderById.get(work.orderID) ?? null) : null;
      return { workId, work, wo };
    },
    [workById, workOrderById],
  );

  const assigneesByTask = useMemo(() => {
    const m = new Map<string, ApiTaskAssignment[]>();
    for (const a of assignments) {
      const arr = m.get(a.taskId) ?? [];
      arr.push(a);
      m.set(a.taskId, arr);
    }
    return m;
  }, [assignments]);

  const isDone = (t: ApiTaskWithWork) => t.status === "done";

  const openTasksForEmployee = useCallback(
    (empId: string): OpenTaskRef[] => {
      const myTaskIds = new Set(
        assignments.filter((a) => a.employeeId === empId).map((a) => a.taskId),
      );
      return tasks
        .filter((t) => myTaskIds.has(t.taskId) && !isDone(t))
        .map((t) => ({
          taskId: t.taskId,
          title: t.title,
          shift: t.shift as ShiftId,
          machineName: t.machineId ? (machineNameById.get(t.machineId) ?? t.machineId) : null,
        }));
    },
    [assignments, tasks, machineNameById],
  );

  const shiftEmployees = employees.filter((e) => e.shift === current);
  const shiftTasks = tasks.filter((t) => t.shift === current);
  const doneCount = shiftTasks.filter(isDone).length;
  const currentShiftName = SHIFT_NAME[current];

  // ── actions ───────────────────────────────────────────────────────────────

  async function toggleTask(t: ApiTaskWithWork) {
    const nextStatus = isDone(t) ? "pending" : "done";
    setTasks((p) => p.map((x) => (x.taskId === t.taskId ? { ...x, status: nextStatus } : x)));
    try {
      // PUT replaces every field — echo workId so the origin link is preserved
      await updateTaskWithWork(t.taskId, {
        title: t.title,
        description: t.description,
        machineId: t.machineId,
        shift: t.shift,
        status: nextStatus,
        workId: t.workId,
      });
    } catch (e) {
      setTasks((p) => p.map((x) => (x.taskId === t.taskId ? { ...x, status: t.status } : x)));
      toast.error(apiErrorMessage(e, "อัปเดตสถานะงานไม่สำเร็จ"));
    }
  }

  async function changeShift(empId: string, shift: ShiftId): Promise<boolean> {
    const e = employees.find((x) => x.employeeId === empId);
    if (!e) return false;
    try {
      await employeesApi.update(empId, {
        firstName: e.firstName,
        lastName: e.lastName,
        phone: e.phone,
        email: e.email ?? "",
        department: e.department,
        position: e.position,
        role: e.role,
        status: e.status,
        shift,
      });
      setEmployees((p) => p.map((x) => (x.employeeId === empId ? { ...x, shift } : x)));
      return true;
    } catch (err) {
      toast.error(apiErrorMessage(err, "ย้ายกะไม่สำเร็จ"));
      return false;
    }
  }

  async function createTaskWithAssignees(
    payload: {
      shift: ShiftId;
      title: string;
      machineId: string | null;
      assigneeIds: string[];
      workId: string | null;
    },
    opts: { reassignEmployeeIds: string[] },
  ): Promise<ShiftTaskCreateResult> {
    let created: ApiTaskWithWork;
    try {
      created = await createTaskWithWork({
        title: payload.title,
        description: "",
        machineId: payload.machineId,
        shift: payload.shift,
        status: "pending",
        workId: payload.workId,
      });
    } catch (e) {
      return { ok: false, error: apiErrorMessage(e, "เพิ่มงานไม่สำเร็จ") };
    }

    const assigned: string[] = [];
    for (const empId of payload.assigneeIds) {
      try {
        await tasksApi.assign(created.taskId, empId);
        assigned.push(empId);
      } catch {
        /* keep going; report the real count */
      }
    }
    if (assigned.length === 0) {
      await tasksApi.remove(created.taskId).catch(() => {});
      return { ok: false, error: "สร้างงานแล้วแต่มอบหมายผู้รับผิดชอบไม่สำเร็จ — ยกเลิกงานให้แล้ว" };
    }

    // detach the confirmed reassignments from their other still-open tasks
    let detached = 0;
    const reassign = new Set(opts.reassignEmployeeIds.filter((id) => assigned.includes(id)));
    for (const empId of reassign) {
      for (const prev of tasks) {
        if (isDone(prev) || prev.taskId === created.taskId) continue;
        const a = (assigneesByTask.get(prev.taskId) ?? []).find((x) => x.employeeId === empId);
        if (!a) continue;
        try {
          await tasksApi.unassign(prev.taskId, a.assignmentId);
          detached += 1;
        } catch {
          /* best effort */
        }
      }
    }

    await load();
    const movedNote = detached > 0 ? ` • ย้ายออกจากงานเดิม ${detached} รายการ` : "";
    if (assigned.length < payload.assigneeIds.length) {
      toast.warning(
        `บันทึกงานแล้ว แต่มอบหมายสำเร็จ ${assigned.length}/${payload.assigneeIds.length} คน (บางรายการล้มเหลว)${movedNote}`,
      );
    } else {
      toast.success(`บันทึกงานสำเร็จ • ผู้รับผิดชอบ ${assigned.length} คน${movedNote}`);
    }
    return { ok: true, assigned: assigned.length, requested: payload.assigneeIds.length, detached };
  }

  async function handleEditTask(v: TaskDialogSubmit): Promise<boolean> {
    if (!editTarget) return false;
    try {
      await updateTaskWithWork(editTarget.taskId, v);
      toast.success("บันทึกการแก้ไขแล้ว");
      await load();
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e, "แก้ไขงานไม่สำเร็จ"));
      return false;
    }
  }

  async function confirmDeleteTask() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // explicit un-assignment first (backend refuses to cascade silently)
      for (const a of assigneesByTask.get(deleteTarget.taskId) ?? []) {
        await tasksApi.unassign(deleteTarget.taskId, a.assignmentId);
      }
      await tasksApi.remove(deleteTarget.taskId);
      toast.success("ลบงานแล้ว");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, "ลบงานไม่สำเร็จ"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageShell
      title="งานและการมอบหมาย"
      description="จัดกะการทำงาน มอบหมายงานพนักงาน และติดตามงานในแต่ละกะ"
      icon={<TaskAlt />}
    >
      {loading && (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      )}

      {!loading && error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={load}>
              ลองใหม่
            </Button>
          }
        >
          {error} · รายการงานด้านล่างอาจไม่ครบ
        </Alert>
      )}

      {!loading && !error && (
        <>
          {/* shift selector */}
          <Box
            sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr 1fr" } }}
          >
            {SHIFTS.map((s) => {
              const Icon = shiftIcon[s.id];
              const emp = employees.filter((e) => e.shift === s.id).length;
              const st = tasks.filter((t) => t.shift === s.id);
              const active = current === s.id;
              return (
                <Paper
                  key={s.id}
                  variant="outlined"
                  onClick={() => setCurrent(s.id)}
                  sx={{
                    borderRadius: 3,
                    p: 2.5,
                    cursor: "pointer",
                    transition: "all .2s",
                    borderColor: active ? "primary.main" : "divider",
                    boxShadow: active ? "0 0 0 3px rgba(74,144,226,0.18)" : "none",
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Avatar
                      variant="rounded"
                      sx={{ bgcolor: "primary.light", width: 40, height: 40 }}
                    >
                      <Icon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{s.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.time}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack spacing={0.5} sx={{ mt: 2 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        พนักงาน
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {emp} คน
                      </Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        งาน
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {st.filter(isDone).length}/{st.length}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 2.5,
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              mt: 2.5,
            }}
          >
            {/* panel: employees in shift */}
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700, color: "primary.main" }}>
                    พนักงานใน{currentShiftName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ดูพนักงานในกะนี้ และจัดกะการทำงาน
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={`${shiftEmployees.length} คน`}
                  sx={{ bgcolor: "action.hover" }}
                />
              </Stack>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {shiftEmployees.length === 0 && (
                  <Paper
                    variant="outlined"
                    sx={{ borderStyle: "dashed", borderRadius: 2, p: 3, textAlign: "center" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      ยังไม่มีพนักงานในกะนี้
                    </Typography>
                  </Paper>
                )}
                {shiftEmployees.map((e) => (
                  <Stack
                    key={e.employeeId}
                    direction="row"
                    spacing={1.5}
                    sx={{
                      alignItems: "center",
                      flexWrap: "wrap",
                      rowGap: 1,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      p: 1.5,
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: "primary.light",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {fullName(e).charAt(0)}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {fullName(e)} ({e.employeeId})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {e.position || "—"}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={e.department}
                      sx={{ bgcolor: "action.hover", color: "primary.main", fontWeight: 600 }}
                    />
                    <Button
                      size="small"
                      startIcon={<CalendarMonth fontSize="small" />}
                      onClick={() => {
                        setPickShift(e.shift as ShiftId);
                        setShiftDialog({
                          id: e.employeeId,
                          name: fullName(e),
                          shift: e.shift as ShiftId,
                        });
                      }}
                    >
                      จัดกะ
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            {/* panel: tasks in shift */}
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700, color: "primary.main" }}>งานในกะ</Typography>
                  <Typography variant="caption" color="text.secondary">
                    เสร็จแล้ว {doneCount}/{shiftTasks.length} งาน
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setAddOpen(true)}
                >
                  เพิ่มงาน
                </Button>
              </Stack>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {shiftTasks.length === 0 && (
                  <Paper
                    variant="outlined"
                    sx={{ borderStyle: "dashed", borderRadius: 2, p: 3, textAlign: "center" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      ยังไม่มีงานในกะนี้
                    </Typography>
                  </Paper>
                )}
                {shiftTasks.map((t) => {
                  const done = isDone(t);
                  const as = assigneesByTask.get(t.taskId) ?? [];
                  const names = as.map((a) => `${a.firstName} ${a.lastName}`.trim());
                  const label =
                    names.length === 0
                      ? "ไม่ระบุ"
                      : names.length <= 2
                        ? names.join(", ")
                        : `${names[0]} +${names.length - 1} คน`;
                  const machineName = t.machineId
                    ? (machineNameById.get(t.machineId) ?? t.machineId)
                    : null;
                  const origin = resolveOrigin(t.workId);
                  return (
                    <Stack
                      key={t.taskId}
                      direction="row"
                      spacing={1.5}
                      sx={{
                        alignItems: "center",
                        borderRadius: 2,
                        p: 1.5,
                        border: "1px solid",
                        borderColor: done ? "success.light" : "divider",
                        bgcolor: done ? "success.50" : "transparent",
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => toggleTask(t)}
                        aria-label="สลับสถานะงาน"
                      >
                        {done ? (
                          <CheckCircle color="success" />
                        ) : (
                          <RadioButtonUnchecked color="disabled" />
                        )}
                      </IconButton>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            textDecoration: done ? "line-through" : "none",
                            color: done ? "text.secondary" : "text.primary",
                          }}
                          noWrap
                        >
                          {t.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ display: "block" }}
                        >
                          ผู้รับผิดชอบ:{" "}
                          {names.length > 2 ? (
                            <Tooltip
                              title={
                                <Box sx={{ py: 0.5 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 700, display: "block", mb: 0.5 }}
                                  >
                                    ผู้รับผิดชอบ ({as.length} คน)
                                  </Typography>
                                  {as.map((a) => (
                                    <Typography
                                      key={a.assignmentId}
                                      variant="caption"
                                      sx={{ display: "block" }}
                                    >
                                      {a.firstName} {a.lastName} · {a.employeeId}
                                    </Typography>
                                  ))}
                                </Box>
                              }
                            >
                              <Box
                                component="span"
                                sx={{ textDecoration: "underline dotted", cursor: "help" }}
                              >
                                {label}
                              </Box>
                            </Tooltip>
                          ) : (
                            label
                          )}
                          {machineName ? ` · เครื่องจักร: ${machineName}` : ""}
                        </Typography>

                        {/* FRESH-13 — production origin (read-only trace Task -> Work -> Work Order) */}
                        {origin &&
                          (origin.work ? (
                            <Tooltip
                              title={
                                <Box sx={{ py: 0.5 }}>
                                  <Typography variant="caption" sx={{ display: "block" }}>
                                    ใบสั่งผลิต: {origin.wo?.orderID ?? origin.work.orderID}
                                    {origin.wo ? ` · ${origin.wo.name}` : ""}
                                  </Typography>
                                  {origin.wo && (
                                    <>
                                      <Typography variant="caption" sx={{ display: "block" }}>
                                        จำนวน: {origin.wo.amount.toLocaleString()} · กำหนดส่ง:{" "}
                                        {origin.wo.endDate
                                          ? new Date(origin.wo.endDate).toLocaleDateString("th-TH")
                                          : "—"}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: "block" }}>
                                        {(() => {
                                          const line =
                                            origin.wo.production_line_id !== undefined
                                              ? lineNameById.get(origin.wo.production_line_id)
                                              : undefined;
                                          const priority = planPriorityById.get(origin.wo.planID);
                                          return `สายการผลิต: ${line || "—"} · ความสำคัญ: ${priority || "—"} · สถานะ WO: ${origin.wo.status}`;
                                        })()}
                                      </Typography>
                                    </>
                                  )}
                                  <Typography variant="caption" sx={{ display: "block" }}>
                                    งาน: {origin.work.workID} — {origin.work.work}
                                  </Typography>
                                </Box>
                              }
                            >
                              <Chip
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ mt: 0.5, maxWidth: "100%" }}
                                label={
                                  `${origin.wo?.orderID ?? origin.work.orderID}` +
                                  `${origin.wo ? ` · ${origin.wo.name}` : ""}` +
                                  ` · ${origin.work.workID}`
                                }
                              />
                            </Tooltip>
                          ) : (
                            <Chip
                              size="small"
                              variant="outlined"
                              sx={{ mt: 0.5 }}
                              label={`${origin.workId} — ไม่พบข้อมูลต้นทาง`}
                            />
                          ))}
                      </Box>
                      <Chip
                        size="small"
                        label={done ? "เสร็จแล้ว" : "กำลังอยู่"}
                        color={done ? "success" : "default"}
                        variant={done ? "filled" : "outlined"}
                      />
                      <Tooltip title="แก้ไขงาน">
                        <IconButton size="small" onClick={() => setEditTarget(t)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="จัดการผู้รับผิดชอบ">
                        <IconButton size="small" onClick={() => setAssignTarget(t)}>
                          <GroupAdd fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบงาน">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(t)}>
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  );
                })}
              </Stack>
            </Paper>
          </Box>
        </>
      )}

      {/* จัดกะการทำงาน */}
      <Dialog open={!!shiftDialog} onClose={() => setShiftDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          จัดกะการทำงาน
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
            เลือกกะใหม่สำหรับ {shiftDialog?.name}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            select
            label="กะ"
            fullWidth
            sx={{ mt: 1 }}
            value={pickShift}
            onChange={(e) => setPickShift(e.target.value as ShiftId)}
          >
            {SHIFTS.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name} ({s.time})
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShiftDialog(null)}>ยกเลิก</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!shiftDialog) return;
              const ok = await changeShift(shiftDialog.id, pickShift);
              if (ok) {
                toast.success(`ย้าย ${shiftDialog.name} ไป${SHIFT_NAME[pickShift]}แล้ว`);
                setShiftDialog(null);
              }
            }}
          >
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>

      <ShiftTaskDialog
        open={addOpen}
        defaultShift={current}
        employees={employees}
        machines={machines}
        workOrders={workOrders}
        works={works}
        openTasksForEmployee={openTasksForEmployee}
        onClose={() => setAddOpen(false)}
        onMoveShift={changeShift}
        onCreate={createTaskWithAssignees}
      />

      <TaskDialog
        open={!!editTarget}
        mode="edit"
        task={editTarget}
        workOrders={workOrders}
        works={works}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEditTask}
      />

      <TaskAssignmentDialog
        open={!!assignTarget}
        task={assignTarget}
        onClose={() => setAssignTarget(null)}
        onChanged={load}
      />

      <Dialog
        open={!!deleteTarget}
        onClose={deleting ? undefined : () => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>ยืนยันการลบงาน</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ต้องการลบงาน{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {deleteTarget?.title}
            </Box>{" "}
            ({deleteTarget?.taskId}) หรือไม่?
            {deleteTarget && (assigneesByTask.get(deleteTarget.taskId)?.length ?? 0) > 0 && (
              <>
                {" "}
                ระบบจะยกเลิกการมอบหมายพนักงาน {assigneesByTask.get(deleteTarget.taskId)!.length} คน
                ในงานนี้ก่อนลบ
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            ยกเลิก
          </Button>
          <Button color="error" variant="contained" onClick={confirmDeleteTask} disabled={deleting}>
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}
