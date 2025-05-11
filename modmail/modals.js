const { Modal, TextInputComponent, MessageActionRow } = require('discord.js');

module.exports = {
    createRequestModal: (messageId) => {
        const modal = new Modal()
            .setCustomId(`request_modal_${messageId}`)
            .setTitle('Create Request');

        const requestTypeInput = new TextInputComponent()
            .setCustomId('request_type')
            .setLabel('نوع الطلب')
            .setPlaceholder('مثلاً: استفسار / مشكلة / اقتراح')
            .setStyle('SHORT')
            .setRequired(true);

        const requestDescriptionInput = new TextInputComponent()
            .setCustomId('request_description')
            .setLabel('الرسالة')
            .setStyle('PARAGRAPH')
            .setRequired(true)
            .setPlaceholder('معي مشكلة .....')
            .setValue('');

        modal.addComponents(
            new MessageActionRow().addComponents(requestTypeInput),
            new MessageActionRow().addComponents(requestDescriptionInput)
        );
        return modal;
    },

    createAdminReplyModal: (userId) => {
        const modal = new Modal()
            .setCustomId(`reply_modal_${userId}`)
            .setTitle('Reply to Request');

        const replyMessageInput = new TextInputComponent()
            .setCustomId('reply_message')
            .setLabel('Your Reply')
            .setStyle('PARAGRAPH')
            .setRequired(true);

        modal.addComponents(new MessageActionRow().addComponents(replyMessageInput));
        return modal;
    },

    createUserReplyModal: () => {
        const modal = new Modal()
            .setCustomId('reply_modal_User')
            .setTitle('Reply to Request');

        const replyMessageInput = new TextInputComponent()
            .setCustomId('reply_message')
            .setLabel('Your Reply')
            .setStyle('PARAGRAPH')
            .setRequired(true);

        modal.addComponents(new MessageActionRow().addComponents(replyMessageInput));
        return modal;
    },

    createAddReplierModal: (userId) => {
        const modal = new Modal()
            .setCustomId(`add_replier_modal_${userId}`)
            .setTitle('إضافة شخص للرد');

        const userIdInput = new TextInputComponent()
            .setCustomId('user_id')
            .setLabel('معرف الشخص (User ID أو Mention)')
            .setStyle('SHORT')
            .setRequired(true);

        modal.addComponents(new MessageActionRow().addComponents(userIdInput));
        return modal;
    }
};