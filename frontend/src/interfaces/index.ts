export type Role = "Planner" | "Warehouse" | "Shipping" | "QC";

export interface AppUser {
  email: string;
  name: string;
  role: Role;
}

/* ---------- ระบบคลังสินค้าสำเร็จรูปและจัดส่งสินค้า ---------- */

export interface Warehouse {
  warehouse_id: string;
  warehouse_name: string;
  location: string;
  capacity?: number;
}

export interface StockItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  palette?: string | undefined;
  lot?: string | undefined;
  warehouseId?: string | undefined;
  warehouseName?: string | undefined;
}

export type TransactionType = "receive" | "issue";

export interface StockTransaction {
  id: string;
  type: TransactionType;
  code: string;
  name: string;
  quantity: number;
  location: string;
  palette: string;
  lot: string;
  warehouseId?: string | undefined;
  warehouseName?: string | undefined;
  remark?: string | undefined;
  createdAt: string;
}

export type ShipmentStatus = "pending" | "ready" | "shipped";

export interface Customer {
  id?: number;
  customer_id: number;
  customer_name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Shipment {
  id: string;
  code: string;
  customer: string;
  productName: string;
  quantity: number;
  eta: string;
  status: ShipmentStatus;
  verifiedAt?: string | undefined;
}

/* ---------- ระบบจัดการข้อมูลผลิตภัณฑ์ / สูตรการผลิต / วัตถุดิบ ---------- */

export interface RawMaterial {
  id: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  bomVersion: string;
}

export type BomStatus = "draft" | "pending" | "approved" | "rejected" | "pending_delete";

export interface BomMaterial {
  name: string;
  amount: string;
}

export interface Bom {
  id: string;
  code: string;
  productCode: string;
  productName: string;
  version: string;
  category: string;
  materials: BomMaterial[];
  machines: string[];
  steps?: string[] | undefined;
  status: BomStatus;
  updatedBy: string;
  updatedAt: string;
}
