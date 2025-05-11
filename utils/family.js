const { MessageActionRow, MessageButton, MessageEmbed, Modal, TextInputComponent } = require('discord.js');
const Ticket = require('../models/Ticket');
const Counter = require('../models/Counter');

async function family(interaction, user, type, categoryId, config) {
 // ✅ **الحصول على آخر تذكرة وزيادة الرقم**


    const lastCounter = await Counter.findOne().sort({ value: -1 });
    const newTicketNumber = lastCounter ? lastCounter.value + 1 : 1;
  

    const channel = await interaction.guild.channels.create(`🎫・${newTicketNumber}`, {
        type: 'GUILD_TEXT',
        parent: categoryId,
          topic: interaction.user.id,

        permissionOverwrites: [
            { id: interaction.guild.id, deny: ['VIEW_CHANNEL'] },
            { id: user.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
            { id: config.ADMIN_ROLE_ID, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }
        ],
        reason: `New ticket created by ${user.tag}`
    });

 // ✅ تحديث بيانات التذكرة أو إضافتها إذا لم تكن موجودة
await Ticket.findOneAndUpdate(
    { userId: user.id }, // البحث عن التذكرة الخاصة بالمستخدم
    { channelId: channel.id, status: 'open' }, // تحديث بيانات التذكرة
    { new: true, upsert: true } // إنشاء إدخال جديد إذا لم يكن موجودًا
);

     // ✅ تحديث بيانات التذكرة أو إضافتها إذا لم تكن موجودة
await Counter.findOneAndUpdate(
    { serverid: "1169464655727579207" }, // البحث عن التذكرة الخاصة بالمستخدم
    { value: newTicketNumber }, // تحديث بيانات التذكرة
);
  
    

    const closeButton = new MessageButton()
        .setCustomId('confirm_close')
        .setLabel('إغلاق التذكرة')
        .setStyle('DANGER');

    const closeWithReasonButton = new MessageButton()
        .setCustomId('close_with_reason')
        .setLabel('إغلاق مع سبب')
        .setStyle('DANGER');

     const followUpButton = new MessageButton()
        .setCustomId('follow_up')
        .setLabel('متابعة التقديم')
        .setStyle('SUCCESS'); // زر المتابعة فقط لصاحب التذكرة
  
    const actionRow = new MessageActionRow().addComponents(closeButton, closeWithReasonButton, followUpButton);

    await channel.send({
      content: `${user}\nمرحبا بك في **عائلة العربي**! 🎉\nلإتمام عملية التقديم، لا تنسَ الضغط على زر **المتابعة** لتكملة التقديم.`,
      components: [actionRow]
    });

    await interaction.update({
      content: `✅ ${user}, your ticket has been successfully created!\nYou can access it here: ${channel}`,
        components: []
    });

 

}


module.exports = { family };
