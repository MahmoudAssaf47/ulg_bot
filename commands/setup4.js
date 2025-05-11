const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

module.exports = {
  name: 'setupsadsadasdasdasd3',
  description: 'إعداد نظام التفعيل الرسمي',
  async execute(message) {
    // الحصول على اسم السيرفر
    const serverName = message.guild.name;

    // تصميم الـ Embed
    const embed = new MessageEmbed()
      .setColor('#2F3136') // اللون الداكن مثل الصورة
      .setTitle('📌✨ نظام التفعيل الرسمي ✨📌')
      .setDescription(`
مرحبا بك في **\`${serverName}\`**!  
لـتفعيل حسابك والحصول على الصلاحيات، اضغط على زر التسجيل ✅  

🔹 **بعد التفعيل**، ستتمكن من التفاعل مع جميع القنوات والمميزات 🎉
      `)
      .setFooter({ text: 'اضغط على الزر لتفعيل حسابك' });

    // زر التفعيل
    const button = new MessageActionRow().addComponents(
      new MessageButton() 
        .setCustomId('create_ACT')
        .setLabel('اضغط هنا لتفعيل حسابك')
        .setStyle('SUCCESS') // لون الزر أخضر مثل الصورة
    );

    // إرسال الـ Embed مع الزر
    await message.channel.send({ embeds: [embed], components: [button] });
  }
};
