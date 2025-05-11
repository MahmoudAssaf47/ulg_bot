const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

module.exports = {
  name: 'send_ticket_control_message',
  description: 'إرسال رسالة لوحة التحكم الخاصة بالتذاكر',
  async execute(message, args, client) {

    const BotSettings = require('../models/bot'); // تأكد من تعديل المسار الصحيح

    let botData = await BotSettings.findOne({ botId: client.user.id });

    if (!botData) {
      botData = await BotSettings.create({
        botId: client.user.id,
        TicketMessageId: '',
        Ticketalliance: true,
        Ticketfamily: true,
        Ticketorganization: true,
        statusEnabled: true,
        blacklist: []
      });
    }

    // تعريف التذاكر المختلفة وحالتها
    const tickets = {
      alliance: {
        id: "set_apply_alliance",
        label: "التقديم على التحالف",
        status: botData.Ticketalliance,
        openText: "🟢 **مفتوح** - يمكن التقديم الآن",
        closedText: "🔴 **مغلق** - غير متاح حالياً"
      },
      family: {
        id: "set_apply_family",
        label: "التقديم على العائلة",
        status: botData.Ticketfamily,
        openText: "🟢 **مفتوح** - يمكن التقديم الآن",
        closedText: "🔴 **مغلق** - غير متاح حالياً"
      },
      organization: {
        id: "set_apply_organization",
        label: "التقديم على المنظمة",
        status: botData.Ticketorganization,
        openText: "🟢 **مفتوح** - يمكن التقديم الآن",
        closedText: "🔴 **مغلق** - غير متاح حالياً"
      }
    };

    // إنشاء الـ Embed التي تحتوي على تفاصيل التذاكر
    const embed = new MessageEmbed()
      .setDescription(`> **حالة التقديمات الحالية:**

> ${tickets.alliance.label} - ${tickets.alliance.status ? tickets.alliance.openText : tickets.alliance.closedText}
> ${tickets.family.label} - ${tickets.family.status ? tickets.family.openText : tickets.family.closedText}
> ${tickets.organization.label} - ${tickets.organization.status ? tickets.organization.openText : tickets.organization.closedText}
`)

    // إنشاء صف الأزرار الخاصة بإدارة التذاكر
    const ticketRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(tickets.alliance.id)
        .setLabel(tickets.alliance.status ? "إغلاق التقديم" : "فتح التقديم")
        .setStyle(tickets.alliance.status ? "DANGER" : "SUCCESS")
        .setEmoji(tickets.alliance.status ? "🔴" : "🟢"),
      
      new MessageButton()
        .setCustomId(tickets.family.id)
        .setLabel(tickets.family.status ? "إغلاق التقديم" : "فتح التقديم")
        .setStyle(tickets.family.status ? "DANGER" : "SUCCESS")
        .setEmoji(tickets.family.status ? "🔴" : "🟢"),
      
      new MessageButton()
        .setCustomId(tickets.organization.id)
        .setLabel(tickets.organization.status ? "إغلاق التقديم" : "فتح التقديم")
        .setStyle(tickets.organization.status ? "DANGER" : "SUCCESS")
        .setEmoji(tickets.organization.status ? "🔴" : "🟢"),

      new MessageButton()
        .setLabel("الدعم الفني")
        .setCustomId("ticket_support")
        .setStyle("SECONDARY")
        .setEmoji("🛠️")
    );

    await message.channel.send({
      embeds: [embed],
      components: [ticketRow]
    });

  },

};
