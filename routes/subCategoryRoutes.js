
import express from "express";

import {
  getSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  updateSubCategoryStatus,
  deleteSubCategory,
} from "../controllers/subCategoryController.js";
import { adminAuth } from "../middleware/adminAuth.js";


const router = express.Router();

// GET: Fetch all subcategories
// Supports: ?parentCategory=sets
// Supports: ?isActive=true
router.get("/", getSubCategories);

// GET: Fetch a single subcategory by ID
router.get("/:id", getSubCategoryById);

// POST: Create a new subcategory (Admin only)
router.post("/", adminAuth, createSubCategory);

// PUT: Update an existing subcategory (Admin only)
router.put("/:id", adminAuth, updateSubCategory);

// PATCH: Activate or deactivate a subcategory (Admin only)
router.patch("/:id/status", adminAuth, updateSubCategoryStatus);

// DELETE: Delete a subcategory (Admin only)
router.delete("/:id", adminAuth, deleteSubCategory);

export default router;
