const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // معرف المستخدم
  leaveType: { type: String }, // نوع الإجازة
  startDate: { type: Date, required: true }, // تاريخ بدء الإجازة
  endDate: { type: Date, required: true }, // تاريخ نهاية الإجازة
  reason: { type: String, default: "لم يتم التوضيح" }, // سبب الإجازة
  status: { type: String, enum: ['قيد الانتظار', 'مقبولة', 'مرفوضة'], default: 'قيد الانتظار' }, // حالة الإجازة
  previousRoles: { type: [String], default: [] }, // حفظ الرتب السابقة للمستخدم
  createdAt: { type: Date, default: Date.now } // تاريخ تقديم الطلب
});

module.exports = mongoose.model('LeaveSystem', leaveSchema);
