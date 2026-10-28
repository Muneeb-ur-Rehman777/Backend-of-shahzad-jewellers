import { Router } from "express";
import {
  listProducts, getProduct, createProduct, updateProduct,
  deleteProduct, changeStock,
} from "../controllers/productController.js";
import { adminAuth } from "../middleware/adminAuth.js";
import upload from "../config/multer.js";

const router = Router();

router.get("/", listProducts);
router.get("/:id", getProduct);

router.post("/", adminAuth, upload.array("images", 5), createProduct);

router.put("/:id", adminAuth, upload.array("images", 5), updateProduct);
router.patch("/:id", adminAuth, upload.array("images", 5), updateProduct);

router.patch("/:id/stock", adminAuth, changeStock);
router.delete("/:id", adminAuth, deleteProduct);

export default router;