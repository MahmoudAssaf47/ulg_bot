const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  acceptedReports: { type: Number, default: 0 },
  pendingReports: { type: Number, default: 0 },
  dailyReports: { type: Number, default: 0 },
  rejectedReports: { type: Number, default: 0 },
  crimeReports: { type: Number, default: 0 }, 
  agricultureReports: { type: Number, default: 0 },
  User_name: { type: String, default: "" },
  User_id: { type: String, default: "" }, 
  User_name_game: { type: String, default: "" },
  loginDate: { type: Date, default: Date.now },
  lastPromotionDate: { type: Date, default: null }, // ✅ تاريخ آخر ترقية
  lastResetDate: { type: Date, default: null } // ✅ تاريخ آخر تصفير
});

module.exports = mongoose.model('Application_user', applicationSchema);
