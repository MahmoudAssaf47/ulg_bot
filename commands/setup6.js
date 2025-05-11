const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

module.exports = {
  name: 'رفع_التسشيشسيشسيشسيشسيشسيقارير',
  description: 'إعداد نظام رفع التقارير المختلفة، بما في ذلك تقرير الدفع 500 ألف',
  async execute(message) {
    // تصميم الـ Embed
    const embed = new MessageEmbed()
      .setColor('#2F3136')
      .setTitle('📌✨ نظام رفع التقارير ✨📌')
      .setDescription(`  
🔹 **لرفع تقرير جديد** (مثل تقرير مزرعة أو إجرام أو يومي)، اضغط على زر **"📤 رفع تقرير"**.

💰 **لرفع تقرير دفع 500 ألف إلى بنك العائلة**، اضغط على زر **"💰 تقرير الدفع"**.

📑 **لعرض جميع تقاريرك السابقة**، اضغط على زر **"📑 عرض تقاريري"**.

📜 **لعرض ملاحظاتك الخاصة**، اضغط على زر **"📜 عرض ملاحظاتي"**.

⌛ سيتم مراجعة تقريرك في أسرع وقت ممكن من قبل فريق الإدارة.
      `)
      .setFooter({ text: '📌 اختر الإجراء المطلوب بالضغط على أحد الأزرار أدناه' });

    // إنشاء مجموعة الأزرار
    const buttons = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('submit_report')
        .setLabel('📤 رفع تقرير')
        .setStyle('PRIMARY'),

      new MessageButton()
        .setCustomId('submit_payment_report')
        .setLabel('💰 تقرير الدفع')
        .setStyle('SUCCESS'),

      new MessageButton()
        .setCustomId('view_reports')
        .setLabel('📑 عرض تقاريري')
        .setStyle('SECONDARY'),

      new MessageButton()
        .setCustomId('view_notes')
        .setLabel('📜 عرض ملاحظاتي')
        .setStyle('SECONDARY')
    );

    // إرسال الرسالة مع الأزرار
    await message.channel.send({ embeds: [embed], components: [buttons] });
  }
};