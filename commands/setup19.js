const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

module.exports = {
  name: "seasdasdasdasdasdasddasasdasdasdnd",
  description: "نظام رتب تفاعلي",
  async execute(message) {
    const embed = new MessageEmbed()
      .setTitle("📌 اختار القسم اللي يناسبك")
      .setDescription(`:wave: **السلام عليكم**  
 # > :hash: **Escobar Famliy**

:loudspeaker: **يرجى تخصيص حسابك حسب سبب دخولك للسيرفر:**

:shopping_cart: إذا كنت داخل **علشان المتجر والشراء والبيع**  
:family_mwgb: إذا كنت داخل **من أجل العائلة والتجمع**  
:chart_with_upwards_trend: إذا كنت داخل **لمتابعة نقاط الـ XP والتفاعل**

> # **\`سيتم اضافة الرتبة تلقائيًا\`**`);

    const roleButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("md_role_shop")
        .setLabel("🛒 المتجر")
        .setStyle("SECONDARY"),
      new MessageButton()
        .setCustomId("md_role_family")
        .setLabel("👨‍👩‍👧‍👦 العائلة")
        .setStyle("SECONDARY"),
      new MessageButton()
        .setCustomId("md_role_xp")
        .setLabel("📈 نظام الـ XP")
        .setStyle("SECONDARY")
    );

    const genderButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("md_role_man")
        .setLabel("👨 رجل")
        .setStyle("SECONDARY"),
      new MessageButton()
        .setCustomId("md_role_woman")
        .setLabel("👩‍🦰 فتاة")
        .setStyle("SECONDARY"),
      new MessageButton()
        .setLabel('الدعم الفني')
        .setStyle('LINK')
        .setURL('https://discord.com/channels/@me/1345894199282761750')
    );

    // زر سرعة البوت
    const speedButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("check_bot_speed")
        .setLabel("⏱️ سرعة البوت")
        .setStyle("PRIMARY")
    );

    await message.channel.send({
      embeds: [embed],
      components: [roleButtonRow, genderButtonRow, speedButtonRow],
    });

    await message.channel.send({
      content: `# >>> **\`لأي استفسار أو مشكلة، يُرجى التواصل مع الإدارة مباشرة\`**\n# **\`عن طريق إرسال رسالة إلى البوت، وسيتم الرد عليك في أقرب وقت ممكن\`**`,
    });
  },
};

