import mongoose from 'mongoose';

const goldRateSchema = new mongoose.Schema({
    rate24kPerGram: { type: Number, required: true },
    rate22kPerGram: { type: Number, required: true },
    rate24kPerTola: { type: Number, required: true },
    rate22kPerTola: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now }
});

const GoldRate = mongoose.model('GoldRate', goldRateSchema);
export default GoldRate;