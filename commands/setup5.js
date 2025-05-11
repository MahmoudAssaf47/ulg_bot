const { MessageActionRow, MessageButton, MessageEmbed, Modal, TextInputComponent } = require('discord.js');

module.exports = {
  name: 'سشيسشسيسشيشسيشسيشسيشسيشسيشسشيسشيشسي',
  description: 'إعداد نظام رفع تقرير دفع 500 ألف إلى بنك العائلة',
  async execute(message) {
    // تصميم الـ Embed
    const embed = new MessageEmbed()
      .setColor('#2F3136') // اللون الداكن
      .setTitle('📌✨ نظام رفع تقرير الدفع ✨📌')
      .setDescription(`
**من فضلك، قم بالضغط على الزر التالي لرفع تقرير دفع 500 ألف إلى بنك العائلة.**  
      `)
      .setFooter({ text: 'اضغط على الزر لرفع التقرير' });

    // زر رفع التقرير
    const button = new MessageActionRow().addComponents(
       new MessageButton()
        .setCustomId('submit_payment_report')
        .setLabel('📤 رفع تقرير الدفع')
        .setStyle('PRIMARY'), // لون الزر أزرقلون الزر أزرق
    );

    // إرسال الـ Embed مع الزر
    await message.channel.send({ embeds: [embed], components: [button] });
  }
};