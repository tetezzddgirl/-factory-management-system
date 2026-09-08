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

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@factoryflow.app");
  const [password, setPassword] = useState("demo1234");
  const [role, setRole] = useState<Role>("Planner");

  return (
    <MiniLayout>
      <Typography variant="h5" fontWeight={700} color="text.primary">
        เข้าสู่ระบบ
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        ระบบจัดการการผลิตในโรงงาน (FactoryFlow)
      </Typography>

      <Box
        component="form"
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        onSubmit={(e) => {
          e.preventDefault();
          login(email, role);
          navigate({ to: "/dashboard" });
        }}
      >
        <Field
          label="อีเมลผู้ใช้งาน"
          type="email"
          placeholder="อีเมล"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="รหัสผ่าน"
          type="password"
          placeholder="รหัสผ่าน"
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
          เข้าสู่ระบบ
        </Button>
      </Box>

      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          ยังไม่มีบัญชี?{" "}
          <Typography
            component={Link}
            to="/register"
            variant="body2"
            fontWeight={600}
            color="primary.main"
            sx={{ textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
          >
            สมัครใช้งาน
          </Typography>
        </Typography>
      </Box>
    </MiniLayout>
  );
}
