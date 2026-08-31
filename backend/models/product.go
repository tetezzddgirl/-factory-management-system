package models

// Product คือสินค้า/ผลิตภัณฑ์สำเร็จรูปที่โรงงานผลิต (master data)
// ใช้ตอนสร้างแผนการผลิต/ใบสั่งผลิต เพื่อดึงชื่อ หน่วย และสูตรการผลิต (Formula) มาเติมให้อัตโนมัติ
type Product struct {
	ProductID string `json:"productID" gorm:"primaryKey;column:product_id"`
	Name      string `json:"name" gorm:"not null"`
	Unit      string `json:"unit" gorm:"default:ชิ้น"`
}
