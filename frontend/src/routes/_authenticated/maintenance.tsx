import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Build, Add, Search, Person, Schedule } from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Stack, Typography,
  Button, Tabs, Tab, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  DialogContentText, Divider, InputAdornment,
} from "@mui/material";
import { PageShell } from "@/components/page-shell";
import {
  maintenanceApi, machinesApi, employeesApi,
  type ApiMachine, type ApiMaintenanceLog, type ApiMaintenanceOrder, type ApiEmployee,
} from "@/lib/api-client";
import {
  MAINTENANCE_STATUSES,
  maintenanceStatusLabel,
  maintenanceStatusTone,
  maintenanceTypeTone,
  formatMachineDate,
  todayISO,
} from "@/lib/machinery";
import { toast } from "sonner";

// หน้า "ซ่อมบำรุง" — พอร์ตโครงสร้าง 2 แท็บ (รายการที่ค้างอยู่ / ประวัติที่ปิดงานแล้ว)
// มาจาก Machinery-maintenance (frontend/src/routes/maintenance.tsx) แล้วสร้างใหม่ด้วย
// MUI/PageShell ให้เข้าชุดกับหน้าอื่นของ FactoryFlow
//
// ต่างจากต้นฉบับตรงที่รหัสใบงานซ่อม (MT-####) ถูกสร้างจากฝั่ง backend แล้วแสดงเป็นช่องอ่านอย่างเดียว
// (ต้นฉบับให้ผู้ใช้พิมพ์เอง แต่ backend สร้างทับให้อยู่ดี รหัสที่พิมพ์จึงถูกทิ้ง)
// แนวทางนี้ตรงกับ /api/work-orders/next-id และ /api/plans/next-id ของระบบนี้

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({
    meta: [
      { title: "ซ่อมบำรุง — FactoryFlow" },
      { name: "description", content: "ใบแจ้งซ่อม ตารางบำรุงรักษา และประวัติการซ่อมบำรุงเครื่องจักร" },
    ],
  }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const [tab, setTab] = useState(0);
  const [orders, setOrders] = useState<ApiMaintenanceOrder[]>([]);
  const [machines, setMachines] = useState<ApiMachine[]>([]);
  const [technicians, setTechnicians] = useState<ApiEmployee[]>([]);
  const [logs, setLogs] = useState<ApiMaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formType, setFormType] = useState<"CM" | "PM">("CM");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiMaintenanceOrder | null>(null);
  const [detail, setDetail] = useState<ApiMaintenanceOrder | null>(null);

  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");

  const reload = useCallback(async () => {
    const [orderRows, logRows] = await Promise.all([maintenanceApi.list(), maintenanceApi.logs()]);
    setOrders(orderRows ?? []);
    setLogs(logRows ?? []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRows, machineRows, logRows, staffRows] = await Promise.all([
        maintenanceApi.list(),
        machinesApi.list(),
        maintenanceApi.logs(),
        employeesApi.list().catch(() => [] as ApiEmployee[]),
      ]);
      setOrders(orderRows ?? []);
      setMachines(machineRows ?? []);
      setLogs(logRows ?? []);
      setTechnicians(staffRows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลงานซ่อมบำรุงไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const active = useMemo(() => orders.filter((o) => o.status !== "done"), [orders]);
  const history = useMemo(() => {
    const q = applied.trim().toLowerCase();
    return orders.filter(
      (o) =>
        o.status === "done" &&
        (q === "" ||
          o.machineID.toLowerCase().includes(q) ||
          o.machineName.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q)),
    );
  }, [orders, applied]);

  // ค่าใช้จ่ายรวมของแต่ละใบงาน (มาจากประวัติการซ่อมบำรุงที่สร้างตอนปิดงาน)
  const costByRequest = useMemo(() => {
    const m = new Map<string, number>();
    
    return m;
  }, [logs]);

  const shown = tab === 0 ? active : history;

  function openCreate(type: "CM" | "PM") {
    setEditing(null);
    setFormType(type);
    setFormOpen(true);
  }

  function openEdit(order: ApiMaintenanceOrder) {
    setDetail(null);
    setEditing(order);
    setFormType(order.type === "PM" ? "PM" : "CM");
    setFormOpen(true);
  }

  return (
    <PageShell
      title="ซ่อมบำรุง"
      description="ใบแจ้งซ่อม ตารางบำรุงรักษา และประวัติการซ่อมบำรุงเครื่องจักร"
      icon={<Build />}
      actions={
        <>
          <Button variant="contained" startIcon={<Add />} onClick={() => openCreate("CM")}>
            แจ้งซ่อม
          </Button>
          <Button variant="outlined" startIcon={<Add />} onClick={() => openCreate("PM")}>
            เพิ่มรายการซ่อมบำรุง
          </Button>
        </>
      }
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2, justifyContent: "space-between", alignItems: { sm: "center" } }}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="รายการการซ่อมบำรุง" />
          <Tab label="ประวัติการซ่อมบำรุง" />
        </Tabs>
        {tab === 1 && (
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="ค้นหาเครื่องจักร / รหัสการซ่อม"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setApplied(query);
              }}
            />
            <Button variant="contained" startIcon={<Search />} onClick={() => setApplied(query)}>
              ค้นหา
            </Button>
          </Stack>
        )}
      </Stack>

      {loading && (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      )}
      {!loading && error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && (
        <Stack spacing={1.5}>
          {shown.length === 0 && (
            <Typography variant="body2" color="text.secondary">ไม่พบรายการ</Typography>
          )}
          {shown.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
            >
              <Card>
                <CardActionArea onClick={() => setDetail(o)}>
                  <CardContent>
                    <OrderSummary order={o} cost={costByRequest.get(o.id)} />
                  </CardContent>
                </CardActionArea>
              </Card>
            </motion.div>
          ))}
        </Stack>
      )}

      <OrderFormDialog
        open={formOpen}
        type={formType}
        editing={editing}
        machines={machines}
        technicians={technicians}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>รายละเอียดการซ่อมบำรุง</DialogTitle>
        <DialogContent>
          {detail && (
            <Box sx={{ pt: 1 }}>
              <OrderSummary order={detail} cost={costByRequest.get(detail.id)} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetail(null)}>ปิด</Button>
          <Button variant="contained" onClick={() => detail && openEdit(detail)}>แก้ไข</Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}

