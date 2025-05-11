const { MessageEmbed } = require('discord.js');
const Application_user = require('../models/Application');
const config = require('../config');

module.exports = {
    name: 'ouasdasdasdasdasdast',
    description: '🚨 طرد عضو وإزالة صلاحياته - أمر إداري',
    permissions: ['ADMINISTRATOR'],
    
    async execute(message, args) {
        // التحقق من صلاحيات المستخدم
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

        // البحث عن العضو
        let target;
        if (message.mentions.members.first()) {
            target = message.mentions.members.first();
        } else if (args[0] && !isNaN(args[0])) {
            target = await message.guild.members.fetch(args[0]).catch(() => null);
        }

        if (!target) {
            return message.reply({
                embeds: [new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ | العضو غير موجود')
                    .setDescription('⚠️ تأكد من منشن العضو أو إدخال **ID صحيح**!')
                ]
            });
        }

        const reason = args.slice(1).join(' ') || 'غير محدد';

        try {
            // التحقق مما إذا كان المستخدم في قاعدة البيانات
            const userData = await Application_user.findOne({ userId: target.id });

            if (!userData) {
                return message.reply({
                    embeds: [new MessageEmbed()
                        .setColor('#FFA500')
                        .setTitle('⚠️ | العضو غير مسجل في قاعدة البيانات')
                        .setDescription(`📝 لا توجد بيانات سابقة لهذا العضو في قاعدة البيانات.`)
                    ]
                });
            }

            // حذف البيانات الخاصة بالعضو
            await Application_user.findOneAndDelete({ userId: target.id });
            await Ticket.deleteMany({ userId: target.id });

            // قائمة الأدوار التي سيتم إزالتها
            const rolesToRemove = ['1341094527615762464', '1341094526248554566', '1341094524897984702','1341094507294359603','1341094528622264461','1341094529721438240'];

            // تصفية الأدوار التي يمتلكها المستخدم فقط
            const roles = rolesToRemove.filter(roleId => target.roles.cache.has(roleId));

            if (roles.length > 0) {
                await Promise.all(roles.map(roleId => target.roles.remove(roleId)));
            }

            // إرسال رسالة نجاح
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('🚨 | طرد المستخدم')
                .setDescription(`**👤 العضو:** ${target.user.tag}\n**⚠️ السبب:** ${reason}\n**👮 بواسطة:** ${message.author.tag}`)
                .addField('📌 الإجراءات المتخذة:', `
                ✅ إزالة **${roles.length}** رتبة
                🗑️ حذف المستخدم من قاعدة البيانات
                🎟️ إزالة جميع التذاكر الخاصة به
                `)
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: '🔍 تم تنفيذ الإجراء بنجاح', iconURL: message.guild.iconURL() });

            await message.channel.send({ embeds: [embed] });

            // إرسال إلى قناة السجلات إن وجدت
            const logChannel = message.guild.channels.cache.get("1345396628290273350");
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('❌ خطأ أثناء تنفيذ الأمر:', error);
            message.reply({
                embeds: [new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('❌ | خطأ أثناء التنفيذ')
                    .setDescription('⚠️ حدث خطأ أثناء تنفيذ الأمر. يرجى التحقق من صلاحيات البوت أو المحاولة لاحقًا!')
                ]
            });
        }
    }
};
