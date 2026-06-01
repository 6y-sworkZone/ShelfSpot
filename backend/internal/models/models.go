package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BaseModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

func (m *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}

type House struct {
	BaseModel
	Name      string `gorm:"not null;size:100" json:"name"`
	Remark    string `gorm:"size:500" json:"remark"`
	Rooms     []Room `gorm:"foreignKey:HouseID" json:"rooms,omitempty"`
	ItemCount int    `gorm:"-" json:"item_count,omitempty"`
}

type Room struct {
	BaseModel
	Name       string      `gorm:"not null;size:100" json:"name"`
	Remark     string      `gorm:"size:500" json:"remark"`
	HouseID    uuid.UUID   `gorm:"type:uuid;not null" json:"house_id"`
	House      House       `gorm:"foreignKey:HouseID" json:"house,omitempty"`
	Containers []Container `gorm:"foreignKey:RoomID" json:"containers,omitempty"`
	ItemCount  int         `gorm:"-" json:"item_count,omitempty"`
}

type Container struct {
	BaseModel
	Name        string    `gorm:"not null;size:100" json:"name"`
	Remark      string    `gorm:"size:500" json:"remark"`
	Location    string    `gorm:"size:200" json:"location"`
	Capacity    string    `gorm:"size:200" json:"capacity"`
	RoomID      uuid.UUID `gorm:"type:uuid;not null" json:"room_id"`
	Room        Room      `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	Items       []Item    `gorm:"foreignKey:ContainerID" json:"items,omitempty"`
	ItemCount   int       `gorm:"-" json:"item_count,omitempty"`
}

type Category struct {
	BaseModel
	Name      string     `gorm:"not null;size:100" json:"name"`
	ParentID  *uuid.UUID `gorm:"type:uuid" json:"parent_id,omitempty"`
	Parent    *Category  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children  []Category `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Items     []Item     `gorm:"foreignKey:CategoryID" json:"items,omitempty"`
	ItemCount int        `gorm:"-" json:"item_count,omitempty"`
}

type Item struct {
	BaseModel
	Name            string     `gorm:"not null;size:200" json:"name"`
	Quantity        int        `gorm:"not null;default:1" json:"quantity"`
	CategoryID      uuid.UUID  `gorm:"type:uuid;not null" json:"category_id"`
	Category        Category   `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	PurchaseDate    *time.Time `json:"purchase_date,omitempty"`
	ExpiryDate      *time.Time `json:"expiry_date,omitempty"`
	Photos          string     `gorm:"size:1000" json:"photos"`
	ContainerID     uuid.UUID  `gorm:"type:uuid;not null" json:"container_id"`
	Container       Container  `gorm:"foreignKey:ContainerID" json:"container,omitempty"`
	IsIdle          bool       `gorm:"default:false" json:"is_idle"`
	IsExpiryHandled bool       `gorm:"default:false" json:"is_expiry_handled"`
	FullPath        string     `gorm:"-" json:"full_path,omitempty"`
}

type TreeItem struct {
	Key      string                 `json:"key"`
	Title    string                 `json:"title"`
	Type     string                 `json:"type"`
	Children []TreeItem             `json:"children,omitempty"`
	Data     map[string]interface{} `json:"data,omitempty"`
}