/** สรุปใบงานซ่อมหนึ่งใบ — ใช้ทั้งในลิสต์และในกล่องรายละเอียด */
function OrderSummary({ order, cost }: { order: ApiMaintenanceOrder; cost?: number }) {
  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: 2.5, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
              background: "linear-gradient(135deg,#F6B26B,#EF4444)",
            }}
          >
            <Build />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }} noWrap>
              {order.machineName || order.machineID || "-"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {order.code}
              {order.machineID ? ` · ${order.machineID}` : ""}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
            <Person sx={{ fontSize: 15 }} />
            <Typography variant="caption">{order.technician || "-"}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}>
            <Schedule sx={{ fontSize: 15 }} />
            <Typography variant="caption">{formatMachineDate(order.date)}</Typography>
          </Stack>
          {order.finishedAt && (
            <Typography variant="caption" color="text.secondary">
              แล้วเสร็จ {formatMachineDate(order.finishedAt)}
            </Typography>
          )}
        </Stack>

        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
         
          <Chip size="small" label={order.type} color={maintenanceTypeTone(order.type)} />
          <Chip
            size="small"
            label={maintenanceStatusLabel(order.status)}
            color={maintenanceStatusTone(order.status)}
          />
        </Stack>
      </Stack>
      <Typography variant="body2" color="text.secondary">{order.detail || "-"}</Typography>
    </Stack>
  );
}

type FormState = {
  machineID: string;
  technician: string;
  date: string;
  detail: string;
  status: string;
 
};

const EMPTY: FormState = {
  machineID: "",
  technician: "",
  date: todayISO(),
  detail: "",
  status: "pending",
  
};

