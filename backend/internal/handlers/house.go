package handlers

import (
	"shelfspot-backend/internal/database"
	"shelfspot-backend/internal/models"
	"shelfspot-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type HouseHandler struct{}

func NewHouseHandler() *HouseHandler {
	return &HouseHandler{}
}

func (h *HouseHandler) Create(c *gin.Context) {
	var house models.House
	if err := c.ShouldBindJSON(&house); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if house.Name == "" {
		utils.ErrorBadRequest(c, "House name is required")
		return
	}

	if err := database.GetDB().Create(&house).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create house: "+err.Error())
		return
	}

	utils.Success(c, house)
}

func (h *HouseHandler) List(c *gin.Context) {
	var houses []models.House
	if err := database.GetDB().Order("created_at DESC").Find(&houses).Error; err != nil {
		utils.ErrorInternal(c, "Failed to list houses: "+err.Error())
		return
	}

	for i := range houses {
		var count int64
		database.GetDB().Model(&models.Item{}).
			Joins("JOIN containers ON items.container_id = containers.id").
			Joins("JOIN rooms ON containers.room_id = rooms.id").
			Where("rooms.house_id = ?", houses[i].ID).
			Count(&count)
		houses[i].ItemCount = int(count)
	}

	utils.Success(c, houses)
}

func (h *HouseHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid house ID")
		return
	}

	var house models.House
	if err := database.GetDB().First(&house, id).Error; err != nil {
		utils.ErrorNotFound(c, "House not found")
		return
	}

	utils.Success(c, house)
}

func (h *HouseHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid house ID")
		return
	}

	var house models.House
	if err := database.GetDB().First(&house, id).Error; err != nil {
		utils.ErrorNotFound(c, "House not found")
		return
	}

	if err := c.ShouldBindJSON(&house); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if house.Name == "" {
		utils.ErrorBadRequest(c, "House name is required")
		return
	}

	if err := database.GetDB().Save(&house).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update house: "+err.Error())
		return
	}

	utils.Success(c, house)
}

func (h *HouseHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid house ID")
		return
	}

	var roomCount int64
	database.GetDB().Model(&models.Room{}).Where("house_id = ?", id).Count(&roomCount)
	if roomCount > 0 {
		utils.ErrorBadRequest(c, "Cannot delete house with existing rooms")
		return
	}

	if err := database.GetDB().Delete(&models.House{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete house: "+err.Error())
		return
	}

	utils.Success(c, nil)
}

func (h *HouseHandler) GetTree(c *gin.Context) {
	var houses []models.House
	if err := database.GetDB().Preload("Rooms.Containers").Find(&houses).Error; err != nil {
		utils.ErrorInternal(c, "Failed to get house tree: "+err.Error())
		return
	}

	var tree []models.TreeItem
	for _, house := range houses {
		houseItem := models.TreeItem{
			Key:      "house_" + house.ID.String(),
			Title:    house.Name,
			Type:     "house",
			Data:     map[string]interface{}{"id": house.ID.String()},
			Children: []models.TreeItem{},
		}

		for _, room := range house.Rooms {
			roomItem := models.TreeItem{
				Key:      "room_" + room.ID.String(),
				Title:    room.Name,
				Type:     "room",
				Data:     map[string]interface{}{"id": room.ID.String()},
				Children: []models.TreeItem{},
			}

			for _, container := range room.Containers {
				containerItem := models.TreeItem{
					Key:   "container_" + container.ID.String(),
					Title: container.Name,
					Type:  "container",
					Data:  map[string]interface{}{"id": container.ID.String()},
				}
				roomItem.Children = append(roomItem.Children, containerItem)
			}

			houseItem.Children = append(houseItem.Children, roomItem)
		}

		tree = append(tree, houseItem)
	}

	utils.Success(c, tree)
}
