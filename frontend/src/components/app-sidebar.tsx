import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Dashboard as DashboardIcon, CalendarMonth, Inventory2, Factory, VerifiedUser,
  Settings as SettingsIcon, Build, Groups, LocalShipping, AutoAwesome, Logout,
  Category, Layers, ReportProblem, Assignment, TaskAlt,
} from "@mui/icons-material";
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Avatar, Tooltip, ButtonBase,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { getSession, logout } from "@/lib/auth";
import { toast } from "sonner";
import { useRole, canAccess } from "@/lib/roles";
import { SelfProfileDialog } from "@/components/self-profile-dialog";

const items = [
  // { title: "แดชบอร์ด", url: "/", icon: DashboardIcon },
  { title: "แผนการผลิต", url: "/planning", icon: CalendarMonth },
  { title: "ใบสั่งผลิต", url: "/work-orders", icon: Assignment },
  { title: "ผลิตภัณฑ์ & สูตรการผลิต", url: "/products", icon: Category },
  { title: "วัตถุดิบ", url: "/materials", icon: Inventory2 },
  { title: "สินค้าระหว่างผลิต", url: "/wip", icon: Layers },
  { title: "การผลิต", url: "/production", icon: Factory },
  { title: "ตรวจสอบปัญหา", url: "/issues", icon: ReportProblem },
  { title: "ควบคุมคุณภาพ", url: "/quality", icon: VerifiedUser },
  { title: "เครื่องจักร", url: "/machines", icon: SettingsIcon },
  { title: "ซ่อมบำรุง", url: "/maintenance", icon: Build },
  { title: "บุคลากร", url: "/personnel", icon: Groups },
  { title: "งานและการมอบหมาย", url: "/tasks", icon: TaskAlt },
  // FRESH-14 — "บัญชีผู้ใช้" (/users) removed: account info is managed on "บุคลากร";
  // each user edits their own via the "ข้อมูลของฉัน" dialog below. Backend account
  // APIs / UserAccount model / login / password reset are untouched.
  { title: "คลัง & จัดส่ง", url: "/warehouse", icon: LocalShipping },
];

export const DRAWER_WIDTH = 260;
export const DRAWER_MINI = 76;

export function AppSidebar({ open }: { open: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const { role } = useRole();
  // FRESH-14 — "บุคลากร" is viewable by every authenticated role; admin-only
  // controls are gated inside the page and enforced by the backend. Every other
  // item keeps its original RoleContext-based visibility.
  const visible = items.filter((it) => it.url === "/personnel" || canAccess(role, it.url));

  useEffect(() => {
    setEmail(getSession()?.email ?? null);
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    toast.success("ออกจากระบบแล้ว");
    navigate({ to: "/auth", replace: true });
  }

  const width = open ? DRAWER_WIDTH : DRAWER_MINI;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width, flexShrink: 0, whiteSpace: "nowrap",
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        "& .MuiDrawer-paper": {
          width, overflowX: "hidden",
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, minHeight: 64 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: 2.5, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #7FB4EE 0%, #4A90E2 100%)",
            color: "#fff", boxShadow: "0 4px 14px rgba(74,144,226,0.4)",
          }}
        >
          <AutoAwesome fontSize="small" />
        </Box>
        {open && (
          <Box sx={{ overflow: "hidden" }}>
            <Typography noWrap sx={{ fontWeight: 700, fontSize: 15 }}>FactoryFlow</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>Production Suite</Typography>
          </Box>
        )}
      </Box>
      <Divider />

      <List sx={{ flex: 1, py: 1 }}>
        {visible.map((item) => {
          const active = isActive(item.url);
          const Icon = item.icon;
          const button = (
            <ListItemButton
              component={Link}
              to={item.url}
              selected={active}
              sx={{ minHeight: 44, px: open ? 2 : 1.5, justifyContent: open ? "flex-start" : "center" }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : "auto", justifyContent: "center" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: 14, fontWeight: active ? 600 : 500 }}>{item.title}</Typography>
                  }
                />
              )}
            </ListItemButton>
          );
          return (
            <ListItem key={item.url} disablePadding>
              {open ? button : <Tooltip title={item.title} placement="right">{button}</Tooltip>}
            </ListItem>
          );
        })}
      </List>

      <Divider />
      <Box sx={{ p: 1.5 }}>
        {/* FRESH-14 — the account block opens the "ข้อมูลของฉัน" self-profile dialog.
            Same layout / avatar / typography as before, wrapped in a ButtonBase so
            it is pointer- and keyboard-clickable. */}
        {open && email && (
          <ButtonBase
            onClick={() => setProfileOpen(true)}
            sx={{
              display: "flex", alignItems: "center", gap: 1.5, mb: 1, px: 1, py: 0.5,
              width: "100%", textAlign: "left", borderRadius: 2,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.light", fontSize: 13 }}>
              {(email[0] ?? "?").toUpperCase()}
            </Avatar>
            <Box sx={{ overflow: "hidden" }}>
              <Typography variant="caption" noWrap sx={{ display: "block", fontWeight: 600 }}>{email}</Typography>
              <Typography variant="caption" color="text.secondary">ผู้ใช้งาน</Typography>
            </Box>
          </ButtonBase>
        )}
        <Tooltip title={open ? "" : "ออกจากระบบ"} placement="right">
          <ListItemButton onClick={handleSignOut} sx={{ minHeight: 42, justifyContent: open ? "flex-start" : "center", color: "error.main" }}>
            <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : "auto", justifyContent: "center", color: "error.main" }}>
              <Logout fontSize="small" />
            </ListItemIcon>
            {open && <ListItemText primary={<Typography sx={{ fontSize: 14 }}>ออกจากระบบ</Typography>} />}
          </ListItemButton>
        </Tooltip>
      </Box>

      <SelfProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Drawer>
  );
}
