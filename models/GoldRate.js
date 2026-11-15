import mongoose from 'mongoose';

const goldRateSchema = new mongoose.Schema({
    rate24kPerGram: { type: Number, required: true },
    rate22kPerTola: { type: Number, required: true },
    rate21kPerGram: { type: Number, required: false },
    rate21kPerTola: { type: Number, required: false },
    rate18kPerGram: { type: Number, required: false },
    rate18kPerTola: { type: Number, required: false },
    rate22kPerGram: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now }
});

const GoldRate = mongoose.model('GoldRate', goldRateSchema);
export default GoldRate;