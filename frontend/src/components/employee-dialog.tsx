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
  Divider,
  Typography,
  Box,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { AssignmentInd, Visibility, VisibilityOff } from "@mui/icons-material";
import type { ApiEmployee, ApiEmployeeAccount } from "@/lib/api-client";
import {
  DEPARTMENTS,
  POSITIONS_BY_DEPARTMENT,
  POSITION_OTHER,
  ROLES,
  ROLE_LABELS,
  STATUS_LABEL,
  suggestUsername,
  type EmployeeStatus,
} from "@/lib/factoryflow-personnel";

// FRESH-12 — Employee create / edit form.
//
// UX ported 1:1 from the ORIGINAL FactoryFlow "เพิ่มพนักงาน" / "แก้ไขข้อมูลพนักงาน"
// dialogs (`factory-flow-core-8ec208be/frontend/src/routes/index.tsx`), rebuilt
// with the same MUI primitives Friend's own dialogs use. Field order, wording,
// the boxed "บัญชีผู้ใช้" section, the username auto-suggest, and the account
// controls (สถานะบัญชี + รีเซ็ตรหัสผ่าน) all match the original.
//
// Difference from the original, both intentional:
//   • "กะ" is NOT a field here — the original omits it too (server defaults
//     "morning" on create; edit preserves the employee's current shift). Shift
//     is changed on the "งานและการมอบหมาย" board ("จัดกะ"), exactly like the
//     original.
//   • The account controls PERSIST for real (D3): the original's were
//     client-state only. "สถานะบัญชี" is saved with the main "บันทึก"; "ตั้งใหม่"
//     resets the password immediately, as its own action — same as the original.

export type EmployeeFormValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  department: string;
  position: string;
  role: string;
  status: string;
  /** create only */
  username: string;
  /** create only */
  password: string;
  /** edit only — persisted via PATCH /employees/:id/account (D3) */
  accountActive: boolean;
};

const EMPTY: EmployeeFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  department: "",
  position: "",
  role: "operator",
  status: "working",
  username: "",
  password: "",
  accountActive: true,
};

const emailRE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmployeeDialogProps {
  open: boolean;
  mode: "create" | "edit";
  employee?: ApiEmployee | null;
  /** edit mode: the linked login account (null when the employee has none) */
  account?: ApiEmployeeAccount | null;
  /** usernames already taken — used for the create-mode auto-suggest dedupe */
  existingUsernames?: string[];
  onClose: () => void;
  /** resolve true on success (dialog closes), false to keep it open */
  onSubmit: (values: EmployeeFormValues) => Promise<boolean>;
  /** edit mode only — reset the linked account's password (its own action) */
  onResetPassword?: (password: string) => Promise<boolean>;
}

