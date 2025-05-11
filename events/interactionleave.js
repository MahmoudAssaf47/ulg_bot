const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageActionRow, MessageButton, Modal, MessageAttachment, MessageSelectMenu, Permissions, MessageEmbed, TextInputComponent } = require('discord.js');
const Leave = require('../models/LeaveSystem');
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


const BotStatus  = require('../models/restart'); // تأكد من مسار ملف قاعدة البيانات
async function setRestartingState(client, state) {
    await BotStatus.findOneAndUpdate({}, { isRestarting: state }, { upsert: true });
    client.isRestarting = state;
}



      
    
    module.exports = {
    name: 'interactionleave',
    async execute(interaction, client) {
        // تفاعل مع أزرار القبول والرفض
        if (!interaction.isButton()) return;

        const ALLOWED_BUTTONS = ['leave_accept_leave', 'leave_reject_leave']; // الأزرار المسموح بها
        if (!ALLOWED_BUTTONS.includes(interaction.customId)) return;
if (client.isRestarting) {
        return interaction.reply({
          content: '⚠️ البوت قيد إعادة التشغيل، انتظر حتى يكتمل!',
          components: [],
          ephemeral: true
        }).catch(() => {});
      }
        const embed = interaction.message.embeds[0];
        if (!embed?.fields) {
            return interaction.followUp({
                content: '❌ بيانات التقرير غير صالحة',
                ephemeral: true
            });
        }

        // البحث عن القيم داخل الحقول
        const userField = embed.fields.find(field => field.name === '🆔 المستخدم');
        const leaveTypeField = embed.fields.find(field => field.name === '📌 نوع الإجازة');
        const startDateField = embed.fields.find(field => field.name === '📅 تاريخ البدء');
        const endDateField = embed.fields.find(field => field.name === '📅 تاريخ الانتهاء');
        const reasonField = embed.fields.find(field => field.name === '📖 السبب');

        // استخراج معرف المستخدم بعد التأكد من وجوده
        if (!userField) {
            return interaction.reply({ content: '❌ لم يتم العثور على بيانات المستخدم.', ephemeral: true });
        }
        const userId = userField.value.replace(/[<@!>]/g, ''); // إزالة Mentions إذا كانت موجودة

        // محاولة جلب العضو من السيرفر
        let member;
        try {
            member = await interaction.guild.members.fetch(userId);
        } catch (error) {
            return interaction.reply({ content: '❌ تعذر العثور على العضو في السيرفر.', ephemeral: true });
        }

        // استخراج القيم بعد التحقق من وجودها
        const leaveType = leaveTypeField?.value || 'غير محدد';
        const startDate = startDateField?.value || 'غير محدد';
        const endDate = endDateField?.value || 'غير محدد';
        const reason = reasonField?.value || 'لم يتم التوضيح';

        // إرسال رسالة إلى العضو
        if (interaction.customId === 'leave_accept_leave') {
            // 🔹 التحقق من صحة التواريخ وتحويلها إلى `Date`
            const dateRegex = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/;

            function parseDate(dateStr) {
                const match = dateStr.match(dateRegex);
                if (!match) return null;

                const [_, day, month, year] = match.map(Number);
                const date = new Date(year, month - 1, day);

                return (date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year)
                    ? date
                    : null;
            }

            const start = parseDate(startDate);
            const end = parseDate(endDate);

            const rolesToRemove = [config.vacationManager]; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000']; 

            if (
                !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
                !allowedUserIds.includes(interaction.user.id)
            ) {
                return interaction.reply({
                    content: '❌ ليس لديك الصلاحية لاستخدام هذا الأمر.',
                    ephemeral: true
                });
            }

            let leaveRequest = await Leave.findOne({ userId: member.user.id });

            if (!leaveRequest) {
                leaveRequest = new Leave({
                    userId: member.user.id,
                    leaveType: leaveType || "أخرى",
                    startDate: start,
                    endDate: end,
                    reason: reason,
                    status: "مقبولة",
                    previousRoles: member.roles.cache.map(role => role.id) // حفظ كل الرتب الحالية
                });
            } else {
                leaveRequest.leaveType = leaveType || "أخرى";
                leaveRequest.startDate = start;
                leaveRequest.endDate = end;
                leaveRequest.reason = reason;
                leaveRequest.status = "مقبولة";
                leaveRequest.previousRoles = member.roles.cache.map(role => role.id); // تحديث الرتب السابقة
            }

            await leaveRequest.save();
            const allowe = [ 
  config.topRole,        // @・إشراف العائلة
  config.management,        // @・Mangment
  config.leadManagement,    // @・Lead Mangment
  config.familyManager,     // @・Family Manager
  config.support,           // @・Support
  config.goldFamily,        // @・Gold Family
  config.silverFamily,      // @・Silver Family
  config.bronzeFamily,      // @・Bronze Family
  config.member2,           // @・Member 2
  config.member1,           // @・Member 1
  config.vandal,           // @vandal
  config.Farmer,           // @・Farmer
  "1367145421885018244",
             "1367145423638233098",
  "1367145414180081785",
  "1367145424665841798",
  "1367145449768751136",
  "1367180421892149328",
   
                "1367145432630820895",
  "1367145433876402177",
  "1367145436057571328",
  "1367145436988706827",
  "1367145437840277544",
  "1367145439039852637",
  "1367145440532762736",
  "1367145441338069105",
  "1367145443015921695",
  "1367281081576853554",
  "1367281135452815420",

            ];
            await member.roles.remove(allowe);
            await member.roles.add([config.vacation, config.familyrole]);
            await interaction.update({ components: [] });

            // إرسال إشعار للمستخدم
            await member.send(`✅ تم قبول طلب إجازتك وتم منحك الرتب الخاصة بالإجازة.`);

            // إرسال اللوج
            await sendLog(interaction.guild, '✅ طلب إجازة مقبول', `تم قبول طلب إجازة لـ ${member.user.tag}.\n**نوع الإجازة:** ${leaveType}\n**السبب:** ${reason}`, 'GREEN');

            return interaction.followUp({ content: `✅ تم تسجيل الموافقة على طلب الإجازة لـ ${member.user.tag}.` });

        } else if (interaction.customId === 'leave_reject_leave') {
            const rolesToRemove = [config.vacationManager]; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000']; 

            if (
                !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
                !allowedUserIds.includes(interaction.user.id)
            ) {
                return interaction.reply({
                    content: '❌ ليس لديك الصلاحية لاستخدام هذا الأمر.',
                    ephemeral: true
                });
            }

            await interaction.update({ components: [] });
            await Leave.findOneAndDelete({ userId: member.user.id });
            await member.send(`❌ تم رفض طلب إجازتك.`);

            // إرسال اللوج
            await sendLog(interaction.guild, '❌ طلب إجازة مرفوض', `تم رفض طلب إجازة لـ ${member.user.tag}.\n**السبب:** ${reason}`, 'RED');

            return interaction.followUp({ content: `❌ تم رفض طلب الإجازة لـ ${member.user.tag}.` });

        }
    },
};