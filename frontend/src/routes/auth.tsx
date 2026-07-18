import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AutoAwesome } from "@mui/icons-material";
import {
  Box, Card, CardContent, Tabs, Tab, TextField, Button,
  Typography, Divider, CircularProgress, Stack,
} from "@mui/material";
import { z } from "zod";
import { login, signup, getSession } from "@/lib/auth";
import { toast } from "sonner";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  component: AuthPage,
});

const emailSchema = z.string().trim().email("อีเมลไม่ถูกต้อง").max(255);
const passwordSchema = z.string().min(6, "รหัสผ่านอย่างน้อย 6 ตัวอักษร").max(72);
const nameSchema = z.string().trim().min(1, "กรุณากรอกชื่อ").max(80);

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) navigate({ to: redirect ?? "/", replace: true });
  }, [navigate, redirect]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = emailSchema.safeParse(fd.get("email"));
    const password = passwordSchema.safeParse(fd.get("password"));
    if (!email.success) return toast.error(email.error.issues[0].message);
    if (!password.success) return toast.error(password.error.issues[0].message);
    setLoading(true);
    try {
      await login(email.data, password.data);
      toast.success("ยินดีต้อนรับกลับมา!");
      navigate({ to: redirect ?? "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = nameSchema.safeParse(fd.get("name"));
    const email = emailSchema.safeParse(fd.get("email"));
    const password = passwordSchema.safeParse(fd.get("password"));
    if (!name.success) return toast.error(name.error.issues[0].message);
    if (!email.success) return toast.error(email.error.issues[0].message);
    if (!password.success) return toast.error(password.error.issues[0].message);
    setLoading(true);
    try {
      // หมายเหตุ: backend Go ปัจจุบันยังไม่รองรับ display name ตอน signup
      await signup(email.data, password.data);
      toast.success("สร้างบัญชีสำเร็จ!");
      navigate({ to: redirect ?? "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setLoading(true);
    const email = "demo@factoryflow.app";
    const password = "DemoFactory!2026";
    try {
      try {
        await login(email, password);
      } catch {
        // ยังไม่มีบัญชี demo ในฐานข้อมูล → สมัครแล้วเข้าสู่ระบบใหม่
        await signup(email, password);
        await login(email, password);
      }
      toast.success("เข้าสู่ระบบด้วยบัญชีทดลอง");
      navigate({ to: redirect ?? "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เข้าสู่ระบบด้วยบัญชีทดลองไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        px: 2, py: 6, position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, #EAF4FE 0%, #F4F9FE 50%, #E6F7FA 100%)",
      }}
    >
      <motion.div
        style={{ position: "absolute", top: -100, left: -100, width: 380, height: 380, borderRadius: "50%", background: "rgba(127,180,238,0.35)", filter: "blur(80px)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        style={{ position: "absolute", bottom: -120, right: -100, width: 440, height: 440, borderRadius: "50%", background: "rgba(95,199,216,0.35)", filter: "blur(80px)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, delay: 1 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}
      >
        <Stack spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
          <motion.div
            initial={{ rotate: -12, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            <Box sx={{
              width: 56, height: 56, borderRadius: 3.5, display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, #7FB4EE 0%, #4A90E2 100%)", color: "#fff",
              boxShadow: "0 8px 24px rgba(74,144,226,0.45)",
            }}>
              <AutoAwesome fontSize="medium" />
            </Box>
          </motion.div>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>FactoryFlow</Typography>
          <Typography variant="body2" color="text.secondary">ระบบบริหารจัดการการผลิต</Typography>
        </Stack>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
              <Tab label="เข้าสู่ระบบ" />
              <Tab label="สมัครสมาชิก" />
            </Tabs>

            {tab === 0 && (
              <Box component="form" onSubmit={handleSignIn}>
                <Stack spacing={2}>
                  <TextField name="email" type="email" label="อีเมล" placeholder="you@example.com" autoComplete="email" required />
                  <TextField name="password" type="password" label="รหัสผ่าน" autoComplete="current-password" required />
                  <Button type="submit" variant="contained" size="large" disabled={loading}>
                    {loading ? <CircularProgress size={22} color="inherit" /> : "เข้าสู่ระบบ"}
                  </Button>
                </Stack>
              </Box>
            )}

            {tab === 1 && (
              <Box component="form" onSubmit={handleSignUp}>
                <Stack spacing={2}>
                  <TextField name="name" label="ชื่อที่แสดง" placeholder="สมชาย ใจดี" autoComplete="name" required />
                  <TextField name="email" type="email" label="อีเมล" placeholder="you@example.com" autoComplete="email" required />
                  <TextField name="password" type="password" label="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)" autoComplete="new-password" required />
                  <Button type="submit" variant="contained" size="large" disabled={loading}>
                    {loading ? <CircularProgress size={22} color="inherit" /> : "สมัครสมาชิก"}
                  </Button>
                </Stack>
              </Box>
            )}

            <Divider sx={{ my: 2.5, fontSize: 12, color: "text.secondary" }}>หรือ</Divider>

            <Button fullWidth variant="outlined" onClick={handleDemo} disabled={loading}>
              {loading ? <CircularProgress size={22} /> : "🚀 ใช้บัญชีทดลอง (เข้าเลย)"}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 1 }}>
              demo@factoryflow.app · DemoFactory!2026
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 2 }}>
          <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>← กลับหน้าหลัก</Link>
        </Typography>
      </motion.div>
    </Box>
  );
}
