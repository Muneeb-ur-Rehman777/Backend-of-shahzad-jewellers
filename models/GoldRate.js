import mongoose from 'mongoose';

const goldRateSchema = new mongoose.Schema({
    rate24kPerTola: { type: Number, required: true },
    rate24kPerGram: { type: Number, required: true },
    rate22kPerTola: { type: Number, required: true },
    rate22kPerGram: { type: Number, required: true },
    rate21kPerTola: { type: Number, required: false },
    rate21kPerGram: { type: Number, required: false },
    rate18kPerTola: { type: Number, required: false },
    rate18kPerGram: { type: Number, required: false },
    updatedAt: { type: Date, default: Date.now }
});

const GoldRate = mongoose.model('GoldRate', goldRateSchema);
export default GoldRate;