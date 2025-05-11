const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

module.exports = {
  name: "cussadsadastomdsad_order_reqasdasdsadsauest",
  description: "زر لطلب طلبية مخصصة",
  async execute(message) {
    const embed = new MessageEmbed()
      .setColor("#0099ff")
      .setTitle("📦 طلبية مخصصة")
      .setDescription("اضغط الزر بالأسفل لو حابب تطلب طلبية مخصصة حسب احتياجك.");

    const buttonRow = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId("custom_order")
          .setLabel("📦 اطلب طلبية مخصصة")
          .setStyle("PRIMARY")
      );

    await message.channel.send({
      embeds: [embed],
      components: [buttonRow],
    });
  },
};
