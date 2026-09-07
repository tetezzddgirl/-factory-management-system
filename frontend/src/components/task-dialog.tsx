import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import type { ApiTask, ApiWorkOrder, ApiWork } from "@/lib/api-client";

// Allowed values mirror the FRESH-03 CHECK constraints (tasks_shift_check,
// tasks_status_check). The backend is the source of truth.
export const TASK_SHIFTS = ["morning", "afternoon", "night"];
export const TASK_STATUSES = ["pending", "in_progress", "done"];

/** FRESH-13 — a Task with the optional Friend Work link may be edited here. */
export type TaskDialogSubmit = {
  title: string;
  description: string;
  machineId: string | null;
  shift: string;
  status: string;
  /** Friend Work.workID, or null for an ad-hoc task */
  workId: string | null;
};

export type TaskFormValues = {
  title: string;
  description: string;
  machineId: string;
  shift: string;
  status: string;
  /** FRESH-13 — "" = no reference (ad-hoc) */
  workOrderId: string;
  workId: string;
};

const EMPTY: TaskFormValues = {
  title: "",
  description: "",
  machineId: "",
  shift: "morning",
  status: "pending",
  workOrderId: "",
  workId: "",
};

interface TaskDialogProps {
  open: boolean;
  mode: "create" | "edit";
  task?: (ApiTask & { workId?: string | null }) | null;
  /** FRESH-13 — existing Friend data for the optional origin picker (read-only reuse) */
  workOrders?: ApiWorkOrder[];
  works?: ApiWork[];
  onClose: () => void;
  /** resolve true on success (dialog closes), false to keep it open (caller showed its own error) */
  onSubmit: (values: TaskDialogSubmit) => Promise<boolean>;
}

/**
 * FRESH-08 — Task create / edit form, MUI. FRESH-13 adds an OPTIONAL
 * "อ้างอิงงานจากใบสั่งผลิต" picker (Work Order → Work). Leaving it blank keeps
 * the task ad-hoc; clearing it on an already-linked task removes the link.
 * task_id is never an input (backend generates TSK-####).
 */
export function TaskDialog({
  open,
  mode,
  task,
  workOrders = [],
  works = [],
  onClose,
  onSubmit,
}: TaskDialogProps) {
  const [v, setV] = useState<TaskFormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && task) {
      const linkedWork = task.workId ? works.find((w) => w.workID === task.workId) : undefined;
      setV({
        title: task.title ?? "",
        description: task.description ?? "",
        machineId: task.machineId ?? "",
        shift: task.shift || "morning",
        status: task.status || "pending",
        workOrderId: linkedWork?.orderID ?? "",
        workId: task.workId ?? "",
      });
    } else {
      setV(EMPTY);
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, task]);

  const worksForOrder = useMemo(
    () => (v.workOrderId ? works.filter((w) => w.orderID === v.workOrderId) : []),
    [v.workOrderId, works],
  );

  function set<K extends keyof TaskFormValues>(key: K, value: string) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function onWorkOrderChange(orderId: string) {
    // changing / clearing the Work Order always resets the Work selection
    setV((prev) => ({ ...prev, workOrderId: orderId, workId: "" }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof TaskFormValues, string>> = {};
    if (!v.title.trim()) e.title = "กรุณากรอกชื่องาน";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const ok = await onSubmit({
        title: v.title.trim(),
        description: v.description.trim(),
        machineId: v.machineId.trim() === "" ? null : v.machineId.trim(),
        shift: v.shift,
        status: v.status,
        workId: v.workId.trim() === "" ? null : v.workId.trim(),
      });
      if (ok) onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {mode === "create" ? "เพิ่มงาน" : "แก้ไขงาน"}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {mode === "edit" && task && (
              <TextField
                label="รหัสงาน"
                value={task.taskId}
                disabled
                helperText="รหัสสร้างโดยระบบ — แก้ไขไม่ได้"
              />
            )}

            {/* FRESH-13 — optional production origin (read-only reuse of Friend data) */}
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                อ้างอิงงานจากใบสั่งผลิต (ไม่บังคับ)
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  select
                  fullWidth
                  label="ใบสั่งผลิต"
                  value={v.workOrderId}
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
                  value={v.workId}
                  onChange={(e) => set("workId", e.target.value)}
                  disabled={!v.workOrderId}
                  helperText={!v.workOrderId ? "เลือกใบสั่งผลิตก่อน" : undefined}
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
              required
              value={v.title}
              onChange={(e) => set("title", e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
            />

            <TextField
              label="รายละเอียด"
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              multiline
              minRows={2}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="เครื่องจักร (machine id)"
                value={v.machineId}
                onChange={(e) => set("machineId", e.target.value)}
                helperText="ไม่บังคับ"
              />
              <TextField
                select
                label="กะ"
                value={v.shift}
                onChange={(e) => set("shift", e.target.value)}
              >
                {TASK_SHIFTS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="สถานะ"
                value={v.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {TASK_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {mode === "create" ? "เพิ่มงาน" : "บันทึก"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
