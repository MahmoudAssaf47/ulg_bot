const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageActionRow, MessageButton, Modal, MessageAttachment, MessageSelectMenu, Permissions, MessageEmbed, TextInputComponent } = require('discord.js');
const Application_user = require('../models/Application');
const config = require('../config');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الدوال المساعدة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = '1357233499618410506'; // ID قناة اللوج
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

async function updateReportStats(userId, updateData) {
    return Application_user.findOneAndUpdate(
        { userId },
        updateData,
        { upsert: true, new: true }
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// معالجة القبول
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleAccept(interaction, userId, participants) {
    try {
        const reportType = interaction.message.embeds[0].footer?.text;
    let channelMap = {
  'Daily': config.Daily,  // روم تقارير اليومية
  'Crime': config.Crime,  // روم تقارير الاجرام
  'Farm': config.Farm,    // روم تقارير المزرعة
};
        const updateData = {
            $inc: {
                acceptedReports: 1,
                pendingReports: -1,
                ...(reportType === 'Daily' && { dailyReports: 1 }),
             //   ...(reportType === 'Farm' && { agricultureReports: 1 }),
                ...(reportType === 'Crime' && { crimeReports: 1 })
            }
        };

        // إرسال للتقرير للروم المخصص إن وجد
        if (channelMap[reportType]) {
            const targetChannel = interaction.guild.channels.cache.get(channelMap[reportType]);
            if (targetChannel) {
    await targetChannel.send({
    content: `🎉 **تم قبول تقريرك بنجاح!**  
📌 **المُرسل:** <@${userId}>  
🛡 **تمت المراجعة بواسطة:** <@${interaction.user.id}>  
📅 **التاريخ:** <t:${Math.floor(Date.now() / 1000)}:R>  
🚀 **شكرًا لمساهمتك في تحسين العائلة، استمرارك يُحدث فرقًا!** ✨`,
    embeds: interaction.message.embeds.length ? interaction.message.embeds : [],
    components: []
});


              
            }
        }

        await updateReportStats(userId, updateData);

        // تحديث إحصائيات المشاركين إذا وجدوا
        if (participants && participants.length > 0) {
            const participantUpdateData = {
                $inc: {
                    acceptedReports: 1,
                    pendingReports: -1,
                    ...(reportType === 'Farm' && { agricultureReports: 1 }),
                    ...(reportType === 'Crime' && { crimeReports: 1 })
                }
            };
            await Application_user.updateMany(
                { userId: { $in: participants } },
                participantUpdateData,
                { upsert: true }
            );
        }

     await interaction.reply({
    content: `✅ **تم قبول تقريرك بنجاح!**  
📂 **نوع التقرير:** \`${reportType}\`  
🛡 **تمت المراجعة بواسطة:** <@${interaction.user.id}>`,
    ephemeral: false
});

await interaction.message.edit({ components: [] });

        // إرسال اللوج
        await sendLog(interaction.guild, '✅ تقرير مقبول', `تم قبول تقرير ${reportType} بواسطة <@${interaction.user.id}>`, 'GREEN');
    } catch (error) {
        console.error('خطأ في القبول:', error);
        await interaction.reply({
            content: '❌ فشل في معالجة القبول',
            ephemeral: true
        });

        // إرسال اللوج في حالة الخطأ
        await sendLog(interaction.guild, '❌ خطأ في القبول', `فشل في معالجة قبول التقرير بواسطة <@${interaction.user.id}>`, 'RED');
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// معالجة الرفض
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleReject(interaction, userId, participants) {
    try {
      

// ✅ تحديث إحصائيات المشاركين إذا وجدوا
if (participants && participants.length > 0) {
    const participantUpdateData = {
        $inc: {
            rejectedReports: 1,  // ⬅️ بدل المقبولة، يتم زيادة المرفوضة
            pendingReports: -1,  // ⬅️ تقليل التقارير المعلقة
        }
    };
    await Application_user.updateMany(
        { userId: { $in: participants } },
        participantUpdateData,
        { upsert: true }
            ).catch(console.error); // ✅ تجنب انهيار الكود عند حدوث خطأ
}

// ✅ تحديث إحصائيات المستخدم الذي تم رفض تقريره
await updateReportStats(userId, {
    $inc: { 
        rejectedReports: 1, // ⬅️ زيادة التقارير المرفوضة له
        pendingReports: -1 // ⬅️ تقليل التقارير المعلقة
    }
        }).catch(console.error);

      const rejectedUser = await interaction.guild.members.fetch(userId).catch(() => null);
const reportEmbed = interaction.message.embeds[0]; // استخراج الـ Embed الأصلي
      if (rejectedUser) {
                  if (rejectedUser) {
    await rejectedUser.send({
        content: `❌ تم رفض تقريرك بواسطة <@${interaction.user.id}>`,
        embeds: reportEmbed ? [reportEmbed] : [] // تضمين الـ Embed إذا وُجد
    }).catch(() => console.log(`تعذر إرسال رسالة خاصة إلى ${userId}`));
} else {
      await rejectedUser.send({
        content: `❌ تم رفض تقريرك بواسطة <@${interaction.user.id}>`,
    }).catch(() => console.log(`تعذر إرسال رسالة خاصة إلى ${userId}`));
}
            
                }
      
      
            if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: `❌ تم رفض التقرير بواسطة <@${interaction.user.id}>`,
                ephemeral: false
            }).catch(console.error);
        } else {
            await interaction.reply({
                content: `❌ تم رفض التقرير بواسطة <@${interaction.user.id}>`,
                ephemeral: false
            }).catch(console.error);
        }

        await interaction.message.edit({ components: [] }).catch(console.error);

        // إرسال اللوج
   await sendLog(
            interaction.guild,
            '❌ تقرير مرفوض',
            `تم رفض تقرير بواسطة <@${interaction.user.id}>`,
            'RED'
        ).catch(console.error);
    } catch (error) {
        console.error('خطأ في الرفض:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ فشل في معالجة الرفض',
                ephemeral: true
            }).catch(console.error);
        } else {
            await interaction.followUp({
                content: '❌ فشل في معالجة الرفض',
                ephemeral: true
            }).catch(console.error);
        }

        // إرسال اللوج في حالة الخطأ
   await sendLog(
            interaction.guild,
            '❌ خطأ في الرفض',
            `فشل في معالجة رفض التقرير بواسطة <@${interaction.user.id}>`,
            'RED'
        ).catch(console.error);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// معالجة الرفض مع السبب
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleRejectWithReason(interaction, userId, participants) {
    try {
        // ✅ التأكد من عدم وجود رد مسبق
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: '✍️ يرجى إرسال سبب الرفض خلال 60 ثانية...',
                ephemeral: true
            }).catch(console.error);
        } else {
            await interaction.reply({
                content: '✍️ يرجى إرسال سبب الرفض خلال 60 ثانية...',
                ephemeral: true
            }).catch(console.error);
        }

        const collector = interaction.channel.createMessageCollector({
            filter: m => m.author.id === interaction.user.id,
            time: 60000,
            max: 1
        });

        collector.on('collect', async m => {
            try {
                // ✅ تحديث إحصائيات المشاركين إذا وجدوا
if (participants && participants.length > 0) {
                    await Application_user.updateMany(
                        { userId: { $in: participants } },
                        { $inc: { rejectedReports: 1, pendingReports: -1 } },
                        { upsert: true }
                    ).catch(console.error);
                }

                // ✅ تحديث إحصائيات المستخدم الذي تم رفض تقريره
                await updateReportStats(userId, {
                    $inc: { 
                        rejectedReports: 1,
                        pendingReports: -1 
                    }
                }).catch(console.error);

                // ✅ محاولة إرسال رسالة خاصة للمستخدم المرفوض
                const rejectedUser = await interaction.guild.members.fetch(userId).catch(() => null);
              const reportEmbed = interaction.message.embeds[0]; // استخراج الـ Embed الأصلي



                if (rejectedUser) {
                  if (rejectedUser) {
    await rejectedUser.send({
        content: `❌ تم رفض تقريرك بواسطة <@${interaction.user.id}>\n📝 **السبب:** ${m.content}`,
        embeds: reportEmbed ? [reportEmbed] : [] // تضمين الـ Embed إذا وُجد
    }).catch(() => console.log(`تعذر إرسال رسالة خاصة إلى ${userId}`));
} else {
      await rejectedUser.send({
        content: `❌ تم رفض تقريرك بواسطة <@${interaction.user.id}>\n📝 **السبب:** ${m.content}`
    }).catch(() => console.log(`تعذر إرسال رسالة خاصة إلى ${userId}`));
}
            
                }

                // ✅ إزالة الأزرار من الرسالة الأصلية
                await interaction.message.edit({ components: [] }).catch(console.error);

                // ✅ التأكد من عدم وجود رد مكرر
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: `📝 سبب الرفض من <@${interaction.user.id}>:\n${m.content}`,
                        ephemeral: false
                    }).catch(console.error);
                } else {
                    await interaction.reply({
                        content: `📝 سبب الرفض من <@${interaction.user.id}>:\n${m.content}`,
                        ephemeral: false
                    }).catch(console.error);
                }

                // ✅ حذف رسالة السبب بعد جمعها
                await m.delete().catch(console.error);

                // ✅ إرسال اللوج
                await sendLog(
                    interaction.guild,
                    '❌ تقرير مرفوض مع سبب',
                    `تم رفض تقرير بواسطة <@${interaction.user.id}> مع السبب: ${m.content}`,
                    'RED'
                ).catch(console.error);
            } catch (error) {
                console.error('❌ خطأ في معالجة السبب:', error);
                await sendLog(
                    interaction.guild,
                    '❌ خطأ في معالجة السبب',
                    `فشل في معالجة سبب الرفض بواسطة <@${interaction.user.id}>`,
                    'RED'
                ).catch(console.error);
            }
        });

        collector.on('end', collected => {
            if (!collected.size) {
                interaction.followUp({
                    content: '⌛ انتهى الوقت المحدد',
                    ephemeral: true
                }).catch(console.error);
            }
        });

    } catch (error) {
        console.error('❌ خطأ في الرفض مع السبب:', error);
        await sendLog(
            interaction.guild,
            '❌ خطأ في الرفض مع السبب',
            `فشل في معالجة الرفض مع السبب بواسطة <@${interaction.user.id}>`,
            'RED'
        ).catch(console.error);
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
        const ALLOWED_BUTTONS = ['accept_report', 'reject_report', 'reject_with_reason']; // الأزرار المسموح بها
        if (!ALLOWED_BUTTONS.includes(interaction.customId)) return;
    if (client.isRestarting) {
        return interaction.reply({
          content: '⚠️ البوت قيد إعادة التشغيل، انتظر حتى يكتمل!',
          components: [],
          ephemeral: true
        }).catch(() => {});
      }
      
        try {
            // استخراج بيانات المستخدم
            const embed = interaction.message.embeds[0];
            if (!embed?.fields) {
                return interaction.reply({
                    content: '❌ بيانات التقرير غير صالحة',
                    ephemeral: true
                });
            }

            const userField = embed.fields.find(f => f.name === '👤 المرسل');
            const targetUserId = userField?.value.match(/\d+/)?.[0];
            if (!targetUserId) {
                return interaction.reply({
                    content: '❌ تعذر تحديد المستخدم',
                    ephemeral: true
                });
            }
           
            const rolesToRemove = [config.reportsManager]; // الرتب المسموح لها
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

            // استخراج المشاركين إذا وجدوا
            const participantsField = embed.fields.find(f => f.name === '👥 المشاركون');
            const participants = participantsField?.value.match(/\d+/g) || [];

            // تنفيذ العملية بناءً على التفاعل
            switch (interaction.customId) {
                case 'accept_report':
                    await handleAccept(interaction, targetUserId, participants);
                    break;

                case 'reject_report':
                    await handleReject(interaction, targetUserId, participants);
                    break;

                case 'reject_with_reason':
                    await handleRejectWithReason(interaction, targetUserId, participants);
                    break;
            }

        } catch (error) {
            console.error('خطأ عام:', error);
            interaction.reply({
                content: '⚠️ حدث خطأ غير متوقع',
                ephemeral: true
            }).catch(() => {});

            // إرسال اللوج في حالة الخطأ العام
            await sendLog(interaction.guild, '⚠️ خطأ عام', `حدث خطأ غير متوقع في التفاعل بواسطة <@${interaction.user.id}>`, 'RED');
        }
    }
};