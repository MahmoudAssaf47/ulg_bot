const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const BotSettings = require('../models/bot'); // تأكد من تعديل المسار الصحيح

module.exports = {
  name: 'boسشيشسيشسيشسيt_cسشيسشيoشسيسشيسشntيشسيسشيrol',
  description: 'لوحة التحكم في إعدادات البوت',
  async execute(message, args, client) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('❌ لا تملك الصلاحيات لاستخدام هذا الأمر!');
    }

    let botData = await BotSettings.findOne({ botId: client.user.id });

    if (!botData) {
      botData = await BotSettings.create({
        botId: client.user.id,
        about: '',
        statuses: [],
        controlMessageId: "",
        statusEnabled: true,
        blacklist: []
      });
    } 

    let statusEnabled = botData.statusEnabled;

    const embed1 = new MessageEmbed()
      .setTitle('⚙️ إعدادات البوت')
      .setDescription('`🖼️ تغيير صورة البوت` - تغيير الأفاتار الخاص بالبوت.\n`📝 تغيير اسم البوت` - تعديل اسم البوت.')
      .setColor('#5865F2');

    const embed2 = new MessageEmbed()
      .setTitle('📜 إدارة الحالات')
      .setDescription('`➕ إضافة حالة` - إضافة حالة جديدة للبوت.\n`📃 قائمة الحالات` - عرض جميع الحالات الحالية.\n`🗑️ حذف حالة` - إزالة حالة معينة من القائمة.\n' +
        (statusEnabled ? '`⏸️ إيقاف الحالات` - تعطيل عرض الحالات.' : '`▶️ تشغيل الحالات` - تفعيل عرض الحالات.'))
      .setColor('#5865F2');

    const embed3 = new MessageEmbed()
      .setTitle('🏡 إدارة العائلات')
      .setDescription('`🏠 إضافة عائلة` - إنشاء مجموعة عائلية جديدة.\n`📋 عرض العائلات` - عرض جميع العائلات المسجلة.\n`❌ إزالة عائلة` - حذف عائلة معينة.')
      .setColor('#5865F2');

    const embed4 = new MessageEmbed()
      .setTitle('🛠️ أدوات الإدارة')
      .setDescription('`🔄 إعادة تشغيل البوت` - إعادة تشغيل البوت بالكامل.\n`🗑️ مسح التقارير` - حذف جميع التقارير المخزنة.\n`🧹 مسح بيانات الأعضاء` - إزالة بيانات المستخدمين من قاعدة البيانات.')
      .setColor('#5865F2');

    const embed5 = new MessageEmbed()
      .setTitle('🚫 إدارة البلاك ليست')
      .setDescription('`➕ إضافة عضو` - إضافة عضو إلى البلاك ليست.\n`❌ إزالة عضو` - إزالة عضو من البلاك ليست.\n`📜 عرض القائمة` - عرض جميع الأعضاء في البلاك ليست.\n`🗑️ مسح جميع الأعضاء` - إزالة كل المستخدمين من القائمة.')
      .setColor('#FF0000');

   const embed6 = new MessageEmbed()
  .setTitle('💰 إدارة التأمين و الإجازات')
  .setDescription('`✅ دفعوا التأمين` - عرض الأعضاء الذين دفعوا التأمين.\n`🌴 الأعضاء في إجازة` - عرض الأعضاء الذين في إجازة.\n`❌ لم يدفعوا التأمين` - عرض الأعضاء الذين لم يدفعوا التأمين.')
  .setColor('#F39C12');


    const row1 = new MessageActionRow().addComponents(
      new MessageButton().setCustomId('avatar').setLabel('🖼️ تغيير صورة البوت').setStyle('PRIMARY'),
      new MessageButton().setCustomId('bot_name').setLabel('📝 تغيير اسم البوت').setStyle('PRIMARY')
    );

    const row2 = new MessageActionRow().addComponents(
      new MessageButton().setCustomId('add_status').setLabel('➕ إضافة حالة').setStyle('SUCCESS'),
      new MessageButton().setCustomId('botstatusme').setLabel('📃 قائمة الحالات').setStyle('PRIMARY'),
      new MessageButton().setCustomId('delete_status').setLabel('🗑️ حذف حالة').setStyle('DANGER'),
      new MessageButton().setCustomId('toggle_status').setLabel(statusEnabled ? '⏸️ إيقاف الحالات' : '▶️ تشغيل الحالات').setStyle(statusEnabled ? 'DANGER' : 'SUCCESS')
    );

    const row3 = new MessageActionRow().addComponents(
      new MessageButton().setCustomId('add_family').setLabel('🏠 إضافة عائلة').setStyle('SUCCESS'),
      new MessageButton().setCustomId('list_families').setLabel('📋 عرض العائلات').setStyle('PRIMARY'),
      new MessageButton().setCustomId('remove_family').setLabel('❌ إزالة عائلة').setStyle('DANGER')
    );

    const row4 = new MessageActionRow().addComponents(
      new MessageButton().setCustomId('restart_bot').setLabel('🔄 إعادة تشغيل البوت').setStyle('PRIMARY'),
      new MessageButton().setCustomId('clear_reports').setLabel('🗑️ مسح التقارير').setStyle('DANGER'),
      new MessageButton().setCustomId('clear_users_data').setLabel('🧹 مسح بيانات الأعضاء').setStyle('DANGER')
    );

    const row5 = new MessageActionRow().addComponents(
      new MessageButton().setCustomId('add_blacklist').setLabel('➕ إضافة عضو').setStyle('DANGER'),
      new MessageButton().setCustomId('remove_blacklist').setLabel('❌ إزالة عضو').setStyle('DANGER'),
      new MessageButton().setCustomId('list_blacklist').setLabel('📜 عرض القائمة').setStyle('PRIMARY'),
      new MessageButton().setCustomId('clear_blacklist').setLabel('🗑️ مسح جميع الأعضاء').setStyle('DANGER')
    );

    const row6 = new MessageActionRow().addComponents(
      new MessageButton().setCustomId('paid_insurance').setLabel('✅ دفعوا التأمين').setStyle('SUCCESS'),
      new MessageButton().setCustomId('on_vacation').setLabel('🌴 الأعضاء في إجازة').setStyle('PRIMARY'),
      new MessageButton().setCustomId('not_paid_insurance').setLabel('❌ لم يدفعوا التأمين').setStyle('DANGER')
    );

    await message.channel.send({ embeds: [embed1], components: [row1] });
    const sentMessage = await message.channel.send({ embeds: [embed2], components: [row2] });
    await message.channel.send({ embeds: [embed3], components: [row3] });
    await message.channel.send({ embeds: [embed4], components: [row4] });
    await message.channel.send({ embeds: [embed5], components: [row5] });
    await message.channel.send({ embeds: [embed6], components: [row6] });

    botData.controlMessageId = sentMessage.id;
    await botData.save();
  }
};
