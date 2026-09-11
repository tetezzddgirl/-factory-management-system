import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Field, SelectField } from "@/components/Field";
import { signup } from "@/lib/auth";
import type { Role } from "@/interfaces";

const roles: Role[] = ["Planner", "Warehouse", "Shipping", "QC"];

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Planner");

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Box sx={{ width: "100%", maxWidth: 420 }}>
      <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>
        สมัครใช้งาน
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        สร้างบัญชีผู้ใช้งานสำหรับเจ้าหน้าที่โรงงาน
      </Typography>

      <Box
        component="form"
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!email || !password) return;
          await signup(email, password);
          navigate({ to: "/" });
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
            to="/auth"
            variant="body2"
            color="primary.main"
            sx={{ fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
          >
            เข้าสู่ระบบ
          </Typography>
        </Typography>
      </Box>
      </Box>
    </Box>
  );
}
