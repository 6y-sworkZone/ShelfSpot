package handlers

import (
	"shelfspot-backend/internal/database"
	"shelfspot-backend/internal/models"
	"shelfspot-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CategoryHandler struct{}

func NewCategoryHandler() *CategoryHandler {
	return &CategoryHandler{}
}

func (h *CategoryHandler) Create(c *gin.Context) {
	var category models.Category
	if err := c.ShouldBindJSON(&category); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if category.Name == "" {
		utils.ErrorBadRequest(c, "Category name is required")
		return
	}

	if category.ParentID != nil && *category.ParentID != uuid.Nil {
		var parent models.Category
		if err := database.GetDB().First(&parent, category.ParentID).Error; err != nil {
			utils.ErrorNotFound(c, "Parent category not found")
			return
		}
	}

	if err := database.GetDB().Create(&category).Error; err != nil {
		utils.ErrorInternal(c, "Failed to create category: "+err.Error())
		return
	}

	utils.Success(c, category)
}

func (h *CategoryHandler) List(c *gin.Context) {
	parentID := c.Query("parent_id")
	db := database.GetDB().Order("created_at DESC")

	if parentID != "" {
		if parentID == "null" || parentID == "0" {
			db = db.Where("parent_id IS NULL")
		} else {
			db = db.Where("parent_id = ?", parentID)
		}
	}

	var categories []models.Category
	if err := db.Find(&categories).Error; err != nil {
		utils.ErrorInternal(c, "Failed to list categories: "+err.Error())
		return
	}

	for i := range categories {
		var count int64
		database.GetDB().Model(&models.Item{}).Where("category_id = ?", categories[i].ID).Count(&count)
		categories[i].ItemCount = int(count)
	}

	utils.Success(c, categories)
}

func (h *CategoryHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid category ID")
		return
	}

	var category models.Category
	if err := database.GetDB().Preload("Parent").First(&category, id).Error; err != nil {
		utils.ErrorNotFound(c, "Category not found")
		return
	}

	utils.Success(c, category)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid category ID")
		return
	}

	var category models.Category
	if err := database.GetDB().First(&category, id).Error; err != nil {
		utils.ErrorNotFound(c, "Category not found")
		return
	}

	if err := c.ShouldBindJSON(&category); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if category.Name == "" {
		utils.ErrorBadRequest(c, "Category name is required")
		return
	}

	if err := database.GetDB().Save(&category).Error; err != nil {
		utils.ErrorInternal(c, "Failed to update category: "+err.Error())
		return
	}

	utils.Success(c, category)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorBadRequest(c, "Invalid category ID")
		return
	}

	var childCount int64
	database.GetDB().Model(&models.Category{}).Where("parent_id = ?", id).Count(&childCount)
	if childCount > 0 {
		utils.ErrorBadRequest(c, "Cannot delete category with existing child categories")
		return
	}

	var itemCount int64
	database.GetDB().Model(&models.Item{}).Where("category_id = ?", id).Count(&itemCount)
	if itemCount > 0 {
		utils.ErrorBadRequest(c, "Cannot delete category with existing items")
		return
	}

	if err := database.GetDB().Delete(&models.Category{}, id).Error; err != nil {
		utils.ErrorInternal(c, "Failed to delete category: "+err.Error())
		return
	}

	utils.Success(c, nil)
}

func (h *CategoryHandler) GetTree(c *gin.Context) {
	var categories []models.Category
	if err := database.GetDB().Where("parent_id IS NULL").Preload("Children", func(db *gorm.DB) *gorm.DB {
		return db.Order("name")
	}).Order("name").Find(&categories).Error; err != nil {
		utils.ErrorInternal(c, "Failed to get category tree: "+err.Error())
		return
	}

	var tree []models.TreeItem
	for _, cat := range categories {
		catItem := models.TreeItem{
			Key:      "category_" + cat.ID.String(),
			Title:    cat.Name,
			Type:     "category",
			Data:     map[string]interface{}{"id": cat.ID.String()},
			Children: []models.TreeItem{},
		}

		for _, child := range cat.Children {
			childItem := models.TreeItem{
				Key:   "category_" + child.ID.String(),
				Title: child.Name,
				Type:  "category",
				Data:  map[string]interface{}{"id": child.ID.String()},
			}
			catItem.Children = append(catItem.Children, childItem)
		}

		tree = append(tree, catItem)
	}

	utils.Success(c, tree)
}
