const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blacklistSchema = new Schema({
  userId: { type: String, required: true },
  reason: { type: String, required: true },
  addedBy: { type: String, required: true },
  addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Blacklist', blacklistSchema);
