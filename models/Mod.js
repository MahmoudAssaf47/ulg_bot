const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  room: { type: String, default: 'msg' }, // pending, accepted, rejected

  status: { type: String, default: 'pending' }, // pending, accepted, rejected
  msg: { type: String, default: 'msg' }, // pending, accepted, rejected
  createdAt: { type: Date, default: Date.now },
    acceptedBy: { type: String, default: null },
  allowedRepliers: { type: [String], default: [] } // إضافة هذا الحقل

});

module.exports = mongoose.model('Request', requestSchema);