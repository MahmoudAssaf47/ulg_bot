const mongoose = require('mongoose');
const { Schema } = mongoose;

const sellerSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  salesCount: { type: Number, default: 0 },
  warningsCount: { type: Number, default: 0 },
  reportsCount: { type: Number, default: 0 },
  productsOffered: { type: Number, default: 0 },
  availableProducts: { type: Number, default: 0 },
  totalSellerProducts: { type: Number, default: 0 }, // تمت الإضافة هنا
  averageRating: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  notes: [{
    noteId: { type: String, required: true },
    content: { type: String, required: true },
    addedBy: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
  }],
  offers: [{
    title: { type: String, required: true },
    description: { type: String },
    discount: { type: Number },
    validUntil: { type: Date },
    preferredPaymentMethod: {
      type: String,
      enum: ['شرعي', 'غير شرعي', 'كلاهما'],
      required: true,
      default: 'شرعي'
    }
  }],
  warnings: [{
    message: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }],
  ratings: [{
    userId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  transactions: [{
    type: { type: String, required: true },
    details: { type: String },
    date: { type: Date, default: Date.now },
    performedBy: { type: String, required: true }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Seller', sellerSchema);
