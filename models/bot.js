const mongoose = require('mongoose');

const BotSettingsSchema = new mongoose.Schema({
    botId: { type: String, required: true, unique: true },
    about: { type: String, default: '' }, // حقل About Me
    statuses: [
        {
            name: { type: String, required: true },
            type: { type: String, enum: ["PLAYING", "WATCHING", "LISTENING", "COMPETING"], required: true }
        }
    ],
    statusEnabled: { type: Boolean, default: true }, // ✅ تشغيل/إيقاف الحالات
      Ticketorganization: { type: Boolean, default: true }, // ✅ تشغيل/إيقاف الحالات
    Ticketfamily: { type: Boolean, default: true }, // ✅ تشغيل/إيقاف الحالات
    Ticketalliance: { type: Boolean, default: true }, // ✅ تشغيل/إيقاف الحالات
    TicketMessageId: { type: String, default: "" }, // ✅ حفظ ID رسالة لوحة التحكم

  controlMessageId: { type: String, default: "" } // ✅ حفظ ID رسالة لوحة التحكم

});

module.exports = mongoose.model('BotSettings', BotSettingsSchema);


