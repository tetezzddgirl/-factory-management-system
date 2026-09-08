import Chip from "@mui/material/Chip";

export type Tone = "success" | "info" | "warning" | "muted" | "danger";

const toneColors: Record<
  Tone,
  { bg: string; color: string; border?: string }
> = {
  // Green: #10B981 (Normal, on, ok, fine, go, satisfactory)
  success: { bg: "#ecfdf5", color: "#10B981", border: "#a7f3d0" },

  // Blue: #4A90E2 (Standby, available, enabled)
  info: { bg: "#ebf4fe", color: "#4A90E2", border: "#b9d8fc" },

  // Orange: #F59E0B (Serious, distress, error, needs attention)
  warning: { bg: "#fffbeb", color: "#F59E0B", border: "#fde68a" },

  // Gray: #A4ABB6 (Off, unavailable, disabled)
  muted: { bg: "#f1f3f5", color: "#6e7683", border: "#A4ABB6" },

  // Red: #EF4444 (Critical, severe, alert, form error, emergency, urgent)
  danger: { bg: "#fef2f2", color: "#EF4444", border: "#fecaca" },
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const meta = toneColors[tone] || toneColors.muted;

  return (
    <Chip
      label={children}
      size="small"
      className={className}
      sx={{
        backgroundColor: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.border || meta.bg}`,
        fontWeight: 600,
        fontSize: "0.75rem",
        height: 22,
        borderRadius: "6px",
        "& .MuiChip-label": {
          px: 1,
        },
      }}
    />
  );
}
