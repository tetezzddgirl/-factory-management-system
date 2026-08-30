import { createTheme, alpha } from "@mui/material/styles";

const primary = "#4A90E2";
const primaryLight = "#7FB4EE";
const primaryDark = "#2E6FBF";
const secondary = "#5FC7D8";

export const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: primary, light: primaryLight, dark: primaryDark, contrastText: "#fff" },
    secondary: { main: secondary, contrastText: "#fff" },
    background: { default: "#F4F9FE", paper: "#FFFFFF" },
    text: { primary: "#1E293B", secondary: "#64748B" },
    success: { main: "#10B981" },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
    info: { main: "#4A90E2" },
    divider: alpha(primary, 0.12),
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: ["Inter", "Sarabun", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"].join(","),
    h1: { fontWeight: 700 }, h2: { fontWeight: 700 }, h3: { fontWeight: 700 },
    h4: { fontWeight: 700 }, h5: { fontWeight: 700 }, h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            "radial-gradient(1200px 600px at -10% -20%, rgba(127,180,238,0.25), transparent 60%), radial-gradient(1000px 500px at 110% 10%, rgba(95,199,216,0.18), transparent 60%)",
          backgroundAttachment: "fixed",
          minHeight: "100vh",
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: `1px solid ${alpha(primary, 0.1)}`,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)",
          boxShadow: `0 4px 20px ${alpha(primary, 0.08)}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, paddingInline: 16 },
      },
    },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: "2px 8px",
          "&.Mui-selected": {
            background: `linear-gradient(135deg, ${alpha(primaryLight, 0.28)} 0%, ${alpha(primary, 0.2)} 100%)`,
            color: primaryDark,
            "& .MuiListItemIcon-root": { color: primaryDark },
            "&:hover": {
              background: `linear-gradient(135deg, ${alpha(primaryLight, 0.4)} 0%, ${alpha(primary, 0.3)} 100%)`,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(12px)",
          color: "#1E293B",
          boxShadow: `0 1px 0 ${alpha(primary, 0.08)}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: "linear-gradient(180deg, #FFFFFF 0%, #F0F7FE 100%)",
          borderRight: `1px solid ${alpha(primary, 0.1)}`,
        },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 18 } } },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 8, borderRadius: 8, backgroundColor: alpha(primary, 0.12) },
        bar: { borderRadius: 8 },
      },
    },
  },
});
