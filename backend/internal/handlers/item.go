package handlers

import (
	"encoding/csv"
	"io"
	"os"
	"path/filepath"
	"shelfspot-backend/internal/database"
	"shelfspot-backend/internal/models"
	"shelfspot-backend/internal/utils"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ItemHandler struct{}

func NewItemHandler() *ItemHandler {
	return &ItemHandler{}
}

type ImportResult struct {
	SuccessCount int           `json:"success_count"`
	FailCount    int           `json:"fail_count"`
	Errors       []ImportError `json:"errors"`
}

type ImportError struct {
	Row     int    `json:"row"`
	Message string `json:"message"`
}

func (h *ItemHandler) Create(c *gin.Context) {
	var item models.Item
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if item.Name == "" {
		utils.ErrorBadRequest(c, "Item name is required")
		return
	}

	if item.Quantity <= 0 {
		utils.ErrorBadRequest(c, "Quantity must be positive integer")
		return
	}

	if item.CategoryID == uuid.Nil {
		utils.ErrorBadRequest(c, "Category ID is required")
		return
	}

	if item.ContainerID == uuid.Nil {
		utils.ErrorBadRequest(c, "Container ID is required")
		return
	}

	var category models.Category
	if err := database.GetDB().First(&category, item.CategoryID).Error; err != nil {
		utils.ErrorNotFound(c, "Category not found")
		return
	}

	var container models.Container
	if err := database.GetDB().First(&container, item.ContainerID).Error; err != nil {
		utils.ErrorNotFound(c, "Container not found")
		return
	}

	if err := database.GetDB().Create(&item).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create item: "+err.Error())
		return
	}

	utils.Success(c, item)
}

func (h *ItemHandler) List(c *gin.Context) {
	categoryID := c.Query("category_id")
	containerID := c.Query("container_id")
	roomID := c.Query("room_id")
	houseID := c.Query("house_id")
	isIdle := c.Query("is_idle")
	search := c.Query("search")

	db := database.GetDB().Preload("Category").Preload("Container.Room.House").Order("created_at DESC")

	if categoryID != "" {
		db = db.Where("category_id = ?", categoryID)
	}

	if containerID != "" {
		db = db.Where("container_id = ?", containerID)
	}

	if roomID != "" {
		db = db.Joins("JOIN containers ON items.container_id = containers.id").
			Where("containers.room_id = ?", roomID)
	}

	if houseID != "" {
		db = db.Joins("JOIN containers ON items.container_id = containers.id").
			Joins("JOIN rooms ON containers.room_id = rooms.id").
			Where("rooms.house_id = ?", houseID)
	}

	if isIdle != "" {
		db = db.Where("is_idle = ?", isIdle == "true")
	}

	if search != "" {
		db = db.Where("name LIKE ?", "%"+search+"%")
	}

	var items []models.Item
	if err := db.Find(&items).Error; err != nil {
		utils.ErrorInternal(c, "Failed to list items: "+err.Error())
		return
	}

	for i := range items {
		items[i].FullPath = buildFullPath(items[i])
	}

	utils.Success(c, items)
}

func (h *ItemHandler) Search(c *gin.Context) {
	name := c.Query("name")
	categoryID := c.Query("category_id")
	search := c.Query("search")

	db := database.GetDB().Preload("Category").Preload("Container.Room.House").Order("created_at DESC")

	if name != "" {
		db = db.Where("name LIKE ?", "%"+name+"%")
	}

	if search != "" {
		subQuery := database.GetDB().Model(&models.Category{}).
			Select("id").Where("name LIKE ?", "%"+search+"%")
		db = db.Where("name LIKE ? OR category_id IN (?)", "%"+search+"%", subQuery)
	}

	if categoryID != "" {
		db = db.Where("category_id = ?", categoryID)
	}

	var items []models.Item
	if err := db.Find(&items).Error; err != nil {
		utils.ErrorInternal(c, "Failed to search items: "+err.Error())
		return
	}

	for i := range items {
		items[i].FullPath = buildFullPath(items[i])
	}

	utils.Success(c, items)
}

func (h *ItemHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid item ID")
		return
	}

	var item models.Item
	if err := database.GetDB().Preload("Category").Preload("Container.Room.House").First(&item, id).Error; err != nil {
		utils.ErrorNotFound(c, "Item not found")
		return
	}

	item.FullPath = buildFullPath(item)
	utils.Success(c, item)
}

