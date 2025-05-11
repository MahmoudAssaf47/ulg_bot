const { MessageActionRow, MessageButton, MessageEmbed, Modal, TextInputComponent } = require('discord.js');

module.exports = {
  name: "applشسيشسيشسيشسيy_سشيشسيseller",
  description: "التقديم على بائع",
  async execute(message) {
    // تصميم Embed للتقديم على بائع
    const embed = new MessageEmbed()
      .setColor("#FFA500") // لون برتقالي
      .setTitle("🛒 التقديم على بائع")
      .setDescription("🔹 **إذا كنت ترغب في التقديم كبائع، اضغط على الزر أدناه.**")
      .setFooter("⚠️ تأكد من قراءة الشروط قبل التقديم.");

    // زر تقديم على بائع
    const button = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("apply_seller")
        .setLabel("📝 تقديم على بائع")
        .setStyle("SUCCESS") // زر أخضر
    );

    // إرسال الرسالة مع الزر
    await message.channel.send({ embeds: [embed], components: [button] });

  }
};