export function EmployeeDialog({
  open,
  mode,
  employee,
  account,
  existingUsernames = [],
  onClose,
  onSubmit,
  onResetPassword,
}: EmployeeDialogProps) {
  const [v, setV] = useState<EmployeeFormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);

  // position dropdown state: a concrete position, POSITION_OTHER, or ""
  const [positionSelect, setPositionSelect] = useState("");
  const [positionOther, setPositionOther] = useState("");

  // reset-password sub-field (edit only)
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setNewPassword("");
    setShowNewPw(false);
    setUsernameTouched(false);
    if (mode === "edit" && employee) {
      const pos = employee.position ?? "";
      const known = (POSITIONS_BY_DEPARTMENT[
        employee.department as keyof typeof POSITIONS_BY_DEPARTMENT
      ] ?? []) as string[];
      const inList = pos !== "" && known.includes(pos);
      setPositionSelect(pos === "" ? "" : inList ? pos : POSITION_OTHER);
      setPositionOther(inList || pos === "" ? "" : pos);
      setV({
        firstName: employee.firstName ?? "",
        lastName: employee.lastName ?? "",
        phone: employee.phone ?? "",
        email: employee.email ?? "",
        department: employee.department || "",
        position: pos,
        role: employee.role || "operator",
        status: employee.status || "working",
        username: account?.username ?? "",
        password: "",
        accountActive: account?.active ?? true,
      });
    } else {
      const role = "operator";
      setPositionSelect("");
      setPositionOther("");
      setV({ ...EMPTY, role, username: suggestUsername(role, existingUsernames) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, employee, account]);

  const positionOptions = useMemo<string[]>(
    () =>
      (POSITIONS_BY_DEPARTMENT[v.department as keyof typeof POSITIONS_BY_DEPARTMENT] ??
        []) as string[],
    [v.department],
  );

  const resolvedPosition =
    positionSelect === POSITION_OTHER ? positionOther.trim() : positionSelect;

  function set<K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function onDepartmentChange(d: string) {
    setV((prev) => ({ ...prev, department: d }));
    // keep the position only if it is still valid for the new department (original behaviour)
    const known = (POSITIONS_BY_DEPARTMENT[d as keyof typeof POSITIONS_BY_DEPARTMENT] ??
      []) as string[];
    if (
      positionSelect !== POSITION_OTHER &&
      positionSelect !== "" &&
      !known.includes(positionSelect)
    ) {
      setPositionSelect("");
    }
  }

  function onRoleChange(role: string) {
    setV((prev) => ({
      ...prev,
      role,
      username:
        mode === "create" && !usernameTouched
          ? suggestUsername(role, existingUsernames)
          : prev.username,
    }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof EmployeeFormValues, string>> = {};
    if (!v.firstName.trim()) e.firstName = "กรุณากรอกชื่อ";
    if (!v.lastName.trim()) e.lastName = "กรุณากรอกนามสกุล";
    if (!v.department) e.department = "กรุณาเลือกแผนก";
    if (positionSelect === POSITION_OTHER && !positionOther.trim()) e.position = "กรุณากรอกตำแหน่ง";
    if (v.email.trim() && !emailRE.test(v.email.trim())) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (mode === "create") {
      const hasU = v.username.trim() !== "";
      const hasP = v.password !== "";
      if (hasU && !hasP) e.password = "กรอกรหัสผ่านด้วยเมื่อระบุชื่อผู้ใช้";
      if (hasP && !hasU) e.username = "กรอกชื่อผู้ใช้ด้วยเมื่อระบุรหัสผ่าน";
      if (hasP && v.password.length < 8) e.password = "รหัสผ่านอย่างน้อย 8 ตัวอักษร";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const ok = await onSubmit({ ...v, position: resolvedPosition });
      if (ok) onClose();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    if (!onResetPassword || newPassword.length < 8) return;
    setResetting(true);
    try {
      const ok = await onResetPassword(newPassword);
      if (ok) setNewPassword("");
    } finally {
      setResetting(false);
    }
  }

  const hasAccount = mode === "edit" && !!account;

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {mode === "create" ? "เพิ่มพนักงาน" : "แก้ไขข้อมูลพนักงาน"}
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
          {mode === "create"
            ? "กรอกข้อมูลพนักงานและบัญชีผู้ใช้ — ระบบจะสร้าง Employee ID และบัญชี Login ให้อัตโนมัติ"
            : `ปรับปรุงข้อมูลของ ${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`.trim()}
        </Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {mode === "edit" && employee && (
              <TextField
                label="รหัสพนักงาน (Employee ID)"
                value={employee.employeeId}
                disabled
                fullWidth
              />
            )}

            <TextField
              select
              label="แผนก"
              required
              fullWidth
              value={v.department}
              onChange={(e) => onDepartmentChange(e.target.value)}
              error={!!errors.department}
              helperText={errors.department}
            >
              <MenuItem value="" disabled>
                เลือกแผนก
              </MenuItem>
              {DEPARTMENTS.map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="ตำแหน่ง"
              fullWidth
              value={positionSelect}
              onChange={(e) => setPositionSelect(e.target.value)}
              disabled={!v.department}
              error={!!errors.position}
              helperText={errors.position ?? (!v.department ? "กรุณาเลือกแผนกก่อน" : undefined)}
            >
              <MenuItem value="">{v.department ? "เลือกตำแหน่ง" : "กรุณาเลือกแผนกก่อน"}</MenuItem>
              {positionOptions.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
              <MenuItem value={POSITION_OTHER}>อื่น ๆ (พิมพ์เอง)…</MenuItem>
            </TextField>
            {positionSelect === POSITION_OTHER && (
              <TextField
                label="ระบุตำแหน่ง"
                fullWidth
                value={positionOther}
                onChange={(e) => setPositionOther(e.target.value)}
                placeholder="พิมพ์ชื่อตำแหน่ง"
                error={!!errors.position}
              />
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="ชื่อ"
                required
                fullWidth
                value={v.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                error={!!errors.firstName}
                helperText={errors.firstName}
              />
              <TextField
                label="นามสกุล"
                required
                fullWidth
                value={v.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                error={!!errors.lastName}
                helperText={errors.lastName}
              />
            </Stack>

            <TextField
              label="เบอร์โทรศัพท์"
              fullWidth
              value={v.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="เช่น 081-234-5678"
            />

            <TextField
              label="Email"
              fullWidth
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
              error={!!errors.email}
              helperText={errors.email || "ไม่บังคับ"}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="สิทธิ์การใช้งาน (Role)"
                fullWidth
                value={v.role}
                onChange={(e) => onRoleChange(e.target.value)}
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="สถานะการทำงาน"
                fullWidth
                value={v.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {(Object.keys(STATUS_LABEL) as EmployeeStatus[]).map((s) => (
                  <MenuItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {/* ── boxed account section ─────────────────────────────────── */}
            <Box
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "action.hover",
                p: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: "text.secondary",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  mb: 1.5,
                }}
              >
                <AssignmentInd fontSize="small" />
                {mode === "create"
                  ? "บัญชีผู้ใช้ (สร้างอัตโนมัติเมื่อบันทึก)"
                  : "บัญชีผู้ใช้ที่ผูกกับพนักงานคนนี้"}
              </Typography>

              {mode === "create" ? (
                <Stack spacing={2}>
                  <TextField
                    label="Username"
                    fullWidth
                    value={v.username}
                    onChange={(e) => {
                      setUsernameTouched(true);
                      set("username", e.target.value);
                    }}
                    error={!!errors.username}
                    helperText={errors.username}
                    placeholder="เช่น somchai.k"
                    autoComplete="off"
                  />
                  <TextField
                    label="Password เริ่มต้น"
                    type="password"
                    fullWidth
                    value={v.password}
                    onChange={(e) => set("password", e.target.value)}
                    error={!!errors.password}
                    helperText={errors.password || "อย่างน้อย 8 ตัวอักษร"}
                    autoComplete="new-password"
                  />
                </Stack>
              ) : hasAccount ? (
                <Stack spacing={2}>
                  <TextField
                    label="Username"
                    value={account?.username ?? ""}
                    disabled
                    fullWidth
                    helperText="Username เป็นค่าถาวร แก้ไขไม่ได้หลังสร้างบัญชี"
                  />
                  <TextField
                    select
                    label="สถานะบัญชี"
                    fullWidth
                    value={v.accountActive ? "active" : "disabled"}
                    onChange={(e) => set("accountActive", e.target.value === "active")}
                  >
                    <MenuItem value="active">เปิดใช้งาน</MenuItem>
                    <MenuItem value="disabled">ปิดใช้งาน</MenuItem>
                  </TextField>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                    <TextField
                      label="รีเซ็ตรหัสผ่าน"
                      type={showNewPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="เว้นว่างถ้าไม่เปลี่ยน"
                      fullWidth
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setShowNewPw((s) => !s)}
                                edge="end"
                              >
                                {showNewPw ? (
                                  <VisibilityOff fontSize="small" />
                                ) : (
                                  <Visibility fontSize="small" />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                    <Button
                      variant="outlined"
                      sx={{ mt: 0.5, whiteSpace: "nowrap" }}
                      disabled={resetting || newPassword.length < 8}
                      onClick={handleReset}
                    >
                      ตั้งใหม่
                    </Button>
                  </Box>
                </Stack>
              ) : (
                <DialogContentText sx={{ fontSize: 13 }}>
                  บุคลากรคนนี้ยังไม่มีบัญชีผู้ใช้ (สร้างได้ตอนเพิ่มบุคลากรใหม่)
                </DialogContentText>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "กำลังบันทึก…" : mode === "create" ? "บันทึก" : "บันทึก"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
