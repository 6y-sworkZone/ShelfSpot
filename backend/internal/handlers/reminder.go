package handlers

import (
	"shelfspot-backend/internal/database"
	"shelfspot-backend/internal/models"
	"shelfspot-backend/internal/utils"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ReminderItem struct {
	models.Item
	DaysRemaining int    `json:"days_remaining"`
	Status        string `json:"status"`
}

type ReminderHandler struct{}

func NewReminderHandler() *ReminderHandler {
	return &ReminderHandler{}
}

func (h *ReminderHandler) GetExpiringItems(c *gin.Context) {
	today := time.Now().Truncate(24 * time.Hour)
	thirtyDaysLater := today.AddDate(0, 0, 30)

	var items []models.Item
	if err := database.GetDB().
		Preload("Category").
		Preload("Container.Room.House").
		Where("expiry_date IS NOT NULL").
		Where("expiry_date <= ?", thirtyDaysLater).
		Where("is_expiry_handled = ?", false).
		Order("expiry_date ASC").
		Find(&items).Error; err != nil {
		utils.ErrorInternal(c, "Failed to get expiring items: "+err.Error())
		return
	}

	reminderItems := make([]ReminderItem, 0)
	for _, item := range items {
		expiryDate := item.ExpiryDate.Truncate(24 * time.Hour)
		daysRemaining := int(expiryDate.Sub(today).Hours() / 24)

		status := "expiring"
		if daysRemaining < 0 {
			status = "expired"
		} else if daysRemaining <= 7 {
			status = "urgent"
		}

		item.FullPath = buildFullPath(item)
		reminderItems = append(reminderItems, ReminderItem{
			Item:          item,
			DaysRemaining: daysRemaining,
			Status:        status,
		})
	}

	if reminderItems == nil {
		reminderItems = make([]ReminderItem, 0)
	}

	sort.Slice(reminderItems, func(i, j int) bool {
		return reminderItems[i].DaysRemaining < reminderItems[j].DaysRemaining
	})

	utils.Success(c, gin.H{
		"total":   len(reminderItems),
		"expired": countByStatus(reminderItems, "expired"),
		"urgent":  countByStatus(reminderItems, "urgent"),
		"items":   reminderItems,
	})
}

func (h *ReminderHandler) MarkHandled(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid item ID")
		return
	}

	var item models.Item
	if err := database.GetDB().First(&item, id).Error; err != nil {
		utils.ErrorNotFound(c, "Item not found")
		return
	}

	item.IsExpiryHandled = true
	if err := database.GetDB().Save(&item).Error; err != nil {
		utils.ErrorInternal(c, "Failed to mark as handled: "+err.Error())
		return
	}

	utils.Success(c, item)
}

func countByStatus(items []ReminderItem, status string) int {
	count := 0
	for _, item := range items {
		if item.Status == status {
			count++
		}
	}
	return count
}
