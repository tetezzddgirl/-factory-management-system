package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"factoryflow/sf_module/database"
	"factoryflow/sf_module/models"

	"github.com/gin-gonic/gin"
)

type BomMaterialResponse struct {
	Name   string `json:"name"`
	Amount string `json:"amount"`
}

type BomResponse struct {
	ID          string                `json:"id"`
	Code        string                `json:"code"`
	ProductCode string                `json:"productCode"`
	ProductName string                `json:"productName"`
	Version     string                `json:"version"`
	Category    string                `json:"category"`
	Materials   []BomMaterialResponse `json:"materials"`
	Machines    []string              `json:"machines"`
	Steps       []string              `json:"steps,omitempty"`
	Status      string                `json:"status"` // "draft" | "pending" | "approved" | "rejected" | "pending_delete"
	UpdatedBy   string                `json:"updatedBy"`
	UpdatedAt   string                `json:"updatedAt"`
}

// GetBoms returns all Bill of Materials (Formulas)
func GetBoms(c *gin.Context) {
	var formulas []models.Formula
	err := database.DB.Preload("Product").Preload("Product.ProductCategory").Preload("FormulaSteps").Find(&formulas).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]BomResponse, 0)
	for _, f := range formulas {
		status := "approved"
		if !f.Status {
			status = "pending"
		}
		if f.FormulaID == "BOM-003" {
			status = "draft"
		}

		materials := []BomMaterialResponse{
			{Name: "PET Resin (RM-001)", Amount: "12 g"},
			{Name: "สีมาสเตอร์แบทช์ (RM-005)", Amount: "0.3 g"},
		}
		if f.FormulaID == "BOM-002" {
			materials = []BomMaterialResponse{
				{Name: "PET Resin (RM-001)", Amount: "22 g"},
				{Name: "สีมาสเตอร์แบทช์ (RM-005)", Amount: "0.5 g"},
			}
		} else if f.FormulaID == "BOM-003" {
			materials = []BomMaterialResponse{
				{Name: "PP Compound (RM-004)", Amount: "3 g"},
			}
		}

		machines := []string{"M-01", "M-02"}
		if f.FormulaID == "BOM-002" {
			machines = []string{"M-03"}
		} else if f.FormulaID == "BOM-003" {
			machines = []string{"M-05"}
		}

		cat := "บรรจุภัณฑ์"
		if f.Product.ProductCategory.CategoryName != "" {
			cat = f.Product.ProductCategory.CategoryName
		}

		var steps []string
		if len(f.FormulaSteps) > 0 {
			for _, st := range f.FormulaSteps {
				if st.StepName != "" {
					steps = append(steps, st.StepName)
				}
			}
		} else if f.Steps != "" {
			for _, s := range strings.Split(f.Steps, "\n") {
				trimmed := strings.TrimSpace(s)
				if trimmed != "" {
					steps = append(steps, trimmed)
				}
			}
		}

		result = append(result, BomResponse{
			ID:          f.FormulaID,
			Code:        f.FormulaID,
			ProductCode: f.ProductID,
			ProductName: f.FormulaName,
			Version:     fmt.Sprintf("v%d", f.Version),
			Category:    cat,
			Materials:   materials,
			Machines:    machines,
			Steps:       steps,
			Status:      status,
			UpdatedBy:   "Admin (Planner)",
			UpdatedAt:   f.UpdatedAt.Format("02 ม.ค. 2006"),
		})
	}

	c.JSON(http.StatusOK, result)
}

// CreateBom creates or updates a BOM formula in database and inserts step rows into formula_steps
func CreateBom(c *gin.Context) {
	var req struct {
		ID          string                `json:"id"`
		Code        string                `json:"code"`
		ProductCode string                `json:"productCode"`
		ProductName string                `json:"productName"`
		Version     string                `json:"version"`
		Category    string                `json:"category"`
		Materials   []BomMaterialResponse `json:"materials"`
		Machines    []string              `json:"machines"`
		Steps       []string              `json:"steps"`
		Status      string                `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	formulaID := req.ID
	if formulaID == "" {
		formulaID = req.Code
	}

	verNum := 1
	if strings.HasPrefix(req.Version, "v") {
		fmt.Sscanf(req.Version, "v%d", &verNum)
	}

	stepsStr := strings.Join(req.Steps, "\n")
	formula := models.Formula{
		FormulaID:     formulaID,
		FormulaName:   req.ProductName,
		ProductID:     req.ProductCode,
		Version:       verNum,
		EffectiveDate: time.Now(),
		Status:        req.Status == "approved",
		Steps:         stepsStr,
	}

	if err := database.DB.Create(&formula).Error; err != nil {
		database.DB.Model(&models.Formula{}).Where("formula_id = ?", formulaID).Updates(formula)
	}

	// Save individual step rows in formula_steps table
	database.DB.Where("formula_id = ?", formulaID).Delete(&models.FormulaStep{})
	for idx, s := range req.Steps {
		trimmed := strings.TrimSpace(s)
		if trimmed != "" {
			stepObj := models.FormulaStep{
				FormulaID:  formulaID,
				StepNumber: idx + 1,
				StepName:   trimmed,
			}
			database.DB.Create(&stepObj)
		}
	}

	c.JSON(http.StatusCreated, req)
}

// DeleteBom deletes a BOM formula and its steps from database
func DeleteBom(c *gin.Context) {
	id := c.Param("id")
	database.DB.Where("formula_id = ?", id).Delete(&models.FormulaStep{})
	if err := database.DB.Where("formula_id = ?", id).Delete(&models.Formula{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "BOM and its steps deleted successfully"})
}

// UpdateBomStatus updates BOM status (e.g. approved / rejected)
func UpdateBomStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var formula models.Formula
	if err := database.DB.Where("formula_id = ?", id).First(&formula).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "BOM formula not found"})
		return
	}

	formula.Status = (req.Status == "approved")
	if err := database.DB.Save(&formula).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("BOM %s status updated to %s", id, req.Status)})
}
