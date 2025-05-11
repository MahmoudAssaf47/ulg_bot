const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

module.exports = {
  name: "setشسيشسيشسيشسupسشيشسشسيشسيشسيي_family",
  description: "إعداد نظام دخول العائلات المتحالفة",
  async execute(message) {
    // تصميم Embed
    const embed = new MessageEmbed()
      .setColor("#2F3136") // لون داكن
      .setTitle("🏡 نظام دخول العائلات المتحالفة")
      .setDescription(`  
إذا كنت عضوًا في **عائلة متحالفة مع عائلة العربي**، يمكنك الانضمام من خلال الضغط على الزر أدناه وإدخال **كلمة مرور التحالف** الخاصة بعائلتك.

**🔹 كيفية الانضمام:**
1️⃣ اضغط على زر **"🏡 دخول التحالف"**.  
2️⃣ قم بكتابة **كلمة مرور التحالف** الخاصة بعائلتك.  
3️⃣ سيتم التحقق من الكلمة وإضافتك تلقائيًا إذا كانت صحيحة.

⚠️ **تأكد من امتلاك كلمة المرور الصحيحة قبل المتابعة.**  
      `)
      .setFooter("📌 تأكد من كتابة كلمة المرور بدقة لضمان القبول.");

    // زر "دخول التحالف"
    const button = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("join_alliance")
        .setLabel("🏡 دخول التحالف")
        .setStyle("PRIMARY") // زر أزرق
    );

    // إرسال الرسالة مع الزر
    await message.channel.send({ embeds: [embed], components: [button] });
  },
};
