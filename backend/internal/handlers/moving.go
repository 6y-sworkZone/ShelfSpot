package handlers

import (
	"encoding/csv"
	"net/http"
	"shelfspot-backend/internal/database"
	"shelfspot-backend/internal/models"
	"shelfspot-backend/internal/utils"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MovingRequest struct {
	RoomIDs      []string `json:"room_ids"`
	ContainerIDs []string `json:"container_ids"`
}

type MovingSummary struct {
	TotalItems     int                 `json:"total_items"`
	TotalQuantity  int                 `json:"total_quantity"`
	CategoryCounts map[string]int      `json:"category_counts"`
	RoomCounts     map[string]int      `json:"room_counts"`
	Items          []models.Item       `json:"items"`
}

type MovingHandler struct{}

func NewMovingHandler() *MovingHandler {
	return &MovingHandler{}
}

func (h *MovingHandler) GenerateList(c *gin.Context) {
	var req MovingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if len(req.RoomIDs) == 0 && len(req.ContainerIDs) == 0 {
		utils.ErrorBadRequest(c, "At least one room_id or container_id is required")
		return
	}

	var allItems []models.Item
	db := database.GetDB()

	if len(req.ContainerIDs) > 0 {
		containerUUIDs := parseUUIDs(req.ContainerIDs)
		items, err := GetItemsByContainerIDs(db, containerUUIDs)
		if err != nil {
			utils.ErrorInternal(c, "Failed to get items by containers: "+err.Error())
			return
		}
		allItems = append(allItems, items...)
	}

	if len(req.RoomIDs) > 0 {
		roomUUIDs := parseUUIDs(req.RoomIDs)
		items, err := GetItemsByRoomIDs(db, roomUUIDs)
		if err != nil {
			utils.ErrorInternal(c, "Failed to get items by rooms: "+err.Error())
			return
		}
		allItems = append(allItems, items...)
	}

	allItems = deduplicateItems(allItems)

	summary := MovingSummary{
		Items:          allItems,
		CategoryCounts: make(map[string]int),
		RoomCounts:     make(map[string]int),
	}

	for _, item := range allItems {
		summary.TotalItems++
		summary.TotalQuantity += item.Quantity

		if item.Category.Name != "" {
			summary.CategoryCounts[item.Category.Name] += item.Quantity
		}

		if item.Container.Room.Name != "" {
			summary.RoomCounts[item.Container.Room.Name] += item.Quantity
		}
	}

	utils.Success(c, summary)
}

func (h *MovingHandler) ExportCSV(c *gin.Context) {
	var req MovingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if len(req.RoomIDs) == 0 && len(req.ContainerIDs) == 0 {
		utils.ErrorBadRequest(c, "At least one room_id or container_id is required")
		return
	}

	var allItems []models.Item
	db := database.GetDB()

	if len(req.ContainerIDs) > 0 {
		containerUUIDs := parseUUIDs(req.ContainerIDs)
		items, err := GetItemsByContainerIDs(db, containerUUIDs)
		if err != nil {
			utils.ErrorInternal(c, "Failed to get items by containers: "+err.Error())
			return
		}
		allItems = append(allItems, items...)
	}

	if len(req.RoomIDs) > 0 {
		roomUUIDs := parseUUIDs(req.RoomIDs)
		items, err := GetItemsByRoomIDs(db, roomUUIDs)
		if err != nil {
			utils.ErrorInternal(c, "Failed to get items by rooms: "+err.Error())
			return
		}
		allItems = append(allItems, items...)
	}

	allItems = deduplicateItems(allItems)

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=moving_list_"+time.Now().Format("20060102_150405")+".csv")

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	writer.Write([]string{"\uFEFF"})
	headers := []string{"序号", "物品名称", "数量", "分类", "位置", "购入日期", "保质期", "是否闲置"}
	writer.Write(headers)

	for i, item := range allItems {
		purchaseDate := ""
		if item.PurchaseDate != nil {
			purchaseDate = item.PurchaseDate.Format("2006-01-02")
		}

		expiryDate := ""
		if item.ExpiryDate != nil {
			expiryDate = item.ExpiryDate.Format("2006-01-02")
		}

		isIdle := "否"
		if item.IsIdle {
			isIdle = "是"
		}

		row := []string{
			strconv.Itoa(i + 1),
			item.Name,
			strconv.Itoa(item.Quantity),
			item.Category.Name,
			item.FullPath,
			purchaseDate,
			expiryDate,
			isIdle,
		}
		writer.Write(row)
	}

	c.Status(http.StatusOK)
}

func parseUUIDs(strs []string) []uuid.UUID {
	var uuids []uuid.UUID
	for _, s := range strs {
		id, err := uuid.Parse(s)
		if err == nil {
			uuids = append(uuids, id)
		}
	}
	return uuids
}

func deduplicateItems(items []models.Item) []models.Item {
	seen := make(map[string]bool)
	var unique []models.Item
	for _, item := range items {
		key := item.ID.String()
		if !seen[key] {
			seen[key] = true
			unique = append(unique, item)
		}
	}
	return unique
}
