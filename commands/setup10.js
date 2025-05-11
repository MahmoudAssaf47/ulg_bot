const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'admsadasdasdin_contrsadasdasdasdol',
  description: 'لوحة تحكم الإدمنية لاختيار الأعضاء وإدارة التأمين والإجازات والبلاك ليست',
  async execute(message) {
    const embed1 = new MessageEmbed()
      .setColor(config.COLOR)
      .setTitle('⚙️ لوحة تحكم الإدمنية')
      .setDescription(`
      **يمكنك اختيار عضو ثم تنفيذ العمليات الإدارية المتاحة عند الاختيار:**
      ✅ **- عرض الأعضاء الذين دفعوا التأمين**
      🌴 **- عرض الأعضاء في إجازة**
      ❌ **- عرض الأعضاء الذين لم يدفعوا التأمين**
      📄 **- عرض جميع تقارير الأعضاء**
      `)
      .setFooter({ text: 'يرجى استخدام الأوامر بحذر ⚠️' });

    const buttons1 = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('members')
        .setLabel('📌 اختيار عضو')
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId('paid_insurance')
        .setLabel('✅ دفعوا التأمين')
        .setStyle('SUCCESS'),
      new MessageButton()
        .setCustomId('on_vacation')
        .setLabel('🌴 الأعضاء في إجازة')
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId('not_paid_insurance')
        .setLabel('❌ لم يدفعوا التأمين')
        .setStyle('DANGER'),
      new MessageButton()
        .setCustomId('all_reports')
        .setLabel('📄 عرض جميع التقارير')
        .setStyle('SECONDARY')
    );

    await message.channel.send({ embeds: [embed1], components: [buttons1] });

    const embed2 = new MessageEmbed()
      .setColor('#FF0000')
      .setTitle('🚫 إدارة البلاك ليست')
      .setDescription(`
      ➕ **إضافة عضو** - إضافة عضو إلى البلاك ليست.
      ❌ **إزالة عضو** - إزالة عضو من البلاك ليست.
      📜 **عرض القائمة** - عرض جميع الأعضاء في البلاك ليست.
      🗑️ **مسح جميع الأعضاء** - إزالة كل المستخدمين من القائمة.
      `)
      .setFooter({ text: 'استخدم هذه الأوامر بحذر!' });

    const buttons2 = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('add_blacklist')
        .setLabel('➕ إضافة عضو')
        .setStyle('DANGER'),
      new MessageButton()
        .setCustomId('remove_blacklist')
        .setLabel('❌ إزالة عضو')
        .setStyle('DANGER'),
      new MessageButton()
        .setCustomId('list_blacklist')
        .setLabel('📜 عرض القائمة')
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId('clear_blacklist')
        .setLabel('🗑️ مسح جميع الأعضاء')
        .setStyle('DANGER')
    );

    await message.channel.send({ embeds: [embed2], components: [buttons2] });
  }
};
