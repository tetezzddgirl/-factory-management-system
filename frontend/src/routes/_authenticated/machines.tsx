import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Settings as CogIcon, Add, Speed, Delete, Edit } from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Grid, Stack,
  Typography, Button, Tabs, Tab, TextField, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, DialogContentText,
} from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { MachineDetailDialog, MachineFormDialog } from "@/components/machine-dialogs";
import {
  machinesApi, productionLinesApi, personnelApi, workApi,
  type ApiMachine, type ApiMachineJob, type ApiMachineType, type ApiPersonnel,
  type ApiProductionLine, type ApiWork,
} from "@/lib/api-client";
import { machineStatusLabel, machineStatusTone, moveToOrder } from "@/lib/machinery";
import { toast } from "sonner";

// หน้า "เครื่องจักรและอุปกรณ์" — พอร์ตโครงสร้าง 2 แท็บมาจาก Machinery-maintenance
// (frontend/src/routes/index.tsx: MachinesTab + LinesTab) แล้วสร้างใหม่ด้วย MUI/PageShell
// ให้หน้าตาเป็นชุดเดียวกับหน้าอื่นๆ ของ FactoryFlow

export const Route = createFileRoute("/_authenticated/machines")({
  head: () => ({
    meta: [
      { title: "เครื่องจักร — FactoryFlow" },
      { name: "description", content: "ข้อมูล สถานะ ชั่วโมงการทำงาน และการจัดเครื่องจักรเข้าสายการผลิต" },
    ],
  }),
  component: MachinesPage,
});

