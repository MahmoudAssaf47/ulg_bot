const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

module.exports = {
  name: "shasdasdasdasdow_prodsadasdasdasducts",
  description: "عرض جميع منتجات المتجر",
  async execute(message) {
    const embed = new MessageEmbed()
      .setColor("#00C896")
      .setTitle("📊 اختر نوع الحاسبة")
      .setDescription(`:pushpin: **طريقة حساب الـ XP الشخصي أو حق المزرعة (العائلة)**  
:dart: الهدف: التحقق من مستوى الخبرة الحالي والمطلوب

:green_square: **الخانه الأولى**: LVL الحالي مستوي الخبرة
:yellow_square: **الخانه الثانية**: XP الحالي  
:red_square: **الخانة الأخيرة**: XP المطلوب للمستوى التالي  

:1234: **مثال توضيحي**  
> LVL مستوي الخبرة = \`60\` 
> XP الحالي = \`830903\`  
> XP المطلوب = \`849600\`  

:bulb: استخدم مفتاح \`F5\` عشان تشوف مستواك بسهولة

:arrows_counterclockwise: تقدر تحسب XP العائلة عبر \`F4\` أو الشخصي بنفس الطريقة :sparkles:`);

    const buttonsRow = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId("farm_calculator")
          .setLabel("مزرعة العائلات")
          .setEmoji("🧑‍🌾")
          .setStyle("PRIMARY"),
          
        new MessageButton()
          .setCustomId("personal_calculator")
          .setLabel("حساب شخصي")
          .setEmoji("👤")
          .setStyle("SECONDARY")
      );

    await message.channel.send({
      embeds: [embed],
      components: [buttonsRow],
    });
  },
};