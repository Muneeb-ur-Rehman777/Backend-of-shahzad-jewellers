import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";
import { validateProductInput } from "../validators/productValidator.js";
import { setProductStock } from "../services/inventoryService.js";
import { getIO } from "../socket.js";

export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const filter = { isActive: true };

  if (req.query.category && req.query.category !== 'all') {
    filter.category = req.query.category.toLowerCase().trim();
  }

  if (req.query.tag && req.query.tag !== 'All') {
    const queryTag = req.query.tag.trim();
    filter.tag = { $regex: new RegExp(`^${queryTag}$`, "i") };
  }

  if (req.query.featured === "true") filter.featured = true;
  if (req.query.search) filter.$text = { $search: String(req.query.search) };

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
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
  });


  // NEW: Notify admin clients about the newly created product.
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
  ];

  const update = {};

  for (const key of allowed) {
    if (parsedBody[key] !== undefined) {
      if (key === "category" && typeof parsedBody[key] === "string") {
        update[key] = parsedBody[key].toLowerCase().trim();
      } else if (key === "tag" && typeof parsedBody[key] === "string") {
        update[key] = parsedBody[key].trim();
      } else {
        update[key] = parsedBody[key];
      }
    }
  }

  // CHANGED 1: Handle existing images that the user wants to keep.
  // The frontend sends these as a JSON string in FormData.
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

    // CHANGED 2: Limit the remaining existing images to five.
    if (existingImages.length > 5) {
      return res.status(400).json({
        message: "A product can have a maximum of 5 images",
      });
    }

    // CHANGED 3: Add newly uploaded images to the existing images.
    const baseUrl = process.env.SERVER_URL;

    const newImageUrls = (req.files || []).map(
      (file) => `${baseUrl}/uploads/${file.filename}`
    );

    const finalImages = [
      ...existingImages,
      ...newImageUrls,
    ];

    // CHANGED 4: Validate the final combined image count.
    if (finalImages.length > 5) {
      return res.status(400).json({
        message: "A product can have a maximum of 5 images",
      });
    }

    update.images = finalImages;
  } else if (req.files && req.files.length > 0) {
    // Fallback for requests that don't send existingImages.
    // New images replace the previous images in this case.
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
  // setProductStock emits the complete updated product exactly once.
  if (parsedBody.stock !== undefined) {
    product = await setProductStock(
      req.params.id,
      parsedBody.stock
    );
  } else if (product) {
    // Emit the complete updated product for other admin dashboards.
    getIO().to("admin-room").emit(
      "stock:updated",
      product.toObject()
    );
  } else {
    // No fields were changed: retrieve the existing product.
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