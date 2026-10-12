import Product from "../models/Product.js";
import { getIO } from "../socket.js";

// Admin sets a stock count. This is not the checkout/decrement operation.
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

  getIO().to("admin-room").emit("stock:updated", {
    productId: product._id.toString(),
    stock: product.stock,
  });

  return product;
}

// Atomic decrement for a single product; useful for future checkout flows.
// Returns null if the product does not exist or has insufficient stock.
export async function decrementStock(productId, quantity) {
  const product = await Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: quantity }, isActive: true },
    { $inc: { stock: -quantity } },
    { new: true, runValidators: true }
  );

  if (product) {
    getIO().to("admin-room").emit("stock:updated", {
      productId: product._id.toString(),
      stock: product.stock,
    });
  }

  return product;
}
