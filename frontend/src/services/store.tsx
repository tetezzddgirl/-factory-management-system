import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Bom, BomStatus, Product, Shipment, StockItem, StockTransaction } from "@/interfaces";
import { StoreContext, type StoreValue } from "@/services/store-context";
import {
  createBomApi,
  createProductApi,
  createShipmentApi,
  deleteBomApi,
  deleteProductApi,
  deleteShipmentApi,
  getBoms,
  getProducts,
  getShipments,
  getStock,
  postStockTransaction,
  seedBoms,
  seedProducts,
  seedShipments,
  seedStock,
  seedTransactions,
  updateBomStatusApi,
  updateShipmentStatusApi,
} from "@/services/https/api";

const loadStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    if (Array.isArray(fallback) && fallback.length > 0 && Array.isArray(parsed) && parsed.length === 0) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
};

const saveStorage = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error saving ${key} to localStorage:`, err);
  }
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stock, setStock] = useState<StockItem[]>(() => loadStorage("ffm_stock", seedStock));
  const [transactions, setTransactions] = useState<StockTransaction[]>(() => loadStorage("ffm_txs", seedTransactions));
  const [shipments, setShipments] = useState<Shipment[]>(() => loadStorage("ffm_shipments", seedShipments));
  const [products, setProducts] = useState<Product[]>(() => loadStorage("ffm_products", seedProducts));
  const [boms, setBoms] = useState<Bom[]>(() => loadStorage("ffm_boms", seedBoms));

  // Sync state to localStorage whenever it changes
  useEffect(() => { saveStorage("ffm_stock", stock); }, [stock]);
  useEffect(() => { saveStorage("ffm_txs", transactions); }, [transactions]);
  useEffect(() => { saveStorage("ffm_shipments", shipments); }, [shipments]);
  useEffect(() => { saveStorage("ffm_products", products); }, [products]);
  useEffect(() => { saveStorage("ffm_boms", boms); }, [boms]);

  // ดึงข้อมูลจริงจาก PostgreSQL ทันทีที่เปิดหน้าเว็บ / รีเฟรช
  useEffect(() => {
    getStock().then((data) => {
      if (data && data.length > 0) {
        setStock(data);
      }
    });
    getShipments().then((data) => {
      if (data && data.length > 0) {
        setShipments((prev) => (prev.length === 0 ? data : prev));
      }
    });
    getProducts().then((data) => {
      if (data && data.length > 0) {
        setProducts((prev) => {
          if (prev.length === 0) return data;
          const map = new Map(prev.map((p) => [p.code.toLowerCase(), p]));
          for (const item of data) {
            if (!map.has(item.code.toLowerCase())) {
              map.set(item.code.toLowerCase(), item);
            }
          }
          return Array.from(map.values());
        });
      }
    });
    getBoms().then((data) => {
      if (data && data.length > 0) {
        setBoms((prev) => {
          if (prev.length === 0) return data;
          const map = new Map(prev.map((b) => [b.id.toLowerCase(), b]));
          for (const item of data) {
            if (!map.has(item.id.toLowerCase())) {
              map.set(item.id.toLowerCase(), item);
            }
          }
          return Array.from(map.values());
        });
      }
    });
  }, []);

  const submitTransaction = useCallback<StoreValue["submitTransaction"]>(
    (input) => {
      const qty = Math.abs(input.quantity);
      if (!input.code || !input.name || !qty) {
        return { ok: false, message: "กรุณากรอกรหัสสินค้า ชื่อสินค้า และจำนวนให้ครบถ้วน" };
      }
      const codeUpper = input.code.trim().toUpperCase();
      const targetWh = input.warehouseId || "";
      const existing = stock.find(
        (s) =>
          (s.code.trim().toUpperCase() === codeUpper ||
            s.name.trim().toLowerCase() === input.name.trim().toLowerCase()) &&
          (!targetWh || !s.warehouseId || s.warehouseId === targetWh),
      );

      if (input.type === "issue") {
        if (!existing || existing.quantity < qty) {
          return { ok: false, message: "สินค้าไม่เพียงพอในคลัง ไม่สามารถเบิกจ่ายได้" };
        }
        setStock((prev) =>
          prev.map((s) =>
            s.id === existing.id
              ? { ...s, quantity: s.quantity - qty }
              : s,
          ),
        );
      } else if (existing) {
        setStock((prev) =>
          prev.map((s) =>
            s.id === existing.id
              ? {
                  ...s,
                  quantity: s.quantity + qty,
                  location: input.location || s.location,
                  palette: input.palette || s.palette,
                  lot: input.lot || s.lot,
                  warehouseId: targetWh || s.warehouseId,
                  warehouseName: input.warehouseName || s.warehouseName,
                }
              : s,
          ),
        );
      } else {
        setStock((prev) => [
          ...prev,
          {
            id: `s${Date.now()}`,
            code: codeUpper,
            name: input.name,
            quantity: qty,
            unit: "ชิ้น",
            location: input.location || "A-01",
            palette: input.palette,
            lot: input.lot,
            warehouseId: targetWh || "WH-01",
            warehouseName: input.warehouseName || "คลังสินค้าสำเร็จรูป A (Main FG)",
          },
        ]);
      }

      const newTx: StockTransaction = {
        id: `t${Date.now()}`,
        type: input.type,
        code: input.code.toUpperCase(),
        name: input.name,
        quantity: qty,
        location: input.location,
        palette: input.palette,
        lot: input.lot,
        warehouseId: targetWh,
        warehouseName: input.warehouseName,
        remark: input.remark || "",
        createdAt: new Date().toLocaleString("th-TH"),
      };

      setTransactions((prev) => [newTx, ...prev]);

      // Call Backend API to persist transaction to PostgreSQL
      postStockTransaction(newTx)
        .then(() => {
          getStock().then((data) => {
            if (data && data.length > 0) setStock(data);
          });
        })
        .catch((err) => console.warn("Could not sync transaction to DB:", err));

      return {
        ok: true,
        message: input.type === "receive" ? "บันทึกการรับสินค้าเข้าคลังแล้ว" : "บันทึกการเบิกจ่ายสินค้าแล้ว",
      };
    },
    [stock],
  );

  const verifyShipment = useCallback((id: string) => {
    setShipments((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: "shipped", verifiedAt: new Date().toLocaleDateString("th-TH") }
          : s,
      ),
    );
    // ซิงค์สถานะจัดส่งไปยัง PostgreSQL Backend
    updateShipmentStatusApi(id, "shipped");
  }, []);

  const addShipment = useCallback<StoreValue["addShipment"]>((input) => {
    const newShip: Shipment = {
      id: `h${Date.now()}`,
      code: `SHP-${500 + Date.now() % 1000}`,
      customer: input.customer,
      productName: input.productName,
      quantity: input.quantity,
      eta: input.eta ? new Date(input.eta).toLocaleDateString("th-TH") : "รอกำหนด",
      status: "pending",
    };
    setShipments((prev) => [newShip, ...prev]);
    // ซิงค์ไปยัง PostgreSQL Backend
    createShipmentApi(input);
  }, []);

  const updateShipment = useCallback<StoreValue["updateShipment"]>((id, input) => {
    setShipments((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              customer: input.customer,
              productName: input.productName,
              quantity: input.quantity,
              eta: input.eta
                ? /^\d{4}-\d{2}-\d{2}$/.test(input.eta)
                  ? new Date(input.eta).toLocaleDateString("th-TH")
                  : input.eta
                : s.eta,
            }
          : s,
      ),
    );
  }, []);

  const deleteShipment = useCallback((id: string) => {
    setShipments((prev) => prev.filter((s) => s.id !== id));
    // ซิงค์การลบไปยัง PostgreSQL Backend
    deleteShipmentApi(id);
  }, []);

  const addBom = useCallback<StoreValue["addBom"]>((input) => {
    const bomId = `BOM-${String(Date.now()).slice(-3)}`;
    const parsedSteps = Array.isArray(input.steps)
      ? input.steps.map((s) => s.trim()).filter(Boolean)
      : input.steps
          .split("\n")
          .map((s) => s.trim().replace(/^(\d+[\.\)\-\s]+)/, "").trim())
          .filter(Boolean);

    const newBom: Bom = {
      id: bomId,
      code: bomId,
      productCode: input.productCode.toUpperCase(),
      productName: input.productName,
      version: input.version || "v1",
      category: input.category,
      materials: input.materials.map((m) => ({ name: m, amount: "-" })),
      steps: parsedSteps,
      machines: input.machines
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      status: "pending",
      updatedBy: "สมชาย (Planner)",
      updatedAt: new Date().toLocaleDateString("th-TH"),
    };
    setBoms((prev) => [newBom, ...prev]);
    // ซิงค์ไปยัง PostgreSQL Backend
    createBomApi(newBom);
  }, []);

  const updateBom = useCallback<StoreValue["updateBom"]>((id, input) => {
    let updatedBom: Bom | undefined;
    const parsedSteps = Array.isArray(input.steps)
      ? input.steps.map((s) => s.trim()).filter(Boolean)
      : input.steps
          .split("\n")
          .map((s) => s.trim().replace(/^(\d+[\.\)\-\s]+)/, "").trim())
          .filter(Boolean);

    setBoms((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          updatedBom = {
            ...b,
            productCode: input.productCode.toUpperCase(),
            productName: input.productName,
            version: input.version || b.version,
            category: input.category,
            materials: input.materials.map((m) => ({ name: m, amount: "-" })),
            steps: parsedSteps,
            machines: input.machines
              .split(",")
              .map((m) => m.trim())
              .filter(Boolean),
            status: "pending", // ส่งไปขออนุมัติใหม่
            updatedBy: "สมชาย (Planner)",
            updatedAt: new Date().toLocaleDateString("th-TH"),
          };
          return updatedBom;
        }
        return b;
      }),
    );
    if (updatedBom) {
      createBomApi(updatedBom);
    }
    // ซิงค์สถานะ pending ไปยัง Backend
    updateBomStatusApi(id, "pending");
  }, []);

  const deleteBom = useCallback((id: string) => {
    setBoms((prev) => prev.filter((b) => b.id !== id));
    deleteBomApi(id);
  }, []);

  const setBomStatus = useCallback(
    (id: string, status: BomStatus) => {
      setBoms((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                status,
                updatedBy: "จันทร์เพ็ญ (QC)",
                updatedAt: new Date().toLocaleDateString("th-TH"),
              }
            : b,
        ),
      );

      // ซิงค์สถานะ BOM (อนุมัติ/ไม่อนุมัติ) ไปยัง PostgreSQL Backend
      updateBomStatusApi(id, status);
    },
    [],
  );

  const addProduct = useCallback<StoreValue["addProduct"]>((input) => {
    const newProduct: Product = {
      id: `p${Date.now()}`,
      code: input.code.toUpperCase(),
      name: input.name,
      category: input.category,
      bomVersion: input.bomVersion || "v1",
    };
    setProducts((prev) => [...prev, newProduct]);
    // ซิงค์สินค้าใหม่ไปยัง PostgreSQL Backend
    createProductApi(newProduct);
  }, []);

  const updateProduct = useCallback<StoreValue["updateProduct"]>((id, input) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              code: input.code.toUpperCase(),
              name: input.name,
              category: input.category,
              bomVersion: input.bomVersion || p.bomVersion,
            }
          : p,
      ),
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    // ซิงค์การลบสินค้าไปยัง PostgreSQL Backend
    deleteProductApi(id);
  }, []);

  const value = useMemo(
    () => ({
      stock,
      transactions,
      shipments,
      products,
      boms,
      submitTransaction,
      verifyShipment,
      addShipment,
      updateShipment,
      deleteShipment,
      addBom,
      updateBom,
      deleteBom,
      setBomStatus,
      addProduct,
      updateProduct,
      deleteProduct,
    }),
    [
      stock,
      transactions,
      shipments,
      products,
      boms,
      submitTransaction,
      verifyShipment,
      addShipment,
      updateShipment,
      deleteShipment,
      addBom,
      updateBom,
      deleteBom,
      setBomStatus,
      addProduct,
      updateProduct,
      deleteProduct,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
