package routes

import (
	"github.com/gin-gonic/gin"
	"factoryflow/sf_module/handlers"
)

func SetupRoutes(r *gin.RouterGroup) {
	api := r.Group("/sf")
	{
		api.GET("/raw-materials", handlers.GetRawMaterials)
		api.POST("/raw-materials", handlers.CreateRawMaterial)
		api.GET("/warehouses", handlers.GetWarehouses)
		api.GET("/stock", handlers.GetStock)
		api.POST("/stock/transactions", handlers.PostStockTransaction)
		api.GET("/shipments", handlers.GetShipments)
		api.POST("/shipments", handlers.CreateShipment)
		api.PATCH("/shipments/:id/status", handlers.UpdateShipmentStatus)
		api.DELETE("/shipments/:id", handlers.DeleteShipment)
		api.GET("/products", handlers.GetProducts)
		api.POST("/products", handlers.CreateProduct)
		api.DELETE("/products/:id", handlers.DeleteProduct)
		api.GET("/boms", handlers.GetBoms)
		api.POST("/boms", handlers.CreateBom)
		api.PATCH("/boms/:id/status", handlers.UpdateBomStatus)
		api.DELETE("/boms/:id", handlers.DeleteBom)
		api.GET("/customers", handlers.GetCustomers)
		api.POST("/customers", handlers.CreateCustomer)
		api.GET("/orders", handlers.GetOrders)
		api.POST("/orders", handlers.CreateOrder)
	}
}
