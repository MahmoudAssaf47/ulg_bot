const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

module.exports = {
  name: "shasdasdasdasdasdow_dasdasdprodsadasdsadasucts",
  description: "عرض جميع منتجات المتجر",
  async execute(message) {
    const embed = new MessageEmbed()
      .setColor("#00FF00")
      .setTitle("🛒 منتجات المتجر")
      .setDescription("🔻 **اختر نوع المنتج لعرض المنتجات الخاصة به، أو اعرض كل المنتجات.**");

    const categories = [
{ id: "filter_type_خشب", label: "🪵 خشب", style: "PRIMARY" },
{ id: "filter_type_دجاج", label: "🐔 دجاج", style: "SECONDARY" },
{ id: "filter_type_سمك", label: "🐟 سمك", style: "SECONDARY" },
{ id: "filter_type_خضروات", label: "🥦 خضروات", style: "SECONDARY" },
{ id: "filter_type_نفط", label: "🛢️ نفط", style: "SECONDARY" },
{ id: "filter_type_قماش", label: "🧵 قماش", style: "SECONDARY" },
{ id: "filter_type_معادن", label: "⛓️ معادن", style: "SECONDARY" },
{ id: "filter_type_ممنوعات", label: "🚫 ممنوعات", style: "DANGER" },
{ id: "filter_type_أسلحة", label: "🔫 أسلحة", style: "DANGER" },
{ id: "filter_type_أخرى", label: "📁 أخرى", style: "SECONDARY" },

      { id: "show_products", label: "📋 كل المنتجات", style: "SECONDARY" },

    ];

    const rows = [];
    let currentRow = new MessageActionRow();

    for (const category of categories) {
      if (currentRow.components.length === 5) {
        rows.push(currentRow);
        currentRow = new MessageActionRow();
      }

      currentRow.addComponents(
        new MessageButton()
          .setCustomId(category.id)
          .setLabel(category.label)
          .setStyle("SECONDARY")
      );
    }

    // إضافة آخر صف لو فيه أزرار متبقية
    if (currentRow.components.length > 0) {
      rows.push(currentRow);
    }

    await message.channel.send({ embeds: [embed], components: rows });
  },
};
