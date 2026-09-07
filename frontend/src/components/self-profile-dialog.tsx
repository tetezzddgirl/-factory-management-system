import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Button,
  Stack,
  Divider,
  Typography,
  Alert,
  CircularProgress,
  Box,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { AccountCircle, Visibility, VisibilityOff } from "@mui/icons-material";
import { employeesApi, type ApiEmployee } from "@/lib/api-client";
import { resetEmployeeAccountPassword } from "@/lib/factoryflow-personnel-api";
import { findMyEmployee, ROLE_LABELS } from "@/lib/factoryflow-personnel";
import { getSession } from "@/lib/auth";
import { toast } from "sonner";

// FRESH-14 — "ข้อมูลของฉัน": the currently authenticated user edits their OWN
// profile. Opened from the bottom-left account block in app-sidebar.tsx.
//
// Functional behaviour is reused from the original FactoryFlow self-profile
// (factory-flow-core-8ec208be/frontend/src/components/AppLayout.tsx →
// updateOwnProfile): editable = firstName / lastName / phone / email; username
// is immutable; department / position / role / status / shift are shown but NOT
// editable here. Password change uses the existing FRESH-12 endpoint
// (POST /api/employees/:id/account/reset-password, bcrypt server-side). The
// bcrypt hash is never fetched or shown. Restyled to the Friend MUI dialog
// language (mirrors components/employee-dialog.tsx).
//
// The "who am I" resolution never trusts a client-supplied id: it matches the
// session (sub -> EMP-####, else email) against GET /api/employees. The backend
// independently pins the privileged fields for a non-admin self-edit.

const emailRE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SelfProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SelfProfileDialog({ open, onClose }: SelfProfileDialogProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState<ApiEmployee | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"firstName" | "lastName" | "email", string>>>(
    {},
  );
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [changingPw, setChangingPw] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setErrors({});
    setNewPassword("");
    setConfirmPassword("");
    setPwError(null);
    setShowPw(false);
    try {
      const list = await employeesApi.list();
      const mine = findMyEmployee(list ?? [], getSession());
      setMe(mine);
      if (mine) {
        setFirstName(mine.firstName ?? "");
        setLastName(mine.lastName ?? "");
        setPhone(mine.phone ?? "");
        setEmail(mine.email ?? "");
        try {
          const acct = await employeesApi.getAccount(mine.employeeId);
          setUsername(acct?.username ?? null);
        } catch {
          setUsername(null);
        }
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!firstName.trim()) e.firstName = "กรุณากรอกชื่อ";
    if (!lastName.trim()) e.lastName = "กรุณากรอกนามสกุล";
    if (email.trim() && !emailRE.test(email.trim())) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!me || !validate()) return;
    setSaving(true);
    try {
      // department / position / role / status / shift are passed through
      // unchanged — this dialog never edits them, and the backend also pins
      // them for a non-admin self-edit.
      await employeesApi.update(me.employeeId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        department: me.department,
        position: me.position,
        role: me.role,
        status: me.status,
        shift: me.shift,
      });
      toast.success("บันทึกข้อมูลส่วนตัวแล้ว");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!me) return;
    setPwError(null);
    if (newPassword.length < 8) {
      setPwError("รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
      return;
    }
    setChangingPw(true);
    try {
      await resetEmployeeAccountPassword(me.employeeId, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("เปลี่ยนรหัสผ่านแล้ว");
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
        <AccountCircle color="primary" />
        ข้อมูลของฉัน
      </DialogTitle>
      <DialogContent>
        {loading && (
          <Stack sx={{ alignItems: "center", py: 5 }}>
            <CircularProgress />
          </Stack>
        )}

        {!loading && loadError && (
          <Alert
            severity="error"
            sx={{ my: 1 }}
            action={
              <Button size="small" onClick={load}>
                ลองใหม่
              </Button>
            }
          >
            {loadError}
          </Alert>
        )}

        {!loading && !loadError && !me && (
          <Alert severity="info" sx={{ my: 1 }}>
            ไม่พบข้อมูลพนักงานสำหรับบัญชีนี้ — บัญชีที่เข้าสู่ระบบอยู่ยังไม่ได้ผูกกับพนักงานในระบบ
            FactoryFlow
          </Alert>
        )}

        {!loading && !loadError && me && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="รหัสพนักงาน" value={me.employeeId} disabled fullWidth />
              <TextField
                label="Role"
                value={ROLE_LABELS[me.role] ?? me.role}
                disabled
                fullWidth
                helperText="กำหนดโดยผู้ดูแลระบบ"
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="ชื่อ"
                required
                fullWidth
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={!!errors.firstName}
                helperText={errors.firstName}
              />
              <TextField
                label="นามสกุล"
                required
                fullWidth
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={!!errors.lastName}
                helperText={errors.lastName}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="เบอร์โทรศัพท์"
                fullWidth
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
              />
              <TextField
                label="อีเมล"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!errors.email}
                helperText={errors.email || "ไม่บังคับ"}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="แผนก" value={me.department} disabled fullWidth />
              <TextField label="ตำแหน่ง" value={me.position || "—"} disabled fullWidth />
            </Stack>

            <Divider textAlign="left" sx={{ pt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                บัญชีผู้ใช้
              </Typography>
            </Divider>

            {username ? (
              <>
                <TextField
                  label="ชื่อผู้ใช้"
                  value={username}
                  disabled
                  fullWidth
                  helperText="ใช้เข้าสู่ระบบด้วยชื่อผู้ใช้นี้ · เปลี่ยนไม่ได้"
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="รหัสผ่านใหม่"
                    type={showPw ? "text" : "password"}
                    fullWidth
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    helperText="อย่างน้อย 8 ตัวอักษร"
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setShowPw((s) => !s)}
                              edge="end"
                            >
                              {showPw ? (
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
                  <TextField
                    label="ยืนยันรหัสผ่านใหม่"
                    type={showPw ? "text" : "password"}
                    fullWidth
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </Stack>
                {pwError && (
                  <Typography variant="body2" color="error">
                    {pwError}
                  </Typography>
                )}
                <Box>
                  <Button
                    variant="outlined"
                    onClick={handleChangePassword}
                    disabled={changingPw || newPassword.length < 8 || confirmPassword.length < 8}
                  >
                    {changingPw ? "กำลังเปลี่ยน…" : "เปลี่ยนรหัสผ่าน"}
                  </Button>
                </Box>
              </>
            ) : (
              <DialogContentText sx={{ fontSize: 13 }}>
                บัญชีนี้ยังไม่มีชื่อผู้ใช้/รหัสผ่านสำหรับเข้าสู่ระบบ
              </DialogContentText>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          ปิด
        </Button>
        {!loading && !loadError && me && (
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
