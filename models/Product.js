
import mongoose from "mongoose";
import { MAIN_CATEGORIES } from "../config/categories.js";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      maxlength: 5000,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "rings",
        "necklaces",
        "sets",
        "bangles",
        "earrings",
        "bracelets",
        "gents-ring",
        "ladies-ring",
        "baby-ring",
        "tops",
        "bali",
        "pendant",
        "chain",
        "mala",
      ],
    },

    // NEW: References the selected subcategory from SubCategory collection
    // Example: Product category = "sets", subCategory = Bridal Set ObjectId
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      default: null,
      index: true,
    },

    weight: {
      type: String,
      default: "",
      trim: true,
    },

    purity: {
      type: String,
      enum: ["24K (999)", "22K (916)", "21K (875)", "18K (750)", ""],
      default: "22K (916)",
    },

    // Added Silver to the existing tag options.
    tag: {
      type: String,
      enum: ["Gold", "Diamond", "Silver", "Other"],
      default: "Gold",
      index: true,
    },

    // Distinguishes new and secondhand products.
    edition: {
      type: String,
      enum: ["new", "secondhand"],
      default: "new",
    },

    // Controls website visibility.
    // true = Show product on website.
    // false = Keep product in inventory only.
    website: {
      type: Boolean,
      default: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    images: [
      {
        type: String,
        trim: true,
      },
    ],

    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: Number.isInteger,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Existing text search index preserved
productSchema.index({
  name: "text",
  description: "text",
  category: "text",
});

export default mongoose.model("Product", productSchema);
