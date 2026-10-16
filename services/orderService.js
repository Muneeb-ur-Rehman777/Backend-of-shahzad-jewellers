import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { getIO } from "../socket.js";

export async function createGuestOrder(payload) {
  try {
    const items = [];
    let total = 0;

    for (const requestedItem of payload.items) {

      const product = await Product.findOne({
        _id: requestedItem.productId,
        isActive: true,
      });

      if (!product || product.stock < requestedItem.quantity) {
        const error = new Error(
          `Product ${requestedItem.productId} is unavailable or has insufficient stock`
        );
        error.statusCode = 409;
        throw error;
      }

      product.stock -= requestedItem.quantity;
      await product.save();

      const lineTotal = product.price * requestedItem.quantity;
      total += lineTotal;
      items.push({
        product: product._id,
        name: product.name,
        unitPrice: product.price,
        quantity: requestedItem.quantity,
      });
    }

    const orderNumber = `SJ-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const order = await Order.create({
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
    });

    try {
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
    } catch (socketErr) {
      console.error("Socket emission error:", socketErr);
    }

    return order;
  } catch (err) {
    console.error("Order creation error:", err);
    throw err;
  }
}
