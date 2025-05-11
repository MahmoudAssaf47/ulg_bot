const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  ratings: [
    {
      userId: { type: String, required: true }, // الشخص اللي عمل التقييم
      rating: { type: Number, required: true, min: 1, max: 5 }, // قيمة التقييم
      comment: { type: String }, // تعليق اختياري
      createdAt: { type: Date, default: Date.now }, // وقت التقييم
    },
  ],
});

module.exports = mongoose.model("TicketSup", ticketSchema);
