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
	warehouseHandler := handlers.NewWarehouseHandler(db)
	personnelHandler := handlers.NewPersonnelHandler(db)
	issueHandler := handlers.NewIssueHandler(db)
	wipHandler := handlers.NewWipHandler(db)
	workOrderHandler := handlers.NewWorkOrderHandler(db)

	productionHandler := handlers.NewProductionHandler(db)

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
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
	}

	log.Println("listening on :" + cfg.ServerPort)
	log.Fatal(r.Run(":" + cfg.ServerPort))
}
