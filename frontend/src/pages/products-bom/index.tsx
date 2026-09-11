import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";

import CategoryIcon from "@mui/icons-material/Category";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";

import { Modal } from "@/components/Modal";
import { Field, SelectField, TextareaField } from "@/components/Field";
import { StatusBadge, type Tone } from "@/components/StatusBadge";
import { useStore } from "@/services/store";
import type { BomStatus, RawMaterial } from "@/interfaces";
import { getRawMaterials } from "@/services/https/api";
import { useRole } from "@/lib/roles";

type TabType = "products" | "boms" | "approvals";

const bomStatusMeta: Record<
  BomStatus,
  { label: string; tone: Tone }
> = {
  approved: { label: "อนุมัติแล้ว", tone: "success" },
  pending: { label: "รอตรวจสอบ", tone: "warning" },
  draft: { label: "ร่าง", tone: "muted" },
  rejected: { label: "ไม่อนุมัติ", tone: "danger" },
  pending_delete: { label: "รออนุมัติลบ", tone: "danger" },
};

const categories = ["บรรจุภัณฑ์", "วัสดุพิมพ์", "วัตถุดิบ"];

export function ProductsBomPage() {
  const { role } = useRole();
  const isQC = role === "qc" || role === "admin";
  const isPlanner = role === "planner" || role === "admin" || role === "supervisor";

  const {
    products,
    boms,
    addBom,
    updateBom,
    deleteBom,
    setBomStatus,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useStore();

  const [tab, setTab] = useState<TabType>(role === "qc" ? "approvals" : "boms");
  const [bomOpen, setBomOpen] = useState(false);
  const [editingBomId, setEditingBomId] = useState<string | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);

  const [toast, setToast] = useState("");
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Menu Anchors
  const [bomMenuAnchor, setBomMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const [prodMenuAnchor, setProdMenuAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);

  const emptyBomForm = {
    productCode: "",
    productName: "",
    materials: [] as string[],
    steps: [] as string[],
    machines: "",
    category: categories[0]!,
    version: "v1",
  };

  const [bomForm, setBomForm] = useState(emptyBomForm);
  const [currentStepInput, setCurrentStepInput] = useState("");

  const handleAddStep = () => {
    const trimmed = currentStepInput.trim();
    if (!trimmed) return;
    setBomForm((prev) => ({
      ...prev,
      steps: [...prev.steps, trimmed],
    }));
    setCurrentStepInput("");
  };

  const handleDeleteStep = (index: number) => {
    setBomForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const emptyProductForm = {
    code: "",
    name: "",
    category: categories[0]!,
    bomVersion: "v1",
  };

  const [productForm, setProductForm] = useState(emptyProductForm);

  useEffect(() => {
    setLoadingMaterials(true);
    getRawMaterials()
      .then((data) => {
        if (data && data.length > 0) setRawMaterials(data);
      })
      .catch((err) => console.error("Error fetching raw materials:", err))
      .finally(() => setLoadingMaterials(false));
  }, [bomOpen]);

  const pending = useMemo(
    () => boms.filter((b) => b.status === "pending" || b.status === "pending_delete"),
    [boms],
  );

  const approvedBoms = useMemo(
    () => boms.filter((b) => b.status === "approved"),
    [boms],
  );

  const notify = (msg: string) => {
    setToast(msg);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
      {/* Toast Notification */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={() => setToast("")} severity="success" sx={{ width: "100%", borderRadius: 2 }}>
          {toast}
        </Alert>
      </Snackbar>

      {/* Page Header */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48, boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)" }}>
            <CategoryIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>
              ผลิตภัณฑ์ &amp; สูตรการผลิต (BOM)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              จัดการข้อมูลผลิตภัณฑ์ สูตรการผลิต และการอนุมัติคุณภาพ
            </Typography>
          </Box>
        </Box>

        {tab === "products" && isPlanner ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingProdId(null);
              setProductForm(emptyProductForm);
              setProductOpen(true);
            }}
            sx={{ px: 3, py: 1 }}
          >
            เพิ่มผลิตภัณฑ์
          </Button>
        ) : null}

        {tab === "boms" && isPlanner ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingBomId(null);
              setBomForm(emptyBomForm);
              setBomOpen(true);
            }}
            sx={{ px: 3, py: 1 }}
          >
            ขอเพิ่มสูตรการผลิต (BOM)
          </Button>
        ) : null}
      </Box>

      {/* Navigation Tabs */}
      <Paper elevation={0} sx={{ borderBottom: "1px solid #e2e8f0", bgcolor: "transparent" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": {
              fontWeight: 600,
              fontSize: "0.875rem",
              textTransform: "none",
              minHeight: 48,
            },
          }}
        >
          <Tab value="boms" label={`สูตรการผลิต (${boms.length})`} />
          <Tab value="products" label={`ผลิตภัณฑ์ (${products.length})`} />
          <Tab value="approvals" label={`คำขออนุญาต QC (${pending.length})`} />
        </Tabs>
      </Paper>

      {/* Tab 1: BOM List */}
      {tab === "boms" ? (
        <Grid container spacing={3}>
          {boms.map((bom) => (
            <Grid size={{ xs: 12, md: 6 }} key={bom.id}>
              <Card
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                  height: "100%",
                  position: "relative",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", pr: 5 }}>
                  <Box>
                    <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700 }}>
                      {bom.productName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {bom.code} • {bom.version}
                    </Typography>
                  </Box>
                  <StatusBadge tone={bomStatusMeta[bom.status].tone}>
                    {bomStatusMeta[bom.status].label}
                  </StatusBadge>
                </Box>

                {/* 3-dots Menu Button */}
                <IconButton
                  size="small"
                  onClick={(e) => setBomMenuAnchor({ el: e.currentTarget, id: bom.id })}
                  sx={{ position: "absolute", top: 16, right: 16 }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>

                {/* Materials List */}
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2.5, mb: 1, fontWeight: 600 }}>
                  วัตถุดิบที่ใช้ (Bill of Materials):
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, bgcolor: "#f8fafc", p: 1.5, borderRadius: 2 }}>
                  {bom.materials.map((m) => (
                    <Box key={m.name} sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                      <Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>
                        {m.name}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                        {m.amount}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Production Steps */}
                {bom.steps && bom.steps.length > 0 ? (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, mb: 0.5, fontWeight: 600 }}>
                      ขั้นตอนการผลิต:
                    </Typography>
                    <Box component="ol" sx={{ pl: 2.5, m: 0, fontSize: "0.8125rem", color: "text.secondary" }}>
                      {bom.steps.map((step, idx) => (
                        <li key={`${bom.id}-step-${idx}`}>
                          <Typography variant="body2" color="text.primary" sx={{ fontSize: "0.8125rem" }}>
                            {step}
                          </Typography>
                        </li>
                      ))}
                    </Box>
                  </>
                ) : null}

                {/* Machine Tags */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                  {bom.machines.map((m) => (
                    <Chip
                      key={m}
                      icon={<PrecisionManufacturingIcon sx={{ fontSize: "14px !important" }} />}
                      label={m}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 1.5, fontSize: "0.75rem" }}
                    />
                  ))}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <HistoryIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                  <Typography variant="caption" color="text.secondary">
                    แก้ไขล่าสุดโดย {bom.updatedBy} • {bom.updatedAt}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : null}

      {/* Tab 2: Products Table */}
      {tab === "products" ? (
        <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>รหัสผลิตภัณฑ์</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ชื่อผลิตภัณฑ์</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>หมวดหมู่</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>BOM ที่ใช้งาน</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{p.code}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell color="text.secondary">{p.category}</TableCell>
                    <TableCell>
                      <Chip
                        label={p.bomVersion}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 600, fontSize: "0.75rem", borderRadius: 1.5 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => setProdMenuAnchor({ el: e.currentTarget, id: p.id })}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}

      {/* Tab 3: Pending Approvals */}
      {tab === "approvals" ? (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
          {pending.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                ไม่มีรายการสูตรการผลิตที่รอการอนุมัติในขณะนี้
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {pending.map((bom) => {
                const isDelete = bom.status === "pending_delete";
                return (
                  <Card
                    key={bom.id}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      bgcolor: isDelete ? "#fef2f2" : "#fffbeb",
                      border: `1px solid ${isDelete ? "#fecaca" : "#fde68a"}`,
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {bom.productName}
                        </Typography>
                        <Chip label={bom.version} size="small" sx={{ height: 22, fontSize: "0.75rem", bgcolor: "#ffffff" }} />
                        <Chip
                          label={isDelete ? "คำขอลบสูตร/ผลิตภัณฑ์" : "คำขออนุมัติสูตร"}
                          size="small"
                          color={isDelete ? "error" : "warning"}
                          sx={{ fontWeight: 600, height: 22, fontSize: "0.75rem" }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        {isDelete ? `ขอลบโดย ${bom.updatedBy} • ${bom.updatedAt}` : `ส่งขออนุมัติโดย ${bom.updatedBy} • ${bom.updatedAt}`}
                      </Typography>
                    </Box>

                    {isQC ? (
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                          color="error"
                          title="ปฏิเสธคำขอ"
                          onClick={() => {
                            if (isDelete) {
                              setBomStatus(bom.id, "approved");
                              notify("ปฏิเสธคำขอลบ สูตรยังคงอยู่ในระบบ");
                            } else {
                              setBomStatus(bom.id, "rejected");
                              notify("ปฏิเสธคำขออนุมัติสูตรการผลิต");
                            }
                          }}
                          sx={{ bgcolor: "#ffffff", border: "1px solid #fee2e2" }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="success"
                          title="อนุมัติคำขอ"
                          onClick={() => {
                            if (isDelete) {
                              deleteBom(bom.id);
                              const matched = products.find((p) => p.code.toLowerCase() === bom.productCode.toLowerCase());
                              if (matched) deleteProduct(matched.id);
                              notify("อนุมัติการลบสูตรและผลิตภัณฑ์แล้ว");
                            } else {
                              setBomStatus(bom.id, "approved");
                              notify("อนุมัติสูตรการผลิตแล้ว (สามารถนำไปใช้งานในแผนการผลิตได้)");
                            }
                          }}
                          sx={{ bgcolor: "#10b981", color: "#ffffff", "&:hover": { bgcolor: "#059669" } }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Chip
                        label="รอเจ้าหน้าที่ฝ่าย QC ตรวจสอบ"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Card>
                );
              })}
            </Box>
          )}
        </Paper>
      ) : null}

      {/* BOM Options Menu */}
      <Menu
        anchorEl={bomMenuAnchor?.el}
        open={Boolean(bomMenuAnchor)}
        onClose={() => setBomMenuAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 140 } } }}
      >
        <MenuItem
          onClick={() => {
            const bom = boms.find((b) => b.id === bomMenuAnchor?.id);
            if (bom) {
              setEditingBomId(bom.id);
              setBomForm({
                productCode: bom.productCode,
                productName: bom.productName,
                materials: bom.materials.map((m) => m.name),
                steps: bom.steps ? [...bom.steps] : [],
                machines: bom.machines.join(", "),
                category: bom.category || categories[0]!,
                version: bom.version,
              });
              setCurrentStepInput("");
              setBomOpen(true);
            }
            setBomMenuAnchor(null);
          }}
          sx={{ fontSize: "0.875rem", gap: 1 }}
        >
          <EditIcon fontSize="small" color="action" /> แก้ไขสูตร
        </MenuItem>
        <MenuItem
          onClick={() => {
            const bom = boms.find((b) => b.id === bomMenuAnchor?.id);
            if (bom) {
              if (bom.status === "approved") {
                setBomStatus(bom.id, "pending_delete");
                notify("ส่งคำขอลบสูตรไปยัง QC แล้ว");
              } else {
                deleteBom(bom.id);
                notify("ลบคำขอสูตรเรียบร้อยแล้ว");
              }
            }
            setBomMenuAnchor(null);
          }}
          sx={{ fontSize: "0.875rem", gap: 1, color: "error.main" }}
        >
          <DeleteIcon fontSize="small" color="error" /> ลบสูตร
        </MenuItem>
      </Menu>

      {/* Product Options Menu */}
      <Menu
        anchorEl={prodMenuAnchor?.el}
        open={Boolean(prodMenuAnchor)}
        onClose={() => setProdMenuAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 140 } } }}
      >
        <MenuItem
          onClick={() => {
            const p = products.find((x) => x.id === prodMenuAnchor?.id);
            if (p) {
              setEditingProdId(p.id);
              setProductForm({
                code: p.code,
                name: p.name,
                category: p.category,
                bomVersion: p.bomVersion,
              });
              setProductOpen(true);
            }
            setProdMenuAnchor(null);
          }}
          sx={{ fontSize: "0.875rem", gap: 1 }}
        >
          <EditIcon fontSize="small" color="action" /> แก้ไขข้อมูล
        </MenuItem>
        <MenuItem
          onClick={() => {
            const p = products.find((x) => x.id === prodMenuAnchor?.id);
            if (p) {
              const linkedBom = boms.find((b) => b.productCode.toLowerCase() === p.code.toLowerCase());
              if (linkedBom && linkedBom.status === "approved") {
                setBomStatus(linkedBom.id, "pending_delete");
                notify("ส่งคำขอลบไปยัง QC แล้ว (สถานะสูตร: รออนุมัติลบ)");
              } else {
                deleteProduct(p.id);
                if (linkedBom) deleteBom(linkedBom.id);
                notify("ลบผลิตภัณฑ์เรียบร้อยแล้ว");
              }
            }
            setProdMenuAnchor(null);
          }}
          sx={{ fontSize: "0.875rem", gap: 1, color: "error.main" }}
        >
          <DeleteIcon fontSize="small" color="error" /> ลบผลิตภัณฑ์
        </MenuItem>
      </Menu>

      {/* Modal: Create/Edit BOM */}
      <Modal
        open={bomOpen}
        onClose={() => {
          setBomOpen(false);
          setEditingBomId(null);
        }}
        title={editingBomId ? "แก้ไขสูตรการผลิต (BOM)" : "เพิ่มสูตรการผลิตใหม่ (BOM)"}
        subtitle="ระบุวัตถุดิบ ขั้นตอนการผลิต และส่งขออนุมัติจากฝ่ายควบคุมคุณภาพ (QC)"
        footer={
          <>
            <Button
              variant="text"
              color="inherit"
              onClick={() => {
                setBomOpen(false);
                setEditingBomId(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (!bomForm.productCode || !bomForm.productName) return;
                if (editingBomId) {
                  updateBom(editingBomId, bomForm);
                  notify("ส่งคำขอแก้ไขสูตรการผลิตเพื่อรออนุมัติแล้ว");
                } else {
                  addBom(bomForm);
                  notify("ส่งคำขอสร้างสูตรการผลิตเพื่อรออนุมัติแล้ว");
                }
                setBomOpen(false);
                setEditingBomId(null);
                setTab("boms");
                setBomForm(emptyBomForm);
              }}
              sx={{ px: 4 }}
            >
              ขออนุมัติ QC
            </Button>
          </>
        }
      >
        <Field
          label="รหัสผลิตภัณฑ์ (Product Code)"
          placeholder="เช่น P-001, FG-001"
          value={bomForm.productCode}
          onChange={(e) => setBomForm({ ...bomForm, productCode: e.target.value })}
        />
        <Field
          label="ชื่อผลิตภัณฑ์ (Product Name)"
          placeholder="เช่น ขวด PET 500ml"
          value={bomForm.productName}
          onChange={(e) => setBomForm({ ...bomForm, productName: e.target.value })}
        />

        {/* Select Raw Material */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <SelectField
            label="เลือกวัตถุดิบ (ดึงจากตาราง RawMaterial ใน Database)"
            value=""
            onChange={(e) => {
              const material = e.target.value;
              if (!material || bomForm.materials.includes(material)) return;
              setBomForm({ ...bomForm, materials: [...bomForm.materials, material] });
            }}
          >
            <option value="" disabled>
              {loadingMaterials ? "กำลังโหลดข้อมูลวัตถุดิบ..." : "-- เลือกวัตถุดิบจากฐานข้อมูล --"}
            </option>
            {rawMaterials.map((m) => (
              <option key={m.id} value={`${m.materialName} (${m.materialCode})`}>
                {m.materialName} ({m.materialCode}) — คงเหลือ {m.quantity} {m.unit}
              </option>
            ))}
          </SelectField>

          {/* Selected Materials Chips */}
          {bomForm.materials.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, pt: 0.5 }}>
              {bomForm.materials.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  size="small"
                  color="primary"
                  variant="outlined"
                  onDelete={() =>
                    setBomForm({ ...bomForm, materials: bomForm.materials.filter((x) => x !== m) })
                  }
                  sx={{ borderRadius: 2 }}
                />
              ))}
            </Box>
          ) : null}
        </Box>

        {/* Production Steps: Enter key or Add Button to append to Steps Table */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
              ขั้นตอนการผลิต (Production Steps)
            </Typography>
            <Typography variant="caption" sx={{ color: "primary.main", fontSize: "0.75rem" }}>
              * กด Enter เพื่อเพิ่มขั้นตอนลงตาราง
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="พิมพ์ขั้นตอน แล้วกด Enter (เช่น 1. หลอมพลาสติก)"
              value={currentStepInput}
              onChange={(e) => setCurrentStepInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddStep();
                }
              }}
              sx={{ bgcolor: "#ffffff" }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddStep}
              disabled={!currentStepInput.trim()}
              startIcon={<AddIcon />}
              sx={{ whiteSpace: "nowrap", px: 2 }}
            >
              เพิ่ม
            </Button>
          </Box>

          {/* Steps Table */}
          {bomForm.steps.length > 0 ? (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ maxHeight: 220, borderRadius: 2, border: "1px solid #e2e8f0" }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: "#f8fafc", fontWeight: 700, fontSize: "0.75rem" } }}>
                    <TableCell sx={{ width: 60 }}>ลำดับ</TableCell>
                    <TableCell>รายละเอียดขั้นตอน</TableCell>
                    <TableCell align="right" sx={{ width: 70 }}>ลบ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bomForm.steps.map((st, idx) => (
                    <TableRow key={idx} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                      <TableCell sx={{ fontWeight: 600, color: "primary.main", fontSize: "0.8125rem" }}>
                        #{idx + 1}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8125rem", color: "text.primary" }}>
                        {st}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteStep(idx)}
                          sx={{ p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#f8fafc",
                border: "1px dashed #cbd5e1",
                textAlign: "center",
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                ยังไม่มีขั้นตอน — พิมพ์ข้อความด้านบนแล้วกด <strong>Enter</strong> เพื่อแยกเป็นตารางขั้นตอน
              </Typography>
            </Box>
          )}
        </Box>
        <Field
          label="เครื่องจักรที่ใช้งาน"
          placeholder="เช่น M-01, M-02"
          value={bomForm.machines}
          onChange={(e) => setBomForm({ ...bomForm, machines: e.target.value })}
        />
        <SelectField
          label="หมวดหมู่ผลิตภัณฑ์"
          value={bomForm.category}
          onChange={(e) => setBomForm({ ...bomForm, category: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <Field
          label="เวอร์ชัน BOM"
          value={bomForm.version}
          onChange={(e) => setBomForm({ ...bomForm, version: e.target.value })}
        />
      </Modal>

      {/* Modal: Create/Edit Product */}
      <Modal
        open={productOpen}
        onClose={() => {
          setProductOpen(false);
          setEditingProdId(null);
        }}
        title={editingProdId ? "แก้ไขผลิตภัณฑ์" : "เพิ่มผลิตภัณฑ์ใหม่"}
        subtitle={
          editingProdId
            ? "แก้ไขข้อมูลผลิตภัณฑ์สำเร็จรูป"
            : "เลือกสูตรการผลิตที่อนุมัติแล้วเพื่อสร้างเป็นผลิตภัณฑ์"
        }
        footer={
          <>
            <Button
              variant="text"
              color="inherit"
              onClick={() => {
                setProductOpen(false);
                setEditingProdId(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (!productForm.code || !productForm.name) return;
                if (editingProdId) {
                  updateProduct(editingProdId, productForm);
                  notify("บันทึกการแก้ไขผลิตภัณฑ์เรียบร้อยแล้ว");
                } else {
                  addProduct(productForm);
                  notify("เพิ่มผลิตภัณฑ์ใหม่เรียบร้อยแล้ว");
                }
                setProductOpen(false);
                setEditingProdId(null);
                setTab("products");
                setProductForm(emptyProductForm);
              }}
              sx={{ px: 4 }}
            >
              บันทึก
            </Button>
          </>
        }
      >
        {!editingProdId ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <SelectField
              label="เลือกจากสูตรการผลิตที่อนุมัติแล้ว (Approved BOM)"
              value=""
              onChange={(e) => {
                const selectedBomId = e.target.value;
                const selected = approvedBoms.find((b) => b.id === selectedBomId);
                if (selected) {
                  setProductForm({
                    code: selected.productCode,
                    name: selected.productName,
                    category: selected.category || categories[0]!,
                    bomVersion: selected.version,
                  });
                }
              }}
            >
              <option value="" disabled>
                {approvedBoms.length === 0
                  ? "-- ไม่มีสูตรที่อนุมัติ (กรุณาให้ QC อนุมัติสูตรก่อน) --"
                  : "-- เลือกสูตรการผลิตที่อนุมัติแล้ว --"}
              </option>
              {approvedBoms.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.productName} ({b.productCode}) — หมวดหมู่ {b.category} [{b.version}]
                </option>
              ))}
            </SelectField>

            {productForm.code ? (
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="caption" color="text.primary" sx={{ fontWeight: 600 }}>
                  สูตรที่เลือก: {productForm.name} ({productForm.code})
                </Typography>
                <Chip
                  label={`เวอร์ชัน ${productForm.bomVersion}`}
                  size="small"
                  color="primary"
                  sx={{ height: 22, fontSize: "0.75rem" }}
                />
              </Paper>
            ) : null}
          </Box>
        ) : null}

        <Field
          label="รหัสผลิตภัณฑ์"
          placeholder="เช่น P-001"
          value={productForm.code}
          onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
        />
        <Field
          label="ชื่อผลิตภัณฑ์"
          placeholder="เช่น ขวด PET 500ml"
          value={productForm.name}
          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
        />
        <SelectField
          label="หมวดหมู่ผลิตภัณฑ์"
          value={productForm.category}
          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <Field
          label="เวอร์ชัน BOM"
          value={productForm.bomVersion}
          onChange={(e) => setProductForm({ ...productForm, bomVersion: e.target.value })}
        />
      </Modal>
    </Box>
  );
}
