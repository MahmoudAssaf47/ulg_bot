const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

module.exports = {
  name: 'famiيشسيسشيسشسشيشسيly_سشيشسيcسشيشسيشسيشسontrol',
  description: 'إدارة العائلات في السيرفر',
  async execute(message, args, client) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('❌ لا تملك الصلاحيات لاستخدام هذا الأمر!');
    }

    const embed = new MessageEmbed()
      .setTitle('🏡 إدارة العائلات')
      .setDescription('`🏠 إضافة عائلة` - إنشاء مجموعة عائلية جديدة.\n`📋 عرض العائلات` - عرض جميع العائلات المسجلة.\n`❌ إزالة عائلة` - حذف عائلة معينة.')
      .setColor('#5865F2');

    const row = new MessageActionRow().addComponents(
      new MessageButton().setCustomId('add_family').setLabel('🏠 إضافة عائلة').setStyle('SUCCESS'),
      new MessageButton().setCustomId('list_families').setLabel('📋 عرض العائلات').setStyle('PRIMARY'),
      new MessageButton().setCustomId('remove_family').setLabel('❌ إزالة عائلة').setStyle('DANGER')
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
};
