const { MessageActionRow, MessageButton } = require('discord.js');

module.exports = {
    createInitialButtons: () => new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('accept_contact')
            .setLabel('نعم')
            .setStyle('SUCCESS'),
        new MessageButton()
            .setCustomId('decline_contact')
            .setLabel('لا')
            .setStyle('DANGER')
    ),

    createRequestManagementButtons: (userId) => new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId(`accept_request_${userId}`)
            .setLabel('Accept')
            .setStyle('SUCCESS'),
        new MessageButton()
            .setCustomId(`reject_request_${userId}`)
            .setLabel('Reject')
            .setStyle('DANGER'),
        new MessageButton()
            .setCustomId(`delete_request_${userId}`)
            .setLabel('Delete')
            .setStyle('SECONDARY')
    ),

    createTicketButtons: (userId) => new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId(`reply_request_${userId}`)
            .setLabel("📩 رد على الطلب")
            .setStyle("PRIMARY"),
        new MessageButton()
            .setCustomId(`close_ticket_${userId}`)
            .setLabel("🔒 إغلاق التذكرة")
            .setStyle("DANGER"),
        new MessageButton()
            .setCustomId(`add_repliers_${userId}`)
            .setLabel("➕ إضافة أشخاص")
            .setStyle("SUCCESS")
    ),

    createUserReplyButton: () => new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('reply_request_user')
            .setLabel('Reply')
            .setStyle('PRIMARY')
    ),

    createAdminReplyButton: () => new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId("replyagin_request")
            .setLabel("📩 رد على الطلب")
            .setStyle("PRIMARY")
    )
};