/**
 * ฟอร์มใบงานซ่อมบำรุง ใช้ได้ 2 โหมด
 *   - สร้างใหม่ : ส่ง type เป็น CM หรือ PM (สถานะเริ่มต้น = รอดำเนินการ)
 *   - แก้ไข     : ส่ง editing เข้ามา จะเติมค่าเดิมและเปิดช่องแก้สถานะให้
 * การเปลี่ยนสถานะเป็น "เสร็จสิ้น" จะเรียก endpoint ปิดงานซ่อม ซึ่ง backend จะสร้าง
 * ประวัติการซ่อมบำรุงและคืนสถานะเครื่องจักรเป็น "ทำงาน" ให้ในทรานแซกชันเดียว
 */
function OrderFormDialog({
  open,
  type,
  editing,
  machines,
  technicians,
  onClose,
  onSaved,
}: {
  open: boolean;
  type: "CM" | "PM";
  editing: ApiMaintenanceOrder | null;
  machines: ApiMachine[];
  technicians: ApiEmployee[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        machineID: editing.machineID,
        technician: editing.technician,
        date: editing.date || todayISO(),
        detail: editing.detail,
        status: editing.status,
        
      });
      setCode(editing.code);
      return;
    }
    setForm(EMPTY);
    setCode("");
    // รหัสใบงานถัดไปมาจาก backend — ถ้าดึงไม่ได้ก็ยังบันทึกได้ (backend สร้างรหัสให้อยู่ดี)
    maintenanceApi
      .getNextCode()
      .then((r) => setCode(r.code))
      .catch(() => setCode(""));
  }, [open, editing]);

  const closingNow = editing !== null && form.status === "done" && editing.status !== "done";

  async function save() {
    if (!form.machineID || !form.technician.trim() || !form.date) {
      toast.error("กรุณาเลือกเครื่องจักร ผู้รับผิดชอบ และวันที่ดำเนินงานให้ครบ");
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
        // แก้ข้อมูลใบงานก่อนเสมอ แล้วค่อยปิดงานถ้าผู้ใช้เปลี่ยนสถานะเป็น "เสร็จสิ้น"
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
            
          });
          toast.success("ปิดงานซ่อมแล้ว — บันทึกประวัติการซ่อมบำรุงให้อัตโนมัติ");
        } else {
          toast.success("แก้ไขใบงานซ่อมบำรุงแล้ว");
        }
      }
      await onSaved();
      onClose();
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
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
            {machines.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.id} — {m.name}</MenuItem>
            ))}
          </TextField>
          {/* เลือกจากรายชื่อบุคลากรถ้าโหลดได้ ถ้าโหลดไม่ได้ให้พิมพ์ชื่อเองแทน จะได้ยังแจ้งซ่อมได้ */}
          <TextField
            select={technicians.length > 0}
            label="ผู้รับผิดชอบ"
            placeholder="ชื่อผู้รับผิดชอบ"
            value={form.technician}
            onChange={(e) => setForm({ ...form, technician: e.target.value })}
            helperText={technicians.length === 0 ? "โหลดรายชื่อบุคลากรไม่ได้ — พิมพ์ชื่อเอง" : undefined}
          >
            {technicians.map((t) => (
              // <MenuItem key={t.employeeId} value={`${t.firstName} ${t.lastName}`}>{`${t.firstName} ${t.lastName}`} — {t.role}</MenuItem>
              <MenuItem key={t.employeeId} value={`${t.firstName} ${t.lastName}`}>{t.employeeId} — {`${t.firstName} ${t.lastName}`}</MenuItem>
            ))}
            {/* ผู้รับผิดชอบเดิมอาจไม่อยู่ในรายชื่อบุคลากรแล้ว — ใส่ไว้ไม่ให้ค่าเดิมหายตอนแก้ไข */}
            {form.technician && !technicians.some((t) => `${t.firstName} ${t.lastName}` === form.technician) && (
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
                  <MenuItem key={s} value={s}>{maintenanceStatusLabel(s)}</MenuItem>
                ))}
              </TextField>
              
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button variant="contained" disabled={saving} onClick={save}>บันทึก</Button>
      </DialogActions>
    </Dialog>
  );
}
