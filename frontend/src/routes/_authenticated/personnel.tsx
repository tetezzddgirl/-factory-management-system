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
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Groups,
  Add,
  Edit,
  DeleteOutlined,
  PersonOutlined,
  SettingsSuggest,
} from "@mui/icons-material";
import { PageShell } from "@/components/page-shell";
import { DepartmentTabs, EmployeeSearchInput } from "@/components/personnel-filters";
import { EmployeeDialog, type EmployeeFormValues } from "@/components/employee-dialog";
import {
  employeesApi,
  tasksApi,
  machinesApi,
  type ApiEmployee,
  type ApiEmployeeAccount,
  type EmployeeCreateInput,
  type ApiTask,
  type ApiTaskAssignment,
  type ApiMachine,
} from "@/lib/api-client";
import {
  setEmployeeAccountActive,
  resetEmployeeAccountPassword,
  listAllTaskAssignments,
} from "@/lib/factoryflow-personnel-api";
import {
  DEPARTMENTS,
  ALL_DEPARTMENTS,
  ROLE_LABELS,
  ROLE_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  matchesEmployeeQuery,
  departmentCounts,
  fullName,
  findMyEmployee,
  isAdminEmployee,
  type DeptFilter,
  type EmployeeStatus,
} from "@/lib/factoryflow-personnel";
import { getSession } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/personnel")({
  head: () => ({ meta: [{ title: "บุคลากร — FactoryFlow" }] }),
  component: PersonnelPage,
});

/** Pull a human message out of an apiFetch error (its message is the response body). */
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
function deleteErrorMessage(e: unknown): string {
  if (parseApiError(e).toLowerCase().includes("task assignment")) {
    return "ไม่สามารถลบบุคลากรได้ — บุคลากรนี้ยังมีงานที่ได้รับมอบหมายอยู่ กรุณายกเลิกการมอบหมายงานก่อน";
  }
  return apiErrorMessage(e, "ลบบุคลากรไม่สำเร็จ");
}

function toCreatePayload(v: EmployeeFormValues): EmployeeCreateInput {
  const base: EmployeeCreateInput = {
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    phone: v.phone.trim(),
    email: v.email.trim(),
    department: v.department,
    position: v.position.trim(),
    role: v.role,
    status: v.status,
  };
  return v.username.trim() ? { ...base, username: v.username.trim(), password: v.password } : base;
}

