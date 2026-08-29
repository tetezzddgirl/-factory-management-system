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
	planningHandler := handlers.NewPlanningHandler(db)
	productHandler := handlers.NewProductHandler(db)
	formulaHandler := handlers.NewFormulaHandler(db)
	warehouseHandler := handlers.NewWarehouseHandler(db)
	personnelHandler := handlers.NewPersonnelHandler(db)
	issueHandler := handlers.NewIssueHandler(db)
	wipHandler := handlers.NewWipHandler(db)
	workOrderHandler := handlers.NewWorkOrderHandler(db)

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
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

		// ระบบวางแผนการผลิต (Production Planning)
		api.GET("/plans", planningHandler.ListPlans)
		api.POST("/plans", planningHandler.CreatePlan)
		api.PUT("/plans/:id", planningHandler.UpdatePlanProgress)

		// สินค้า/ผลิตภัณฑ์ + สูตรการผลิต (Product & Formula/BOM master data) — ใช้ตอนสร้างแผนการผลิต/ใบสั่งผลิต
		api.GET("/products", productHandler.ListProducts)
		api.POST("/products", productHandler.CreateProduct)
		api.GET("/formulas", formulaHandler.ListFormulas)
		api.POST("/formulas", formulaHandler.CreateFormulaItem)

		// ระบบคลังสินค้า/วัตถุดิบ (Warehouse & Inventory)
		api.GET("/materials", warehouseHandler.ListRawMaterials)
		api.POST("/materials", warehouseHandler.CreateMaterial)
		api.PUT("/materials/:rmID", warehouseHandler.UpdateStock)

		// ตำแหน่งจัดเก็บวัตถุดิบ (RawMaterialLocation)
		api.GET("/materials/locations", warehouseHandler.ListLocations)
		api.POST("/materials/locations", warehouseHandler.CreateLocation)
		api.PUT("/materials/locations/:id", warehouseHandler.UpdateLocation)

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

		api.GET("/wip/locations", wipHandler.ListWipLocations)
		api.POST("/wip/locations", wipHandler.CreateWipLocation)

		api.GET("/wip/records", wipHandler.ListWipRecords)
		api.POST("/wip/records", wipHandler.CreateWipRecord)

		api.GET("/wip/requisitions", wipHandler.ListRequisitionSlips)
		api.POST("/wip/requisitions", wipHandler.CreateRequisitionSlip)

		// ใบสั่งผลิต (Work Orders / Production Orders)
		api.GET("/work-orders", workOrderHandler.ListWorkOrders)
		api.POST("/work-orders", workOrderHandler.CreateWorkOrder)
		api.PUT("/work-orders/:id", workOrderHandler.UpdateWorkOrderStatus)

		api.GET("/work-orders/work", workOrderHandler.ListWork)
		api.POST("/work-orders/work", workOrderHandler.CreateWork)
	}

	log.Println("listening on :" + cfg.ServerPort)
	log.Fatal(r.Run(":" + cfg.ServerPort))
}
