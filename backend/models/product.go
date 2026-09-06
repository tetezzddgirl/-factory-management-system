package models

// Product คือสินค้า/ผลิตภัณฑ์สำเร็จรูปที่โรงงานผลิต (master data)
// ใช้ตอนสร้างแผนการผลิต/ใบสั่งผลิต เพื่อดึงชื่อ หน่วย และสูตรการผลิต (Formula) มาเติมให้อัตโนมัติ
type Product struct {
	ProductID 		string `json:"product_id" gorm:"primaryKey;column:product_id"`
	ProductName     string `json:"product_name"`
	//Unit      string `json:"unit" gorm:"default:ชิ้น"`
}
