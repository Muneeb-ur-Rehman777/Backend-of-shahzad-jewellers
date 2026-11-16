import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export async function adminAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check allowed requests for employees
    const isProductsListRequest = req.baseUrl.includes('products') && req.path === '/admin/all' && req.method === 'GET';
    const isMeRequest = req.path === '/me' || req.baseUrl.includes('admin') && req.path.includes('me');
    const isOrdersRequest = req.baseUrl.includes('orders') || req.path.includes('orders');

    if (decoded.role === "admin") {
      const admin = await Admin.findById(decoded.id).select("_id name email role isActive");
      if (!admin || !admin.isActive) {
        return res.status(401).json({ message: "Admin account is unavailable" });
      }
      req.admin = admin;
      return next();
    } 
    
    // Agar employee hai aur request /me, products list, ya orders ki hai, toh allow kar do
    else if ((isProductsListRequest || isMeRequest || isOrdersRequest) && (decoded.role === "employee" || decoded.id || decoded.employeeId)) {
      req.admin = { _id: decoded.id, role: decoded.role, name: decoded.name || "Employee" };
      return next();
    }

    return res.status(403).json({ message: "Admin access only" });

  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    next(error);
  }
}