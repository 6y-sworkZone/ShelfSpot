package handlers

import (
	"shelfspot-backend/internal/database"
	"shelfspot-backend/internal/models"
	"shelfspot-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RoomHandler struct{}

func NewRoomHandler() *RoomHandler {
	return &RoomHandler{}
}

func (h *RoomHandler) Create(c *gin.Context) {
	var room models.Room
	if err := c.ShouldBindJSON(&room); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if room.Name == "" {
		utils.ErrorBadRequest(c, "Room name is required")
		return
	}

	if room.HouseID == uuid.Nil {
		utils.ErrorBadRequest(c, "House ID is required")
		return
	}

	var house models.House
	if err := database.GetDB().First(&house, room.HouseID).Error; err != nil {
		utils.ErrorNotFound(c, "House not found")
		return
	}

	if err := database.GetDB().Create(&room).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create room: "+err.Error())
		return
	}

	utils.Success(c, room)
}

func (h *RoomHandler) List(c *gin.Context) {
	houseID := c.Query("house_id")
	db := database.GetDB().Order("created_at DESC")

	if houseID != "" {
		db = db.Where("house_id = ?", houseID)
	}

	var rooms []models.Room
	if err := db.Find(&rooms).Error; err != nil {
		utils.ErrorInternal(c, "Failed to list rooms: "+err.Error())
		return
	}

	for i := range rooms {
		var count int64
		database.GetDB().Model(&models.Item{}).
			Joins("JOIN containers ON items.container_id = containers.id").
			Where("containers.room_id = ?", rooms[i].ID).
			Count(&count)
		rooms[i].ItemCount = int(count)
	}

	utils.Success(c, rooms)
}

func (h *RoomHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid room ID")
		return
	}

	var room models.Room
	if err := database.GetDB().Preload("House").First(&room, id).Error; err != nil {
		utils.ErrorNotFound(c, "Room not found")
		return
	}

	utils.Success(c, room)
}

func (h *RoomHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid room ID")
		return
	}

	var room models.Room
	if err := database.GetDB().First(&room, id).Error; err != nil {
		utils.ErrorNotFound(c, "Room not found")
		return
	}

	if err := c.ShouldBindJSON(&room); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if room.Name == "" {
		utils.ErrorBadRequest(c, "Room name is required")
		return
	}

	if err := database.GetDB().Save(&room).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update room: "+err.Error())
		return
	}

	utils.Success(c, room)
}

func (h *RoomHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid room ID")
		return
	}

	var containerCount int64
	database.GetDB().Model(&models.Container{}).Where("room_id = ?", id).Count(&containerCount)
	if containerCount > 0 {
		utils.ErrorBadRequest(c, "Cannot delete room with existing containers")
		return
	}

	if err := database.GetDB().Delete(&models.Room{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete room: "+err.Error())
		return
	}

	utils.Success(c, nil)
}

func (h *RoomHandler) GetTree(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid room ID")
		return
	}

	var room models.Room
	if err := database.GetDB().Preload("Containers").First(&room, id).Error; err != nil {
		utils.ErrorNotFound(c, "Room not found")
		return
	}

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

	utils.Success(c, roomItem)
}
