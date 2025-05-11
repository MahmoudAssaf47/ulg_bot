const { MessageActionRow, MessageButton, Permissions, MessageEmbed } = require('discord.js');
const Ticket = require('../models/Ticket');
const config = require('../config');
const Counter = require('../models/Counter');

  async function alliance(interaction, user, type, categoryId, config, familyName, familyOwner, allianceReason) {
  // ✅ **الحصول على آخر تذكرة وزيادة الرقم**
  
  // ✅ البحث عن العداد الخاص بالسيرفر وزيادة رقم التذكرة أو إنشاؤه إذا لم يكن موجودًا
const counter = await Counter.findOneAndUpdate(
    { serverid: interaction.guild.id }, // البحث عن العداد الخاص بالسيرفر
    { $inc: { value: 1 } }, // زيادة رقم التذكرة بمقدار 1
    { new: true, upsert: true } // إنشاء العداد إذا لم يكن موجودًا
);
  
    const lastCounter = await Counter.findOne().sort({ value: -1 });
    const newTicketNumber = lastCounter ? lastCounter.value + 1 : 1;
  
  

    const channel = await interaction.guild.channels.create(`🎫・${newTicketNumber}`, {
      type: 'GUILD_TEXT',
      parent: categoryId, // 👈 كل نوع في فئته الخاصة
               topic: interaction.user.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [Permissions.FLAGS.VIEW_CHANNEL] },
        { id: user.id, allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES] },
        { id: config.ADMIN_ROLE_ID, allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES] }
      ],
      reason: `New ticket created by ${user.tag}`
    });

  
 // ✅ تحديث بيانات التذكرة أو إضافتها إذا لم تكن موجودة
await Ticket.findOneAndUpdate(
    { userId: user.id }, // البحث عن التذكرة الخاصة بالمستخدم
    { channelId: channel.id, status: 'open' }, // تحديث بيانات التذكرة
    { new: true, upsert: true } // إنشاء إدخال جديد إذا لم يكن موجودًا
);

    

   
    // 🔹 زر إغلاق التذكرة
     
    const closeButton = new MessageButton()
        .setCustomId('confirm_close')
        .setLabel('إغلاق التذكرة')
        .setStyle('DANGER');

    const closeWithReasonButton = new MessageButton()
        .setCustomId('close_with_reason')
        .setLabel('إغلاق مع سبب')
        .setStyle('DANGER');

    const claimButton = new MessageButton()
        .setCustomId('claim_ticket')
        .setLabel('استلام التذكرة')
        .setStyle('PRIMARY');
    
    
const embed = new MessageEmbed()
    .setTitle('🤝 **طلب تحالف جديد - قيد المراجعة**')
    .setColor('#0077cc')
    .setDescription(
        `📜 **سبب تقديم التحالف:**\n` +
        `>>> ${allianceReason || '❌ لم يتم تقديم سبب واضح.'}\n\n` +
        `⚠️ **الرجاء عدم إرسال أي رسائل إضافية وانتظار رد الإدارة. سيتم مراجعة الطلب قريبًا.**`
    )
    .addFields([
        { name: '🏰 **اسم العائلة:**', value: `🏡 ${familyName || '❌ غير متوفر'}`, inline: true },
        { name: '👑 **مالك العائلة:**', value: `🤴 ${familyOwner || '❌ غير متوفر'}`, inline: true },
        { name: '📅 **تاريخ التقديم:**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ])
    .setFooter('🔍 يتم مراجعة الطلبات وفقًا لقوانين اللعبة. نشكرك على تعاونك!')
    .setTimestamp();
    
    const actionRow = new MessageActionRow().addComponents(closeButton, closeWithReasonButton, claimButton);

    await channel.send({
        content: `${user} <@&${config.ADMIN_ROLE_ID}>`,
        embeds: [embed],
        components: [actionRow]
    });

    // 🔹 تحديث رد المستخدم لإبلاغه بنجاح العملية
    await interaction.update({
      content: `✅ ${user}, your ticket has been successfully created!\nYou can access it here: ${channel}`,
        components: []
    });
}


module.exports = { alliance };
