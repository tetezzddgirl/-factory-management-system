import type { Bom, Customer, Product, RawMaterial, Shipment, StockItem, StockTransaction, Warehouse } from "@/interfaces";

/**
 * Backend API Base URL (Go Gin Server on localhost:8080)
 */
const API_HOST = import.meta.env.VITE_API_URL || "http://localhost:8080";
export const BASE_URL = `${API_HOST.replace(/\/+$/, "")}/api/sf`;

export const seedWarehouses: Warehouse[] = [
  { warehouse_id: "WH-01", warehouse_name: "คลังสินค้าสำเร็จรูป A (Main FG)", location: "อาคาร A ชั้น 1 (Zone A - ขวด PET)", capacity: 50000 },
  { warehouse_id: "WH-02", warehouse_name: "คลังสินค้าสำเร็จรูป B (Secondary FG)", location: "อาคาร A ชั้น 2 (Zone B - ขวด HDPE & ฝา)", capacity: 35000 },
  { warehouse_id: "WH-03", warehouse_name: "คลังสินค้าพักรอส่ง (Transit Hub)", location: "ลานโหลดสินค้า อาคาร B (Loading Bay 1-3)", capacity: 20000 },
  { warehouse_id: "WH-04", warehouse_name: "คลังสินค้ารองรับการส่งออกและสำรอง (Buffer)", location: "อาคาร C (Buffer Storage)", capacity: 30000 },
];

export const seedCustomers: Customer[] = [
  { customer_id: 1, customer_name: "บจก. สยามวอเตอร์ เบฟเวอเรจ (น้ำดื่ม A)", phone: "02-123-4567", email: "contact@siamwater.com", address: "123 ถ.วิภาวดีรังสิต แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900" },
  { customer_id: 2, customer_name: "บจก. กรีนเบฟ ดริ้งค์ (เครื่องดื่ม B)", phone: "02-987-6543", email: "info@greenbev.co.th", address: "88 หมู่ 3 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120" },
  { customer_id: 3, customer_name: "บมจ. ไทยแพ็คเกจจิ้ง แอนด์ ลอจิสติกส์ (บรรจุภัณฑ์ C)", phone: "02-555-8888", email: "sales@thaipack.co.th", address: "99/1 นิคมอุตสาหกรรมบางปู จ.สมุทรปราการ 10280" },
  { customer_id: 4, customer_name: "บจก. พลัสไดรฟ์ ฟู้ดแอนด์เบฟเวอเรจ", phone: "038-234-5678", email: "procurement@plusdrive.co.th", address: "45/2 นิคมฯ อมตะซิตี้ ต.ดอนหัวฬ่อ อ.เมือง จ.ชลบุรี 20000" },
  { customer_id: 5, customer_name: "บจก. ออร์แกนิค ซันไชน์ ฟาร์ม", phone: "053-890-1234", email: "supply@organicsun.com", address: "210 ถ.โชตนา ต.ช้างเผือก อ.เมือง จ.เชียงใหม่ 50300" },
  { customer_id: 6, customer_name: "บจก. คอสเมติก บิวตี้แล็บ", phone: "02-441-9988", email: "purchase@beautylab.co.th", address: "55/12 ถ.บรมราชชนนี แขวงศาลาธรรมสพน์ เขตทวีวัฒนา กรุงเทพฯ 10170" },
  { customer_id: 7, customer_name: "บมจ. สยามเคมิคอล โซลูชั่นส์", phone: "038-685-1111", email: "order@siamchem.co.th", address: "18 นิคมฯ มาบตาพุด ถ.ไอ-หนึ่ง ต.มาบตาพุด อ.เมือง จ.ระยอง 21150" },
  { customer_id: 8, customer_name: "บจก. สหไทย อินเตอร์ฟู้ดส์ โพรดักส์", phone: "034-822-3456", email: "contact@sahathai-food.com", address: "102 หมู่ 5 ต.ท่าทราย อ.เมือง จ.สมุทรสาคร 74000" },
  { customer_id: 9, customer_name: "บจก. เภสัชเวชภัณฑ์ สยามเมดิคอล", phone: "02-714-8800", email: "scm@siammedical.co.th", address: "77/4 ซ.สุขุมวิท 63 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110" },
  { customer_id: 10, customer_name: "บจก. พีทีที โพลีเมอร์ รีเทล", phone: "02-537-2000", email: "distributor@pttplastic.com", address: "555 ถ.วิภาวดีรังสิต แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900" },
];

