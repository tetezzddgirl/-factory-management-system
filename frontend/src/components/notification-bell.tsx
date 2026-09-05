import { useEffect, useState } from "react";
import {
  Badge, Box, Divider, IconButton, List, ListItem, ListItemText,
  Menu, Stack, Typography, Chip, Button,
} from "@mui/material";
import { NotificationsOutlined, Circle } from "@mui/icons-material";
import { motion } from "framer-motion";
import { notificationsApi, type ApiNotification } from "@/lib/api-client";
import { useRole } from "@/lib/roles";

const typeColor: Record<string, string> = {
  info: "#4A90E2", warning: "#F59E0B", success: "#10B981", error: "#EF4444",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีก่อน`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ก่อน`;
  const days = Math.floor(hrs / 24);
  return `${days} วันก่อน`;
}

export function NotificationBell() {
  const { role } = useRole();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const unread = items.filter((n) => !n.isRead).length;

  async function load() {
    try {
      const data = await notificationsApi.list(role);
      setItems(data ?? []);
    } catch {
      // เงียบไว้พอ ไม่ต้องเด้ง error รบกวนแค่เพราะกระดิ่งโหลดไม่ทัน
    }
  }

  useEffect(() => {
    load();
    // ใช้ pattern polling ทุก 3 วิ แบบเดียวกับ productionManagement.tsx เพื่อความ consistent
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [role]);

  async function markOneRead(id: string) {
    setItems((prev) => prev.map((n) => (n.notificationID === id ? { ...n, isRead: true } : n)));
    try {
      await notificationsApi.markRead(id);
    } catch {
      load(); // ถ้า backend fail ให้ sync สถานะจริงกลับมาจาก server
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationsApi.markAllRead(role);
    } catch {
      load();
    }
  }

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
        <Badge badgeContent={unread} color="error">
          <NotificationsOutlined />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 380, maxHeight: 480, mt: 1, borderRadius: 3 } } }}
      >
        <Stack direction="row" sx={{ px: 2, py: 1.5, justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 700 }}>การแจ้งเตือน</Typography>
          <Button size="small" onClick={markAllRead} disabled={unread === 0}>
            อ่านทั้งหมด
          </Button>
        </Stack>
        <Divider />
        <List sx={{ py: 0 }}>
          {items.map((n, i) => (
            <motion.div key={n.notificationID} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <ListItem
                onClick={() => markOneRead(n.notificationID)}
                sx={{
                  py: 1.25, cursor: "pointer",
                  bgcolor: !n.isRead ? "rgba(74,144,226,0.06)" : "transparent",
                  "&:hover": { bgcolor: "rgba(74,144,226,0.1)" },
                }}
              >
                <Box sx={{ mr: 1.5, mt: 0.5, color: typeColor[n.type] ?? typeColor.info }}>
                  <Circle sx={{ fontSize: 10 }} />
                </Box>
                <ListItemText
                  primary={<Typography sx={{ fontSize: 14, fontWeight: !n.isRead ? 700 : 500 }}>{n.title}</Typography>}
                  secondary={
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{n.description}</Typography>
                      <Typography variant="caption" color="text.disabled">{timeAgo(n.createdAt)}</Typography>
                    </>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </motion.div>
          ))}
          {items.length === 0 && (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Chip label="ไม่มีการแจ้งเตือน" size="small" />
            </Box>
          )}
        </List>
      </Menu>
    </>
  );
}