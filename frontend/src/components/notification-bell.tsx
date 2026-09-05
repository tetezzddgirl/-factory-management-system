import { useState } from "react";
import {
  Badge, Box, Divider, IconButton, List, ListItem, ListItemText,
  Menu, Stack, Typography, Chip, Button,
} from "@mui/material";
import { NotificationsOutlined, Circle } from "@mui/icons-material";
import { motion } from "framer-motion";

type Notif = {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "info" | "warning" | "success" | "error";
  unread: boolean;
};

const seed: Notif[] = [
  { id: "n1", title: "แผนการผลิต PLN-2455 รอตรวจสอบ",  desc: "QC ต้องอนุมัติก่อนสร้างใบสั่งผลิต", time: "2 นาทีก่อน", type: "warning", unread: true },
  { id: "n2", title: "เครื่องจักร M-04 แจ้งเสีย",       desc: "รอมอบหมายช่างซ่อมบำรุง",           time: "8 นาทีก่อน", type: "error",   unread: true },
  { id: "n3", title: "วัตถุดิบ RM-002 ต่ำกว่าเกณฑ์",     desc: "คงเหลือ 12% — ควรสั่งเพิ่ม",         time: "15 นาทีก่อน", type: "warning", unread: true },
  { id: "n4", title: "งาน JOB-2449 ผลิตเสร็จแล้ว",       desc: "ส่งเข้าคลังพร้อม QC final",           time: "1 ชม.ก่อน",   type: "success", unread: false },
  { id: "n5", title: "สูตรการผลิต ขวด PET 500ml v3 อนุมัติแล้ว", desc: "โดย จันทร์เพ็ญ (QC)",               time: "3 ชม.ก่อน",   type: "info",    unread: false },
];

const typeColor: Record<Notif["type"], string> = {
  info: "#4A90E2", warning: "#F59E0B", success: "#10B981", error: "#EF4444",
};

export function NotificationBell() {
  const [items, setItems] = useState(seed);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const unread = items.filter((n) => n.unread).length;

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
          <Button
            size="small"
            onClick={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))}
            disabled={unread === 0}
          >
            อ่านทั้งหมด
          </Button>
        </Stack>
        <Divider />
        <List sx={{ py: 0 }}>
          {items.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <ListItem
                onClick={() => setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))}
                sx={{
                  py: 1.25, cursor: "pointer",
                  bgcolor: n.unread ? "rgba(74,144,226,0.06)" : "transparent",
                  "&:hover": { bgcolor: "rgba(74,144,226,0.1)" },
                }}
              >
                <Box sx={{ mr: 1.5, mt: 0.5, color: typeColor[n.type] }}>
                  <Circle sx={{ fontSize: 10 }} />
                </Box>
                <ListItemText
                  primary={<Typography sx={{ fontSize: 14, fontWeight: n.unread ? 700 : 500 }}>{n.title}</Typography>}
                  secondary={
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{n.desc}</Typography>
                      <Typography variant="caption" color="text.disabled">{n.time}</Typography>
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