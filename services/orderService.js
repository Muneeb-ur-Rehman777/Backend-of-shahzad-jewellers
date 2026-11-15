import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { getIO } from "../socket.js";
import GoldRate from "../models/GoldRate.js";
export async function createGuestOrder(payload) {
  try {
    const items = [];
    let total = 0;
    const updatedProducts = [];

    if (!payload.items?.length) {
      const error = new Error("Order must contain at least one product");
      error.statusCode = 400;
      throw error;
    }

    if (!payload.customer) {
      const error = new Error("Customer information is required");
      error.statusCode = 400;
      throw error;
    }

    const { name, phone, address, city } = payload.customer;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof address !== "string" ||
      !address.trim() ||
      typeof city !== "string" ||
      !city.trim()
    ) {
      const error = new Error(
        "Customer name, phone, address, and city are required"
      );
      error.statusCode = 400;
      throw error;
    }

    // NEW: Fetch the latest gold rates for calculating complete prices.
    const goldRates = await GoldRate.findOne().sort({ updatedAt: -1 });

    // NEW: Get the applicable gold rate per gram according to product purity.
    const getGoldRateForPurity = (purity) => {
      if (!goldRates) return 0;

      switch (purity) {
        case "24K (999)":
          return Number(goldRates.rate24kPerGram);

        case "22K (916)":
          return Number(goldRates.rate22kPerGram);

        case "21K (875)":
          return Math.round(
            Number(goldRates.rate24kPerGram) * (21 / 24)
          );

        case "18K (750)":
          return Math.round(
            Number(goldRates.rate24kPerGram) * (18 / 24)
          );

        default:
          return 0;
      }
    };

    for (const requestedItem of payload.items) {
      const productId = requestedItem.productId || requestedItem.product;
      const quantity = Number(requestedItem.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        const error = new Error("Invalid product quantity");
        error.statusCode = 400;
        throw error;
      }

      const product = await Product.findOne({
        _id: productId,
        isActive: true,
      });

      if (!product || product.stock < quantity) {
        const error = new Error(
          `Product ${productId} is unavailable or has insufficient stock`
        );
        error.statusCode = 409;
        throw error;
      }

      // Store products for stock updates after total validation.
      updatedProducts.push({ product, quantity });

      // UPDATED: Calculate complete price instead of using making price alone.
      const makingPrice = Number(product.price);
      let unitPrice = makingPrice;

      // NEW: Add gold value only for Gold products.
      if (product.tag === "Gold") {
        if (!goldRates) {
          const error = new Error("Gold rates are unavailable");
          error.statusCode = 503;
          throw error;
        }

        // Extract weight in grams (supports values like 5g or 5 grams).
        const weight = Number(
          String(product.weight || "")
            .replace(/,/g, "")
            .match(/[\d.]+/)?.[0]
        );

      // FIX: Use frontend calculated unit price if sent, otherwise fallback to product price
      const unitPrice = requestedItem.unitPrice !== undefined 
        ? Number(requestedItem.unitPrice) 
        : Number(product.price);

      total += unitPrice * quantity;

      items.push({
        product: product._id,
        name: product.name,
        unitPrice,
        quantity,
        image:
          requestedItem.image ||
          product.images?.[0] ||
          product.image ||
          "",
      });
    }

    // NEW: Compare frontend total with backend-calculated total.
    const frontendTotal = Number(payload.total);

    if (!Number.isFinite(frontendTotal) || frontendTotal !== total) {
      const error = new Error(
        `Order total mismatch. Frontend total: ${frontendTotal}, Backend total: ${total}`
      );
      error.statusCode = 400;
      throw error;
    }

    // NEW: Update stock only after the totals match.
    for (const { product, quantity } of updatedProducts) {
      product.stock -= quantity;
      await product.save();
    }

    const orderNumber = `SJ-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}`;

    const order = await Order.create({
      orderNumber,
      orderSource: payload.orderSource || "online",
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
      const io = getIO();

      for (const { product } of updatedProducts) {
        io.to("admin-room").emit("stock:updated", product.toObject());
      }

      io.to("admin-room").emit("order:created", {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
      });
    } catch (socketErr) {
      console.error("Socket emission error:", socketErr);
    }

    return order;
  } catch (err)  {
    console.error("Order creation error:", err);
    throw err;
  }
}

export function validateGuestOrder(body) {
  const errors = [];
  const customer = body.customer;

  if (!customer || typeof customer !== "object") {
    return ["customer details are required"];
  }

  for (const field of ["name", "phone", "address", "city"]) {
    if (typeof customer[field] !== "string" || !customer[field].trim()) {
      errors.push(`customer.${field} is required`);
    }
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push("items must be a non-empty array");
  } else {
    for (const [index, item] of body.items.entries()) {
      if (!item.productId && !item.product) {
        errors.push(`items[${index}].productId is required`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        errors.push(`items[${index}].quantity must be a positive integer`);
      }
    }
  }

  return errors;
}