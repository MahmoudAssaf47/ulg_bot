const { MessageActionRow, MessageButton, MessageEmbed, Modal, TextInputComponent } = require('discord.js');

module.exports = {
  name: 'car_gيشسيشسيarشسيشسيسشage_sسشيشسيشسيystem',
  description: 'نظام تسجيل السيارات عند إدخالها وإخراجها من الكراج',
  async execute(message) {
    // تصميم الـ Embed
    const embed = new MessageEmbed()
      .setColor('#2F3136') // اللون الداكن
      .setTitle('🚗✨ نظام تسجيل السيارات ✨🚗')
      .setDescription(`
**من فضلك، قم بالضغط على الزر التالي لتسجيل دخول أو خروج السيارة من الكراج.**  
      `)
      .setFooter({ text: 'اضغط على الزر لتسجيل السيارة' });

    // زر تسجيل السيارة
    const button = new MessageActionRow().addComponents(
       new MessageButton()
        .setCustomId('register_car')
        .setLabel('🚗 تسجيل السيارة')
        .setStyle('PRIMARY'), // لون الزر أزرق
    );

    // إرسال الـ Embed مع الزر
    await message.channel.send({ embeds: [embed], components: [button] });
  }
};
