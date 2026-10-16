import express from 'express';
import GoldRate from '../models/GoldRate.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const latestRate = await GoldRate.findOne().sort({ updatedAt: -1 });
        if (!latestRate) {
            return res.status(404).json({ message: 'No gold rates found. Please set them from admin panel.' });
        }
        res.status(200).json(latestRate);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { rate24kPerGram, rate22kPerGram, rate24kPerTola, rate22kPerTola } = req.body;

        const newGoldRate = new GoldRate({
            rate24kPerGram,
            rate22kPerGram,
            rate24kPerTola,
            rate22kPerTola,
            updatedAt: Date.now()
        });

        const savedRate = await newGoldRate.save();
        res.status(201).json({ message: 'Gold rates updated successfully!', data: savedRate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;