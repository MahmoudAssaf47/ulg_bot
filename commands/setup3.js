const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

module.exports = {
  name: 'seسشيشسيشسيشسيشسيشسيشسيشسيشسيشسtup3',
  description: 'إعداد نظام التفعيل الرسمي',
  async execute(message) {
    // تصميم الـ Embed
    const embed = new MessageEmbed()
      .setColor('#2F3136') // لون الداكن مثل الصورة
      .setTitle('نظام التفعيل الرسمي 🟦')
      .setDescription(`
مرحبًا بكم في نظام التفعيل الرسمي الخاص بالسيرفر، إليكم شرح مبسط عن كيفية استخدام النظام:

**1. اختيار العضو**  
عند الضغط على زر "اختيار العضو"، سيتم عرض قائمة بالأعضاء الذين فعلت لهم عمليات الترقية أو التخفيض أو التردد عليهم.

**2. الإزالة**  
يمكنك إزالة العضو من النظام الرسمي إذا لزم الأمر.
      `)
      .setFooter({ text: 'يرجى استخدام النظام بحكمة!' });

    // زر "اختيار العضو"
    const button = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('members')
        .setLabel('اختيار العضو')
        .setStyle('DANGER') // لون أحمر مثل الصورة
    );

    // إرسال الـ Embed مع الزر
    await message.channel.send({ embeds: [embed], components: [button] });
  }
};
