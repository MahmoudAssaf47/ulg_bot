const mongoose = require('mongoose');
const { Schema } = mongoose;

const storeSchema = new Schema({
  serverId: { type: String, required: true, unique: true },
  products: [{
    sellerId: { type: String, required: true, unique: true }, // جعل ID البائع فريدًا لكل منتج
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    stock: { type: Number, default: 1 }, // عدد النسخ المتاحة من المنتج
    category: { type: String }, // تصنيف المنتج
    addedAt: { type: Date, default: Date.now },
    preferredPaymentMethod: {
      type: String,
      required: true,
      default: 'شرعي'
    },
    messageId: { type: String, required: false },
    image: { type: String, required: false },
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Store', storeSchema);
