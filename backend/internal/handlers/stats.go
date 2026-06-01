package handlers

import (
	"shelfspot-backend/internal/database"
	"shelfspot-backend/internal/models"
	"shelfspot-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type StatsResponse struct {
	TotalItems       int64                    `json:"total_items"`
	IdleCount        int64                    `json:"idle_count"`
	IdleRate         float64                  `json:"idle_rate"`
	CategoryStats    []CategoryStat           `json:"category_stats"`
	HouseStats       []SpaceStat              `json:"house_stats"`
	RoomStats        []SpaceStat              `json:"room_stats"`
	IdleItems        []models.Item            `json:"idle_items,omitempty"`
}

type CategoryStat struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Count    int64   `json:"count"`
	Ratio    float64 `json:"ratio"`
	ParentID string  `json:"parent_id,omitempty"`
}

type SpaceStat struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

type StatsHandler struct{}

func NewStatsHandler() *StatsHandler {
	return &StatsHandler{}
}

func (h *StatsHandler) GetOverview(c *gin.Context) {
	var totalItems int64
	database.GetDB().Model(&models.Item{}).Count(&totalItems)

	var idleCount int64
	database.GetDB().Model(&models.Item{}).Where("is_idle = ?", true).Count(&idleCount)

	idleRate := 0.0
	if totalItems > 0 {
		idleRate = float64(idleCount) / float64(totalItems) * 100
	}

	var categories []models.Category
	database.GetDB().Where("parent_id IS NULL").Preload("Children").Find(&categories)

	categoryStats := make([]CategoryStat, 0)
	for _, cat := range categories {
		var count int64
		database.GetDB().Model(&models.Item{}).Where("category_id = ?", cat.ID).Count(&count)

		for _, child := range cat.Children {
			var childCount int64
			database.GetDB().Model(&models.Item{}).Where("category_id = ?", child.ID).Count(&childCount)
			count += childCount
		}

		ratio := 0.0
		if totalItems > 0 {
			ratio = float64(count) / float64(totalItems) * 100
		}

		categoryStats = append(categoryStats, CategoryStat{
			ID:    cat.ID.String(),
			Name:  cat.Name,
			Count: count,
			Ratio: ratio,
		})
	}

	var houses []models.House
	database.GetDB().Find(&houses)

	houseStats := make([]SpaceStat, 0)
	for _, house := range houses {
		var count int64
		database.GetDB().Model(&models.Item{}).
			Joins("JOIN containers ON items.container_id = containers.id").
			Joins("JOIN rooms ON containers.room_id = rooms.id").
			Where("rooms.house_id = ?", house.ID).
			Count(&count)
		houseStats = append(houseStats, SpaceStat{
			ID:    house.ID.String(),
			Name:  house.Name,
			Count: count,
		})
	}

	var rooms []models.Room
	database.GetDB().Find(&rooms)

	roomStats := make([]SpaceStat, 0)
	for _, room := range rooms {
		var count int64
		database.GetDB().Model(&models.Item{}).
			Joins("JOIN containers ON items.container_id = containers.id").
			Where("containers.room_id = ?", room.ID).
			Count(&count)
		roomStats = append(roomStats, SpaceStat{
			ID:    room.ID.String(),
			Name:  room.Name,
			Count: count,
		})
	}

	if categoryStats == nil {
		categoryStats = make([]CategoryStat, 0)
	}
	if houseStats == nil {
		houseStats = make([]SpaceStat, 0)
	}
	if roomStats == nil {
		roomStats = make([]SpaceStat, 0)
	}

	stats := StatsResponse{
		TotalItems:    totalItems,
		IdleCount:     idleCount,
		IdleRate:      idleRate,
		CategoryStats: categoryStats,
		HouseStats:    houseStats,
		RoomStats:     roomStats,
	}

	utils.Success(c, stats)
}

func (h *StatsHandler) GetIdleItems(c *gin.Context) {
	categoryID := c.Query("category_id")

	db := database.GetDB().Preload("Category").Preload("Container.Room.House").
		Where("is_idle = ?", true).
		Order("created_at DESC")

	if categoryID != "" {
		db = db.Where("category_id = ?", categoryID)
	}

	items := make([]models.Item, 0)
	if err := db.Find(&items).Error; err != nil {
		utils.ErrorInternal(c, "Failed to get idle items: "+err.Error())
		return
	}

	for i := range items {
		items[i].FullPath = buildFullPath(items[i])
	}

	if items == nil {
		items = make([]models.Item, 0)
	}

	utils.Success(c, items)
}

type PieItem struct {
	Name  string `json:"name"`
	Value int64  `json:"value"`
}

func (h *StatsHandler) GetCategoryPieChart(c *gin.Context) {
	var totalItems int64
	database.GetDB().Model(&models.Item{}).Count(&totalItems)

	var categories []models.Category
	database.GetDB().Where("parent_id IS NULL").Preload("Children").Find(&categories)

	pieData := make([]PieItem, 0)
	for _, cat := range categories {
		var count int64
		database.GetDB().Model(&models.Item{}).Where("category_id = ?", cat.ID).Count(&count)

		for _, child := range cat.Children {
			var childCount int64
			database.GetDB().Model(&models.Item{}).Where("category_id = ?", child.ID).Count(&childCount)
			count += childCount
		}

		pieData = append(pieData, PieItem{
			Name:  cat.Name,
			Value: count,
		})
	}

	if pieData == nil {
		pieData = make([]PieItem, 0)
	}

	utils.Success(c, pieData)
}
