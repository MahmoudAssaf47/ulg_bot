const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

module.exports = {
  name: "selسشيشسيشسيlers_شسيسشيrسشيشسيسoشيشسom",
  description: "إنشاء رسالة روم البائعين بتصميم احترافي",
  async execute(message) {
    // تصميم Embed لروم البائعين بشكل احترافي
    const embed = new MessageEmbed()
      .setColor("#FFD700") // لون ذهبي فاخر
      .setTitle("🛒 | مركز إدارة البائعين")
      .setDescription(
        "👋 **مرحبًا بك في مركز البائعين!**\n\n" +
        "📜 **عرض معلوماتك** - لمعرفة تفاصيل حسابك كبائع.\n" +
        "🛍 **عرض منتجاتك** - لمشاهدة كل المنتجات التي أضفتها.\n" +
        "🛒 **إضافة منتج جديد** - لإنشاء منتج في متجرك.\n" +
        "📢 **إضافة عرض جديد** - لإنشاء عرض خاص وجذاب لعملائك.\n" +
        "🗑 **إزالة منتج** - لحذف منتج من متجرك.\n" +
        "📌 **عرض ملاحظاتي** - لمشاهدة ملاحظاتك حول المتجر."
      );

    // الأزرار المتاحة
    const buttons = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("view_seller_info")
        .setLabel("📜 عرض معلوماتك")
        .setStyle("PRIMARY"), // زر أزرق

      new MessageButton()
        .setCustomId("view_products")
        .setLabel("🛍 عرض منتجاتك")
        .setStyle("SECONDARY"), // زر رمادي

      new MessageButton()
        .setCustomId("view_my_notes")
        .setLabel("📌 عرض ملاحظاتي")
        .setStyle("SUCCESS") // زر أخضر
    );

    const buttons1 = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("add_new_product")
        .setLabel("🛒 إضافة منتج جديد")
        .setStyle("SUCCESS"), // زر أخضر

      new MessageButton()
        .setCustomId("add_new_offer")
        .setLabel("📢 إضافة عرض جديد")
        .setStyle("DANGER"), // زر أحمر لجذب الانتباه

      new MessageButton()
        .setCustomId("remove_product")
        .setLabel("🗑 إزالة منتج")
        .setStyle("DANGER") // زر أحمر لجذب الانتباه
    );

    // إرسال الرسالة مع الأزرار
    await message.channel.send({ embeds: [embed], components: [buttons, buttons1] });
  }
};
