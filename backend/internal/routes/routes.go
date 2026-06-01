package routes

import (
	"shelfspot-backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	healthHandler := handlers.NewHealthHandler()
	houseHandler := handlers.NewHouseHandler()
	roomHandler := handlers.NewRoomHandler()
	containerHandler := handlers.NewContainerHandler()
	categoryHandler := handlers.NewCategoryHandler()
	itemHandler := handlers.NewItemHandler()
	reminderHandler := handlers.NewReminderHandler()
	movingHandler := handlers.NewMovingHandler()
	statsHandler := handlers.NewStatsHandler()

	api := r.Group("/api")
	{
		api.GET("/health", healthHandler.HealthCheck)

		houses := api.Group("/houses")
		{
			houses.POST("", houseHandler.Create)
			houses.GET("", houseHandler.List)
			houses.GET("/:id", houseHandler.Get)
			houses.PUT("/:id", houseHandler.Update)
			houses.DELETE("/:id", houseHandler.Delete)
		}

		rooms := api.Group("/rooms")
		{
			rooms.POST("", roomHandler.Create)
			rooms.GET("", roomHandler.List)
			rooms.GET("/:id", roomHandler.Get)
			rooms.PUT("/:id", roomHandler.Update)
			rooms.DELETE("/:id", roomHandler.Delete)
			rooms.GET("/:id/tree", roomHandler.GetTree)
		}

		containers := api.Group("/containers")
		{
			containers.POST("", containerHandler.Create)
			containers.GET("", containerHandler.List)
			containers.GET("/:id", containerHandler.Get)
			containers.PUT("/:id", containerHandler.Update)
			containers.DELETE("/:id", containerHandler.Delete)
			containers.GET("/:id/tree", containerHandler.GetTree)
		}

		api.GET("/tree", houseHandler.GetTree)

		categories := api.Group("/categories")
		{
			categories.POST("", categoryHandler.Create)
			categories.GET("", categoryHandler.List)
			categories.GET("/:id", categoryHandler.Get)
			categories.PUT("/:id", categoryHandler.Update)
			categories.DELETE("/:id", categoryHandler.Delete)
			categories.GET("/tree", categoryHandler.GetTree)
		}

		items := api.Group("/items")
		{
			items.POST("", itemHandler.Create)
			items.GET("", itemHandler.List)
			items.GET("/search", itemHandler.Search)
			items.GET("/:id", itemHandler.Get)
			items.PUT("/:id", itemHandler.Update)
			items.DELETE("/:id", itemHandler.Delete)
			items.PATCH("/:id/idle", itemHandler.ToggleIdle)
			items.PATCH("/:id/expiry-handled", itemHandler.MarkExpiryHandled)
			items.POST("/:id/photos", itemHandler.UploadPhotos)
			items.POST("/import", itemHandler.ImportCSV)
		}

		reminders := api.Group("/reminders")
		{
			reminders.GET("", reminderHandler.GetExpiringItems)
			reminders.PATCH("/:id/handled", reminderHandler.MarkHandled)
		}

		moving := api.Group("/moving")
		{
			moving.POST("/generate", movingHandler.GenerateList)
			moving.POST("/export", movingHandler.ExportCSV)
		}

		stats := api.Group("/stats")
		{
			stats.GET("/overview", statsHandler.GetOverview)
			stats.GET("/idle-items", statsHandler.GetIdleItems)
			stats.GET("/category-pie", statsHandler.GetCategoryPieChart)
		}
	}
}