func (h *ItemHandler) Update(c *gin.Context) {
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

	if err := c.ShouldBindJSON(&item); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if item.Name == "" {
		utils.ErrorBadRequest(c, "Item name is required")
		return
	}

	if item.Quantity <= 0 {
		utils.ErrorBadRequest(c, "Quantity must be positive integer")
		return
	}

	if err := database.GetDB().Save(&item).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update item: "+err.Error())
		return
	}

	utils.Success(c, item)
}

func (h *ItemHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid item ID")
		return
	}

	if err := database.GetDB().Delete(&models.Item{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete item: "+err.Error())
		return
	}

	utils.Success(c, nil)
}

func (h *ItemHandler) ToggleIdle(c *gin.Context) {
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

	item.IsIdle = !item.IsIdle
	if err := database.GetDB().Save(&item).Error; err != nil {
		utils.ErrorInternal(c, "Failed to toggle idle status: "+err.Error())
		return
	}

	utils.Success(c, item)
}

func (h *ItemHandler) MarkExpiryHandled(c *gin.Context) {
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
		utils.ErrorInternal(c, "Failed to mark expiry handled: "+err.Error())
		return
	}

	utils.Success(c, item)
}

func (h *ItemHandler) UploadPhotos(c *gin.Context) {
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

	form, err := c.MultipartForm()
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid multipart form: "+err.Error())
		return
	}

	files := form.File["photos"]
	if len(files) == 0 {
		utils.ErrorBadRequest(c, "No photos uploaded")
		return
	}

	if len(files) > 3 {
		utils.ErrorBadRequest(c, "Maximum 3 photos allowed")
		return
	}

	uploadDir := "uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.ErrorInternal(c, "Failed to create upload directory: "+err.Error())
		return
	}

	var photoURLs []string
	for _, file := range files {
		ext := filepath.Ext(file.Filename)
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
			utils.ErrorBadRequest(c, "Invalid file type: "+ext)
			return
		}

		newFilename := uuid.New().String() + ext
		filepath := filepath.Join(uploadDir, newFilename)

		if err := c.SaveUploadedFile(file, filepath); err != nil {
			utils.ErrorInternal(c, "Failed to save file: "+err.Error())
			return
		}

		photoURLs = append(photoURLs, "/"+filepath)
	}

	item.Photos = strings.Join(photoURLs, ",")
	if err := database.GetDB().Save(&item).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update item photos: "+err.Error())
		return
	}

	utils.Success(c, gin.H{
		"photos": photoURLs,
		"item":   item,
	})
}

