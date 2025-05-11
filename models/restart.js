const mongoose = require('mongoose');

const botStatusSchema = new mongoose.Schema({
    isRestarting: { type: Boolean, default: false }
});

module.exports = mongoose.model('Restart', botStatusSchema);
