import { Router } from "express";
import { createOrder, listOrders, updateOrderStatus } from "../controllers/orderController.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

router.post("/", createOrder);

router.get("/", adminAuth, listOrders);
router.patch("/:id/status", adminAuth, updateOrderStatus);

export default router;
