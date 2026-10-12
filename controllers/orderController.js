import Order from "../models/Order.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateGuestOrder } from "../validators/orderValidator.js";
import { createGuestOrder } from "../services/orderService.js";

export const createOrder = asyncHandler(async (req, res) => {
  const errors = validateGuestOrder(req.body);
  if (errors.length) return res.status(400).json({ message: "Invalid order data", errors });

  const order = await createGuestOrder(req.body);
  res.status(201).json({
    message: "Order placed successfully",
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      items: order.items,
    },
  });
});

export const listOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};

  if (req.query.status) filter.status = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({ orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const allowed = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );

  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
});
