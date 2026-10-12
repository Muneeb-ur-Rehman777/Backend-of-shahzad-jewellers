import { Router } from "express";
import { createOrder, listOrders, updateOrderStatus } from "../controllers/orderController.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

// Guest checkout; customer accounts are not required.
router.post("/", createOrder);

// Admin-only order management
router.get("/", adminAuth, listOrders);
router.patch("/:id/status", adminAuth, updateOrderStatus);

export default router;
