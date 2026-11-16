import express from 'express';
import GoldRate from '../models/GoldRate.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route: Rates dekhne ke liye (Sab ke liye open)
router.get('/', async (req, res) => {
    try {
        const latestRate = await GoldRate.findOne().sort({ updatedAt: -1 });
        if (!latestRate) {
            return res.status(404).json({ message: 'No gold rates found.' });
        }
        res.status(200).json(latestRate);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Protected route: Sirf Admin rates update kar sakta hai (Employee blocked)
router.post('/', protect, async (req, res) => {
    try {
        // Yeh check ensure karega ke agar request bhejne wala employee hai, toh foran block kar dein
        if (req.employee || req.user?.role === 'employee') {
            return res.status(403).json({ 
                message: 'Access denied. Employees are not authorized to update gold rates.' 
            });
        }

        const { 
            rate24kPerGram, 
            rate22kPerGram, 
            rate24kPerTola, 
            rate22kPerTola,
            rate21kPerTola,
            rate21kPerGram,
            rate18kPerTola,
            rate18kPerGram
        } = req.body;

        const newGoldRate = new GoldRate({
            rate24kPerGram,
            rate22kPerGram,
            rate24kPerTola,
            rate22kPerTola,
            rate21kPerTola: rate21kPerTola || Math.round(Number(rate24kPerTola) * (21/24)),
            rate21kPerGram: rate21kPerGram || Math.round((Number(rate24kPerTola) * (21/24)) / 11.664),
            rate18kPerTola: rate18kPerTola || Math.round(Number(rate24kPerTola) * (18/24)),
            rate18kPerGram: rate18kPerGram || Math.round((Number(rate24kPerTola) * (18/24)) / 11.664),
            updatedAt: Date.now()
        });

        const savedRate = await newGoldRate.save();
        res.status(201).json({ message: 'Gold rates updated successfully!', data: savedRate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;