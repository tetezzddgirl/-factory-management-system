import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppBar, Box, Chip, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import { AppSidebar } from "@/components/app-sidebar";
import { getSession } from "@/lib/auth";
import { NotificationBell } from "@/components/notification-bell";
import { RoleSwitcher } from "@/components/role-switcher";
import { RoleContext, ROLE_MAP, type RoleKey } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = getSession();
    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: session };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [open, setOpen] = useState(true);
  const [role, setRoleState] = useState<RoleKey>("admin");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("ff:role") as RoleKey)) || null;
    if (saved && ROLE_MAP[saved]) setRoleState(saved);
  }, []);
  const setRole = (r: RoleKey) => {
    setRoleState(r);
    if (typeof window !== "undefined") localStorage.setItem("ff:role", r);
  };
  const current = ROLE_MAP[role];
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <AppSidebar open={open} />
        <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <AppBar position="sticky" elevation={0}>
            <Toolbar sx={{ minHeight: "56px !important", gap: 1 }}>
              <IconButton onClick={() => setOpen((v) => !v)} size="small">
                <MenuIcon />
              </IconButton>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>FactoryFlow</Typography>
              <Chip
                size="small"
                label={current.short}
                sx={{ ml: 1, bgcolor: `${current.color}22`, color: current.color, fontWeight: 700, fontSize: 11 }}
              />
              <Box sx={{ flexGrow: 1 }} />
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <RoleSwitcher />
                <NotificationBell />
              </Stack>
            </Toolbar>
          </AppBar>
          <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </RoleContext.Provider>
  );
}
