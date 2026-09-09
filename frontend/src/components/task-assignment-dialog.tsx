import { useCallback, useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  TextField, MenuItem, Button, Stack, Typography, Divider, IconButton,
  List, ListItem, ListItemText, CircularProgress, Box, Tooltip,
} from "@mui/material";
import { PersonRemove } from "@mui/icons-material";
import { tasksApi, employeesApi, type ApiTask, type ApiTaskAssignment, type ApiEmployee } from "@/lib/api-client";
import { toast } from "sonner";

function apiMsg(e: unknown, fallback: string): string {
  if (!(e instanceof Error)) return fallback;
  try {
    const j = JSON.parse(e.message) as { error?: string };
    if (j && typeof j.error === "string") return j.error;
  } catch {
    /* not JSON */
  }
  return e.message === "Unauthorized" ? fallback : e.message || fallback;
}

interface TaskAssignmentDialogProps {
  open: boolean;
  task: ApiTask | null;
  onClose: () => void;
  /** called after any assign/unassign so the parent can refresh its own view if needed */
  onChanged?: () => void;
}

/**
 * FRESH-08 — assign / unassign FactoryFlow employees to a task. Built from Friend
 * MUI primitives. The employee selector loads from GET /api/employees (the
 * FactoryFlow personnel source of truth) — never /api/personnel. No password /
 * hash / user-account fields are shown.
 */
export function TaskAssignmentDialog({ open, task, onClose, onChanged }: TaskAssignmentDialogProps) {
  const [assignments, setAssignments] = useState<ApiTaskAssignment[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickedEmployee, setPickedEmployee] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    try {
      const [a, e] = await Promise.all([tasksApi.listAssignments(task.taskId), employeesApi.list()]);
      setAssignments(a ?? []);
      setEmployees(e ?? []);
    } catch (err) {
      toast.error(apiMsg(err, "โหลดข้อมูลการมอบหมายไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, [task]);

  useEffect(() => {
    if (open) {
      setPickedEmployee("");
      load();
    }
  }, [open, load]);

  const assignedIds = new Set(assignments.map((a) => a.employeeId));
  const assignable = employees.filter((e) => !assignedIds.has(e.employeeId));

  async function handleAssign() {
    if (!task || !pickedEmployee) return;
    setBusy(true);
    try {
      await tasksApi.assign(task.taskId, pickedEmployee);
      toast.success("มอบหมายงานแล้ว");
      setPickedEmployee("");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(apiMsg(err, "มอบหมายงานไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnassign(a: ApiTaskAssignment) {
    if (!task) return;
    setBusy(true);
    try {
      await tasksApi.unassign(task.taskId, a.assignmentId);
      toast.success("ยกเลิกการมอบหมายแล้ว");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(apiMsg(err, "ยกเลิกการมอบหมายไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        มอบหมายพนักงาน
        {task && (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
            {task.taskId} · {task.title}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Stack sx={{ alignItems: "center", py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary">
                พนักงานที่ได้รับมอบหมาย ({assignments.length})
              </Typography>
            </Divider>

            {assignments.length === 0 ? (
              <DialogContentText sx={{ fontSize: 13 }}>ยังไม่มีพนักงานได้รับมอบหมายในงานนี้</DialogContentText>
            ) : (
              <List dense disablePadding>
                {assignments.map((a) => (
                  <ListItem
                    key={a.assignmentId}
                    disableGutters
                    secondaryAction={
                      <Tooltip title="ยกเลิกการมอบหมาย">
                        <IconButton edge="end" size="small" color="error" disabled={busy} onClick={() => handleUnassign(a)}>
                          <PersonRemove fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemText
                      primary={`${a.firstName} ${a.lastName}`}
                      secondary={`${a.employeeId}${a.department ? " · " + a.department : ""}${a.position ? " · " + a.position : ""}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}

            <Divider textAlign="left" sx={{ pt: 1 }}>
              <Typography variant="caption" color="text.secondary">มอบหมายเพิ่ม</Typography>
            </Divider>

            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
              <TextField
                select
                fullWidth
                label="เลือกพนักงาน"
                value={pickedEmployee}
                onChange={(e) => setPickedEmployee(e.target.value)}
                disabled={busy || assignable.length === 0}
                helperText={assignable.length === 0 ? "พนักงานทุกคนถูกมอบหมายในงานนี้แล้ว" : undefined}
              >
                {assignable.map((e) => (
                  <MenuItem key={e.employeeId} value={e.employeeId}>
                    {e.firstName} {e.lastName} — {e.employeeId}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                sx={{ mt: 0.5, whiteSpace: "nowrap" }}
                disabled={busy || !pickedEmployee}
                onClick={handleAssign}
              >
                มอบหมาย
              </Button>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>ปิด</Button>
      </DialogActions>
    </Dialog>
  );
}
