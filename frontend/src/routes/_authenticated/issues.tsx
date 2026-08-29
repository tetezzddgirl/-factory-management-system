import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ReportProblem, Add } from "@mui/icons-material";
import { useEffect, useState } from "react";
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography, Button, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from "@mui/material";
import { PageShell } from "@/components/page-shell";
import { AddItemDialog } from "@/components/add-item-dialog";
import { issuesApi, workOrdersApi, type ApiIssue, type ApiWorkOrder } from "@/lib/api-client";
import { getSession } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/issues")({
  head: () => ({
    meta: [
      { title: "ตรวจสอบปัญหาการผลิต — FactoryFlow" },
      { name: "description", content: "แจ้งปัญหาระหว่างการผลิตและคลังสินค้า พร้อมบันทึกแนวทางแก้ไขจากฝ่ายวางแผนการผลิต" },
      { property: "og:title", content: "ตรวจสอบปัญหาการผลิต — FactoryFlow" },
      { property: "og:description", content: "รวมปัญหาที่พบระหว่างการผลิตและแนวทางแก้ไข" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProblemPage,
});

const STATUSES = ["รอแก้ไข", "กำลังแก้ไข", "แก้ไขแล้ว"] as const;

const statusColor: Record<string, "error" | "warning" | "success" | "default"> = {
  "รอแก้ไข": "error", "กำลังแก้ไข": "warning", "แก้ไขแล้ว": "success",
};

function ProblemPage() {
  const [problem, setProblem] = useState<ApiIssue[]>([]);
  const [workOrders, setWorkOrders] = useState<ApiWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orderID, setOrderID] = useState("");
  const [problemText, setProblemText] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [selected, setSelected] = useState<ApiIssue | null>(null);
  const [solution, setSolution] = useState("");
  const [reporterID, setReporterID] = useState("");
  const [solutionProviderID, setSolutionProviderID] = useState("");
  const [status, setStatus] = useState<string>("รอแก้ไข");

  async function loadIssues() {
    setLoading(true);
    setError(null);
    try {
      const [data, orders] = await Promise.all([issuesApi.list(), workOrdersApi.list()]);
      setProblem(data ?? []);
      setWorkOrders(orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลปัญหาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIssues();
  }, []);

  const orderOptions = workOrders.length
    ? workOrders.map((o) => `${o.orderID} - ${o.name}`)
    : ["-"];
  const currentHandler = getSession()?.email ?? "";

  function openDetail(iss: ApiIssue) {
    setSelected(iss);
    setOrderID(iss.orderID ?? "");
    setProblemText(iss.issue ?? "");
    setDescriptionText(iss.description_id ?? "");
    setReporterID(iss.reporter_id ?? "");
    setSolution(iss.solutions ?? "");
    setSolutionProviderID(iss.solution_provider_id ?? "");
    setStatus(iss.status);
  }

  async function saveSolution() {
    if (!selected) return;
    try {
      await issuesApi.update(selected.issue_id, {
        solution_provider_id: solutionProviderID,
        solutions: solution,
        status,
      });
      toast.success("บันทึกแนวทางแก้ไขแล้ว");
      setSelected(null);
      await loadIssues();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกแนวทางแก้ไขไม่สำเร็จ");
    }
  }

  async function handleAdd(v: Record<string, string>) {
    try {
      await issuesApi.create({
        orderID: v.orderID,
        reporter_id: v.reporterID,
        issue: v.problem,
        description_id: v.description,
        status: "รอแก้ไข",
      });
      await loadIssues();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "แจ้งปัญหาไม่สำเร็จ");
      return false;
    }
  }

  return (
    <PageShell
      title="ตรวจสอบปัญหา"
      description="ปัญหาที่เจ้าหน้าที่พบระหว่างการผลิต และแนวทางแก้ไขจากฝ่ายวางแผน"
      icon={<ReportProblem />}
      actions={
        <AddItemDialog
          title={`แจ้งปัญหา`}
          description="ระบุชื่อผู้แจ้ง ปัญหาที่พบ และรายละเอียด"
          successMessage="ส่งเรื่องแจ้งปัญหาแล้ว"
          submitLabel="แจ้งปัญหา"
          trigger={<Button variant="contained" startIcon={<Add />}>แจ้งปัญหา</Button>}
          fields={[
            { name: "orderID", label: "หมายเลขใบสั่งผลิต", type: "select", options: orderOptions, defaultValue: orderOptions[0] },
            { name: "reporterID", label: "รหัสเจ้าหน้าที่ผู้แจ้งปัญหา", placeholder: "OPR-0007", defaultValue: currentHandler, helperText: "เติมจากบัญชีที่ล็อกอินอยู่ให้อัตโนมัติ" },
            { name: "problem", label: "ปัญหาที่พบ", placeholder: "เครื่องจักรหยุดกลางคัน" },
            { name: "description", label: "รายละเอียดปัญหา", type: "textarea", placeholder: "อธิบายสถานการณ์ที่พบ" },
          ]}
          onSubmit={handleAdd}
        />
      }
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          {problem.map((iss, i) => (
            <motion.div key={iss.issue_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -3 }}>
              <Card sx={{ cursor: "pointer" }} onClick={() => openDetail(iss)}>
                <CardContent>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">{iss.issue_id}</Typography>
                        <Chip size="small" label={iss.orderID} sx={{ fontSize: 11 }} />
                      </Stack>
                      <Typography sx={{ fontWeight: 700 }}>{iss.issue}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>{iss.description_id}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        แจ้งโดย {iss.reporter_id} • {new Date(iss.timestamp).toLocaleString("th-TH")}
                      </Typography>
                    </Box>
                    <Chip label={iss.status} color={statusColor[iss.status] ?? "default"} size="small" />
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>รายละเอียดปัญหาใน {orderID} </DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Divider />
              <TextField label="ชื่อเจ้าหน้าที่ผู้แจ้งปัญหา" value={reporterID} onChange={(e) => setReporterID(e.target.value)} />
              <TextField label="ปัญหาที่พบ" value={problemText} onChange={(e) => setProblemText(e.target.value)} />
              <TextField label="รายละเอียดปัญหา" multiline minRows={3} value={descriptionText} onChange={(e) => setDescriptionText(e.target.value)} />
              <Divider />
              <TextField label="ชื่อเจ้าหน้าที่ฝ่ายวางแผนการผลิต" value={solutionProviderID} onChange={(e) => setSolutionProviderID(e.target.value)} />
              <TextField label="แนวทางแก้ไขปัญหา" multiline minRows={3} value={solution} onChange={(e) => setSolution(e.target.value)} />
              <TextField select label="สถานะ" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelected(null)}>ยกเลิก</Button>
          <Button variant="contained" onClick={saveSolution}>บันทึก</Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}
