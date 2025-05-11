const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

module.exports = {
  name: "seldasdasdasdlasdasdasers_asdroom",
  description: "إنشاء رسالة روم البائعين بتصميم احترافي",
  async execute(message) {
    // تصميم Embed لروم البائعين بشكل احترافي
    const embed = new MessageEmbed()
      .setColor("#FFD700") // لون ذهبي فاخر
      .setTitle("🛒 | مركز إدارة البائعين")
      .setDescription(
        "👋 **مرحبًا بك في مركز إدارة البائعين!**\n\n" +
        "📋 **عرض جميع البائعين** - لعرض كافة البائعين المتواجدين.\n" +
        "🔍 **اختيار بائع** - لاختيار بائع معين من القائمة."
      );

    // الأزرار الخاصة بالبائعين
    const buttons2 = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("view_all_sellers")
        .setLabel("📋 عرض جميع البائعين")
        .setStyle("PRIMARY"), // زر أزرق

      new MessageButton()
        .setCustomId("select_seller")
        .setLabel("🔍 اختيار بائع")
        .setStyle("SECONDARY") // زر رمادي
    );

    // إرسال الرسالة مع الأزرار
    await message.channel.send({ embeds: [embed], components: [buttons2] });
  }
};