export const seedRawMaterials: RawMaterial[] = [
  { id: "RM-001", materialCode: "RM-001", materialName: "เม็ดพลาสติก PET Resin (เกรดใส)", quantity: 25000, unit: "kg" },
  { id: "RM-002", materialCode: "RM-002", materialName: "เม็ดพลาสติก HDPE (เกรดเป่าขวดทึบ)", quantity: 18000, unit: "kg" },
  { id: "RM-003", materialCode: "RM-003", materialName: "เม็ดพลาสติก PP Copolymer (เกรดทำฝา)", quantity: 12000, unit: "kg" },
  { id: "RM-004", materialCode: "RM-004", materialName: "เม็ดพลาสติก LDPE (เกรดฟิล์ม)", quantity: 8500, unit: "kg" },
  { id: "RM-005", materialCode: "RM-005", materialName: "สีมาสเตอร์แบทช์ สีฟ้า (Blue MB)", quantity: 450, unit: "kg" },
  { id: "RM-006", materialCode: "RM-006", materialName: "สีมาสเตอร์แบทช์ สีเขียว (Green MB)", quantity: 300, unit: "kg" },
  { id: "RM-007", materialCode: "RM-007", materialName: "สีมาสเตอร์แบทช์ สีขาวมุก (White MB)", quantity: 650, unit: "kg" },
  { id: "RM-008", materialCode: "RM-008", materialName: "สารเพิ่มความลื่น (Slip Agent)", quantity: 150, unit: "kg" },
  { id: "RM-009", materialCode: "RM-009", materialName: "สารป้องกันรังสียูวี (UV Stabilizer)", quantity: 120, unit: "kg" },
  { id: "RM-010", materialCode: "RM-010", materialName: "ฝาเกลียวสำเร็จรูป 28mm (Short Neck)", quantity: 85000, unit: "ชิ้น" },
  { id: "RM-011", materialCode: "RM-011", materialName: "ฝาฟลิปท็อป 24mm (Flip Top Cap)", quantity: 30000, unit: "ชิ้น" },
  { id: "RM-012", materialCode: "RM-012", materialName: "พรีฟอร์มขวด PET 500ml (Preform 18g)", quantity: 50000, unit: "ชิ้น" },
  { id: "RM-013", materialCode: "RM-013", materialName: "ม้วนฟิล์มฉลากพิมพ์ PVC/PET Shrink", quantity: 3500, unit: "kg" },
  { id: "RM-014", materialCode: "RM-014", materialName: "กาวฮอทเมลท์ความร้อนสูง (Hot Melt Glue)", quantity: 800, unit: "kg" },
  { id: "RM-015", materialCode: "RM-015", materialName: "กล่องลูกฟูก 5 ชั้น (บรรจุ 24 ขวด)", quantity: 6000, unit: "ชิ้น" },
];

/** วัตถุดิบต้นแบบ */
export const materialOptions: string[] = seedRawMaterials.map((m) => `${m.materialName} (${m.materialCode})`);

export const seedStock: StockItem[] = [
  { id: "s1", code: "FG-001", name: "ขวด PET 500ml", quantity: 18392, unit: "ขวด", location: "A-01", warehouseId: "WH-01", warehouseName: "คลังสินค้าสำเร็จรูป A (Main FG)" },
  { id: "s2", code: "FG-002", name: "ขวด PET 1L", quantity: 9240, unit: "ขวด", location: "A-02", warehouseId: "WH-04", warehouseName: "คลังสินค้ารองรับการส่งออกและสำรอง (Buffer)" },
  { id: "s3", code: "FG-003", name: "ฝาเกลียว", quantity: 45000, unit: "ชิ้น", location: "B-01", warehouseId: "WH-02", warehouseName: "คลังสินค้าสำเร็จรูป B (Secondary FG)" },
  { id: "s4", code: "FG-004", name: "ขวด HDPE", quantity: 3120, unit: "ขวด", location: "A-03", warehouseId: "WH-02", warehouseName: "คลังสินค้าสำเร็จรูป B (Secondary FG)" },
  { id: "s5", code: "FG-001", name: "ขวด PET 500ml", quantity: 5000, unit: "ขวด", location: "Bay 1", warehouseId: "WH-03", warehouseName: "คลังสินค้าพักรอส่ง (Transit Hub)" },
];

