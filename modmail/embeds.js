const { MessageEmbed } = require('discord.js');

module.exports = {
    createRequestEmbed: (user, requestType, requestDescription) => new MessageEmbed()
        .setTitle('New Request')
        .addField('User', `<@${user.id}>`, false)
        .addField('Type', requestType, false)
        .addField('Description', requestDescription)
        .setColor('#0099ff'),

    createAcceptedRequestEmbed: (request) => new MessageEmbed()
        .setColor("GREEN")
        .setTitle("✅ تم قبول الطلب")
        .setDescription(`**نوع الطلب:** ${request.type}\n**الوصف:** ${request.description}`),

    createRejectedRequestEmbed: (request) => new MessageEmbed()
        .setColor('RED')
        .setTitle('Request Rejected')
        .setDescription(`**Type:** ${request.type}\n**Description:** ${request.description}`),

    createClosedRequestEmbed: (request, closedBy) => new MessageEmbed()
        .setColor("GREY")
        .setTitle("Request Closed")
        .setDescription(`**Type:** ${request.type}\n**Description:** ${request.description}\n**Closed By:** <@${closedBy}>`),

    createUserReplyEmbed: (replierId, replyMessage) => new MessageEmbed()
        .setTitle('تم الرد على طلبك')
        .setDescription(`**تم الرد عليك بواسطة <@${replierId}>**\n\n**الرد هو:**\n${replyMessage}\n\nللرد على هذه الرسالة، اضغط على زر "Reply" أدناه.`)
        .setColor('#0099ff'),

    createReplyEmbed: (userId, replyMessage) => new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('📩 رد جديد على التذكرة')
        .setDescription(`💬 **Message from <@${userId}>:**\n > \`\`\`${replyMessage}\`\`\``),

    createBlacklistEmbed: (blacklistData) => new MessageEmbed()
        .setColor('#FF0000')
        .setTitle('🚫 لا يمكنك إرسال طلب!')
        .setDescription(`أنت في **قائمة البلاك ليست** ولا يمكنك إرسال هذا الطلب.\n\n📝 **السبب:** ${blacklistData.reason}\n👤 **تمت إضافتك بواسطة:** <@${blacklistData.addedBy}>\n📅 **وقت الإضافة:** <t:${Math.floor(new Date(blacklistData.addedAt).getTime() / 1000)}:F>`)
};