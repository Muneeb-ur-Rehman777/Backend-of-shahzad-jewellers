import Product from "../models/Product.js";
import { getIO } from "../socket.js";

// Admin sets a stock count.
export async function setProductStock(productId, quantity) {
  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: { stock: quantity } },
    { new: true, runValidators: true }
  );

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  // CHANGED: Emit the complete updated product.
  getIO().to("admin-room").emit("stock:updated", product.toObject());

  return product;
}

// Atomic decrement for checkout/order flows.
export async function decrementStock(productId, quantity) {
  const product = await Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: quantity }, isActive: true },
    { $inc: { stock: -quantity } },
    { new: true, runValidators: true }
  );

  if (product) {
    // CHANGED: Emit the complete updated product.
    getIO().to("admin-room").emit("stock:updated", product.toObject());
  }

  return product;
}