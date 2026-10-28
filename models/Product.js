import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {type: String,required: true,trim: true,maxlength: 160,},

    slug: {type: String,required: true,unique: true,lowercase: true,trim: true,},

    description: {type: String,default: "",maxlength: 5000,},

    category: {type: String,required: true,lowercase: true,trim: true,
      enum: ["rings","necklaces","sets","bangles","earrings","bracelets",],
      default: "rings",
      index: true,
    },

    weight: {type: String,default: "",trim: true,},

    purity: {type: String,enum: ["22K (916)", "21K (875)", "18K (750)", ""],default: "22K (916)",},

    tag: {type: String,enum: ["Gold", "Diamond", "Other"],default: "Gold",index: true,},

    price: {type: Number,required: true,min: 0,},

    images: [{type: String,trim: true,},],

    stock: {type: Number,required: true,default: 0,min: 0,validate: Number.isInteger,},

    isActive: {type: Boolean,default: true,index: true,},

    featured: {type: Boolean,default: false,},
  },
  { timestamps: true }
);

productSchema.index({
  name: "text",
  description: "text",
  category: "text",
});

export default mongoose.model("Product", productSchema);
