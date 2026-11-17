
import mongoose from "mongoose";

import SubCategory from "../models/SubCategory.js";
import Product from "../models/Product.js";

import { MAIN_CATEGORIES } from "../config/categories.js";

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

// Generate URL-friendly slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Validate main category against developer-defined categories
const isValidMainCategory = (category) => {
  return MAIN_CATEGORIES.some(
    (item) => item.slug === category
  );
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Handle duplicate key errors
const handleDuplicateError = (error, res) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "This subcategory already exists under this main category.",
    });
  }

  return null;
};

// --------------------------------------------------
// 1. GET ALL SUBCATEGORIES
// GET /api/subcategories
// --------------------------------------------------

export const getSubCategories = async (req, res) => {
  try {
    const { parentCategory, isActive } = req.query;

    const filter = {};

    // Filter by main category
    if (parentCategory) {
      const normalizedCategory = parentCategory
        .toLowerCase()
        .trim();
        console.log(normalizedCategory)

      if (!isValidMainCategory(normalizedCategory)) {
        return res.status(400).json({
          success: false,
          message: "Invalid main category.",
        });
      }

      filter.parentCategory = normalizedCategory;
    }

    // Filter by active/inactive status
    if (isActive !== undefined) {
      if (!["true", "false"].includes(isActive)) {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
        });
      }

      filter.isActive = isActive === "true";
    }

    const subCategories = await SubCategory.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: subCategories.length,
      subCategories,
    });
  } catch (error) {
    console.error("Get subcategories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories.",
    });
  }
};

// --------------------------------------------------
// 2. GET SINGLE SUBCATEGORY
// GET /api/subcategories/:id
// --------------------------------------------------

export const getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    const subCategory = await SubCategory.findById(id).lean();

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    return res.status(200).json({
      success: true,
      subCategory,
    });
  } catch (error) {
    console.error("Get subcategory error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subcategory.",
    });
  }
};

// --------------------------------------------------
// 3. CREATE SUBCATEGORY
// POST /api/subcategories
// ADMIN ONLY
// --------------------------------------------------

export const createSubCategory = async (req, res) => {
  try {
    const { name, parentCategory, sortOrder } = req.body;

    // Validate required fields
    if (
      !name ||
      typeof name !== "string" ||
      !name.trim() ||
      !parentCategory ||
      typeof parentCategory !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Subcategory name and main category are required.",
      });
    }

    const normalizedName = name.trim();
    const normalizedCategory = parentCategory
      .toLowerCase()
      .trim();

    if (normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Subcategory name cannot exceed 100 characters.",
      });
    }

    // Validate developer-defined main category
    if (!isValidMainCategory(normalizedCategory)) {
      return res.status(400).json({
        success: false,
        message: "Invalid main category.",
      });
    }

    const slug = generateSlug(normalizedName);

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory name.",
      });
    }

    // Check duplicate subcategory under the same main category
    const existingSubCategory = await SubCategory.findOne({
      parentCategory: normalizedCategory,
      slug,
    });

    if (existingSubCategory) {
      return res.status(409).json({
        success: false,
        message:
          "This subcategory already exists under this main category.",
      });
    }

    // Validate sortOrder
    const finalSortOrder =
      sortOrder === undefined ? 0 : Number(sortOrder);

    if (
      !Number.isInteger(finalSortOrder) ||
      finalSortOrder < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "sortOrder must be a non-negative integer.",
      });
    }

    const subCategory = await SubCategory.create({
      name: normalizedName,
      slug,
      parentCategory: normalizedCategory,
      sortOrder: finalSortOrder,
    });

    return res.status(201).json({
      success: true,
      message: "Subcategory created successfully.",
      subCategory,
    });
  } catch (error) {
    console.error("Create subcategory error:", error);

    const duplicateResponse = handleDuplicateError(error, res);

    if (duplicateResponse) return duplicateResponse;

    return res.status(500).json({
      success: false,
      message: "Failed to create subcategory.",
    });
  }
};

// --------------------------------------------------
// 4. UPDATE SUBCATEGORY
// PUT /api/subcategories/:id
// ADMIN ONLY
// --------------------------------------------------

export const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const { name, parentCategory, sortOrder } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    const subCategory = await SubCategory.findById(id);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    // Validate and update name
    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid subcategory name.",
        });
      }

      subCategory.name = name.trim();
      subCategory.slug = generateSlug(name.trim());
    }

    // Validate and update parent category
    if (parentCategory !== undefined) {
      if (typeof parentCategory !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid main category.",
        });
      }

      const normalizedCategory = parentCategory
        .toLowerCase()
        .trim();

      if (!isValidMainCategory(normalizedCategory)) {
        return res.status(400).json({
          success: false,
          message: "Invalid main category.",
        });
      }

      // Check whether products currently use this subcategory
      const productCount = await Product.countDocuments({
        subCategory: subCategory._id,
      });

      // Changing parent category would invalidate existing products
      if (
        productCount > 0 &&
        normalizedCategory !== subCategory.parentCategory
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Cannot change the main category because products are assigned to this subcategory. Reassign those products first.",
          productCount,
        });
      }

      subCategory.parentCategory = normalizedCategory;
    }

    // Validate and update sort order
    if (sortOrder !== undefined) {
      const newSortOrder = Number(sortOrder);

      if (
        !Number.isInteger(newSortOrder) ||
        newSortOrder < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "sortOrder must be a non-negative integer.",
        });
      }

      subCategory.sortOrder = newSortOrder;
    }

    await subCategory.save();

    return res.status(200).json({
      success: true,
      message: "Subcategory updated successfully.",
      subCategory,
    });
  } catch (error) {
    console.error("Update subcategory error:", error);

    const duplicateResponse = handleDuplicateError(error, res);

    if (duplicateResponse) return duplicateResponse;

    return res.status(500).json({
      success: false,
      message: "Failed to update subcategory.",
    });
  }
};

// --------------------------------------------------
// 5. UPDATE SUBCATEGORY STATUS
// PATCH /api/subcategories/:id/status
// ADMIN ONLY
// --------------------------------------------------

export const updateSubCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean value.",
      });
    }

    const subCategory = await SubCategory.findById(id);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    subCategory.isActive = isActive;

    await subCategory.save();

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Subcategory activated successfully."
        : "Subcategory deactivated successfully.",
      subCategory,
    });
  } catch (error) {
    console.error("Update subcategory status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update subcategory status.",
    });
  }
};

// --------------------------------------------------
// 6. DELETE SUBCATEGORY
// DELETE /api/subcategories/:id
// ADMIN ONLY
// --------------------------------------------------

export const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID.",
      });
    }

    const subCategory = await SubCategory.findById(id);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    // Prevent deletion if products are assigned to this subcategory
    const productCount = await Product.countDocuments({
      subCategory: subCategory._id,
    });

    if (productCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete this subcategory because products are assigned to it. Reassign those products first or deactivate this subcategory.",
        productCount,
      });
    }

    await SubCategory.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully.",
    });
  } catch (error) {
    console.error("Delete subcategory error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete subcategory.",
    });
  }
};
