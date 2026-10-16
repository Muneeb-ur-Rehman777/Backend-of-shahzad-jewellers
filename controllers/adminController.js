import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createGuestOrder } from "../services/orderService.js";

export const loginAdmin = asyncHandler(async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // const admin = await Admin.findOne({ email }).select("+passwordHash");
  // if (!admin || !admin.isActive) {
  //   return res.status(401).json({ message: "Invalid email or password" });
  // }

  const admin = await Admin.findOne({ email }).select("+passwordHash");
  if (!admin) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const validPassword = await bcrypt.compare(password, admin.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign(
    { id: admin._id.toString(), role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  res.json({
    token,
    admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
  });
});


export async function createbranchOrder(req, res) {
  try {
    const order = await createGuestOrder({...req.body,orderSource: "branch",});

    return res.status(201).json({success: true,message: "Branch order created successfully",order,});
    
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
}


export const getCurrentAdmin = asyncHandler(async (req, res) => {
  res.json({ admin: req.admin });
});

