const { MessageEmbed } = require('discord.js');
const Application_user = require('../models/Application.js');

module.exports = {
    name: 'rasdasdasdasasd',
    description: 'عرض تقارير أي عضو (خاص بالإدارة)',
    async execute(message, args) {
        const allowedRoles = [
            '1342480295819218965',
            '1342480498588520449',
            '1342480586937208852',
            '1342480686107328564',
            '1341094488004886610'
        ];

        // التحقق من امتلاك العضو لأحد الأدوار المسموحة
        if (!message.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
            return message.reply({ 
                embeds: [new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('⛔ | صلاحيات غير كافية')
                    .setDescription('❌ لا يمكنك استخدام هذا الأمر! يجب أن تمتلك أحد **الأدوار الإدارية** المسموحة.')
                ]
            });
        }
      
        let targetUser;
        
        if (message.mentions.users.first()) {
            targetUser = message.mentions.users.first();
        } else if (args[0] && !isNaN(args[0])) {
            targetUser = await message.client.users.fetch(args[0]).catch(() => null);
        }

        if (!targetUser) {
            return message.reply('❌ يجب منشن العضو أو إدخال الـ ID بشكل صحيح!');
        }

        try {
            const userData = await Application_user.findOne({ userId: targetUser.id });

            if (!userData) {
                return message.reply(`⚠️ لا توجد بيانات متاحة لـ ${targetUser.tag}!`);
            }

            const totalReports = (userData.acceptedReports || 0) + (userData.rejectedReports || 0) + (userData.pendingReports || 0);
            
            function createProgressBar(percentage, length = 10) {
                percentage = Math.max(0, Math.min(percentage, 100));
                const filledLength = Math.round((percentage / 100) * length);
                const emptyLength = length - filledLength;
                const color = percentage >= 75 ? '🟩' : percentage >= 50 ? '🟨' : percentage >= 25 ? '🟧' : '🟥';
                const filled = color.repeat(filledLength);
                const empty = '⬜'.repeat(emptyLength);
                return `**[${filled}${empty}]** ${percentage.toFixed(1)}%`;
            }

            const embed = new MessageEmbed()
                .setColor('#2b2d31')
                .setAuthor({
                    name: `${targetUser.tag} - تقارير المراقبة`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`**🆔 ID:** \`${targetUser.id}\``)
                .addFields(
                    { name: '✅ مقبولة', value: `\`${userData.acceptedReports || 0}\`\n${createProgressBar((userData.acceptedReports / totalReports) * 100 || 0)}`, inline: false },
                    { name: '🔄 معلقة', value: `\`${userData.pendingReports || 0}\`\n${createProgressBar((userData.pendingReports / totalReports) * 100 || 0)}`, inline: false },
                    { name: '📅 يومية', value: `\`${userData.dailyReports || 0}\`\n${createProgressBar((userData.dailyReports / 30) * 100 || 0)}`, inline: false },
                    { name: '⛔ مرفوضة', value: `\`${userData.rejectedReports || 0}\`\n${createProgressBar((userData.rejectedReports / totalReports) * 100 || 0)}`, inline: false },
                )
                .setFooter({ 
                    text: `طلب بواسطة: ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL()
                });

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('خطأ:', error);
            return message.reply('❌ حدث خطأ أثناء جلب البيانات!');
        }
    }
};