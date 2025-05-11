const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  }
});

module.exports = mongoose.model('Ticket', ticketSchema);
