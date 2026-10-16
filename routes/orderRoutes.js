import { Router } from "express";
import { createOrder, listOrders, updateOrderStatus, } from "../controllers/orderController.js";
import { adminAuth } from "../middleware/adminAuth.js";
import {createbranchOrder} from "../controllers/adminController.js";

const router = Router();

router.post("/", createOrder);

router.post("/createorder",adminAuth,createbranchOrder);

router.get("/", adminAuth, listOrders);
router.patch("/:id/status", adminAuth, updateOrderStatus);

export default router;
