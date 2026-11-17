
import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema(
  {
    // Subcategory name (e.g. Neck Set, Bridal Set, Kundan Set)
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // URL-friendly name (e.g. neck-set, bridal-set)
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // Parent main category (e.g. sets, bangles, earrings)
    // Main categories are defined by the developer in config/categories.js
    parentCategory: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Controls whether this subcategory is available for selection
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Allows admin to control display order
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Prevent duplicate subcategory names/slugs under the same main category
// Example: "Bridal Set" can exist under Sets, but cannot be duplicated under Sets
subCategorySchema.index(
  { parentCategory: 1, slug: 1 },
  { unique: true }
);

export default mongoose.model("SubCategory", subCategorySchema);