export const seedTransactions: StockTransaction[] = [
  {
    id: "tx-1",
    type: "receive",
    code: "FG-001",
    name: "ขวด PET 500ml",
    quantity: 5000,
    location: "A-01",
    palette: "PAL-01",
    lot: "LOT-2026-0901",
    remark: "รับสินค้าจากการผลิต กะเช้า",
    createdAt: "06 ก.ย. 2026 09:30",
  },
  {
    id: "tx-2",
    type: "issue",
    code: "FG-001",
    name: "ขวด PET 500ml",
    quantity: 2000,
    location: "A-01",
    palette: "PAL-01",
    lot: "LOT-2026-0901",
    remark: "เบิกจ่ายจัดส่ง บ.น้ำดื่ม A",
    createdAt: "06 ก.ย. 2026 11:15",
  },
  {
    id: "tx-3",
    type: "receive",
    code: "FG-003",
    name: "ฝาเกลียว",
    quantity: 15000,
    location: "B-01",
    palette: "PAL-04",
    lot: "LOT-2026-0903",
    remark: "รับเข้าจากแผนกฉีดขึ้นรูป",
    createdAt: "06 ก.ย. 2026 13:45",
  },
];

export const seedShipments: Shipment[] = [
  {
    id: "h1",
    code: "SHP-501",
    customer: "บ.น้ำดื่ม A",
    productName: "ขวด PET 500ml",
    quantity: 5000,
    eta: "วันนี้",
    status: "shipped",
  },
  {
    id: "h2",
    code: "SHP-502",
    customer: "บ.เครื่องดื่ม B",
    productName: "ขวด PET 1L",
    quantity: 2000,
    eta: "พรุ่งนี้",
    status: "ready",
  },
  {
    id: "h3",
    code: "SHP-503",
    customer: "บ.บรรจุภัณฑ์ C",
    productName: "ฝาเกลียว",
    quantity: 20000,
    eta: "12 ก.ค.",
    status: "pending",
  },
];

export const seedProducts: Product[] = [
  { id: "p1", code: "P-001", name: "ขวด PET 500ml", category: "บรรจุภัณฑ์", bomVersion: "v3" },
  { id: "p2", code: "P-002", name: "ฝาเกลียว 28mm", category: "บรรจุภัณฑ์", bomVersion: "v2" },
  { id: "p3", code: "P-003", name: "ขวด HDPE 1L", category: "บรรจุภัณฑ์", bomVersion: "v1" },
  { id: "p4", code: "P-004", name: "ฉลากฟิล์มหด", category: "วัสดุพิมพ์", bomVersion: "v1" },
  { id: "p5", code: "P-005", name: "ลังกระดาษ 12 ช่อง", category: "บรรจุภัณฑ์", bomVersion: "v1" },
];

export const seedBoms: Bom[] = [
  {
    id: "BOM-001",
    code: "BOM-001",
    productCode: "P-001",
    productName: "ขวด PET 500ml",
    version: "v3",
    category: "บรรจุภัณฑ์",
    materials: [
      { name: "PET Resin (RM-001)", amount: "12 g" },
      { name: "สีมาสเตอร์แบทช์ (RM-005)", amount: "0.3 g" },
    ],
    machines: ["M-01", "M-02"],
    status: "approved",
    updatedBy: "จันทร์เพ็ญ (QC)",
    updatedAt: "10 ก.ค. 2026",
  },
  {
    id: "BOM-002",
    code: "BOM-002",
    productCode: "P-006",
    productName: "ขวด PET 1L",
    version: "v3",
    category: "บรรจุภัณฑ์",
    materials: [
      { name: "PET Resin (RM-001)", amount: "22 g" },
      { name: "สีมาสเตอร์แบทช์ (RM-005)", amount: "0.5 g" },
    ],
    machines: ["M-03"],
    status: "pending",
    updatedBy: "สมชาย (Planner)",
    updatedAt: "12 ก.ค. 2026",
  },
  {
    id: "BOM-003",
    code: "BOM-003",
    productCode: "P-002",
    productName: "ฝาเกลียว 28mm",
    version: "v2",
    category: "บรรจุภัณฑ์",
    materials: [{ name: "PP Compound (RM-004)", amount: "3 g" }],
    machines: ["M-05"],
    status: "draft",
    updatedBy: "อรพิน (Planner)",
    updatedAt: "13 ก.ค. 2026",
  },
];

export async function getCustomers(): Promise<Customer[]> {
  try {
    const res = await fetch(`${BASE_URL}/customers`);
    if (!res.ok) throw new Error("Failed to fetch customers");
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
    return seedCustomers;
  } catch (error) {
    console.warn("Using fallback seedCustomers due to:", error);
    return seedCustomers;
  }
}

