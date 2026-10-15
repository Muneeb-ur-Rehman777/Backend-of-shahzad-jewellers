import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { getIO } from "../socket.js";

export async function createGuestOrder(payload) {
  try {
    const items = [];
    let total = 0;

    for (const requestedItem of payload.items) {
      // Product barbaaduu (Yoo hin argamne error hin darbuu, fallback fayyadamuuf)
      let product = await Product.findOne({
        _id: requestedItem.productId,
        isActive: true,
      });

      let unitPrice = requestedItem.unitPrice || 1000;
      let itemName = requestedItem.name || "Jewellery Item";

      if (product) {
        unitPrice = product.price;
        itemName = product.name;
        if (product.stock >= requestedItem.quantity) {
          product.stock -= requestedItem.quantity;
          await product.save();
        }
      }

      const lineTotal = unitPrice * requestedItem.quantity;
      total += lineTotal;
      items.push({
        product: product ? product._id : requestedItem.productId,
        name: itemName,
        unitPrice: unitPrice,
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
      total: payload.total || total,
      notes: payload.notes || "",
    });

    try {
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