import { Router } from "express";
import {
  listProducts, getProduct, createProduct, updateProduct,
  deleteProduct, changeStock,
} from "../controllers/productController.js";
import { adminAuth } from "../middleware/adminAuth.js";
import upload from "../config/multer.js";

const router = Router();

// Public storefront endpoints
router.get("/", listProducts);
router.get("/:id", getProduct);

// Admin-only endpoints
router.post("/",adminAuth,upload.array("images", 5),createProduct);
router.patch("/:id", adminAuth, updateProduct);
router.patch("/:id/stock", adminAuth, changeStock);
router.delete("/:id", adminAuth, deleteProduct);

export default router;
