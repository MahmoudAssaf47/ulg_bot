const { MessageEmbed } = require('discord.js');
const Blacklist = require('../models/Blacklist');
const config = require('../config');

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

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
   

        const targetChannelId = config.VACtargetChannelId; // ID الروم الصوتي للتفعيل
        const roleId = config.VACRoleid; // ID الرتبة
        const targetChannelId2 = config.VACtargettoChannelId; // ID الروم الصوتي للتفعيل
        const member = newState.member || oldState.member;
        if (!member || !member.guild) return;

        const role = member.guild.roles.cache.get(roleId);
        if (!role) return; 

        const oldChannel = oldState.channelId;
        const newChannel = newState.channelId;
        // ✅ إذا دخل الروم الصوتي المستهدف
        if (newChannel === targetChannelId && oldChannel !== targetChannelId) {
            try {
                // 🔴 التحقق مما إذا كان في قائمة البلاك ليست
                const isBlacklisted = await Blacklist.findOne({ userId: member.id });

                if (isBlacklisted) {
                    // 🛑 إرسال رسالة منع
                    const embed = new MessageEmbed()
                        .setColor('#FF0000')
                        .setTitle('🚫 لا يمكنك دخول روم التفعيل!')
                        .setDescription(`أنت في **قائمة البلاك ليست** ولا يمكنك دخول هذا الروم.\n\n📝 **السبب:** ${isBlacklisted.reason}\n👤 **تمت إضافتك بواسطة:** <@${isBlacklisted.addedBy}>\n📅 **وقت الإضافة:** <t:${Math.floor(new Date(isBlacklisted.addedAt).getTime() / 1000)}:F>`)
                        .setFooter({ text: 'يرجى التواصل مع الإدارة إذا كنت تعتقد أن هناك خطأ.', iconURL: member.guild.iconURL() });

                    await member.send({ embeds: [embed] }).catch(() => null);

                    // 🚫 فصل المستخدم من الصوت بدل نقله
                    await member.voice.disconnect();
                    await sendLog(member.guild, '🚫 منع دخول', `تم منع <@${member.id}> من دخول <#${targetChannelId}> وتم فصله من الصوت.`, 'RED');

                    return; 
                }

                // ✅ إضافة الرتبة إذا لم يكن في البلاك ليست
                if (!member.roles.cache.has(roleId)) {
                    await member.roles.add(role);
                    await sendLog(member.guild, '✅ إضافة رتبة', `تمت إضافة الرتبة <@&${roleId}> إلى <@${member.id}>`, 'GREEN');
                }
await member.voice.setChannel(targetChannelId2).catch(() => null);

            } catch (error) {
                console.error(`❌ خطأ أثناء تنفيذ العملية:`, error);
                await sendLog(member.guild, '❌ خطأ في العملية', `حدث خطأ أثناء تنفيذ العملية على <@${member.id}>: ${error.message}`, 'RED');
            }
        }
    },
};