func (h *ItemHandler) ImportCSV(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorBadRequest(c, "Failed to get CSV file: "+err.Error())
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true

	headers, err := reader.Read()
	if err != nil {
		utils.ErrorBadRequest(c, "Failed to read CSV header: "+err.Error())
		return
	}

	expectedHeaders := []string{"名称", "数量", "分类", "购入日期", "保质期", "所属容器"}
	for i, h := range expectedHeaders {
		if strings.TrimSpace(headers[i]) != h {
			utils.ErrorBadRequest(c, "Invalid CSV format. Expected headers: 名称,数量,分类,购入日期,保质期,所属容器")
			return
		}
	}

	result := ImportResult{}
	rowNum := 1

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.FailCount++
			result.Errors = append(result.Errors, ImportError{Row: rowNum, Message: "Failed to read row: " + err.Error()})
			rowNum++
			continue
		}

		rowNum++
		name := strings.TrimSpace(record[0])
		quantityStr := strings.TrimSpace(record[1])
		categoryStr := strings.TrimSpace(record[2])
		purchaseDateStr := strings.TrimSpace(record[3])
		expiryDateStr := strings.TrimSpace(record[4])
		containerStr := strings.TrimSpace(record[5])

		if name == "" {
			result.FailCount++
			result.Errors = append(result.Errors, ImportError{Row: rowNum - 1, Message: "名称不能为空"})
			continue
		}

		quantity, err := strconv.Atoi(quantityStr)
		if err != nil || quantity <= 0 {
			result.FailCount++
			result.Errors = append(result.Errors, ImportError{Row: rowNum - 1, Message: "数量必须是正整数"})
			continue
		}

		if categoryStr == "" {
			result.FailCount++
			result.Errors = append(result.Errors, ImportError{Row: rowNum - 1, Message: "分类不能为空"})
			continue
		}

		if containerStr == "" {
			result.FailCount++
			result.Errors = append(result.Errors, ImportError{Row: rowNum - 1, Message: "所属容器不能为空"})
			continue
		}

		categoryID, err := findCategoryID(categoryStr)
		if err != nil {
			result.FailCount++
			result.Errors = append(result.Errors, ImportError{Row: rowNum - 1, Message: "分类不存在: " + categoryStr})
			continue
		}

		containerID, err := findContainerID(containerStr)
		if err != nil {
			result.FailCount++
			result.Errors = append(result.Errors, ImportError{Row: rowNum - 1, Message: "容器不存在: " + containerStr})
			continue
		}

		var purchaseDate *time.Time
		if purchaseDateStr != "" {
			parsed, err := time.Parse("2006-01-02", purchaseDateStr)
			if err != nil {
				result.FailCount++
				result.Errors = append(result.Errors, ImportError{Row: rowNum - 1, Message: "购入日期格式错误，应为 YYYY-MM-DD"})
				continue
			}
			purchaseDate = &parsed
		}

		var expiryDate *time.Time
		if expiryDateStr != "" {
			parsed, err := time.Parse("2006-01-02", expiryDateStr)
			if err != nil {
				result.FailCount++
				result.Errors = append(result.Errors, ImportError{Row: rowNum - 1, Message: "保质期格式错误，应为 YYYY-MM-DD"})
				continue
			}
			expiryDate = &parsed
		}

		item := models.Item{
			Name:         name,
			Quantity:     quantity,
			CategoryID:   categoryID,
			ContainerID:  containerID,
			PurchaseDate: purchaseDate,
			ExpiryDate:   expiryDate,
		}

		if err := database.GetDB().Create(&item).Error; err != nil {
			result.FailCount++
			result.Errors = append(result.Errors, ImportError{Row: rowNum - 1, Message: "创建失败: " + err.Error()})
			continue
		}

		result.SuccessCount++
	}

	utils.Success(c, result)
}

func findCategoryID(str string) (uuid.UUID, error) {
	id, err := uuid.Parse(str)
	if err == nil {
		var category models.Category
		if err := database.GetDB().First(&category, id).Error; err == nil {
			return category.ID, nil
		}
	}

	var category models.Category
	if err := database.GetDB().Where("name = ?", str).First(&category).Error; err != nil {
		return uuid.Nil, err
	}
	return category.ID, nil
}

func findContainerID(str string) (uuid.UUID, error) {
	id, err := uuid.Parse(str)
	if err == nil {
		var container models.Container
		if err := database.GetDB().First(&container, id).Error; err == nil {
			return container.ID, nil
		}
	}

	var container models.Container
	if err := database.GetDB().Where("name = ?", str).First(&container).Error; err != nil {
		return uuid.Nil, err
	}
	return container.ID, nil
}

func buildFullPath(item models.Item) string {
	path := item.Container.Name
	if item.Container.Room.Name != "" {
		path = item.Container.Room.Name + " → " + path
	}
	if item.Container.Room.House.Name != "" {
		path = item.Container.Room.House.Name + " → " + path
	}
	return path
}

func GetItemsByContainerIDs(db *gorm.DB, containerIDs []uuid.UUID) ([]models.Item, error) {
	var items []models.Item
	if err := db.Preload("Category").Preload("Container.Room.House").
		Where("container_id IN ?", containerIDs).
		Order("created_at DESC").
		Find(&items).Error; err != nil {
		return nil, err
	}

	for i := range items {
		items[i].FullPath = buildFullPath(items[i])
	}

	return items, nil
}

func GetItemsByRoomIDs(db *gorm.DB, roomIDs []uuid.UUID) ([]models.Item, error) {
	var items []models.Item
	if err := db.Preload("Category").Preload("Container.Room.House").
		Joins("JOIN containers ON items.container_id = containers.id").
		Where("containers.room_id IN ?", roomIDs).
		Order("created_at DESC").
		Find(&items).Error; err != nil {
		return nil, err
	}

	for i := range items {
		items[i].FullPath = buildFullPath(items[i])
	}

	return items, nil
}
