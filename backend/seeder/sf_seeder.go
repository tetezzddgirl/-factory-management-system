package main

import (
	"time"

	sf_models "factoryflow/sf_module/models"

	"gorm.io/gorm"
)

// SeedSF ใส่ข้อมูลตัวอย่างสำหรับระบบ Stock & Formula
func SeedSF(db *gorm.DB) {
	// 1. Units of Measure
	units := []sf_models.UnitOfMeasure{
		{UnitID: "U-01", UnitName: "กิโลกรัม", UnitSymbol: "kg", Description: "กิโลกรัม (น้ำหนัก)"},
		{UnitID: "U-02", UnitName: "ชิ้น", UnitSymbol: "pcs", Description: "ชิ้น (จำนวนนับ)"},
		{UnitID: "U-03", UnitName: "ขวด", UnitSymbol: "bottle", Description: "ขวด (บรรจุภัณฑ์)"},
		{UnitID: "U-04", UnitName: "ม้วน", UnitSymbol: "roll", Description: "ม้วน (ฟิล์ม/ฉลาก)"},
		{UnitID: "U-05", UnitName: "ลัง", UnitSymbol: "box", Description: "ลังบรรจุภัณฑ์"},
	}
	upsert(db, "unit_id", units)

	// 2. Product Categories
	categories := []sf_models.ProductCategory{
		{ProductCategoryID: "CAT-01", CategoryName: "บรรจุภัณฑ์", Description: "ผลิตภัณฑ์ขวด ฝา ลังบรรจุภัณฑ์"},
		{ProductCategoryID: "CAT-02", CategoryName: "วัสดุพิมพ์", Description: "ฉลาก ฟิล์มหด สติกเกอร์"},
		{ProductCategoryID: "CAT-03", CategoryName: "วัตถุดิบ", Description: "เม็ดพลาสติกและสารเติมแต่ง"},
	}
	upsert(db, "product_category_id", categories)

	// 3. Customers
	customers := []sf_models.Customer{
		{CustomerID: 1, CustomerName: "บจก. สยามวอเตอร์ เบฟเวอเรจ (น้ำดื่ม A)", Phone: "02-123-4567", Email: "contact@siamwater.com", Address: "123 ถ.วิภาวดีรังสิต แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900"},
		{CustomerID: 2, CustomerName: "บจก. กรีนเบฟ ดริ้งค์ (เครื่องดื่ม B)", Phone: "02-987-6543", Email: "info@greenbev.co.th", Address: "88 หมู่ 3 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120"},
		{CustomerID: 3, CustomerName: "บมจ. ไทยแพ็คเกจจิ้ง แอนด์ ลอจิสติกส์ (บรรจุภัณฑ์ C)", Phone: "02-555-8888", Email: "sales@thaipack.co.th", Address: "99/1 นิคมอุตสาหกรรมบางปู จ.สมุทรปราการ 10280"},
		{CustomerID: 4, CustomerName: "บจก. พลัสไดรฟ์ ฟู้ดแอนด์เบฟเวอเรจ", Phone: "038-234-5678", Email: "procurement@plusdrive.co.th", Address: "45/2 นิคมฯ อมตะซิตี้ ต.ดอนหัวฬ่อ อ.เมือง จ.ชลบุรี 20000"},
		{CustomerID: 5, CustomerName: "บจก. ออร์แกนิค ซันไชน์ ฟาร์ม", Phone: "053-890-1234", Email: "supply@organicsun.com", Address: "210 ถ.โชตนา ต.ช้างเผือก อ.เมือง จ.เชียงใหม่ 50300"},
	}
	upsert(db, "customer_id", customers)

	// 4. Raw Materials
	rawMaterials := []sf_models.RawMaterial{
		{RawMaterialID: "RM-001", MaterialCode: "RM-001", MaterialName: "เม็ดพลาสติก PET Resin (เกรดใส)", Quantity: 25000, UnitID: "U-01"},
		{RawMaterialID: "RM-002", MaterialCode: "RM-002", MaterialName: "เม็ดพลาสติก HDPE (เกรดเป่าขวดทึบ)", Quantity: 18000, UnitID: "U-01"},
		{RawMaterialID: "RM-003", MaterialCode: "RM-003", MaterialName: "เม็ดพลาสติก PP Copolymer (เกรดทำฝา)", Quantity: 12000, UnitID: "U-01"},
		{RawMaterialID: "RM-004", MaterialCode: "RM-004", MaterialName: "เม็ดพลาสติก LDPE (เกรดฟิล์ม)", Quantity: 8500, UnitID: "U-01"},
		{RawMaterialID: "RM-005", MaterialCode: "RM-005", MaterialName: "สีมาสเตอร์แบทช์ สีฟ้า (Blue MB)", Quantity: 450, UnitID: "U-01"},
		{RawMaterialID: "RM-006", MaterialCode: "RM-006", MaterialName: "สีมาสเตอร์แบทช์ สีเขียว (Green MB)", Quantity: 300, UnitID: "U-01"},
		{RawMaterialID: "RM-007", MaterialCode: "RM-007", MaterialName: "สีมาสเตอร์แบทช์ สีขาวมุก (White MB)", Quantity: 650, UnitID: "U-01"},
		{RawMaterialID: "RM-008", MaterialCode: "RM-008", MaterialName: "สารเพิ่มความลื่น (Slip Agent)", Quantity: 150, UnitID: "U-01"},
		{RawMaterialID: "RM-009", MaterialCode: "RM-009", MaterialName: "สารป้องกันรังสียูวี (UV Stabilizer)", Quantity: 120, UnitID: "U-01"},
		{RawMaterialID: "RM-010", MaterialCode: "RM-010", MaterialName: "ฝาเกลียวสำเร็จรูป 28mm (Short Neck)", Quantity: 85000, UnitID: "U-02"},
	}
	upsert(db, "raw_material_id", rawMaterials)

	// 5. Products
	products := []sf_models.Product{
		{ProductID: "P-001", ProductCode: "P-001", ProductName: "ขวด PET 500ml", Size: "500ml", SellingPrice: 1.85, Description: "ขวดพลาสติก PET ใส ขนาด 500ml", ProductCategoryID: "CAT-01", UnitID: "U-03"},
		{ProductID: "P-002", ProductCode: "P-002", ProductName: "ฝาเกลียว 28mm", Size: "28mm", SellingPrice: 0.45, Description: "ฝาเกลียวพลาสติก Short Neck 28mm", ProductCategoryID: "CAT-01", UnitID: "U-02"},
		{ProductID: "P-003", ProductCode: "P-003", ProductName: "ขวด HDPE 1L", Size: "1000ml", SellingPrice: 3.20, Description: "ขวดพลาสติก HDPE ทึบ ขนาด 1 ลิตร", ProductCategoryID: "CAT-01", UnitID: "U-03"},
		{ProductID: "P-004", ProductCode: "P-004", ProductName: "ฉลากฟิล์มหด", Size: "500ml-Std", SellingPrice: 0.25, Description: "ม้วนฉลากพิมพ์ฟิล์มหด Shrink Film", ProductCategoryID: "CAT-02", UnitID: "U-04"},
		{ProductID: "P-005", ProductCode: "P-005", ProductName: "ลังกระดาษ 12 ช่อง", Size: "24x36x25cm", SellingPrice: 8.50, Description: "กล่องลูกฟูก 5 ชั้น สำหรับบรรจุ 12 ขวด", ProductCategoryID: "CAT-01", UnitID: "U-05"},
	}
	upsert(db, "product_id", products)

	// 6. Formulas (BOM)
	now := time.Now()
	formulas := []sf_models.Formula{
		{FormulaID: "BOM-001", FormulaName: "สูตรผลิตขวด PET 500ml มาตรฐาน", Version: 3, EffectiveDate: now, Status: true, Description: "สูตรมาตรฐานสำหรับขวดน้ำดื่มขนาด 500 มล.", Steps: "1. อบไล่ความชื้นเม็ด PET\n2. ฉีดขึ้นรูปพรีฟอร์ม (Preform Injection)\n3. เป่าขวดด้วยความร้อนสูง (Stretch Blow Molding)\n4. ตรวจสอบขนาดและความหนาขวด (Quality Check)", ProductID: "P-001"},
		{FormulaID: "BOM-002", FormulaName: "สูตรผลิตฝาเกลียว 28mm", Version: 2, EffectiveDate: now, Status: true, Description: "สูตรการฉีดฝาเกลียวพลาสติก PP", Steps: "1. ผสมเม็ดพลาสติก PP กับ Masterbatch\n2. ฉีดขึ้นรูปฝาด้วยเครื่อง Injection Molding\n3. ตัดขอบและขึ้นเกลียว (Slitting & Folding)\n4. ตรวจสอบการรั่วซึมและการเปิดฝา", ProductID: "P-002"},
		{FormulaID: "BOM-003", FormulaName: "สูตรผลิตขวด HDPE 1L", Version: 1, EffectiveDate: now, Status: true, Description: "สูตรผลิตขวดทึบขนาด 1 ลิตร", Steps: "1. ผสมเม็ด HDPE และสีขาวมุก\n2. เป่าขึ้นรูปขวด Extrusion Blow Molding\n3. ตัดแต่งครีบส่วนเกิน\n4. ตรวจสอบปริมาตรและน้ำหนัก", ProductID: "P-003"},
	}
	upsert(db, "formula_id", formulas)

	// 7. Warehouses (Mockup 4 คลัง)
	warehouses := []sf_models.Warehouse{
		{WarehouseID: "WH-01", WarehouseName: "คลังสินค้าสำเร็จรูป A (Main FG)", Location: "อาคาร A ชั้น 1 (Zone A - ขวด PET)", Capacity: 50000},
		{WarehouseID: "WH-02", WarehouseName: "คลังสินค้าสำเร็จรูป B (Secondary FG)", Location: "อาคาร A ชั้น 2 (Zone B - ขวด HDPE & ฝา)", Capacity: 35000},
		{WarehouseID: "WH-03", WarehouseName: "คลังสินค้าพักรอส่ง (Transit Hub)", Location: "ลานโหลดสินค้า อาคาร B (Loading Bay 1-3)", Capacity: 20000},
		{WarehouseID: "WH-04", WarehouseName: "คลังสินค้ารองรับการส่งออกและสำรอง (Buffer)", Location: "อาคาร C (Buffer Storage)", Capacity: 30000},
	}
	upsert(db, "warehouse_id", warehouses)

	// 8. Inventories (สต็อกเริ่มต้นกระจายตามคลัง)
	inventories := []sf_models.Inventory{
		{InventoryID: "s1", ProductID: "P-001", WarehouseID: "WH-01", Quantity: 18392, LastUpdated: now},
		{InventoryID: "s2", ProductID: "P-002", WarehouseID: "WH-02", Quantity: 45000, LastUpdated: now},
		{InventoryID: "s3", ProductID: "P-003", WarehouseID: "WH-02", Quantity: 3120, LastUpdated: now},
		{InventoryID: "s4", ProductID: "P-001", WarehouseID: "WH-03", Quantity: 5000, LastUpdated: now},
		{InventoryID: "s5", ProductID: "P-003", WarehouseID: "WH-04", Quantity: 9240, LastUpdated: now},
	}
	upsert(db, "inventory_id", inventories)
}