function PersonnelPage() {
  const [rows, setRows] = useState<ApiEmployee[]>([]);
  const [accounts, setAccounts] = useState<Record<string, ApiEmployeeAccount | null>>({});
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [assignments, setAssignments] = useState<ApiTaskAssignment[]>([]);
  const [machines, setMachines] = useState<ApiMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deptFilter, setDeptFilter] = useState<DeptFilter>(ALL_DEPARTMENTS);
  const [query, setQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiEmployee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiEmployee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [emps, taskList, asgs, mach] = await Promise.all([
        employeesApi.list(),
        tasksApi.list().catch(() => [] as ApiTask[]),
        listAllTaskAssignments().catch(() => [] as ApiTaskAssignment[]),
        machinesApi.list().catch(() => [] as ApiMachine[]),
      ]);
      setRows(emps ?? []);
      setTasks(taskList ?? []);
      setAssignments(asgs ?? []);
      setMachines(mach ?? []);
      // account per employee — parallel, tolerate individual failures
      const entries = await Promise.all(
        (emps ?? []).map(async (e) => {
          try {
            return [e.employeeId, await employeesApi.getAccount(e.employeeId)] as const;
          } catch {
            return [e.employeeId, null] as const;
          }
        }),
      );
      setAccounts(Object.fromEntries(entries));
    } catch (e) {
      setError(apiErrorMessage(e, "โหลดข้อมูลบุคลากรไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const existingUsernames = useMemo(
    () =>
      Object.values(accounts)
        .filter(Boolean)
        .map((a) => (a as ApiEmployeeAccount).username),
    [accounts],
  );

  const machineNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of machines) m.set(x.id, x.name);
    return m;
  }, [machines]);

  /** machine names an employee is responsible for, via the tasks they're assigned to */
  const machinesForEmployee = useCallback(
    (empId: string): string[] => {
      const taskIds = new Set(
        assignments.filter((a) => a.employeeId === empId).map((a) => a.taskId),
      );
      const names = new Set<string>();
      for (const t of tasks) {
        if (t.machineId && taskIds.has(t.taskId)) {
          names.add(machineNameById.get(t.machineId) ?? t.machineId);
        }
      }
      return [...names];
    },
    [assignments, tasks, machineNameById],
  );

  // FRESH-14 — every authenticated role may open + view บุคลากร (list / search /
  // filter). Only an ADMIN sees the create / edit / delete controls. "Admin" is
  // the real role of the logged-in user (their own employees.role), resolved
  // from the session — NOT the freely switchable frontend RoleContext. The
  // backend independently enforces the same rule on the write endpoints.
  const isAdmin = useMemo(() => isAdminEmployee(findMyEmployee(rows, getSession())), [rows]);

  const counts = departmentCounts(rows);
  const visibleDepts = deptFilter === ALL_DEPARTMENTS ? DEPARTMENTS : [deptFilter];
  const groups = visibleDepts.map((d) => ({
    dept: d,
    list: rows.filter((e) => e.department === d && matchesEmployeeQuery(e, query)),
  }));
  const nothingFound = !loading && !error && groups.every((g) => g.list.length === 0);

  function openCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }
  function openEdit(emp: ApiEmployee) {
    setEditTarget(emp);
    setDialogOpen(true);
  }

  async function handleCreate(v: EmployeeFormValues): Promise<boolean> {
    try {
      const created = await employeesApi.create(toCreatePayload(v));
      toast.success(
        v.username.trim()
          ? `เพิ่มพนักงานสำเร็จ • Employee ID: ${created.employeeId} • Username: ${v.username.trim()}`
          : `เพิ่มพนักงานสำเร็จ • Employee ID: ${created.employeeId}`,
      );
      await load();
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e, "เพิ่มพนักงานไม่สำเร็จ"));
      return false;
    }
  }

  async function handleEdit(v: EmployeeFormValues): Promise<boolean> {
    if (!editTarget) return false;
    try {
      await employeesApi.update(editTarget.employeeId, {
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        phone: v.phone.trim(),
        email: v.email.trim(),
        department: v.department,
        position: v.position.trim(),
        role: v.role,
        status: v.status,
        shift: editTarget.shift, // not edited here — preserve (original omits it too)
      });
      // account active flag (D3 — persists for real)
      const acct = accounts[editTarget.employeeId];
      if (acct && acct.active !== v.accountActive) {
        const updated = await setEmployeeAccountActive(editTarget.employeeId, v.accountActive);
        setAccounts((p) => ({ ...p, [editTarget.employeeId]: updated }));
      }
      toast.success("บันทึกข้อมูลพนักงานและบัญชีผู้ใช้แล้ว");
      await load();
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e, "บันทึกข้อมูลไม่สำเร็จ"));
      return false;
    }
  }

  async function handleResetPassword(password: string): Promise<boolean> {
    if (!editTarget) return false;
    try {
      await resetEmployeeAccountPassword(editTarget.employeeId, password);
      const uname = accounts[editTarget.employeeId]?.username ?? editTarget.employeeId;
      toast.success(`ตั้งรหัสผ่านใหม่ให้ ${uname} แล้ว`);
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e, "ตั้งรหัสผ่านใหม่ไม่สำเร็จ"));
      return false;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await employeesApi.remove(deleteTarget.employeeId);
      toast.success("ลบข้อมูลพนักงานและบัญชีผู้ใช้แล้ว");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(deleteErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageShell
      title="บุคลากร"
      description="จัดการพนักงานและบัญชีผู้ใช้ในที่เดียว — เพิ่มพนักงานแล้วระบบสร้างบัญชีให้อัตโนมัติ"
      icon={<Groups />}
      actions={
        isAdmin ? (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            เพิ่มพนักงาน
          </Button>
        ) : undefined
      }
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
          เชื่อมต่อ backend ไม่สำเร็จ — {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            <DepartmentTabs
              value={deptFilter}
              onChange={setDeptFilter}
              counts={counts}
              total={rows.length}
            />
            <EmployeeSearchInput id="emp-search" value={query} onChange={setQuery} />
          </Stack>

          {nothingFound && (
            <Paper
              variant="outlined"
              sx={{ borderRadius: 3, p: 6, textAlign: "center", borderStyle: "dashed" }}
            >
              <Typography color="text.secondary">
                {rows.length === 0 ? "ยังไม่มีข้อมูลบุคลากร" : "ไม่พบพนักงานที่ตรงกับการค้นหา"}
              </Typography>
            </Paper>
          )}

          <Stack spacing={4}>
            {groups.map(({ dept, list }) => {
              if (list.length === 0) return null;
              return (
                <Box component="section" key={dept}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 800,
                        letterSpacing: 0.6,
                        color: "primary.main",
                        textTransform: "uppercase",
                      }}
                    >
                      {dept}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${list.length} คน`}
                      sx={{ bgcolor: "action.hover" }}
                    />
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "1fr 1fr 1fr" },
                    }}
                  >
                    {list.map((e) => {
                      const acct = accounts[e.employeeId] ?? null;
                      const machinesResp = machinesForEmployee(e.employeeId);
                      const st =
                        (e.status as EmployeeStatus) in STATUS_LABEL
                          ? (e.status as EmployeeStatus)
                          : "working";
                      return (
                        <Paper
                          key={e.employeeId}
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            p: 2,
                            transition: "box-shadow .2s",
                            "&:hover": { boxShadow: 4 },
                            "&:hover .row-actions": { opacity: 1 },
                          }}
                        >
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                            <Avatar
                              sx={{
                                bgcolor: "primary.light",
                                width: 40,
                                height: 40,
                                fontSize: 15,
                                fontWeight: 700,
                              }}
                            >
                              {fullName(e).charAt(0) || "?"}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ fontWeight: 700 }} noWrap>
                                {fullName(e)}
                              </Typography>
                              <Typography
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: 11,
                                  color: "text.secondary",
                                }}
                              >
                                {e.employeeId}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                sx={{ display: "block" }}
                              >
                                {e.position || "—"} • {e.department}
                              </Typography>
                            </Box>
                            {/* FRESH-14 — admin-only: non-admin never sees แก้ไข / ลบ */}
                            {isAdmin && (
                              <Stack
                                direction="row"
                                className="row-actions"
                                sx={{ opacity: { xs: 1, md: 0 }, transition: "opacity .15s" }}
                              >
                                <Tooltip title="แก้ไข">
                                  <IconButton size="small" onClick={() => openEdit(e)}>
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="ลบ">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => setDeleteTarget(e)}
                                  >
                                    <DeleteOutlined fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            )}
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 1, flexWrap: "wrap", alignItems: "center", rowGap: 0.75 }}
                          >
                            <Chip
                              size="small"
                              label={ROLE_LABELS[e.role] ?? e.role}
                              color={ROLE_TONE[e.role] ?? "default"}
                            />
                            {acct && !acct.active && (
                              <Chip size="small" label="บัญชีปิดใช้งาน" variant="outlined" />
                            )}
                          </Stack>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.75 }}
                          >
                            <PersonOutlined sx={{ fontSize: 15 }} />
                            Username:&nbsp;
                            <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
                              {acct?.username ?? "—"}
                            </Box>
                          </Typography>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.75, display: "flex", alignItems: "flex-start", gap: 0.75 }}
                          >
                            <SettingsSuggest sx={{ fontSize: 15, mt: "1px" }} />
                            <span>
                              เครื่องจักรที่รับผิดชอบ:&nbsp;
                              <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
                                {machinesResp.length > 0 ? machinesResp.join(", ") : "ไม่มี"}
                              </Box>
                            </span>
                          </Typography>

                          <Box sx={{ mt: 1.5 }}>
                            <Chip
                              size="small"
                              label={STATUS_LABEL[st]}
                              color={STATUS_TONE[st]}
                              variant={STATUS_TONE[st] === "default" ? "outlined" : "filled"}
                            />
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </>
      )}

      <EmployeeDialog
        open={dialogOpen}
        mode={editTarget ? "edit" : "create"}
        employee={editTarget}
        account={editTarget ? (accounts[editTarget.employeeId] ?? null) : null}
        existingUsernames={existingUsernames}
        onClose={() => setDialogOpen(false)}
        onSubmit={editTarget ? handleEdit : handleCreate}
        onResetPassword={editTarget ? handleResetPassword : undefined}
      />

      <Dialog
        open={!!deleteTarget}
        onClose={deleting ? undefined : () => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>ยืนยันการลบบุคลากร</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ต้องการลบ{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {deleteTarget && fullName(deleteTarget)}
            </Box>{" "}
            ({deleteTarget?.employeeId}) หรือไม่? หากบุคลากรนี้มีบัญชีผู้ใช้ บัญชีจะถูกลบไปด้วย
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            ยกเลิก
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}
