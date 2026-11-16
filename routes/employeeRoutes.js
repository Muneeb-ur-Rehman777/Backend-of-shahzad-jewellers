import { Router } from "express";
import bcrypt from 'bcryptjs';
import Employee from '../models/Employee.js';
import { loginEmployee, getCurrentEmployee } from "../controllers/employeeController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Is code ko apne register/upsert route ki jagah rakh lein:
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Check if employee exists, agar hai toh update kar do, nahi toh naya bana lo
        let employee = await Employee.findOne({ email });

        if (employee) {
            employee.passwordHash = hashedPassword;
            await employee.save();
            return res.status(200).json({
                message: 'Password updated successfully!',
                employee: { email: employee.email, role: employee.role }
            });
        }

        // Agar pehle se nahi hai toh naya bana do
        employee = new Employee({
            name: 'Store Employee',
            email,
            passwordHash: hashedPassword,
            role: 'employee'
        });

        await employee.save();
        res.status(201).json({
            message: 'Employee created successfully!',
            employee: { email: employee.email, role: employee.role }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/login", loginEmployee);
router.get("/me", protect, getCurrentEmployee);

export default router;