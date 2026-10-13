import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";
import { validateProductInput } from "../validators/productValidator.js";
import { setProductStock } from "../services/inventoryService.js";

export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const filter = { isActive: true };

  if (["gold", "diamond", "other"].includes(req.query.type)) filter.type = req.query.type;
  if (req.query.featured === "true") filter.featured = true;
  if (req.query.search) filter.$text = {$search: String(req.query.search) };

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

  // Single file handling
  const imageUrls = req.file ? [`${baseUrl}/uploads/${req.file.filename}`] : [];

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

  const product = await Product.create({
    name: body.name.trim(),
    slug: slugify(body.slug || body.name),
    description: body.description || "",
    category: null, // <-- Yahan rings ki jagah null kar diya hai taake BSONError na aaye
    type: body.type || "other",
    price: body.price,
    images: imageUrls,
    stock: body.stock,
    featured: body.featured ?? false,
    isActive: body.isActive ?? true,
  });

  res.status(201).json({ product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const errors = validateProductInput(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ message: "Invalid product data", errors });

  const allowed = ["name", "description", "category", "type", "price", "images", "featured", "isActive"];
  const update = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  if (req.body.name !== undefined) {
    update.name = req.body.name.trim();
    update.slug = slugify(req.body.slug || req.body.name);
  } else if (req.body.slug !== undefined) {
    update.slug = slugify(req.body.slug);
  }

  const product = await Product.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });

  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!product) return res.status(404).json({ message: "Product not found" });
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