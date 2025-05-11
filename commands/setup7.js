const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

module.exports = {
  name: 'leave_syسشيسشيشسيسشيشسيشسstem',
  description: 'إعداد نظام طلب الإجازات بشكل رسمي',
  async execute(message) {
    // تصميم الـ Embed
    const embed = new MessageEmbed()
      .setColor('#0099ff') // لون أزرق مميز
      .setTitle('📅✨ نظام طلب الإجازات الرسمي ✨📅')
      .setDescription(`
🔹 **هل تحتاج إلى إجازة؟**  
✍ قم بتقديم طلب إجازة بكل سهولة عبر الضغط على زر **"📝 طلب إجازة"**.  
✅ سيتم مراجعة طلبك من قبل الإدارة، وسيتم إشعارك عند الموافقة أو الرفض.

🔄 **هل تريد إنهاء الإجازة مبكرًا؟**  
🚪 اضغط على زر **"🚪 إنهاء الإجازة"** لإنهاء إجازتك والعودة إلى العمل.

🔔 **يرجى التأكد من صحة المعلومات قبل التقديم!**  
      `)
      .setFooter({ text: 'اختر الإجراء المطلوب بالضغط على أحد الأزرار أدناه' });

    // أزرار التحكم
    const buttons = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('request_leave')
        .setLabel('📝 طلب إجازة')
        .setStyle('SUCCESS'), // لون الزر أخضر

      new MessageButton()
        .setCustomId('end_leave')
        .setLabel('🚪 إنهاء الإجازة')
        .setStyle('DANGER'), // لون الزر أحمر
    );

    // إرسال الرسالة مع الأزرار
    await message.channel.send({ embeds: [embed], components: [buttons] });
  }
};
