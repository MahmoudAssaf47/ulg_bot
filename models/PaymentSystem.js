const mongoose = require('mongoose');

const paymentSystemSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // معرف المستخدم
  insurancePaymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' } // حالة دفع التأمين
});

module.exports = mongoose.model('PaymentSystem', paymentSystemSchema);
