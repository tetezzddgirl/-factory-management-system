import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Dashboard as DashboardIcon, CalendarMonth, Inventory2, Factory, VerifiedUser,
  Settings as SettingsIcon, Build, Groups, ManageAccounts, LocalShipping, AutoAwesome, Logout,
  Category, Layers, ReportProblem, Assignment,
} from "@mui/icons-material";
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Avatar, Tooltip,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { getSession, logout } from "@/lib/auth";
import { toast } from "sonner";
import { useRole, canAccess } from "@/lib/roles";

const items = [
  // { title: "แดชบอร์ด", url: "/", icon: DashboardIcon },
  { title: "แผนการผลิต", url: "/planning", icon: CalendarMonth },
  { title: "ใบสั่งผลิต", url: "/work-orders", icon: Assignment },
  { title: "ผลิตภัณฑ์ & BOM", url: "/products", icon: Category },
  { title: "วัตถุดิบ", url: "/materials", icon: Inventory2 },
  { title: "สินค้าระหว่างผลิต", url: "/wip", icon: Layers },
  { title: "การผลิต", url: "/production", icon: Factory },
  { title: "ตรวจสอบปัญหา", url: "/issues", icon: ReportProblem },
  { title: "ควบคุมคุณภาพ", url: "/quality", icon: VerifiedUser },
  { title: "เครื่องจักร", url: "/machines", icon: SettingsIcon },
  { title: "ซ่อมบำรุง", url: "/maintenance", icon: Build },
  { title: "บุคลากร", url: "/personnel", icon: Groups },
  { title: "บัญชีผู้ใช้", url: "/users", icon: ManageAccounts },
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
  const { role } = useRole();
  const visible = items.filter((it) => canAccess(role, it.url));

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
        {open && email && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1, px: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.light", fontSize: 13 }}>
              {(email[0] ?? "?").toUpperCase()}
            </Avatar>
            <Box sx={{ overflow: "hidden" }}>
              <Typography variant="caption" noWrap sx={{ display: "block", fontWeight: 600 }}>{email}</Typography>
              <Typography variant="caption" color="text.secondary">ผู้ใช้งาน</Typography>
            </Box>
          </Box>
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
    </Drawer>
  );
}
