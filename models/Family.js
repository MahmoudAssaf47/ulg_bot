const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  familyName: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  familyRoleId: { type: String, required: true },
  adminRoleId: { type: String, required: true },
  memberPassword: { type: String, required: true },
  adminPassword: { type: String, required: true },
  chatChannelId: { type: String, required: false },  // روم الشات
  voiceChannelId: { type: String, required: false }, // روم الصوتي
  adminChannelId: { type: String, required: true }, // روم الإدارة
  members: { type: [String], default: [] },
    admins: { type: [String], default: [] }

});

module.exports = mongoose.model('Family', familySchema);
