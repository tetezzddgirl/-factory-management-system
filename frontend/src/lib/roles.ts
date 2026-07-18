import { createContext, useContext } from "react";

export type RoleKey =
  | "planner"
  | "warehouse"
  | "operator"
  | "supervisor"
  | "qc"
  | "maintenance"
  | "shipping"
  | "admin"
  | "executive";

export const ROLES: { key: RoleKey; label: string; short: string; color: string }[] = [
  { key: "planner",     label: "เจ้าหน้าที่ฝ่ายวางแผนการผลิต",  short: "Planner",     color: "#4A90E2" },
  { key: "warehouse",   label: "เจ้าหน้าที่ฝ่ายคลังสินค้า",       short: "Warehouse",   color: "#0EA5E9" },
  { key: "operator",    label: "เจ้าหน้าที่ฝ่ายผลิต",             short: "Operator",    color: "#10B981" },
  { key: "supervisor",  label: "หัวหน้างานฝ่ายผลิต",              short: "Supervisor",  color: "#059669" },
  { key: "qc",          label: "เจ้าหน้าที่ฝ่ายควบคุมคุณภาพ",     short: "QC",          color: "#F59E0B" },
  { key: "maintenance", label: "เจ้าหน้าที่ฝ่ายซ่อมบำรุง",         short: "Maintenance", color: "#EF4444" },
  { key: "shipping",    label: "เจ้าหน้าที่ฝ่ายจัดส่งสินค้า",       short: "Shipping",    color: "#8B5CF6" },
  { key: "admin",       label: "ผู้ดูแลระบบ",                        short: "Admin",       color: "#334155" },
  { key: "executive",   label: "ผู้บริหาร",                          short: "Executive",   color: "#0F172A" },
];

export const ROLE_MAP: Record<RoleKey, (typeof ROLES)[number]> = ROLES.reduce(
  (acc, r) => ({ ...acc, [r.key]: r }),
  {} as Record<RoleKey, (typeof ROLES)[number]>,
);

/** Which nav items each role can see. */
export const ROLE_NAV: Record<RoleKey, string[]> = {
  planner:     ["/", "/planning", "/products", "/materials", "/machines", "/personnel"],
  warehouse:   ["/", "/materials", "/warehouse"],
  operator:    ["/", "/production", "/machines", "/quality"],
  supervisor:  ["/", "/production", "/planning", "/personnel", "/machines", "/quality"],
  qc:          ["/", "/quality", "/products", "/production"],
  maintenance: ["/", "/maintenance", "/machines"],
  shipping:    ["/", "/warehouse"],
  admin:       ["/", "/users", "/personnel", "/products", "/planning", "/materials", "/production", "/quality", "/machines", "/maintenance", "/warehouse"],
  executive:   ["/", "/planning", "/production", "/quality", "/warehouse", "/personnel"],
};

export const RoleContext = createContext<{
  role: RoleKey;
  setRole: (r: RoleKey) => void;
}>({ role: "admin", setRole: () => {} });

export const useRole = () => useContext(RoleContext);

export function canAccess(role: RoleKey, path: string) {
  return ROLE_NAV[role].includes(path);
}