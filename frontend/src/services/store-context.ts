import { createContext } from "react";
import type {
  Bom,
  BomStatus,
  Product,
  Shipment,
  StockItem,
  StockTransaction,
  TransactionType,
} from "@/interfaces";

export interface StoreValue {
  stock: StockItem[];
  transactions: StockTransaction[];
  shipments: Shipment[];
  products: Product[];
  boms: Bom[];
  submitTransaction: (input: {
    type: TransactionType;
    code: string;
    name: string;
    quantity: number;
    location: string;
    palette: string;
    lot: string;
    warehouseId?: string;
    warehouseName?: string;
    remark?: string;
  }) => { ok: boolean; message: string };
  verifyShipment: (id: string) => void;
  addShipment: (input: { customer: string; productName: string; quantity: number; eta: string }) => void;
  updateShipment: (
    id: string,
    input: { customer: string; productName: string; quantity: number; eta: string },
  ) => void;
  deleteShipment: (id: string) => void;
  addBom: (input: {
    productCode: string;
    productName: string;
    materials: string[];
    steps: string[] | string;
    machines: string;
    category: string;
    version: string;
  }) => void;
  updateBom: (
    id: string,
    input: {
      productCode: string;
      productName: string;
      materials: string[];
      steps: string[] | string;
      machines: string;
      category: string;
      version: string;
    },
  ) => void;
  deleteBom: (id: string) => void;
  setBomStatus: (id: string, status: BomStatus) => void;
  addProduct: (input: { code: string; name: string; category: string; bomVersion: string }) => void;
  updateProduct: (
    id: string,
    input: { code: string; name: string; category: string; bomVersion: string },
  ) => void;
  deleteProduct: (id: string) => void;
}

export const StoreContext = createContext<StoreValue | null>(null);
