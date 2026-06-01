package handlers

import (
	"shelfspot-backend/internal/database"
	"shelfspot-backend/internal/models"
	"shelfspot-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ContainerHandler struct{}

func NewContainerHandler() *ContainerHandler {
	return &ContainerHandler{}
}

func (h *ContainerHandler) Create(c *gin.Context) {
	var container models.Container
	if err := c.ShouldBindJSON(&container); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if container.Name == "" {
		utils.ErrorBadRequest(c, "Container name is required")
		return
	}

	if container.RoomID == uuid.Nil {
		utils.ErrorBadRequest(c, "Room ID is required")
		return
	}

	var room models.Room
	if err := database.GetDB().First(&room, container.RoomID).Error; err != nil {
		utils.ErrorNotFound(c, "Room not found")
		return
	}

	if err := database.GetDB().Create(&container).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create container: "+err.Error())
		return
	}

	utils.Success(c, container)
}

func (h *ContainerHandler) List(c *gin.Context) {
	roomID := c.Query("room_id")
	db := database.GetDB().Order("created_at DESC")

	if roomID != "" {
		db = db.Where("room_id = ?", roomID)
	}

	var containers []models.Container
	if err := db.Find(&containers).Error; err != nil {
		utils.ErrorInternal(c, "Failed to list containers: "+err.Error())
		return
	}

	for i := range containers {
		var count int64
		database.GetDB().Model(&models.Item{}).Where("container_id = ?", containers[i].ID).Count(&count)
		containers[i].ItemCount = int(count)
	}

	utils.Success(c, containers)
}

func (h *ContainerHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid container ID")
		return
	}

	var container models.Container
	if err := database.GetDB().Preload("Room.House").First(&container, id).Error; err != nil {
		utils.ErrorNotFound(c, "Container not found")
		return
	}

	utils.Success(c, container)
}

func (h *ContainerHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid container ID")
		return
	}

	var container models.Container
	if err := database.GetDB().First(&container, id).Error; err != nil {
		utils.ErrorNotFound(c, "Container not found")
		return
	}

	if err := c.ShouldBindJSON(&container); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if container.Name == "" {
		utils.ErrorBadRequest(c, "Container name is required")
		return
	}

	if err := database.GetDB().Save(&container).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update container: "+err.Error())
		return
	}

	utils.Success(c, container)
}

func (h *ContainerHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid container ID")
		return
	}

	var itemCount int64
	database.GetDB().Model(&models.Item{}).Where("container_id = ?", id).Count(&itemCount)
	if itemCount > 0 {
		utils.ErrorBadRequest(c, "Cannot delete container with existing items")
		return
	}

	if err := database.GetDB().Delete(&models.Container{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete container: "+err.Error())
		return
	}

	utils.Success(c, nil)
}

func (h *ContainerHandler) GetTree(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid container ID")
		return
	}

	var container models.Container
	if err := database.GetDB().First(&container, id).Error; err != nil {
		utils.ErrorNotFound(c, "Container not found")
		return
	}

	containerItem := models.TreeItem{
		Key:   "container_" + container.ID.String(),
		Title: container.Name,
		Type:  "container",
		Data:  map[string]interface{}{"id": container.ID.String()},
	}

	utils.Success(c, containerItem)
}
