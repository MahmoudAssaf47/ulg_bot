const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'seسشيشسيسشيسشي1سش6516161يشس61616سيشي16tup',
  description: 'إعداد نظام التذاكر',
  async execute(message) {
    const bannerUrl = 'https://media.discordapp.net/attachments/1345885896825901157/1345891015613222993/background.png?ex=67c6322f&is=67c4e0af&hm=731ffb044328f82c2bb462fdbd7896dbcf160088f75f11694b8bbbf4f9478b3b&=&format=webp&quality=lossless&width=1066&height=599';

    // تصميم الـ Embed
    const embed = new MessageEmbed()
      .setColor(config.COLOR)
      .setTitle('🎟️ نظام التذاكر الرسمي')
      .setDescription(`
      **قم بفتح تذكرة إن كنت تريد <:2456redarrowdown:1212345818414194738>**\n
      > 🎉 **- الانضمام إلى العائلة**
      > 🤝 **- التقديم على التحالف معنا**
      > 🚨 **- الشكاوي على الأعضاء**
      `)
      .setImage(bannerUrl) // إضافة صورة البنر
      .setFooter({ text: 'يرجى عدم فتح تذكرة إلا عند الحاجة' });

    // زر فتح التذكرة
    const button = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('create_ticket')
        .setLabel('فتح تذكرة جديدة')
        .setStyle('PRIMARY')
        .setEmoji('🎫')
    );

    // إرسال الـ Embed مع الزر
    await message.channel.send({ embeds: [embed], components: [button] });
  }
};
