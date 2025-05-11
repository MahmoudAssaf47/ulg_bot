const mongoose = require('mongoose');

const notesSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // معرف المستخدم
  notes: [
    {
      noteId: { type: String, required: true }, // معرف فريد لكل ملاحظة
      content: { type: String, required: true }, // نص الملاحظة
      addedBy: { type: String, required: true }, // الشخص الذي أضاف الملاحظة
      addedAt: { type: Date, default: Date.now } // تاريخ الإضافة
    }
  ]
});

module.exports = mongoose.model('UserNotes', notesSchema);
