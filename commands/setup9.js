const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

module.exports = {
  name: "blackasdasdasdlist_disadasdasdassplay",
  description: "عرض قائمة الأعضاء في البلاك ليست",
  async execute(message) {
    // تصميم Embed لعرض القائمة السوداء
    const embed = new MessageEmbed() 
      .setColor("#FF0000") // لون أحمر للقائمة السوداء
      .setTitle("🚫 القائمة السوداء")
      .setDescription("🔻 **لمعرفة الأعضاء المحظورين، اضغط على الزر أدناه.**")
      .setFooter("⚠️ إذا كنت ضمن القائمة وتعتقد أن هناك خطأ، يرجى التواصل مع الإدارة.");

    // زر عرض القائمة السوداء
    const button = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("list_blacklist")
        .setLabel("📜 عرض القائمة السوداء")
        .setStyle("DANGER") // زر أحمر
    );

    // إرسال الرسالة مع الزر
    await message.channel.send({ embeds: [embed], components: [button] });

  /*  // الاستجابة للزر عند الضغط عليه
    const filter = (interaction) => interaction.customId === "list_blacklist" && !interaction.user.bot;
    const collector = message.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "list_blacklist") {
        await interaction.reply({ content: "🚫 **هذه قائمة الأعضاء المحظورين:**\n- العضو 1\n- العضو 2\n- العضو 3", ephemeral: true });
      }
    });*/
  },
};