function MachinesPage() {
  const [tab, setTab] = useState(0);

  const [machines, setMachines] = useState<ApiMachine[]>([]);
  const [lines, setLines] = useState<ApiProductionLine[]>([]);
  const [types, setTypes] = useState<ApiMachineType[]>([]);
  const [owners, setOwners] = useState<ApiPersonnel[]>([]);
  const [works, setWorks] = useState<ApiWork[]>([]);
  const [jobs, setJobs] = useState<ApiMachineJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<ApiMachine | null>(null);
  const [editing, setEditing] = useState<ApiMachine | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const loadMachines = useCallback(async () => {
    setMachines(await machinesApi.list());
  }, []);

  const loadJobs = useCallback(async () => {
    setJobs(await machinesApi.jobs());
  }, []);

  const loadTypes = useCallback(async () => {
    setTypes(await machinesApi.types());
  }, []);

  const loadLines = useCallback(async () => {
    setLines(await productionLinesApi.list());
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [machineRows, lineRows, typeRows, jobRows, ownerRows, workRows] = await Promise.all([
        machinesApi.list(),
        productionLinesApi.list(),
        machinesApi.types(),
        machinesApi.jobs(),
        // สองอันนี้เป็นข้อมูลเสริมของฟอร์ม ถ้าโหลดไม่ได้ก็ยังใช้หน้านี้ต่อได้
        personnelApi.list().catch(() => [] as ApiPersonnel[]),
        workApi.list().catch(() => [] as ApiWork[]),
      ]);
      setMachines(machineRows ?? []);
      setLines(lineRows ?? []);
      setTypes(typeRows ?? []);
      setJobs(jobRows ?? []);
      setOwners(ownerRows ?? []);
      setWorks(workRows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลเครื่องจักรไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // เปิดกล่องรายละเอียดอยู่แล้วให้ตามข้อมูลล่าสุดเสมอ (เช่น หลังแก้ไขข้อมูลเครื่อง)
  const detailMachine = useMemo(
    () => (detail ? (machines.find((m) => m.id === detail.id) ?? null) : null),
    [detail, machines],
  );

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(m: ApiMachine) {
    setDetail(null);
    setEditing(m);
    setFormOpen(true);
  }

  return (
    <PageShell
      title="เครื่องจักรและอุปกรณ์"
      description="ข้อมูล สถานะ ชั่วโมงการทำงาน และการจัดเครื่องจักรเข้าสายการผลิต"
      icon={<CogIcon />}
      actions={
        tab === 0 ? (
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}>เพิ่มเครื่องจักร</Button>
        ) : undefined
      }
    >
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="ข้อมูลเครื่องจักรและอุปกรณ์" />
        <Tab label="สายการผลิต" />
      </Tabs>

      {loading && (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      )}
      {!loading && error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && tab === 0 && (
        <MachinesTab machines={machines} onOpenDetail={setDetail} />
      )}
      {!loading && !error && tab === 1 && (
        <LinesTab
          machines={machines}
          lines={lines}
          onMachinesChanged={loadMachines}
          onLinesChanged={loadLines}
        />
      )}

      <MachineFormDialog
        open={formOpen}
        machine={editing}
        machines={machines}
        types={types}
        owners={owners}
        works={works}
        onClose={() => setFormOpen(false)}
        onSaved={loadMachines}
        onTypesChanged={loadTypes}
      />
      <MachineDetailDialog
        machine={detailMachine}
        jobs={jobs}
        owners={owners}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onJobsChanged={loadJobs}
      />
    </PageShell>
  );
}

/** แท็บ "ข้อมูลเครื่องจักรและอุปกรณ์" — การ์ดของทุกเครื่อง กดเพื่อดูรายละเอียด */
function MachinesTab({
  machines,
  onOpenDetail,
}: {
  machines: ApiMachine[];
  onOpenDetail: (m: ApiMachine) => void;
}) {
  if (machines.length === 0) {
    return <Typography variant="body2" color="text.secondary">ยังไม่มีข้อมูลเครื่องจักร</Typography>;
  }

  return (
    <Grid container spacing={2}>
      {machines.map((m, i) => (
        <Grid key={m.id} size={{ xs: 12, sm: 6, lg: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4 }}
          >
            <Card>
              <CardActionArea onClick={() => onOpenDetail(m)}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 48, height: 48, borderRadius: 2.5, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                          background: "linear-gradient(135deg,#7FB4EE,#4A90E2)",
                        }}
                      >
                        <motion.div
                          animate={m.status === "running" ? { rotate: 360 } : {}}
                          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                        >
                          <CogIcon />
                        </motion.div>
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }} noWrap>{m.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{m.id}</Typography>
                      </Box>
                    </Stack>
                    <Chip
                      label={machineStatusLabel(m.status)}
                      color={machineStatusTone(m.status)}
                      size="small"
                    />
                  </Stack>
                  <Grid container spacing={1.5}>
                    <Grid size={6}>
                      <Box sx={{ p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.06)" }}>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
                          <Speed sx={{ fontSize: 14 }} />
                          <Typography variant="caption">ชั่วโมงทำงาน</Typography>
                        </Stack>
                        <Typography sx={{ fontWeight: 600, mt: 0.5 }}>
                          {Math.round(m.hours).toLocaleString()} ชม.
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={6}>
                      <Box sx={{ p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.06)" }}>
                        <Typography variant="caption" color="text.secondary">งานปัจจุบัน</Typography>
                        <Typography sx={{ fontWeight: 600, mt: 0.5 }} noWrap>
                          {m.currentJob || "-"}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </CardActionArea>
            </Card>
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );
}

/**
 * แท็บ "สายการผลิต"
 * โหมดปกติ: ดูเครื่องจักรในสายที่เลือก / เพิ่มเครื่องเข้าสาย / เพิ่ม-ลบสายการผลิต
 * โหมดแก้ไข: แก้ลำดับหรือทำเครื่องหมายลบบนร่างก่อน กด "บันทึก" จึงเขียนจริง กด "ยกเลิก" ทิ้งร่าง
 * (พอร์ตพฤติกรรมมาจาก LinesTab ของ Machinery-maintenance)
 */
function LinesTab({
  machines,
  lines,
  onMachinesChanged,
  onLinesChanged,
}: {
  machines: ApiMachine[];
  lines: ApiProductionLine[];
  onMachinesChanged: () => Promise<void>;
  onLinesChanged: () => Promise<void>;
}) {
  const [lineID, setLineID] = useState<number | "">("");
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<ApiMachine[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addOrder, setAddOrder] = useState("");
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [lineName, setLineName] = useState("");
  const [deleteLineOpen, setDeleteLineOpen] = useState(false);

  // เลือกสายแรกให้อัตโนมัติ และถ้าสายที่เลือกอยู่ถูกลบไปแล้วให้ย้ายไปสายอื่น
  useEffect(() => {
    if (lines.length === 0) {
      setLineID("");
      return;
    }
    if (lineID === "" || !lines.some((l) => l.id === lineID)) {
      setLineID(lines[0]!.id);
    }
  }, [lines, lineID]);

  const current = useMemo(
    () => machines.filter((m) => m.productionLineID === lineID).sort((a, b) => a.lineOrder - b.lineOrder),
    [machines, lineID],
  );

  const shown = editMode ? [...draft].sort((a, b) => a.lineOrder - b.lineOrder) : current;
  const available = machines.filter((m) => m.productionLineID === null);
  const selectedLine = lines.find((l) => l.id === lineID) ?? null;

  function cancelEdit() {
    setDraft([]);
    setRemoved([]);
    setEditMode(false);
  }

  function startEdit() {
    setDraft(current);
    setRemoved([]);
    setEditMode(true);
  }

  /** เขียนสายการผลิตชุดใหม่ลง backend: เครื่องที่อยู่ในสาย + เครื่องที่ถูกเอาออก */
  async function writeLine(keep: ApiMachine[], drop: ApiMachine[]) {
    if (lineID === "") return;
    setBusy(true);
    try {
      await Promise.all([
        ...drop.map((m) => machinesApi.update(m.id, { productionLineID: 0 })),
        ...keep.map((m, i) =>
          machinesApi.update(m.id, { productionLineID: lineID, lineOrder: i + 1 }),
        ),
      ]);
      await onMachinesChanged();
      toast.success("บันทึกสายการผลิตแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกสายการผลิตไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function commitEdit() {
    const sorted = [...draft].sort((a, b) => a.lineOrder - b.lineOrder);
    await writeLine(
      sorted.filter((m) => !removed.includes(m.id)),
      sorted.filter((m) => removed.includes(m.id)),
    );
    cancelEdit();
  }

  /** เพิ่มเครื่องเข้าสาย — เว้นลำดับว่างไว้ = ต่อท้ายสาย แล้วจัดลำดับใหม่เป็น 1,2,3,... เสมอ */
  async function addMachineToLine() {
    const machine = machines.find((m) => m.id === addCode);
    if (!machine) {
      toast.error("กรุณาเลือกเครื่องจักร");
      return;
    }
    const target = addOrder.trim() === "" ? current.length + 1 : Number(addOrder);
    if (Number.isNaN(target) || target < 1) {
      toast.error("ลำดับการผลิตต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป");
      return;
    }
    const pos = Math.min(Math.max(target, 1), current.length + 1) - 1;
    const next = [...current.slice(0, pos), machine, ...current.slice(pos)];
    await writeLine(next, []);
    setAddOpen(false);
    setAddCode("");
    setAddOrder("");
  }

  async function createLine() {
    const name = lineName.trim();
    if (!name) {
      toast.error("กรุณากรอกชื่อสายการผลิต");
      return;
    }
    setBusy(true);
    try {
      const created = await productionLinesApi.create({ name });
      await onLinesChanged();
      setLineID(created.id);
      setLineName("");
      setAddLineOpen(false);
      cancelEdit();
      toast.success("เพิ่มสายการผลิตแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เพิ่มสายการผลิตไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function deleteLine() {
    if (lineID === "") return;
    setBusy(true);
    try {
      await productionLinesApi.remove(lineID);
      // backend เอาเครื่องจักรออกจากสายที่ถูกลบให้แล้ว จึงต้องโหลดเครื่องจักรใหม่ด้วย
      await Promise.all([onLinesChanged(), onMachinesChanged()]);
      cancelEdit();
      setDeleteLineOpen(false);
      toast.success("ลบสายการผลิตแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบสายการผลิตไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        <TextField
          select
          size="small"
          label="สายการผลิต"
          sx={{ width: 260, flexShrink: 0 }}
          value={lineID === "" ? "" : String(lineID)}
          onChange={(e) => {
            cancelEdit();
            setLineID(Number(e.target.value));
          }}
        >
          {lines.map((l) => (
            <MenuItem key={l.id} value={String(l.id)}>{l.name}</MenuItem>
          ))}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        {editMode ? (
          <>
            <Button onClick={cancelEdit}>ยกเลิก</Button>
            <Button variant="contained" disabled={busy} onClick={commitEdit}>บันทึก</Button>
          </>
        ) : (
          <>
            <Button startIcon={<Add />} onClick={() => setAddLineOpen(true)}>เพิ่มสายการผลิต</Button>
            <Button
              startIcon={<Delete />}
              color="error"
              disabled={lineID === "" || lines.length <= 1}
              onClick={() => setDeleteLineOpen(true)}
            >
              ลบสายการผลิต
            </Button>
            <Button
              variant="outlined"
              startIcon={<Add />}
              disabled={lineID === "" || available.length === 0}
              onClick={() => setAddOpen(true)}
            >
              เพิ่มเครื่องเข้าสาย
            </Button>
            <Button
              variant="contained"
              startIcon={<Edit />}
              disabled={lineID === "" || current.length === 0}
              onClick={startEdit}
            >
              แก้ไขลำดับ
            </Button>
          </>
        )}
      </Stack>

      {shown.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          ยังไม่มีเครื่องจักรในสายการผลิตนี้
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {shown.map((m) => {
            const marked = removed.includes(m.id);
            return (
              <Card key={m.id} sx={{ opacity: marked ? 0.5 : 1 }}>
                <CardContent>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    sx={{ alignItems: { md: "center" } }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 180 }}>
                      <Box
                        sx={{
                          width: 44, height: 44, borderRadius: 2.5, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                          background: "linear-gradient(135deg,#7FB4EE,#4A90E2)",
                        }}
                      >
                        <CogIcon />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }} noWrap>{m.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{m.id}</Typography>
                      </Box>
                    </Stack>

                    <Box sx={{ p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.06)", minWidth: 140 }}>
                      <Typography variant="caption" color="text.secondary">งานปัจจุบัน</Typography>
                      <Typography sx={{ fontWeight: 600 }}>{m.currentJob || "-"}</Typography>
                    </Box>

                    <Box sx={{ p: 1.5, borderRadius: 2, background: "rgba(74,144,226,0.06)", minWidth: 180 }}>
                      <Typography variant="caption" color="text.secondary">ลำดับการผลิต</Typography>
                      {editMode && !marked ? (
                        <TextField
                          size="small"
                          sx={{ mt: 0.5, width: 120 }}
                          value={m.lineOrder}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (!Number.isNaN(v) && v >= 1) setDraft((prev) => moveToOrder(prev, m.id, v));
                          }}
                        />
                      ) : (
                        <Typography sx={{ fontWeight: 600 }}>ลำดับที่ {m.lineOrder}</Typography>
                      )}
                    </Box>

                    <Box sx={{ flexGrow: 1 }} />
                    <Chip
                      label={machineStatusLabel(m.status)}
                      color={machineStatusTone(m.status)}
                      size="small"
                    />
                    {editMode &&
                      (marked ? (
                        <Button size="small" onClick={() => setRemoved((p) => p.filter((id) => id !== m.id))}>
                          เลิกทำ
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => setRemoved((p) => [...p, m.id])}
                        >
                          เอาออกจากสาย
                        </Button>
                      ))}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>เพิ่มเครื่องจักรในสายการผลิต</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="เครื่องจักร"
              value={addCode}
              onChange={(e) => setAddCode(e.target.value)}
              helperText="แสดงเฉพาะเครื่องที่ยังไม่ถูกจัดเข้าสายการผลิตใด"
            >
              {available.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.id} — {m.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="ลำดับการผลิต"
              placeholder="เว้นว่าง = ต่อท้ายสาย"
              value={addOrder}
              onChange={(e) => setAddOrder(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" disabled={busy} onClick={addMachineToLine}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addLineOpen} onClose={() => setAddLineOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>เพิ่มสายการผลิต</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            sx={{ mt: 1 }}
            label="ชื่อสายการผลิต"
            placeholder="สายการบรรจุ L-05"
            value={lineName}
            onChange={(e) => setLineName(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddLineOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" disabled={busy} onClick={createLine}>บันทึก</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteLineOpen} onClose={() => setDeleteLineOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>ลบสายการผลิต</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ยืนยันการลบสายการผลิต {selectedLine?.name}? เครื่องจักรในสายนี้จะถูกเอาออกจากสาย
            แต่ข้อมูลเครื่องจักรยังอยู่ครบ
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteLineOpen(false)}>ยกเลิก</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={deleteLine}>ลบ</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
