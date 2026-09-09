import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";

interface PageShellProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, description, icon, actions, children }: PageShellProps) {
  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1280, mx: "auto", width: "100%" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            {icon && (
              <Box
                sx={{
                  width: 52, height: 52, borderRadius: 3,
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                  background: "linear-gradient(135deg, #7FB4EE 0%, #4A90E2 100%)",
                  boxShadow: "0 6px 18px rgba(74,144,226,0.35)",
                }}
              >
                {icon}
              </Box>
            )}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{title}</Typography>
              {description && (
                <Typography variant="body2" color="text.secondary">{description}</Typography>
              )}
            </Box>
          </Stack>
          {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
        </Stack>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        {children}
      </motion.div>
    </Box>
  );
}
