const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");

module.exports = {
  name: "send_application_message",
  description: "إرسال رسالة التقديم على التحالف والعائلة والمنظمة",
  async execute(message, args, client) {
    
    
        const BotSettings = require('../models/bot'); // تأكد من تعديل المسار الصحيح

    let botData = await BotSettings.findOne({ botId: client.user.id });

    if (!botData) {
      botData = await BotSettings.create({
        botId: client.user.id,
        about: '',
        statuses: [],
        controlMessageId: "",
        TicketMessageId: "",
        Ticketalliance: true,
        Ticketfamily: true,
        Ticketorganization: true,
        statusEnabled: true,
        blacklist: []
      });
    } 
    
      
    
        const applications = {
      alliance: {
        id: "apply_alliance",
        label: "التقديم على التحالف",
        status: botData.Ticketalliance,
        openText: "🟢 **مفتوح** - يمكن التقديم الآن",
        closedText: "🔴 **مغلق** - غير متاح حالياً"
      },
      family: {
        id: "apply_family",
        label: "التقديم على العائلة",
        status: botData.Ticketfamily,
        openText: "🟢 **مفتوح** - يمكن التقديم الآن",
        closedText: "🔴 **مغلق** - غير متاح حالياً"
      },
      organization: {
        id: "apply_organization",
        label: "التقديم على المنظمة",
        status: botData.Ticketorganization,
        openText: "🟢 **مفتوح** - يمكن التقديم الآن",
        closedText: "🔴 **مغلق** - غير متاح حالياً"
      }
    };
    
    const embed = new MessageEmbed()
      .setDescription(`> **حالة التقديمات الحالية:**

> ${applications.alliance.label} - ${applications.alliance.status ? applications.alliance.openText : applications.alliance.closedText}
> ${applications.family.label} - ${applications.family.status ? applications.family.openText : applications.family.closedText}
> ${applications.organization.label} - ${applications.organization.status ? applications.organization.openText : applications.organization.closedText}
`)
          .setImage("https://images-ext-1.discordapp.net/external/GBK3NNjsKy9ULt9plPYcFuSiUZ1Ts-STbT8vlWUbJ3E/%3Fsize%3D1024%26width%3D1024%26height%3D0/https/cdn.discordapp.com/banners/1345881410325712968/a_212b911b6fa0a5a57000c7c77a222ac7.gif")
      .setColor("#0099ff")

    // صف أزرار التقديم مع حالة كل منها
    const applicationRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(applications.alliance.id)
        .setLabel(applications.alliance.label)
        .setStyle(applications.alliance.status ? "SECONDARY" : "SECONDARY")
        .setEmoji(applications.alliance.status ? "🟢" : "🔴")
        .setDisabled(!applications.alliance.status),
      new MessageButton()
        .setCustomId(applications.family.id)
        .setLabel(applications.family.label)
        .setStyle(applications.family.status ? "SECONDARY" : "SECONDARY")
        .setEmoji(applications.family.status ? "🟢" : "🔴")
        .setDisabled(!applications.family.status),
      new MessageButton()
        .setCustomId(applications.organization.id)
        .setLabel(applications.organization.label)
        .setStyle(applications.organization.status ? "SECONDARY" : "SECONDARY")
        .setEmoji(applications.organization.status ? "🟢" : "🔴")
        .setDisabled(!applications.organization.status),
         new MessageButton()
        .setLabel("الدعم الفني")
        .setCustomId("ticket_support")
        .setStyle("SECONDARY")
        .setEmoji("🛠️")
    );
  

    const sentMessage = await message.channel.send({
      embeds: [embed],
      components: [applicationRow]
    });
    
    

    botData.TicketMessageId = sentMessage.id;
    await botData.save();
  },
};