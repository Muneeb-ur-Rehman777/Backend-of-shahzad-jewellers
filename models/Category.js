import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: 150
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      lowercase: true,
      trim: true,
      default: "rings"
    },
    type: {
      type: String,
      enum: ["gold", "diamond", "other"],
      default: "gold"
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: 0
    },
    images: {
      type: [String],
      default: []
    },
    stock: {
      type: Number,
      required: true,
      default: 10,
      min: 0
    },
    weight: {
      type: String,
      default: ""
    },
    purity: {
      type: String,
      default: "22K"
    },
    tag: {
      type: String,
      default: "Gold"
    },
    featured: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", category: "text" });

export default mongoose.model("Product", productSchema);