import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { MiniLayout } from "@/layout/MiniLayout";
import { Field, SelectField } from "@/components/Field";
import { useAuth } from "@/auth/AuthProvider";
import type { Role } from "@/interfaces";

const roles: Role[] = ["Planner", "Warehouse", "Shipping", "QC"];

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Planner");

  return (
    <MiniLayout>
      <Typography variant="h5" fontWeight={700} color="text.primary">
        สมัครใช้งาน
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        สร้างบัญชีผู้ใช้งานสำหรับเจ้าหน้าที่โรงงาน
      </Typography>

      <Box
        component="form"
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!email || !password) return;
          register(email, role);
          navigate({ to: "/dashboard" });
        }}
      >
        <Field
          label="อีเมลผู้ใช้งาน"
          placeholder="อีเมล"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="รหัสผ่าน"
          placeholder="รหัสผ่าน"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <SelectField label="บทบาทผู้ใช้งาน" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectField>

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          sx={{ mt: 1, py: 1.25 }}
        >
          สมัครใช้งาน
        </Button>
      </Box>

      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          มีบัญชีแล้ว?{" "}
          <Typography
            component={Link}
            to="/login"
            variant="body2"
            fontWeight={600}
            color="primary.main"
            sx={{ textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
          >
            เข้าสู่ระบบ
          </Typography>
        </Typography>
      </Box>
    </MiniLayout>
  );
}
