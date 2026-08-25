import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  Typography, Box, TextField, Chip, Divider, Alert, IconButton, Tooltip,
} from "@mui/material";
import { AssignmentInd, Add, DeleteOutlined, ContentCopy } from "@mui/icons-material";

export type AssignWorkData = {
  product: string;
  target: number;
  due: string;
  orderID: string
};

export type AssignWorkResult = {
  workID: string;
  work: string;
  description: string;
  start: string;
  due: string;
};

interface Props {
  open: boolean;
  data: AssignWorkData | null;
  onClose: () => void;
  onConfirm: (results: AssignWorkResult[]) => void;
}

let workSeq = 1;

const draftStore = new Map<string, AssignWorkResult[]>();
const keyFor = (d: AssignWorkData) => `${d.product}__${d.orderID}`;

draftStore.set("ขวด PET 500ml__WO-1042", [
  { workID: "WORK-038", work: "ผลิตฝาเกลียวรอบบ่าย", description: "สายการผลิต L-02 กะเช้า 08:00-16:00", start: "2025-07-01", due: "2025-07-03"},
]);
draftStore.set("ฝาเกลียว__WO-1039", [
  { workID: "WORK-050", work: "ผลิตฝาเกลียวรอบเช้า", description: "สายการผลิต L-01 กะเช้า 08:00-16:00", start: "2025-07-01", due: "2025-07-03", },
]);

const emptyTask = (): AssignWorkResult => ({
  workID: `WORK-${String(workSeq++).padStart(3, "0")}`,
  work: "",
  description: "",
  start: "",
  due: "",
});

export function AssignWorkDialog({ open, data, onClose, onConfirm }: Props) {
  const [tasks, setTasks] = useState<AssignWorkResult[]>([emptyTask()]);

  useEffect(() => {
    if (open && data) {
      const saved = draftStore.get(keyFor(data));
      setTasks(saved && saved.length > 0 ? saved : [emptyTask()]);
    }
  }, [open, data]);

  if (!data) return null;

    const set = <K extends keyof AssignWorkResult>(i: number, k: K, val: AssignWorkResult[K]) =>
    setTasks((s) => {
      const next = s.map((t, idx) => (idx === i ? { ...t, [k]: val } : t));
      draftStore.set(keyFor(data), next);
      return next;
    });

  const addTask = () =>
    setTasks((s) => {
      const next = [...s, emptyTask()];
      draftStore.set(keyFor(data), next);
      return next;
    });

  const duplicateTask = (i: number) =>
    setTasks((s) => {
      const next = [...s, { ...s[i], workID: `WORK-${String(workSeq++).padStart(3, "0")}` }];
      draftStore.set(keyFor(data), next);
      return next;
    });

  const removeTask = (i: number) =>
    setTasks((s) => {
      if (s.length === 1) return s;
      const next = s.filter((_, idx) => idx !== i);
      draftStore.set(keyFor(data), next);
      return next;
    });

  const valid = tasks.every((t) => t.work.trim() && t.start.trim() && t.due.trim());

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <AssignmentInd color="primary" />
          <span>มอบหมายงานผลิต</span>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400, mt: 0.5 }}>
          {data.product} • เป้า {data.target.toLocaleString()} • กำหนด {data.due}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="success" sx={{ mb: 2 }}>
          ระบุชื่องาน รายละเอียด และกำหนดวันเริ่ม-เสร็จของแต่ละงาน
        </Alert>
        <Stack spacing={2}>
          {tasks.map((v, i) => (
            <motion.div key={v.workID} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Box sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                  <Chip size="small" color="primary" label={`งานที่ ${i + 1} — ${v.workID}`} />
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="ทำซ้ำงานนี้">
                      <IconButton size="small" onClick={() => duplicateTask(i)}><ContentCopy fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="ลบงานนี้">
                      <span>
                        <IconButton size="small" color="error" disabled={tasks.length === 1} onClick={() => removeTask(i)}>
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
                <Stack spacing={2}>
                  <TextField
                    label="ชื่องาน" placeholder="เช่น เป่าขวด PET 500ml รอบเช้า"
                    value={v.work} onChange={(e) => set(i, "work", e.target.value)}
                  />
                  <TextField
                    label="รายละเอียดงาน" placeholder="รายละเอียดเพิ่มเติมของงาน"
                    multiline minRows={2}
                    value={v.description} onChange={(e) => set(i, "description", e.target.value)}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      fullWidth label="วันที่เริ่ม" type="date"
                      value={v.start} onChange={(e) => set(i, "start", e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      fullWidth label="กำหนดเสร็จ" type="date"
                      value={v.due} onChange={(e) => set(i, "due", e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Stack>
                </Stack>
              </Box>
            </motion.div>
          ))}
          <Button variant="outlined" startIcon={<Add />} onClick={addTask}>
            เพิ่มงานที่ {tasks.length + 1}
          </Button>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.06)" }}>
          <Typography variant="caption" color="text.secondary">
            สรุปการมอบหมาย — {tasks.length} งาน
          </Typography>
          <Stack spacing={0.75} sx={{ mt: 0.75 }}>
            {tasks.map((v, i) => (
              <Stack key={v.workID} direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                <Chip size="small" label={`งานที่ ${i + 1}`} />
                <Chip size="small" color="primary" variant="outlined" label={v.work || "ยังไม่ระบุชื่องาน"} />
              </Stack>
            ))}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>ย้อนกลับ</Button>
        <Button variant="contained" disabled={!valid} onClick={() => {draftStore.delete(keyFor(data)); onConfirm(tasks)}}>
          มอบหมายงาน ({tasks.length} งาน)
        </Button>
      </DialogActions>
    </Dialog>
  );
}