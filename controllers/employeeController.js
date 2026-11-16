import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Employee from "../models/Employee.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const loginEmployee = asyncHandler(async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const employee = await Employee.findOne({ email }).select("+passwordHash");
  if (!employee || !employee.isActive) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const validPassword = await bcrypt.compare(password, employee.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign(
    { id: employee._id.toString(), role: "employee" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  res.json({
    token,
    employee: { id: employee._id, name: employee.name, email: employee.email, role: employee.role },
  });
});

export const getCurrentEmployee = asyncHandler(async (req, res) => {
  // Check karein ke req.employee mojood hai ya nahi
  if (!req.employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  // Frontend ke liye dono structures match kar dete hain taake kabhi {} empty object na aaye
  res.json({
    id: req.employee._id || req.employee.id,
    name: req.employee.name,
    email: req.employee.email,
    role: req.employee.role || "employee",
    employee: req.employee // Nested bhi rakh liya taake agar koi purana component ise use kar raha ho toh woh bhi na phanse
  });
});