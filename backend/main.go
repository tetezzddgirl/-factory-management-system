package main

import (
	"log"

	"factoryflow/config"
	"factoryflow/database"
	"factoryflow/handlers"
	"factoryflow/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal(err)
	}

	if err := database.Migrate(db); err != nil {
		log.Fatal(err)
	}

	secret := []byte(cfg.JWTSecret)
	authHandler := handlers.NewAuthHandler(db, secret)
	machineHandler := handlers.NewMachineHandler(db)
	productionLineHandler := handlers.NewProductionLineHandler(db)
	planningHandler := handlers.NewPlanningHandler(db)
	productHandler := handlers.NewProductHandler(db)
	formulaHandler := handlers.NewFormulaHandler(db)
	warehouseHandler := handlers.NewWarehouseHandler(db)
	personnelHandler := handlers.NewPersonnelHandler(db)
	issueHandler := handlers.NewIssueHandler(db)
	wipHandler := handlers.NewWipHandler(db)
	workOrderHandler := handlers.NewWorkOrderHandler(db)

	productionHandler := handlers.NewProductionHandler(db)
	qualityHandler := handlers.NewQualityHandler(db)

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"ok": true}) })
	r.POST("/auth/signup", authHandler.Signup)
	r.POST("/auth/login", authHandler.Login)

	api := r.Group("/api")
	api.Use(middleware.Auth(secret))
	{
		api.GET("/machines", machineHandler.ListMachines)
		api.POST("/machines", machineHandler.CreateMachine)

		// สายการผลิต (Production Lines) — ใช้เป็นตัวเลือก dropdown ตอนสร้างแผนการผลิต/ใบสั่งผลิต
		api.GET("/production-lines", productionLineHandler.ListProductionLines)
		api.POST("/production-lines", productionLineHandler.CreateProductionLine)

		// ระบบวางแผนการผลิต (Production Planning)
		api.GET("/plans", planningHandler.ListPlans)
		api.POST("/plans", planningHandler.CreatePlan)
		api.PUT("/plans/:id", planningHandler.UpdatePlanProgress)
		api.GET("/plans/next-id", planningHandler.PreviewNextPlanID)

		// สินค้า/ผลิตภัณฑ์ + สูตรการผลิต (Product & Formula/BOM master data) — ใช้ตอนสร้างแผนการผลิต/ใบสั่งผลิต
		api.GET("/products", productHandler.ListProducts)
		api.POST("/products", productHandler.CreateProduct)
		api.GET("/formulas", formulaHandler.ListFormulas)
		api.POST("/formulas", formulaHandler.CreateFormulaItem)
		api.GET("/formulas/steps", formulaHandler.ListFormulaSteps)
		api.POST("/formulas/steps", formulaHandler.CreateFormulaStep)

		// ระบบคลังสินค้า/วัตถุดิบ (Warehouse & Inventory)
		api.GET("/materials", warehouseHandler.ListRawMaterials)
		api.POST("/materials", warehouseHandler.CreateMaterial)
		api.PUT("/materials/:rmID", warehouseHandler.UpdateStock)
		api.GET("/materials/:rmID/detail", warehouseHandler.GetRawMaterial)

		// ตำแหน่งจัดเก็บวัตถุดิบ (RawMaterialLocation)
		api.GET("/materials/locations", warehouseHandler.ListLocations)
		api.POST("/materials/locations", warehouseHandler.CreateLocation)
		api.PUT("/materials/locations/:id", warehouseHandler.UpdateLocation)
		api.GET("/materials/locations/next-code", warehouseHandler.PreviewNextLocationCodes)

		// ประวัติรายการเคลื่อนไหววัตถุดิบ (RawMaterialRecord)
		api.GET("/materials/records", warehouseHandler.ListRecords)
		api.POST("/materials/records", warehouseHandler.CreateRecord)

		// บุคลากร (Personnel)
		api.GET("/personnel", personnelHandler.ListPersonnel)
		api.POST("/personnel", personnelHandler.CreatePersonnel)
		api.PUT("/personnel/:id", personnelHandler.UpdatePersonnelStatus)

		// ปัญหาการผลิต (Issues)
		api.GET("/issues", issueHandler.ListIssues)
		api.POST("/issues", issueHandler.CreateIssue)
		api.PUT("/issues/:id", issueHandler.UpdateIssue)

		// สินค้าระหว่างผลิต (Work In Process)
		api.GET("/wip", wipHandler.ListWorkInProcess)
		api.POST("/wip", wipHandler.CreateWorkInProcess)
		api.PUT("/wip/:wipID", wipHandler.UpdateWorkInProcessAmount)
		api.GET("/wip/:wipID/detail", wipHandler.GetWorkInProcess)

		api.GET("/wip/locations", wipHandler.ListWipLocations)
		api.POST("/wip/locations", wipHandler.CreateWipLocation)
		api.PUT("/wip/locations/:id", wipHandler.UpdateWipLocation)
		api.GET("/wip/locations/next-code", wipHandler.PreviewNextLocationCodes)

		api.GET("/wip/records", wipHandler.ListWipRecords)
		api.POST("/wip/records", wipHandler.CreateWipRecord)

		api.GET("/wip/requisitions", wipHandler.ListRequisitionSlips)
		api.POST("/wip/requisitions", wipHandler.CreateRequisitionSlip)

		// ใบสั่งผลิต (Work Orders / Production Orders)
		api.GET("/work-orders", workOrderHandler.ListWorkOrders)
		api.POST("/work-orders", workOrderHandler.CreateWorkOrder)
		api.PUT("/work-orders/:id", workOrderHandler.UpdateWorkOrderStatus)
		api.GET("/work-orders/:id/detail", workOrderHandler.GetWorkOrder)
		api.GET("/work-orders/next-id", workOrderHandler.PreviewNextOrderID)

		api.GET("/work-orders/work", workOrderHandler.ListWork)
		api.POST("/work-orders/work", workOrderHandler.CreateWork)
		api.DELETE("/work-orders/work/:id", workOrderHandler.DeleteWork)
		api.PUT("/work-orders/work/:id", workOrderHandler.UpdateWork)

		// Production
		api.GET("/production/orders", productionHandler.ListOrders)
		api.GET("/production/orders/:id", productionHandler.GetOrderByID)
		api.POST("/production/orders", productionHandler.CreateOrder)
		api.PATCH("/production/orders/:id/status", productionHandler.UpdateOrderStatus)
		api.GET("/production/orders/:id/status-history", productionHandler.GetStatusHistoryByOrderID)

		api.GET("/production/orders/:id/events", productionHandler.GetEventsByOrderID)
		api.POST("/production/events", productionHandler.CreateEvent)

		api.GET("/production/orders/:id/reports", productionHandler.GetReportsByOrderID)
		api.POST("/production/reports", productionHandler.CreateReport)
		api.PATCH("/production/reports/:reportId", productionHandler.UpdateReport)

		api.GET("/production/orders/:id/transfers", productionHandler.GetTransfersByOrderID)
		api.POST("/production/transfers", productionHandler.CreateTransfer)

		api.DELETE("/production/transfers/:id", productionHandler.DeleteTransfer)

		// Quality
		api.GET("/quality/requirements", qualityHandler.ListRequirements)
		api.POST("/quality/requirements", qualityHandler.CreateRequirement)

		api.POST("/quality/points", qualityHandler.CreatePoint)
		api.GET("/quality/orders/:id/points", qualityHandler.GetPointsByOrderID)

		api.POST("/quality/inspections", qualityHandler.CreateInspection)
		api.GET("/quality/points/:pointId/inspections", qualityHandler.GetInspectionsByPointID)
		api.GET("/quality/orders/:id/inspections", qualityHandler.GetInspectionsByOrderID)
		api.POST("/quality/corrections", qualityHandler.CreateCorrection)
		
		api.GET("/quality/inspections/:id", qualityHandler.GetInspectionByID)
		api.GET("/quality/inspections/:id/items", qualityHandler.GetInspectionItems)
		api.GET("/quality/corrections/inspection/:inspectionId", qualityHandler.GetCorrectionByInspectionID)

	}

	log.Println("listening on :" + cfg.ServerPort)
	log.Fatal(r.Run(":" + cfg.ServerPort))
}
