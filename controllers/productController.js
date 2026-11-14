import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";
import { validateProductInput } from "../validators/productValidator.js";
import { setProductStock } from "../services/inventoryService.js";
import { getIO } from "../socket.js";

export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));

  // UPDATED: Public website only displays active products
  // that are marked for website visibility.
  const filter = {
    isActive: true,
    website: true,
  };

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

  const [products, total] = await Promise.all([
    Product.find(filter)
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
// NEW: Admin product listing controller.
// Returns ALL products, including inactive and inventory-only products.
export const listAdminProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));

  // NEW: No default isActive or website filter.
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

  // NEW: Optional admin filters for active/inactive and website visibility.
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
  const product = await Product.findOne({ _id: req.params.id, isActive: true });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const baseUrl = process.env.SERVER_URL;

  // Handle multiple uploaded images.
  const imageUrls = req.files && req.files.length > 0
    ? req.files.map(file => `${baseUrl}/uploads/${file.filename}`)
    : [];

  const body = {
    ...req.body,
    images: imageUrls,
    price: Number(req.body.price),
    stock: Number(req.body.stock) || 10,
    featured: req.body.featured === undefined ? undefined : req.body.featured === "true",
    isActive: req.body.isActive === undefined ? undefined : req.body.isActive === "true",

    // NEW: Set product edition. Default is "new".
    edition: req.body.edition || "new",

    // NEW: Website visibility. Default is true.
    // FormData sends checkbox values as strings.
    website: req.body.website === undefined
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
  const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

  const selectedTag = body.tag ? body.tag.trim() : "Gold";

  const product = await Product.create({
    name: body.name.trim(),
    slug: uniqueSlug,
    description: body.description || "",
    category: body.category
      ? body.category.toLowerCase().trim()
      : "rings",
    price: body.price,
    images: imageUrls,
    stock: body.stock,
    weight: body.weight || "",
    purity: body.purity || "22K (916)",
    tag: selectedTag,
    featured: body.featured ?? false,
    isActive: body.isActive ?? true,

    // NEW: Save edition and website visibility.
    edition: body.edition,
    website: body.website,
  });

  // Notify admin clients about the newly created product.
  // Send the complete product so the frontend can update its product lists.
  getIO().to("admin-room").emit("product:created", product.toObject());

  res.status(201).json({ product });
});



export const updateProduct = asyncHandler(async (req, res) => {
  const parsedBody = {
    ...req.body,
    price: req.body.price !== undefined ? Number(req.body.price) : undefined,
    stock: req.body.stock !== undefined ? Number(req.body.stock) : undefined,
    featured:
      req.body.featured !== undefined
        ? req.body.featured === "true" || req.body.featured === true
        : undefined,
    isActive:
      req.body.isActive !== undefined
        ? req.body.isActive === "true" || req.body.isActive === true
        : undefined,

    // NEW: Convert website string from FormData into a Boolean.
    website:
      req.body.website !== undefined
        ? req.body.website === "true" || req.body.website === true
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
    "edition", // NEW
    "website", // NEW
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

    const baseUrl = process.env.SERVER_URL;

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
    const baseUrl = process.env.SERVER_URL;

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
    );

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
  } else if (product) {
    getIO().to("admin-room").emit(
      "stock:updated",
      product.toObject()
    );
  } else {
    product = await Product.findById(req.params.id);

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