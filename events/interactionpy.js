const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageActionRow, MessageButton, Modal, MessageAttachment, MessageSelectMenu, Permissions, MessageEmbed, TextInputComponent } = require('discord.js');
const PaymentSystem = require('../models/PaymentSystem'); // استيراد نموذج الدفع
const config = require('../config');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الدوال المساعدة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannel = guild.channels.cache.get(config.botlogs) || await guild.channels.fetch(config.botlogs).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// معالجة القبول
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleAccept(interaction, userId) {
    try {
        await PaymentSystem.findOneAndUpdate(
            { userId },
            { insurancePaymentStatus: 'paid' },
            { upsert: true, new: true }
        );

        // جلب معلومات السيرفر والمستخدم
        const guild = interaction.guild;
        const member = await guild.members.fetch(userId);

        // إضافة الرتبة
        const roleId = config.Paid; // استبدلها بالرتبة الفعلية
        await member.roles.add(roleId);

        await interaction.followUp({
            content: `✅ تم قبول التقرير بواسطة <@${interaction.user.id}> وتمت إضافة الرتبة للمستخدم.`,
            ephemeral: false
        });

        // إرسال اللوج
        await sendLog(guild, '✅ قبول تقرير', `تم قبول تقرير بواسطة <@${interaction.user.id}> وتمت إضافة الرتبة للمستخدم <@${userId}>`, 'GREEN');
    } catch (error) {
        console.error('خطأ في القبول:', error);
        await interaction.followUp({
            content: '❌ فشل في معالجة القبول أو إضافة الرتبة',
            ephemeral: true
        });

        // إرسال اللوج في حالة الخطأ
        await sendLog(interaction.guild, '❌ خطأ في القبول', `فشل في قبول تقرير بواسطة <@${interaction.user.id}>`, 'RED');
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// معالجة الرفض
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleReject(interaction, userId) {
    try {
        await interaction.client.users.fetch(userId).then(async (user) => {
            await user.send({
                content: `❌ تم رفض تقريرك بواسطة <@${interaction.user.id}>`
            });
        }).catch((error) => {
            console.error('فشل في إرسال الرسالة للمستخدم:', error);
        });

        await interaction.followUp({
            content: `❌ تم رفض التقرير بواسطة <@${interaction.user.id}>`,
            ephemeral: false
        });

        // إرسال اللوج
        await sendLog(interaction.guild, '❌ رفض تقرير', `تم رفض تقرير بواسطة <@${interaction.user.id}>`, 'RED');
    } catch (error) {
        console.error('خطأ في الرفض:', error);
        await interaction.followUp({
            content: '❌ فشل في معالجة الرفض',
            ephemeral: true
        });

        // إرسال اللوج في حالة الخطأ
        await sendLog(interaction.guild, '❌ خطأ في الرفض', `فشل في رفض تقرير بواسطة <@${interaction.user.id}>`, 'RED');
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// معالجة الرفض مع السبب
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleRejectWithReason(interaction, userId) {
    try {
        await interaction.followUp({
            content: '✍️ يرجى إرسال سبب الرفض خلال 60 ثانية...',
            ephemeral: true
        });

        const collector = interaction.channel.createMessageCollector({
            filter: m => m.author.id === interaction.user.id,
            time: 60000,
            max: 1
        });

        collector.on('collect', async m => {
            try {
                await interaction.client.users.fetch(userId).then(async (user) => {
                    await user.send({
                        content: `❌ تم رفض تقريرك بواسطة <@${interaction.user.id}>.
سبب الرفض: ${m.content}`
                    });
                }).catch((error) => {
                    console.error('فشل في إرسال الرسالة للمستخدم:', error);
                });

                await interaction.followUp({
                    content: `📝 سبب الرفض من <@${interaction.user.id}>:
${m.content}`,
                    ephemeral: false
                });

                await m.delete().catch(() => {});

                // إرسال اللوج
                await sendLog(interaction.guild, '❌ رفض تقرير مع سبب', `تم رفض تقرير بواسطة <@${interaction.user.id}> مع السبب: ${m.content}`, 'RED');
            } catch (error) {
                console.error('خطأ في معالجة السبب:', error);
                await sendLog(interaction.guild, '❌ خطأ في معالجة السبب', `فشل في معالجة سبب الرفض بواسطة <@${interaction.user.id}>`, 'RED');
            }
        });

        collector.on('end', collected => {
            if (!collected.size) {
                interaction.followUp({
                    content: '⌛ انتهى الوقت المحدد',
                    ephemeral: true
                }).catch(() => {});

                // إرسال اللوج في حالة انتهاء الوقت
                sendLog(interaction.guild, '⌛ انتهاء الوقت', `انتهى الوقت المحدد لإدخال سبب الرفض بواسطة <@${interaction.user.id}>`, 'ORANGE');
            }
        });
    } catch (error) {
        console.error('خطأ في الرفض مع السبب:', error);
        await sendLog(interaction.guild, '❌ خطأ في الرفض مع السبب', `فشل في معالجة الرفض مع السبب بواسطة <@${interaction.user.id}>`, 'RED');
    }
}



const BotStatus  = require('../models/restart'); // تأكد من مسار ملف قاعدة البيانات
async function setRestartingState(client, state) {
    await BotStatus.findOneAndUpdate({}, { isRestarting: state }, { upsert: true });
    client.isRestarting = state;
}


module.exports = {
    name: 'interactionReport',
  async execute(interaction, client) {
        if (!interaction.isButton()) return;
        const ALLOWED_BUTTONS = ['py_accept_report', 'py_reject_report', 'py_reject_with_reason'];
        if (!ALLOWED_BUTTONS.includes(interaction.customId)) return;

        const rolesToRemove = [config.PromotionManager]; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000']; 

        if (
            !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
            !allowedUserIds.includes(interaction.user.id)
        ) {
            return interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setColor('#FF0000')
                        .setTitle('⛔ | صلاحيات غير كافية')
                        .setDescription('❌ لا يمكنك استخدام هذا الأمر! يجب أن تمتلك أحد **الأدوار الإدارية** المسموحة.')
                ],
                ephemeral: true
            });
        }

        try {
            const embed = interaction.message.embeds[0];
            if (!embed?.fields) {
                return interaction.followUp({
                    content: '❌ بيانات التقرير غير صالحة',
                    ephemeral: true
                });
            }

            const userField = embed.fields.find(f => f.name === '👤 المرسل');
            const targetUserId = userField?.value.match(/\d+/)?.[0];
            if (!targetUserId) {
                return interaction.followUp({
                    content: '❌ تعذر تحديد المستخدم',
                    ephemeral: true
                });
            }

            await interaction.deferUpdate();
            await interaction.editReply({ components: [] });

            switch (interaction.customId) {
                case 'py_accept_report':
                    await handleAccept(interaction, targetUserId);
                    break;
                case 'py_reject_report':
                    await handleReject(interaction, targetUserId);
                    break;
                case 'py_reject_with_reason':
                    await handleRejectWithReason(interaction, targetUserId);
                    break;
            }
        } catch (error) {
            console.error('خطأ عام:', error);
            interaction.followUp({
                content: '⚠️ حدث خطأ غير متوقع',
                ephemeral: true
            }).catch(() => {});

            // إرسال اللوج في حالة الخطأ العام
            await sendLog(interaction.guild, '⚠️ خطأ عام', `حدث خطأ غير متوقع في التفاعل بواسطة <@${interaction.user.id}>`, 'RED');
        }
    }
};