import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";
import { validateProductInput } from "../validators/productValidator.js";
import { setProductStock } from "../services/inventoryService.js";
import { getIO } from "../socket.js";
import SubCategory from "../models/SubCategory.js";
import Order from "../models/Order.js"; // Order model imported for most delivered sorting
import mongoose from "mongoose";

export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));

  // Public website only displays active products
  // that are marked for website visibility.
  const filter = {
    isActive: true,
    website: true,
  };

  // YAHAN YE NEW CONDITION ADD KARI HAI:
  if (req.query.edition) {
    filter.edition = req.query.edition.toLowerCase().trim();
  } else {
    filter.edition = "new";
  }

  if (req.query.category && req.query.category !== "all") {
    filter.category = req.query.category.toLowerCase().trim();
  }

  // YAHAN NEW SUBCATEGORY FILTER ADD HUA HAI:
  if (req.query.subcategory && req.query.subcategory !== "all") {
    const subCatDoc = await SubCategory.findOne({ slug: req.query.subcategory.toLowerCase().trim() });
    if (subCatDoc) {
      filter.subCategory = subCatDoc._id;
    } else {
      filter.subCategory = req.query.subcategory;
    }
  }

  if (req.query.tag && req.query.tag !== "All") {
    const queryTag = req.query.tag.trim();
    filter.tag = { $regex: new RegExp(`^${queryTag}$`, "i") };
  }

  if (req.query.featured === "true") {
    filter.featured = true;
  }

  if (req.query.search) {
    filter.$text = { $search: String(req.query.search) };
  }

  // MOST DELIVERED / ORDER FREQUENCY SORTING LOGIC
  let products = [];
  let total = 0;

  if (req.query.sortBy === "most-delivered" || req.query.bestSelling === "true") {
    // Step 1: Aggregate delivered orders
    const topOrderedProducts = await Order.aggregate([
      { $match: { $or: [{ status: "delivered" }, { status: "Delivered" }, { orderStatus: "delivered" }] } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSold: -1 } }
    ]);

    const orderedProductIds = topOrderedProducts.map(p => p._id);

    // Step 2: Fetch strictly those products that have actual deliveries, sorted by most ordered quantity
    const specificFilter = { ...filter, _id: { $in: orderedProductIds } };
    
    const matchedProducts = await Product.find(specificFilter).populate("subCategory", "name slug");
    
    products = orderedProductIds
      .map(id => matchedProducts.find(p => p._id.toString() === id.toString()))
      .filter(Boolean)
      .slice((page - 1) * limit, page * limit);

    total = orderedProductIds.length;
  } else {
    // Standard listing with creation date sorting
    const [fetchedProducts, fetchedTotal] = await Promise.all([
      Product.find(filter)
        .populate("subCategory", "name slug")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      Product.countDocuments(filter),
    ]);

    products = fetchedProducts;
    total = fetchedTotal;
  }

  res.json({
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// NEW: Admin product listing controller.
// Returns ALL products, including inactive and inventory-only products.
export const listAdminProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));

  // No default isActive or website filter.
  // Admin can see active, inactive, website, and inventory-only products.
  const filter = {};

  if (req.query.category && req.query.category !== "all") {
    filter.category = req.query.category.toLowerCase().trim();
  }

  if (req.query.tag && req.query.tag !== "All") {
    const queryTag = req.query.tag.trim();
    filter.tag = { $regex: new RegExp(`^${queryTag}$`, "i") };
  }

  if (req.query.featured === "true") {
    filter.featured = true;
  }

  if (req.query.search) {
    filter.$text = { $search: String(req.query.search) };
  }

  // Optional admin filters for active/inactive and website visibility.
  if (req.query.isActive === "true") {
    filter.isActive = true;
  } else if (req.query.isActive === "false") {
    filter.isActive = false;
  }

  if (req.query.website === "true") {
    filter.website = true;
  } else if (req.query.website === "false") {
    filter.website = false;
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("subCategory", "name slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),

    Product.countDocuments(filter),
  ]);

  res.json({
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("subCategory", "name slug");

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json({ product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL

  // Handle uploaded images.
  const imageUrls = req.files && req.files.length > 0
    ? req.files.map(
      (file) => `${baseUrl}/uploads/${file.filename}`
    )
    : [];

  const normalizedCategory = req.body.category
    ? req.body.category.toLowerCase().trim()
    : "rings";

  const subCategoryId = req.body.subCategory?.trim() || "";

  // Validate subcategory ID and its relationship with the main category.
  let selectedSubCategory = null;

  if (subCategoryId) {
    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      return res.status(400).json({
        message: "Invalid subcategory ID.",
      });
    }

    selectedSubCategory = await SubCategory.findOne({
      _id: subCategoryId,
      parentCategory: normalizedCategory,
      isActive: true,
    });

    if (!selectedSubCategory) {
      return res.status(400).json({
        message:
          "Selected subcategory does not belong to the selected category or is inactive.",
      });
    }
  }

  const body = {
    ...req.body,
    category: normalizedCategory,
    subCategory: selectedSubCategory
      ? selectedSubCategory._id
      : null,
    images: imageUrls,
    price: Number(req.body.price),

    // Preserve zero stock instead of replacing it with 10.
    stock:
      req.body.stock === undefined || req.body.stock === ""
        ? 10
        : Number(req.body.stock),

    featured:
      req.body.featured === undefined
        ? undefined
        : req.body.featured === "true",

    isActive:
      req.body.isActive === undefined
        ? undefined
        : req.body.isActive === "true",

    edition: req.body.edition || "new",

    website:
      req.body.website === undefined
        ? true
        : req.body.website === "true",
  };

  const errors = validateProductInput(body);

  if (errors.length) {
    console.log("Validation Errors:", errors);

    return res.status(400).json({
      message: "Invalid product data",
      errors,
    });
  }

  const baseSlug = slugify(body.slug || body.name);

  const uniqueSlug = `${baseSlug}-${Date.now()
    .toString()
    .slice(-4)}`;

  const selectedTag = body.tag
    ? body.tag.trim()
    : "Gold";

  const product = await Product.create({
    name: body.name.trim(),
    slug: uniqueSlug,
    description: body.description || "",

    category: body.category,

    // NEW: Save the selected subcategory reference.
    subCategory: body.subCategory,

    price: body.price,
    images: imageUrls,
    stock: body.stock,
    weight: body.weight || "",
    purity: body.purity || "22K (916)",
    tag: selectedTag,

    featured: body.featured ?? false,
    isActive: body.isActive ?? true,

    edition: body.edition,
    website: body.website,
  });

  // Notify admin clients about the newly created product.
  getIO()
    .to("admin-room")
    .emit("product:created", product.toObject());

  res.status(201).json({ product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const parsedBody = {
    ...req.body,

    price:
      req.body.price !== undefined
        ? Number(req.body.price)
        : undefined,

    stock:
      req.body.stock !== undefined
        ? Number(req.body.stock)
        : undefined,

    featured:
      req.body.featured !== undefined
        ? req.body.featured === "true" || req.body.featured === true
        : undefined,

    isActive:
      req.body.isActive !== undefined
        ? req.body.isActive === "true" || req.body.isActive === true
        : undefined,

    website:
      req.body.website !== undefined
        ? req.body.website === "true" || req.body.website === true
        : undefined,

    // NEW: Subcategory ID from FormData.
    subCategory:
      req.body.subCategory !== undefined
        ? req.body.subCategory.trim()
        : undefined,
  };

  const errors = validateProductInput(parsedBody, { partial: true });

  if (errors.length) {
    console.log("Validation Errors:", errors);

    return res.status(400).json({
      message: "Invalid product data",
      errors,
    });
  }

  const allowed = [
    "name",
    "description",
    "category",
    "price",
    "featured",
    "isActive",
    "weight",
    "purity",
    "tag",
    "edition",
    "website",
  ];

  const update = {};

  for (const key of allowed) {
    if (parsedBody[key] !== undefined) {
      if (key === "category" && typeof parsedBody[key] === "string") {
        update[key] = parsedBody[key].toLowerCase().trim();
      } else if (key === "tag" && typeof parsedBody[key] === "string") {
        update[key] = parsedBody[key].trim();
      } else if (key === "edition" && typeof parsedBody[key] === "string") {
        update[key] = parsedBody[key].trim().toLowerCase();
      } else {
        update[key] = parsedBody[key];
      }
    }
  }

  // NEW: Validate and update the selected subcategory.
  if (parsedBody.subCategory !== undefined) {
    if (!parsedBody.subCategory) {
      // Admin selected "No subcategory".
      update.subCategory = null;
    } else {
      // Get the category that will belong to this product.
      let productCategory = update.category;

      if (!productCategory) {
        const existingProduct = await Product.findById(req.params.id)
          .select("category");

        if (!existingProduct) {
          return res.status(404).json({
            message: "Product not found",
          });
        }

        productCategory = existingProduct.category;
      }

      // Ensure the selected subcategory belongs to this main category.
      const selectedSubCategory = await SubCategory.findOne({
        _id: parsedBody.subCategory,
        parentCategory: productCategory,
        isActive: true,
      });

      if (!selectedSubCategory) {
        return res.status(400).json({
          message: "Invalid subcategory for the selected main category.",
        });
      }

      update.subCategory = selectedSubCategory._id;
    }
  }

  // Handle existing images that the user wants to keep.
  let existingImages = [];

  if (req.body.existingImages !== undefined) {
    try {
      existingImages = JSON.parse(req.body.existingImages);
    } catch (error) {
      return res.status(400).json({
        message: "Invalid existing images data",
      });
    }

    if (
      !Array.isArray(existingImages) ||
      !existingImages.every((image) => typeof image === "string")
    ) {
      return res.status(400).json({
        message: "Existing images must be an array of image URLs",
      });
    }

    if (existingImages.length > 5) {
      return res.status(400).json({
        message: "A product can have a maximum of 5 images",
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL

    const newImageUrls = (req.files || []).map(
      (file) => `${baseUrl}/uploads/${file.filename}`
    );

    const finalImages = [
      ...existingImages,
      ...newImageUrls,
    ];

    if (finalImages.length > 5) {
      return res.status(400).json({
        message: "A product can have a maximum of 5 images",
      });
    }

    update.images = finalImages;
  } else if (req.files && req.files.length > 0) {
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL

    update.images = req.files.map(
      (file) => `${baseUrl}/uploads/${file.filename}`
    );
  }

  if (parsedBody.name !== undefined) {
    update.name = parsedBody.name.trim();

    update.slug =
      slugify(parsedBody.slug || parsedBody.name) +
      "-" +
      Date.now().toString().slice(-4);
  } else if (parsedBody.slug !== undefined) {
    update.slug = slugify(parsedBody.slug);
  }

  let product;

  // Update normal product fields and images.
  if (Object.keys(update).length > 0) {
    product = await Product.findByIdAndUpdate(
      req.params.id,
      update,
      {
        new: true,
        runValidators: true,
      }
    ).populate("subCategory", "name slug");

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }
  }

  // Update stock separately through inventoryService.
  if (parsedBody.stock !== undefined) {
    product = await setProductStock(
      req.params.id,
      parsedBody.stock
    );

    // Return the populated subcategory in the response.
    await product.populate("subCategory", "name slug");
  } else if (product) {
    getIO().to("admin-room").emit(
      "stock:updated",
      product.toObject()
    );
  } else {
    product = await Product.findById(req.params.id)
      .populate("subCategory", "name slug");

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }
  }

  res.json({ product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // NEW: Notify admin clients that this product has been archived.
  getIO().to("admin-room").emit("product:deleted", {
    productId: product._id.toString(),
  });

  res.json({ message: "Product archived successfully" });
});

export const changeStock = asyncHandler(async (req, res) => {
  const stock = req.body.stock;

  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ message: "Stock must be a non-negative integer" });
  }

  const product = await setProductStock(req.params.id, stock);
  res.json({ message: "Inventory updated successfully", product });
});