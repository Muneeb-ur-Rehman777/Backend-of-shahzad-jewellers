import jwt from "jsonwebtoken";
import Employee from "../models/Employee.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const employeeAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const employee = await Employee.findById(decoded.id).select("-passwordHash");
    
    if (!employee || !employee.isActive) {
      return res.status(401).json({ success: false, message: "Not authorized, employee not found or inactive" });
    }

    req.employee = employee;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
});