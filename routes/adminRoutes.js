import { Router } from "express";
import { loginAdmin, getCurrentAdmin } from "../controllers/adminController.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

router.post("/login", loginAdmin);
router.get("/me", adminAuth, getCurrentAdmin);


export default router;