export async function getRawMaterials(): Promise<RawMaterial[]> {
  try {
    const res = await fetch(`${BASE_URL}/raw-materials`);
    if (!res.ok) throw new Error("Failed to fetch raw materials");
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
    return seedRawMaterials;
  } catch (error) {
    console.warn("Using fallback seedRawMaterials due to:", error);
    return seedRawMaterials;
  }
}

export async function getWarehouses(): Promise<Warehouse[]> {
  try {
    const token = localStorage.getItem("ff:token") || localStorage.getItem("token") || "";
    const res = await fetch(`${BASE_URL}/warehouses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return seedWarehouses;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : seedWarehouses;
  } catch (error) {
    console.warn("Error fetching warehouses, using fallback:", error);
    return seedWarehouses;
  }
}

export async function getStock(): Promise<StockItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/stock`);
    if (!res.ok) throw new Error("Failed to fetch stock");
    return await res.json();
  } catch (error) {
    console.warn("Error fetching stock:", error);
    return [];
  }
}

export async function getShipments(): Promise<Shipment[]> {
  try {
    const res = await fetch(`${BASE_URL}/shipments`);
    if (!res.ok) throw new Error("Failed to fetch shipments");
    return await res.json();
  } catch (error) {
    console.warn("Error fetching shipments:", error);
    return [];
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${BASE_URL}/products`);
    if (!res.ok) throw new Error("Failed to fetch products");
    return await res.json();
  } catch (error) {
    console.warn("Error fetching products:", error);
    return [];
  }
}

export async function getBoms(): Promise<Bom[]> {
  try {
    const res = await fetch(`${BASE_URL}/boms`);
    if (!res.ok) throw new Error("Failed to fetch boms");
    return await res.json();
  } catch (error) {
    console.warn("Error fetching boms:", error);
    return [];
  }
}

export async function postStockTransaction(tx: StockTransaction): Promise<StockTransaction> {
  try {
    const res = await fetch(`${BASE_URL}/stock/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tx),
    });
    if (!res.ok) throw new Error("Failed to post stock transaction");
    return await res.json();
  } catch (error) {
    console.warn("Using local transaction fallback due to:", error);
    return tx;
  }
}

export async function createShipmentApi(payload: { customer: string; address?: string; productName: string; quantity: number; eta: string }): Promise<Shipment | null> {
  try {
    const res = await fetch(`${BASE_URL}/shipments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create shipment");
    return await res.json();
  } catch (error) {
    console.warn("Could not sync shipment creation to DB:", error);
    return null;
  }
}

export async function deleteShipmentApi(id: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/shipments/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.warn("Could not sync shipment deletion to DB:", error);
  }
}

export async function updateShipmentStatusApi(id: string, status: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/shipments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    console.warn("Could not sync shipment status to DB:", error);
  }
}

export async function updateBomStatusApi(id: string, status: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/boms/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    console.warn("Could not sync BOM status to DB:", error);
  }
}

export async function createBomApi(bom: Bom): Promise<void> {
  try {
    await fetch(`${BASE_URL}/boms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bom),
    });
  } catch (error) {
    console.warn("Could not sync BOM creation to DB:", error);
  }
}

export async function deleteBomApi(id: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/boms/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.warn("Could not sync BOM deletion to DB:", error);
  }
}

export async function createProductApi(product: Partial<Product>): Promise<void> {
  try {
    await fetch(`${BASE_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_code: product.code,
        product_name: product.name,
      }),
    });
  } catch (error) {
    console.warn("Could not sync product to DB:", error);
  }
}

export async function deleteProductApi(id: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/products/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.warn("Could not sync product deletion to DB:", error);
  }
}

export interface PendingFGItem {
  transferID: string;
  finishedGoodsId: string;
  orderID: string;
  productName: string;
  quantity: number;
  palletNumber: string;
  status: string;
  createdBy: string;
  createDateTime: string;
  remark: string;
}

export async function getPendingFGTransfers(): Promise<PendingFGItem[]> {
  try {
    const token = localStorage.getItem("ff:token") || localStorage.getItem("token") || "";
    const res = await fetch("http://localhost:8080/api/production/transfers/pending-fg", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.warn("Could not fetch pending FG transfers:", error);
    return [];
  }
}

export async function receiveTransferApi(transferID: string, receivedBy = "เจ้าหน้าที่ฝ่ายคลังสินค้า"): Promise<boolean> {
  try {
    const token = localStorage.getItem("ff:token") || localStorage.getItem("token") || "";
    const res = await fetch(`http://localhost:8080/api/production/transfers/${transferID}/receive`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ receivedBy }),
    });
    return res.ok;
  } catch (error) {
    console.warn("Could not receive transfer:", error);
    return false;
  }
}

