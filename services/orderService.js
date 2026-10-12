import mongoose from "mongoose";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { getIO } from "../socket.js";

export async function createGuestOrder(payload) {
  // A transaction keeps stock decrements and order creation together.
  // MongoDB transactions require a replica set (Atlas supports this).
  const session = await mongoose.startSession();

  try {
    let createdOrder;

    await session.withTransaction(async () => {
      const items = [];
      let total = 0;

      for (const requestedItem of payload.items) {
        const product = await Product.findOneAndUpdate(
          {
            _id: requestedItem.productId,
            isActive: true,
            stock: { $gte: requestedItem.quantity },
          },
          { $inc: { stock: -requestedItem.quantity } },
          { new: true, session }
        );

        if (!product) {
          const error = new Error(
            `Product ${requestedItem.productId} is unavailable or has insufficient stock`
          );
          error.statusCode = 409;
          throw error;
        }

        const lineTotal = product.price * requestedItem.quantity;
        total += lineTotal;
        items.push({
          product: product._id,
          name: product.name,
          unitPrice: product.price,
          quantity: requestedItem.quantity,
        });

        // Emit only after the transaction commits (below), not inside it.
      }

      const orderNumber = `SJ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const orders = await Order.create([{
        orderNumber,
        customer: {
          name: payload.customer.name.trim(),
          phone: payload.customer.phone.trim(),
          email: (payload.customer.email || "").trim().toLowerCase(),
          address: payload.customer.address.trim(),
          city: payload.customer.city.trim(),
        },
        items,
        total,
        notes: payload.notes || "",
      }], { session });

      createdOrder = orders[0];
    });

    // Fetch committed stock values and notify connected admins.
    const order = await Order.findById(createdOrder._id);
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        getIO().to("admin-room").emit("stock:updated", {
          productId: product._id.toString(),
          stock: product.stock,
        });
      }
    }

    getIO().to("admin-room").emit("order:created", {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
    });

    return order;
  } finally {
    await session.endSession();
  }
}
