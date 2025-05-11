const { ModalBuilder, TextInputBuilder, MessageComponentInteraction, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageActionRow, MessageButton, Modal, MessageAttachment, MessageSelectMenu, Permissions, MessageEmbed, TextInputComponent } = require('discord.js');
const Application_user = require('../models/Application'); // تأكد من أن المسار صحيح
const fetch = require('node-fetch'); // استدعاء المكتبة
const UserNotes = require('../models/UserNotes'); // تأكد من مسار ملف قاعدة البيانات
  const PaymentSystem = require('../models/PaymentSystem'); // استدعاء الموديل
            const Leave = require("../models/LeaveSystem"); // استدعاء موديل الإجازات
const Request = require('../models/Mod'); // استيراد نموذج الطلبات
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

module.exports = {
    name: 'interactionCreate',
  async execute(interaction, client) {
        if (!interaction.isButton() && !interaction.isSelectMenu() && !interaction.isModalSubmit()) return;

        // قائمة الرتب المحمية (لا يمكن تغييرها)
const allowedRoles = [
  config.member2,          // @・ Member 2
  config.bronzeFamily,     // @・ Bronze Family
  config.silverFamily,     // @・Silver Family
  config.goldFamily,       // @・Gold Family
  config.support,          // @・ Support
  config.familyManager,    // @・Family Manger
  config.leadManagement,   // @・Lead Mangment
  config.management,       // @・Mangment
  config.topRole           // @・إشراف العائلة
];
    
    const allowedRoles2 = [
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
];

        // التعامل مع تفاعل الأزرار
        if (interaction.isButton()) {
            // زر البداية الذي يطلق عملية اختيار العضو
      if (interaction.customId === 'members') {
    const rolesToRemove = [config.PromotionManager];
 const allowedUserIds = ['298011146584064000']; 

    if (!interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
        !allowedUserIds.includes(interaction.user.id)) {
        return interaction.reply({
            content: '❌ ليس لديك الصلاحية لاستخدام هذا الأمر.',
            ephemeral: true
        });
    }

    const roleId = config.familyrole;

    try {
        const membersWithRole = await interaction.guild.members.fetch()
            .then(members => members.filter(member => member.roles.cache.has(roleId)));

        if (membersWithRole.size === 0) {
            return interaction.reply({ content: '❌ لا يوجد أعضاء بهذه الرتبة.', ephemeral: true });
        }

        const userIds = [...membersWithRole.keys()];
        const sortedUsers = await Application_user.find({ userId: { $in: userIds } })
            .sort({ loginDate: 1 })
            .lean();

        const sortedMembers = sortedUsers
            .map(user => membersWithRole.get(user.userId))
            .filter(member => member);

        if (sortedMembers.length === 0) {
            return interaction.reply({ content: '❌ لا يوجد بيانات متطابقة في قاعدة البيانات.', ephemeral: true });
        }

        const chunkSize = 25;
        const memberChunks = [];
        for (let i = 0; i < sortedMembers.length; i += chunkSize) {
            memberChunks.push(sortedMembers.slice(i, i + chunkSize));
        }

        let pageIndex = 0;
        const sendPage = async (index) => {
            const options = memberChunks[index].map(member => ({
                label: member.displayName,
                value: member.user.id
            }));

            const selectMenu = new MessageSelectMenu()
                .setCustomId(`select_member_${index}`)
                .setPlaceholder(`🔍 اختر العضو (${index + 1}/${memberChunks.length})`)
                .addOptions(options);

            const selectRow = new MessageActionRow().addComponents(selectMenu);
            const buttons = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ السابق')
                    .setStyle('PRIMARY')
                    .setDisabled(index === 0),
                new MessageButton()
                    .setCustomId('next_page')
                    .setLabel('➡️ التالي')
                    .setStyle('PRIMARY')
                    .setDisabled(index === memberChunks.length - 1)
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    content: `👤 اختر العضو من القائمة (${index + 1}/${memberChunks.length}):`,
                    components: memberChunks.length > 1 ? [selectRow, buttons] : [selectRow],
                    ephemeral: true
                }); 
            } else {
                await interaction.reply({
                    content: `👤 اختر العضو من القائمة (${index + 1}/${memberChunks.length}):`,
                    components: memberChunks.length > 1 ? [selectRow, buttons] : [selectRow],
                    ephemeral: true
                });
            }
        };

        await sendPage(pageIndex);

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'prev_page' && pageIndex > 0) {
                pageIndex--;
                await sendPage(pageIndex);
                await i.deferUpdate();
            } else if (i.customId === 'next_page' && pageIndex < memberChunks.length - 1) {
                pageIndex++;
                await sendPage(pageIndex);
                await i.deferUpdate();
            }
        });
    } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        return interaction.reply({ content: '❌ حدث خطأ أثناء جلب البيانات.', ephemeral: true });
    }
}

            // تفاعل أزرار الإجراءات (طرد، ترقية، تخفيض)
            if (
                interaction.customId.startsWith('kick_') ||
                interaction.customId.startsWith('promote_') ||
                interaction.customId.startsWith('change_') ||
                interaction.customId.startsWith('demote_') ||
                interaction.customId.startsWith('rp_') ||
                interaction.customId.startsWith('contact_') ||
                interaction.customId.startsWith('addnote_') ||
                interaction.customId.startsWith('viewnotes_') ||
                interaction.customId.startsWith('deletenotes_') ||
                interaction.customId.startsWith('ortsresetreports_')

            ) {
                const [action, selectedMemberId] = interaction.customId.split('_');
                const selectedMember = await interaction.guild.members.fetch(selectedMemberId).catch(() => null);
                if (!selectedMember) {
                    await interaction.deferReply({ ephemeral: true });
                    return interaction.editReply({ content: '❌ العضو غير موجود.', components: [] });
                }

                if (action === 'kick') {
                    // إنشاء زرين للتأكيد والإلغاء
                    const confirmRow = new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId('confirm_kick')
                            .setLabel('✅ تأكيد الطرد')
                            .setStyle('SUCCESS'),
                        new MessageButton()
                            .setCustomId('cancel_kick')
                            .setLabel('❌ إلغاء الطرد')
                            .setStyle('DANGER')
                    );

                    const embed = new MessageEmbed()
                        .setColor('#FFA500') // لون برتقالي للتحذير
                        .setTitle('⚠️ تأكيد الطرد')
                        .setDescription(`هل أنت متأكد أنك تريد طرد ${selectedMember.user.username}؟`);

                    await interaction.reply({ embeds: [embed], components: [confirmRow], ephemeral: true });

                    // انتظار تفاعل المستخدم
                    const filter = i => i.user.id === interaction.user.id;
                    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

                    collector.on('collect', async i => {
                        if (i.customId === 'confirm_kick') {
                            try {
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
  config.familyrole,           // @・My Family

                                ]; // من الأدنى إلى الأعلى

                                // إزالة الرتب المحددة من العضو
                                const rolesToRemove = selectedMember.roles.cache.filter(role => allowe.includes(role.id));
                                await selectedMember.roles.remove(rolesToRemove, 'إزالة الرتب المحددة');
                                // إضافة الرتبة الجديدة
                                const newRoleId = config.allmemberrole;
                                await selectedMember.roles.add(newRoleId, 'إضافة رتبة جديدة');

                                // حذف بيانات العضو من قاعدة البيانات
                                await Application_user.findOneAndDelete({ userId: selectedMemberId });
                                 await PaymentSystem.findOneAndDelete({ userId: selectedMemberId });
                                 await UserNotes.findOneAndDelete({ userId: selectedMemberId });
                                 await Leave.findOneAndDelete({ userId: selectedMemberId });
                                 await Request.findOneAndDelete({ userId: selectedMemberId });

                              let members = await PaymentSystem.find({ insurancePaymentStatus: { $ne: "paid" } });

                                await selectedMember.setNickname(null).catch(() => {});

                                await i.update({ content: `✅ تم طرد ${selectedMember.user.username} بنجاح وتمت إضافته إلى الرتبة الجديدة.`, components: [] });

                                // إرسال اللوج
                                await sendLog(interaction.guild, '✅ طرد عضو', `تم طرد ${selectedMember.user.username} بواسطة ${interaction.user.tag}`, 'GREEN');
                            } catch (error) {
                                console.error(error);
                                await i.update({ content: '❌ حدث خطأ أثناء محاولة تنفيذ الأمر.', components: [] });

                                // إرسال اللوج في حالة الخطأ
                                await sendLog(interaction.guild, '❌ خطأ في الطرد', `فشل في طرد ${selectedMember.user.username} بواسطة ${interaction.user.tag}`, 'RED');
                            }
                        } else if (i.customId === 'cancel_kick') {
                            await i.update({ content: '❌ تم إلغاء عملية الطرد.', components: [] });
                        }

                        collector.stop(); // إيقاف المجمع بعد التفاعل
                    });

                    collector.on('end', collected => {
                        if (collected.size === 0) {
                            interaction.followUp({ content: '❌ انتهى الوقت ولم يتم تأكيد الطرد.', ephemeral: true });
                        }
                    });
                } else if (action === 'promote') {
                    // إنشاء زرين للتأكيد والإلغاء
                    const confirmRow = new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId('confirm_promote')
                            .setLabel('✅ تأكيد الترقية')
                            .setStyle('SUCCESS'),
                        new MessageButton()
                            .setCustomId('cancel_promote')
                            .setLabel('❌ إلغاء الترقية')
                            .setStyle('DANGER')
                    );

                    const embed = new MessageEmbed()
                        .setColor('#FFA500') // لون برتقالي للتحذير
                        .setTitle('⚠️ تأكيد الترقية')
                        .setDescription(`هل أنت متأكد أنك تريد ترقية ${selectedMember.user.username}؟`);

                    await interaction.reply({ embeds: [embed], components: [confirmRow], ephemeral: true });

                    // انتظار تفاعل المستخدم
                    const filter = i => i.user.id === interaction.user.id;
                    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

                    collector.on('collect', async i => {
                        if (i.customId === 'confirm_promote') {
                            try {
                                // حساب الرتبة الجديدة للترقية
                                const newRoleId = getPromotionRole(selectedMember.roles.cache.map(r => r.id), interaction.guild, allowedRoles);
                                if (newRoleId) {
                                    // إزالة الرتب الحالية من مجموعة الرتب غير المحمية وإضافة الرتبة الجديدة
                                    const rankRoles = interaction.guild.roles.cache.filter(role => allowedRoles.includes(role.id));
                                    const memberRankRoles = selectedMember.roles.cache.filter(role => rankRoles.has(role.id));
                                    await selectedMember.roles.add(newRoleId, 'ترقية').catch(console.error);
                                    const newRoleName = interaction.guild.roles.cache.get(newRoleId)?.name || 'الرتبة الجديدة';
                                    await i.update({ content: `✅ تم ترقية ${selectedMember.user.username} إلى رتبة **${newRoleName}**.`, components: [] });
await Application_user.findOneAndUpdate(
  { userId: selectedMember.user.id },
  { lastPromotionDate: Date.now() }
);
                                    // إرسال اللوج
                                    await sendLog(interaction.guild, '✅ ترقية عضو', `تم ترقية ${selectedMember.user.username} إلى رتبة ${newRoleName} بواسطة ${interaction.user.tag}`, 'GREEN');
                                } else {
                                    await i.update({ content: '❌ لا يمكن ترقية العضو أكثر من ذلك.', components: [] });
                                }
                            } catch (error) {
                                console.error(error);
                                await i.update({ content: '❌ حدث خطأ أثناء محاولة تنفيذ الترقية.', components: [] });

                                // إرسال اللوج في حالة الخطأ
                                await sendLog(interaction.guild, '❌ خطأ في الترقية', `فشل في ترقية ${selectedMember.user.username} بواسطة ${interaction.user.tag}`, 'RED');
                            }
                        } else if (i.customId === 'cancel_promote') {
                            await i.update({ content: '❌ تم إلغاء عملية الترقية.', components: [] });
                        }

                        collector.stop(); // إيقاف المجمع بعد التفاعل
                    });

                    collector.on('end', collected => {
                        if (collected.size === 0) {
                            interaction.followUp({ content: '❌ انتهى الوقت ولم يتم تأكيد الترقية.', ephemeral: true });
                        }
                    });
                } else if (action === 'demote') {
                    // إنشاء زرين للتأكيد والإلغاء
                    const confirmRow = new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId('confirm_demote')
                            .setLabel('✅ تأكيد التخفيض')
                            .setStyle('SUCCESS'),
                        new MessageButton()
                            .setCustomId('cancel_demote')
                            .setLabel('❌ إلغاء التخفيض')
                            .setStyle('DANGER')
                    );

                    const embed = new MessageEmbed()
                        .setColor('#FFA500') // لون برتقالي للتحذير
                        .setTitle('⚠️ تأكيد التخفيض')
                        .setDescription(`هل أنت متأكد أنك تريد تخفيض ${selectedMember.user.username}؟`);

                    await interaction.reply({ embeds: [embed], components: [confirmRow], ephemeral: true });

                    // انتظار تفاعل المستخدم
                    const filter = i => i.user.id === interaction.user.id;
                    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

                    collector.on('collect', async i => {
                        if (i.customId === 'confirm_demote') {
                            try {
                                // جلب جميع رتب العضو التي تنتمي إلى قائمة الرتب المسموح بها
                                const rankRoles = interaction.guild.roles.cache.filter(role => allowedRoles2.includes(role.id));
                                const memberRankRoles = selectedMember.roles.cache.filter(role => rankRoles.has(role.id));

                                // تحويل الرتب إلى مصفوفة مرتبة حسب الترتيب في `allowedRoles2`
                                const sortedRoles = allowedRoles2
                                    .map(roleId => interaction.guild.roles.cache.get(roleId))
                                    .filter(role => role) // إزالة القيم غير الموجودة
                                    .sort((a, b) => b.position - a.position); // الترتيب من الأعلى إلى الأدنى

                                // إيجاد الرتبة الحالية للعضو
                                const currentRole = sortedRoles.find(role => memberRankRoles.has(role.id));

                                if (currentRole) {
                                    const currentIndex = sortedRoles.indexOf(currentRole);

                                    // التحقق مما إذا كان هناك رتبة أقل يمكن التخفيض إليها
                                    if (currentIndex < sortedRoles.length - 1) {
                                        const newRole = sortedRoles[currentIndex + 1]; // الرتبة التالية في الترتيب

                                        await selectedMember.roles.remove(currentRole, 'تخفيض إلى رتبة أقل').catch(console.error);
                                        await selectedMember.roles.add(newRole, 'تم التخفيض').catch(console.error);

                                        await i.update({ content: `✅ تم تخفيض ${selectedMember.user.username} إلى رتبة **${newRole.name}**.`, components: [] });

                                        // إرسال اللوج
                                        await sendLog(interaction.guild, '✅ تخفيض عضو', `تم تخفيض ${selectedMember.user.username} إلى رتبة ${newRole.name} بواسطة ${interaction.user.tag}`, 'GREEN');
                                    } else {
                                        await i.update({ content: '❌ لا يمكن تخفيض العضو أكثر من ذلك.', components: [] });
                                    }
                                } else {
                                    await i.update({ content: '❌ العضو ليس لديه أي رتبة من الرتب المسموح بها.', components: [] });
                                }
                            } catch (error) {
                                console.error(error);
                                await i.update({ content: '❌ حدث خطأ أثناء محاولة تنفيذ التخفيض.', components: [] });

                                // إرسال اللوج في حالة الخطأ
                                await sendLog(interaction.guild, '❌ خطأ في التخفيض', `فشل في تخفيض ${selectedMember.user.username} بواسطة ${interaction.user.tag}`, 'RED');
                            }
                        } else if (i.customId === 'cancel_demote') {
                            await i.update({ content: '❌ تم إلغاء عملية التخفيض.', components: [] });
                        }

                        collector.stop(); // إيقاف المجمع بعد التفاعل
                    });

                    collector.on('end', collected => {
                        if (collected.size === 0) {
                            interaction.followUp({ content: '❌ انتهى الوقت ولم يتم تأكيد التخفيض.', ephemeral: true });
                        }
                    });
                } else if (action === 'change') {
                    const embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle('📝 تغيير الهوية')
                        .setDescription('💬 من فضلك أكتب النك نيم الجديد في الشات خلال **30 ثانية**.');

                    await interaction.reply({ embeds: [embed], ephemeral: true });

                    const filter = m => m.author.id === interaction.user.id;
                    const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
                        .catch(() => null);

                    if (!collected || !collected.first()) {
                        return interaction.followUp({ content: '❌ انتهى الوقت، لم يتم تغيير الهوية.', ephemeral: true });
                    }

                    const newNickname = collected.first().content;
                    collected.first().delete().catch(() => {}); // حذف الرسالة للحفاظ على الخصوصية

                    try {
                        if (!selectedMember.manageable) {
                            await interaction.followUp({ content: '❌ حدث خطأ أثناء تغيير الهوية، تأكد من أن لدي الأذونات الكافية.', ephemeral: true });
                        } else {
                            await selectedMember.setNickname(newNickname, 'تغيير الهوية بواسطة البوت');
                            await interaction.followUp({ content: `✅ تم تغيير الهوية إلى **${newNickname}** بنجاح!`, ephemeral: true });

                            // إرسال اللوج
                            await sendLog(interaction.guild, '✅ تغيير الهوية', `تم تغيير هوية ${selectedMember.user.username} إلى ${newNickname} بواسطة ${interaction.user.tag}`, 'GREEN');
                        }
                    } catch (error) {
                        console.error(error);
                        await interaction.followUp({ content: '❌ حدث خطأ أثناء تغيير الهوية.', ephemeral: true });

                        // إرسال اللوج في حالة الخطأ
                        await sendLog(interaction.guild, '❌ خطأ في تغيير الهوية', `فشل في تغيير هوية ${selectedMember.user.username} بواسطة ${interaction.user.tag}`, 'RED');
                    }
                } else
                  
              if (action === 'deletenotes') {
                
                
    // جلب ملاحظات المستخدم
    let userNotes = await UserNotes.findOne({ userId: selectedMember.user.id });
    if (!userNotes || userNotes.notes.length === 0) {
        return interaction.update({
            content: "❌ لا توجد ملاحظات لحذفها.",
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    // تنظيف العناصر التي تكون فيها noteId null لتفادي مشكلة الفهرس
    await UserNotes.updateOne(
        { userId: selectedMember.user.id },
        { $pull: { notes: { noteId: null } } }
    );

    // تحديث البيانات بعد التنظيف
    userNotes = await UserNotes.findOne({ userId: selectedMember.user.id });
    
    let page = 0;
    const notesPerPage = 3;
    const totalPages = Math.ceil(userNotes.notes.length / notesPerPage);

    // دالة لتوليد الـ Embed بناءً على الصفحة الحالية
    const generateEmbed = (currentPage, notesData) => {
        const start = currentPage * notesPerPage;
        const end = start + notesPerPage;
        const notesToShow = notesData.slice(start, end);

        return new MessageEmbed()
            .setTitle(`📜 ملاحظات ${selectedMember.user.username}`)
            .setColor("#0099ff")
            .setDescription(
                notesToShow.map((note, index) =>
                    `**#${start + index + 1}** - 📝 **المحتوى:**\n${note.content}\n\n` +
                    `👤 **أُضيفت بواسطة:** <@${note.addedBy}>\n` +
                    `🕒 **التاريخ:** <t:${Math.floor(new Date(note.addedAt).getTime() / 1000)}:F>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                ).join("\n\n")
            )
            .setFooter(`صفحة ${currentPage + 1} من ${totalPages}`);
    };

    // دالة لتوليد الأزرار بناءً على الصفحة الحالية
    const generateButtons = (currentPage, notesData) => {
        const start = currentPage * notesPerPage;
        const end = start + notesPerPage;
        const notesToShow = notesData.slice(start, end);

        const buttons = notesToShow.map((note, index) =>
            new MessageButton()
                .setCustomId(`delete_note_${note.noteId}`)
                .setLabel(`#${start + index + 1}`)
                .setStyle('DANGER')
        );

        if (totalPages > 1) {
            if (currentPage > 0) {
                buttons.push(new MessageButton().setCustomId('prev_page').setLabel('⬅ السابق').setStyle('SECONDARY'));
            }
            if (currentPage < totalPages - 1) {
                buttons.push(new MessageButton().setCustomId('next_page').setLabel('التالي ➡').setStyle('SECONDARY'));
            }
        }

        return new MessageActionRow().addComponents(buttons);
    };

    // إرسال الرسالة المبدئية
    const message = await interaction.update({
        embeds: [generateEmbed(page, userNotes.notes)],
        components: [generateButtons(page, userNotes.notes)],
        ephemeral: true,
        fetchReply: true
    });

    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (btnInteraction) => {
        if (btnInteraction.user.id !== interaction.user.id) {
            return btnInteraction.reply({ content: "❌ لا يمكنك التفاعل مع هذه الأزرار.", ephemeral: true });
        }

        if (btnInteraction.customId === 'prev_page') {
            page--;
        } else if (btnInteraction.customId === 'next_page') {
            page++;
        } else 
          
  if (btnInteraction.customId.startsWith('delete_note_')) {
        const noteId = btnInteraction.customId.split('_')[2];

        let results = await UserNotes.findOneAndUpdate(
            { userId: selectedMember.user.id },
            { $pull: { notes: { noteId: noteId.toString() } } },
            { new: true }
        ).then(async (result) => {

        // إذا لم تبقَ أي ملاحظات، احذف بيانات المستخدم وأعد إنشائها
        if (!result.notes || result.notes.length === 0) {
          

            return btnInteraction.update({
                content: "✅ **تم حذف جميع الملاحظات وإعادة تعيين بيانات المستخدم!**",
                embeds: [],
                components: []
            });
        }

        // تحديث الصفحة فقط عند وجود ملاحظات
        let totalPages = Math.ceil(result.notes.length / notesPerPage);
        page = Math.max(0, Math.min(page, totalPages - 1));

        await btnInteraction.update({
            content: "✅ **تم حذف الملاحظة بنجاح!**",
            embeds: [generateEmbed(page, result.notes)],
            components: [generateButtons(page, result.notes)]
        });

        }).catch(async (error) => {
          btnInteraction.update({
                content: "✅ **تم حذف جميع الملاحظات وإعادة تعيين بيانات المستخدم!**",
                embeds: [],
                components: []
            });
await UserNotes.deleteOne({ userId: selectedMember.user.id });

   await UserNotes.findOneAndUpdate(
        { userId: selectedMember.user.id },
        { 
            $setOnInsert: { 
                userId: selectedMember.user.id, 
                notes: []
            } 
        },
        { upsert: true, new: true }
    );

   
        })


    
}


    
        // تحديث الواجهة مع تغيير الصفحة (إذا كان التنقل)
        if (btnInteraction.customId === 'prev_page' || btnInteraction.customId === 'next_page') {
            const updatedUserNotes = await UserNotes.findOne({ userId: selectedMember.user.id });
            await btnInteraction.update({
                embeds: [generateEmbed(page, updatedUserNotes.notes)],
                components: [generateButtons(page, updatedUserNotes.notes)]
            });
        }
    });

    collector.on('end', () => {
        message.edit({ components: [] }).catch(() => {});
    });
}

                            else
                              
                              if (action === "ortsresetreports") {
    const confirmEmbed = new MessageEmbed()
        .setTitle("⚠️ تأكيد مسح التقارير")
        .setDescription(`هل أنت متأكد أنك تريد تصفير جميع التقارير الخاصة بالعضو <@${selectedMember.user.id}>؟`)
        .setColor("#FFA500");

    const row = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId("confirm_reset")
            .setLabel("✅ نعم، تأكيد")
            .setStyle("SUCCESS"),
        new MessageButton()
            .setCustomId("cancel_reset")
            .setLabel("❌ لا، إلغاء")
            .setStyle("DANGER")
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });

    // انتظر 30 ثانية، ثم احذف الأزرار
  
 const filter = i => i.user.id === interaction.user.id;
  const collector = interaction.channel.createMessageComponentCollector({
        filter,
        componentType: "BUTTON",
        time: 30000 // المهلة 30 ثانية
    });

    collector.on("collect", async (i) => {
        if (i.customId === "confirm_reset") {
        await Application_user.findOneAndUpdate(
  { userId: selectedMember.user.id },
  {
    acceptedReports: 0,
    pendingReports: 0,
    dailyReports: 0,
    rejectedReports: 0,
    crimeReports: 0,
    agricultureReports: 0,
    lastResetDate: new Date() // ✅ تصحيح التحديث ليكون تاريخًا صحيحًا
  },
  { new: true }
);

            const successEmbed = new MessageEmbed()
                .setTitle("✅ تم تصفير تقارير العضو")
                .setDescription(`✔️ تم تصفير جميع التقارير الخاصة بالعضو <@${selectedMember.user.id}> بنجاح!`)
                .setColor("#00FF00");

            await i.update({ embeds: [successEmbed], components: [], ephemeral: true });
        } else if (i.customId === "cancel_reset") {
            const cancelEmbed = new MessageEmbed()
                .setTitle("❌ تم إلغاء العملية")
                .setDescription("⚠️ لم يتم تصفير التقارير.")
                .setColor("#FF0000");

            await i.update({ embeds: [cancelEmbed], components: [], ephemeral: true });
        }
        collector.stop();
    });

    collector.on("end", async () => {
        await interaction.update({ components: [] });
    });
} 
              
              else if (action === 'viewnotes') {
                    const userNotes = await UserNotes.findOne({ userId: selectedMember.user.id });

                    if (!userNotes || userNotes.notes.length === 0) {
                        return interaction.reply({ content: '❌ **لا توجد ملاحظات لهذا العضو.**', ephemeral: true });
                    }

                    let page = 0;
                    const notesPerPage = 3;
                    const totalPages = Math.ceil(userNotes.notes.length / notesPerPage);

                    const generateEmbed = () => {
                        const start = page * notesPerPage;
                        const end = start + notesPerPage;
                        const notes = userNotes.notes.slice(start, end);

                        const embed = new MessageEmbed()
                            .setTitle(`📌 ملاحظات العضو`) // عنوان الـ Embed
                            .setDescription(
                                notes.map((note, index) =>
                                    `📜 **ملاحظة ${start + index + 1}:**\n\n` +
                                    `هذه هي ${index === 0 ? 'أول' : index === 1 ? 'ثاني' : index === 2 ? 'ثالث' : `${start + index + 1} `} ملاحظة تمت إضافتها لهذا المستخدم.\n\n` +
                                    `**المحتوى:**\n${note.content}\n\n` +
                                    `👤 **أضيفت بواسطة:** <@${note.addedBy}>\n` +
                                    `🕒 **التاريخ:** <t:${Math.floor(new Date(note.addedAt).getTime() / 1000)}:F>`
                                ).join('\n\n━━━━━━━━━━━━━━\n\n') // فصل بين الملاحظات بخط أفقي
                            )
                            .setFooter({
                                text: `صفحة ${page + 1} من ${totalPages}`,
                            })
                            .setTimestamp(); // إضافة الطابع الزمني

                        return embed;
                    };

                    const row = new MessageActionRow().addComponents(
                        new MessageButton().setCustomId(`prev_${selectedMember.user.id}`).setLabel('⬅️ السابق').setStyle('PRIMARY').setDisabled(page === 0),
                        new MessageButton().setCustomId(`next_${selectedMember.user.id}`).setLabel('➡️ التالي').setStyle('PRIMARY').setDisabled(page + 1 >= totalPages)
                    );

                    const msg = await interaction.update({ embeds: [generateEmbed()], components: [row], ephemeral: true, fetchReply: true });

                    // حذف الأزرار بعد 30 ثانية من عدم الاستخدام
                    const collector = msg.createMessageComponentCollector({ time: 30000 });

                    collector.on('collect', async i => {
                        if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ **ليس لديك إذن لاستخدام هذه الأزرار.**', ephemeral: true });

                        if (i.customId === `prev_${selectedMember.user.id}` && page > 0) page--;
                        if (i.customId === `next_${selectedMember.user.id}` && page + 1 < totalPages) page++;

                        await i.update({ embeds: [generateEmbed()], components: [
                            new MessageActionRow().addComponents(
                                new MessageButton().setCustomId(`prev_${selectedMember.user.id}`).setLabel('⬅️ السابق').setStyle('PRIMARY').setDisabled(page === 0),
                                new MessageButton().setCustomId(`next_${selectedMember.user.id}`).setLabel('➡️ التالي').setStyle('PRIMARY').setDisabled(page + 1 >= totalPages)
                            )
                        ]});
                    });

                    collector.on('end', () => {
                        msg.edit({ components: [] }).catch(() => {});
                    });
                } else if (action === 'addnote') {
                    await interaction.update({
                        content: '✍️ **يرجى كتابة الملاحظة الآن...** لديك 60 ثانية.',
                        components: [],
                        embeds: [],
                        ephemeral: true
                    });

                    const filter = m => m.author.id === interaction.user.id;

                    try {
                        const collected = await interaction.channel.awaitMessages({
                            filter,
                            max: 1,
                            time: 60000,
                            errors: ['time']
                        });

                        if (!collected || collected.size === 0) return;

                        const noteContent = collected.first().content;
                        collected.first().delete(); // حذف رسالة المستخدم بعد جمع الملاحظة

                        // تحديث أو إضافة ملاحظة للمستخدم في قاعدة البيانات
                        const userNotes = await UserNotes.findOneAndUpdate(
                            { userId: selectedMember.user.id },
                            {
                                $push: {
                                    notes: {
                                        noteId: Date.now().toString(),
                                        content: noteContent,
                                        addedBy: interaction.user,
                                        addedAt: new Date()
                                    }
                                }
                            },
                            { upsert: true, new: true }
                        );

                        await interaction.editReply({ content: `✅ **تمت إضافة الملاحظة للعضو بنجاح!**`, ephemeral: true });

                        // إرسال اللوج
                        await sendLog(interaction.guild, '✅ إضافة ملاحظة', `تمت إضافة ملاحظة لـ ${selectedMember.user.username} بواسطة ${interaction.user.tag}`, 'GREEN');
                    } catch (error) {
                        await interaction.editReply({ content: '⏳ انتهى الوقت ولم يتم إدخال أي ملاحظة.', ephemeral: true });

                        // إرسال اللوج في حالة الخطأ
                        await sendLog(interaction.guild, '❌ خطأ في إضافة ملاحظة', `فشل في إضافة ملاحظة لـ ${selectedMember.user.username} بواسطة ${interaction.user.tag}`, 'RED');
                    }
                } else if (action === 'contact') {
                    const selectedMemberId = selectedMember?.id; // تأكد من أن selectedMember معرف

                    if (!selectedMemberId) {
                        return interaction.reply({ content: '❌ حدث خطأ، لم يتم العثور على العضو.', ephemeral: true });
                    }

                    // إنشاء مودال لكتابة الرسالة
                    const modal = new Modal()
                        .setCustomId(`contact_modal_${selectedMemberId}`)
                        .setTitle('📩 إرسال رسالة للعضو');

                    // حقل إدخال نصي للرسالة
                    const messageInput = new TextInputComponent()
                        .setCustomId('contact_message')
                        .setLabel('📝 اكتب رسالتك هنا:')
                        .setStyle('PARAGRAPH')
                        .setRequired(true); // جعل الحقل مطلوبًا

                    // إضافة الحقل إلى المودال
                    const row = new MessageActionRow().addComponents(messageInput);
                    modal.addComponents(row);

                    // عرض المودال للمستخدم
                    await interaction.showModal(modal);
                } else if (action === 'rp') {
                    try {
                        const userData = await Application_user.findOne({ userId: selectedMember.user.id }) || {};
                        const totalReports = Object.values(userData).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);

                        const successRate = (userData.acceptedReports / totalReports) * 100 || 0;
                        const rejectionRate = (userData.rejectedReports / totalReports) * 100 || 0;

                        const embed = new MessageEmbed()
                            .setColor('#2F3136')
                            .setAuthor({
                                name: `${interaction.user.username} - لوحة الإحصائيات الذكية`,
                                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                            })
                            .addFields(
                                {
                                    name: '📊 الإحصائيات الرئيسية',
                                    value: [
                                        `**✅ مقبولة:** \`${userData.acceptedReports?.toLocaleString() || 0}\``,
                                        `**🔄 معلقة:** \`${userData.pendingReports?.toLocaleString() || 0}\``,
                                        `**📅 يومية:** \`${userData.dailyReports?.toLocaleString() || 0}\``,
                                        `**⛔ مرفوضة:** \`${userData.rejectedReports?.toLocaleString() || 0}\``,
                                        `**🚔 إجرامية:** \`${userData.crimeReports?.toLocaleString() || 0}\``,
                                        `**🌾 زراعية:** \`${userData.agricultureReports?.toLocaleString() || 0}\``
                                    ].join('\n'),
                                    inline: false
                                },
                                {
                                    name: '📈 التحليلات المتقدمة',
                                    value: [
                                        `**🏆 النجاح:** ${createProgressBar(successRate)}`,
                                        `**📉 الرفض:** ${createProgressBar(rejectionRate)}`
                                    ].join('\n'),
                                    inline: false
                                },
                                {
                                    name: '📊 تقييم الأداء',
                                    value: getSuccessLevel(successRate),
                                    inline: false
                                }
                            );

                        const row = new MessageActionRow().addComponents(
                            new MessageButton()
                                .setCustomId('prp_reload_reports')
                                .setLabel('🔄 تحديث')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('prp_detailed_report')
                                .setLabel('📑 تحليل متقدم')
                                .setStyle('SECONDARY')
                        );

                        await interaction.reply({
                            embeds: [embed],
                            components: [row],
                            ephemeral: true
                        });

                        // جلب الرسالة بعد إرسال الرد
                        const message = await interaction.fetchReply();

                        const collector = message.createMessageComponentCollector({ time: 60000 });

                        collector.on('collect', async (btnInteraction) => {
                            await btnInteraction.deferUpdate();

                            if (btnInteraction.customId === 'prp_reload_reports') {
                                const userData = await Application_user.findOne({ userId: selectedMember.user.id }) || {};
                                const totalReports = Object.values(userData).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);

                                const successRate = (userData.acceptedReports / totalReports) * 100 || 0;
                                const rejectionRate = (userData.rejectedReports / totalReports) * 100 || 0;

                                const embed = new MessageEmbed()
                                    .setColor('#2F3136')
                                    .setAuthor({
                                        name: `${interaction.user.username} - لوحة الإحصائيات الذكية`,
                                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                                    })
                                    .addFields(
                                        {
                                            name: '📊 الإحصائيات الرئيسية',
                                            value: [
                                                `**✅ مقبولة:** \`${userData.acceptedReports?.toLocaleString() || 0}\``,
                                                `**🔄 معلقة:** \`${userData.pendingReports?.toLocaleString() || 0}\``,
                                                `**📅 يومية:** \`${userData.dailyReports?.toLocaleString() || 0}\``,
                                                `**⛔ مرفوضة:** \`${userData.rejectedReports?.toLocaleString() || 0}\``,
                                                `**🚔 إجرامية:** \`${userData.crimeReports?.toLocaleString() || 0}\``,
                                                `**🌾 زراعية:** \`${userData.agricultureReports?.toLocaleString() || 0}\``
                                            ].join('\n'),
                                            inline: false
                                        },
                                        {
                                            name: '📈 التحليلات المتقدمة',
                                            value: [
                                                `**🏆 النجاح:** ${createProgressBar(successRate)}`,
                                                `**📉 الرفض:** ${createProgressBar(rejectionRate)}`
                                            ].join('\n'),
                                            inline: false
                                        },
                                        {
                                            name: '📊 تقييم الأداء',
                                            value: getSuccessLevel(successRate),
                                            inline: false
                                        }
                                    );

                                const row = new MessageActionRow().addComponents(
                                    new MessageButton()
                                        .setCustomId('prp_reload_reports')
                                        .setLabel('🔄 تحديث')
                                        .setStyle('PRIMARY'),
                                    new MessageButton()
                                        .setCustomId('prp_detailed_report')
                                        .setLabel('📑 تحليل متقدم')
                                        .setStyle('SECONDARY')
                                );

                                await btnInteraction.editReply({
                                    embeds: [embed],
                                    components: [row],
                                    ephemeral: true
                                });
                            } else if (btnInteraction.customId === 'prp_detailed_report') {
                                const userData = await Application_user.findOne({ userId: selectedMember.user.id }) || {};
                                const acceptedReports = userData.acceptedReports || 0;
                                const rejectedReports = userData.rejectedReports || 0;
                                const pendingReports = userData.pendingReports || 0;
                                const dailyReports = userData.dailyReports || 0;
                                const crimeReports = userData.crimeReports || 0;
                                const agricultureReports = userData.agricultureReports || 0;
                                const totalReports = acceptedReports + rejectedReports + pendingReports || 1;
                                const successRate = calculatePercentage(acceptedReports, totalReports);
                                const rejectionRate = calculatePercentage(rejectedReports, totalReports);

                                const chartConfig = {
                                    type: 'bar',
                                    data: {
                                        labels: ['مقبولة', 'مرفوضة', 'معلقة', 'يومية', 'جرائم', 'زراعية'],
                                        datasets: [{
                                            label: 'عدد التقارير',
                                            data: [acceptedReports, rejectedReports, pendingReports, dailyReports, crimeReports, agricultureReports],
                                            backgroundColor: [
                                                'rgba(75, 192, 192, 0.8)', // أخضر فاتح
                                                'rgba(255, 99, 132, 0.8)',  // أحمر
                                                'rgba(255, 206, 86, 0.8)',   // أصفر
                                                'rgba(54, 162, 235, 0.8)',   // أزرق
                                                'rgba(153, 102, 255, 0.8)',  // بنفسجي
                                                'rgba(255, 159, 64, 0.8)'    // برتقالي
                                            ],
                                            borderColor: [
                                                'rgba(75, 192, 192, 1)',
                                                'rgba(255, 99, 132, 1)',
                                                'rgba(255, 206, 86, 1)',
                                                'rgba(54, 162, 235, 1)',
                                                'rgba(153, 102, 255, 1)',
                                                'rgba(255, 159, 64, 1)'
                                            ],
                                            borderWidth: 1,
                                            borderRadius: 8,
                                            hoverBackgroundColor: [
                                                'rgba(75, 192, 192, 1)',
                                                'rgba(255, 99, 132, 1)',
                                                'rgba(255, 206, 86, 1)',
                                                'rgba(54, 162, 235, 1)',
                                                'rgba(153, 102, 255, 1)',
                                                'rgba(255, 159, 64, 1)'
                                            ]
                                        }]
                                    },
                                    options: {
                                        responsive: true,
                                        animation: {
                                            duration: 1200,
                                            easing: 'easeOutCubic'
                                        },
                                        scales: {
                                            x: {
                                                grid: { display: false },
                                                ticks: {
                                                    font: {
                                                        size: 14,
                                                        family: 'Arial',
                                                        weight: 'bold'
                                                    }
                                                }
                                            },
                                            y: {
                                                beginAtZero: true,
                                                grid: {
                                                    color: 'rgba(0, 0, 0, 0.1)',
                                                    borderDash: [5, 5]
                                                },
                                                ticks: {
                                                    font: {
                                                        size: 14,
                                                        family: 'Arial'
                                                    }
                                                }
                                            }
                                        },
                                        plugins: {
                                            title: {
                                                display: true,
                                                text: 'إحصائيات التقارير',
                                                font: {
                                                    size: 20,
                                                    family: 'Arial',
                                                    weight: 'bold'
                                                },
                                                padding: { top: 10, bottom: 20 }
                                            },
                                            legend: {
                                                display: true,
                                                position: 'bottom',
                                                labels: {
                                                    font: { size: 14, family: 'Arial' }
                                                }
                                            }
                                        }
                                    }
                                };

                                const quickChartResponse = await fetch('https://quickchart.io/chart/create', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        chart: chartConfig,
                                        backgroundColor: '#ffffff',
                                        width: 500,
                                        height: 300,
                                        format: 'png'
                                    })
                                });

                                const quickChartData = await quickChartResponse.json();
                                const chartUrl = quickChartData.url;

                                const detailedEmbed = new MessageEmbed()
                                    .setColor('#2F3136')
                                    .setTitle('📊 تحليل متقدم للتقارير')
                                    .addFields(
                                        { name: '📌 إجمالي التقارير', value: `\`${totalReports.toLocaleString()}\` تقرير`, inline: true },
                                        { name: '✅ المقبولة', value: `\`${acceptedReports.toLocaleString()}\``, inline: true },
                                        { name: '⛔ المرفوضة', value: `\`${rejectedReports.toLocaleString()}\``, inline: true },
                                        { name: '🔄 المعلقة', value: `\`${pendingReports.toLocaleString()}\``, inline: true },
                                        { name: '📆 اليومية', value: `\`${dailyReports.toLocaleString()}\``, inline: true },
                                        { name: '🚔 الجرائم', value: `\`${crimeReports.toLocaleString()}\``, inline: true },
                                        { name: '🌾 الزراعية', value: `\`${agricultureReports.toLocaleString()}\``, inline: true },
                                        { name: '🏆 نسبة النجاح', value: createProgressBar(successRate), inline: false },
                                        { name: '📉 نسبة الرفض', value: createProgressBar(rejectionRate), inline: false }
                                    )
                                    .setImage(chartUrl);

                                await btnInteraction.editReply({
                                    embeds: [detailedEmbed],
                                    components: [],
                                    ephemeral: true
                                });
                            }
                        });
                    } catch (error) {
                        console.error('Error fetching user data:', error);
                        interaction.reply({
                            content: '❌ تعذر تحميل البيانات! الرجاء المحاولة لاحقاً.',
                            ephemeral: true
                        });

                        // إرسال اللوج في حالة الخطأ
                        await sendLog(interaction.guild, '❌ خطأ في تحميل البيانات', `فشل في تحميل بيانات ${selectedMember.user.username} بواسطة ${interaction.user.tag}`, 'RED');
                    }
                }
            }
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('contact_modal_')) {
            await interaction.deferReply({ ephemeral: true });

            const selectedMemberId = interaction.customId.replace('contact_modal_', '');
            const selectedMember = await interaction.guild.members.fetch(selectedMemberId).catch(() => null);

            if (!selectedMember) {
                return interaction.editReply({ content: '❌ العضو غير موجود.' });
            }

            const messageContent = interaction.fields.getTextInputValue('contact_message');

            try {
                await selectedMember.send(`📩 **رسالة جديدة من ${interaction.user.tag}:**\n\`\`\`${messageContent}\`\`\``);
                await interaction.editReply({ content: '✅ تم إرسال الرسالة بنجاح!' });

                // إرسال اللوج
                await sendLog(interaction.guild, '✅ إرسال رسالة', `تم إرسال رسالة إلى ${selectedMember.user.username} بواسطة ${interaction.user.tag}`, 'GREEN');
            } catch (error) {
                await interaction.editReply({ content: '❌ لا يمكن إرسال رسالة لهذا العضو، ربما لديه الرسائل الخاصة معطلة.' });

                // إرسال اللوج في حالة الخطأ
                await sendLog(interaction.guild, '❌ خطأ في إرسال رسالة', `فشل في إرسال رسالة إلى ${selectedMember.user.username} بواسطة ${interaction.user.tag}`, 'RED');
            }
        }

        if (interaction.isSelectMenu() && interaction.customId.startsWith('select_member_')) {
            const selectedMemberId = interaction.values[0];
            const selectedMember = await interaction.guild.members.fetch(selectedMemberId).catch(() => null);
            if (!selectedMember) {
                return interaction.update({ content: '❌ العضو غير موجود.', components: [] });
            }

            // إنشاء صف أزرار للإجراءات على العضو المختار
         const row1 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId(`rp_${selectedMemberId}`).setLabel('📊 مستوى التقدم').setStyle('PRIMARY'),
    new MessageButton().setCustomId(`promote_${selectedMemberId}`).setLabel('⬆️ ترقية').setStyle('SUCCESS'),
    new MessageButton().setCustomId(`demote_${selectedMemberId}`).setLabel('⬇️ تخفيض').setStyle('DANGER')
);

const row2 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId(`change_${selectedMemberId}`).setLabel('📝 تغيير الهوية').setStyle('PRIMARY'),
    new MessageButton().setCustomId(`contact_${selectedMemberId}`).setLabel('✉️ تواصل مع العضو').setStyle('SUCCESS'),
    new MessageButton().setCustomId(`kick_${selectedMemberId}`).setLabel('🚫 طرد').setStyle('DANGER')
);

const row3 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId(`viewnotes_${selectedMemberId}`).setLabel('📖 عرض ملاحظات').setStyle('PRIMARY'),
    new MessageButton().setCustomId(`addnote_${selectedMemberId}`).setLabel('📝 إضافة ملاحظات').setStyle('SUCCESS'),
    new MessageButton().setCustomId(`deletenotes_${selectedMemberId}`).setLabel('🗑️ مسح ملاحظات').setStyle('DANGER')
);

const row4 = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`ortsresetreports_${selectedMemberId}`).setLabel('🔄 تصفير التقارير').setStyle('SECONDARY')
    );

            const userData = await Application_user.findOne({ userId: selectedMember.user.id });

            if (!userData) {
                return interaction.update({ content: '❌ العضو غير موجود بنظام.', components: [] });
            }

            const paymentData = await PaymentSystem.findOne({ userId: selectedMember.user.id });
            const leaveData = await Leave.findOne({ userId: selectedMember.user.id, status: "مقبولة" });

            // تحديد حالة الدفع
            const insuranceStatus = paymentData && paymentData.insurancePaymentStatus === "paid"
                ? "✅ **تم دفع التأمين**"
                : "❌ **لم يتم دفع التأمين**";

            // معلومات الإجازة إذا كانت متاحة
            const leaveStatus = leaveData
                ? `📅 **إجازة مقبولة**\n🗓 **البداية:** ${new Date(leaveData.startDate).toLocaleDateString('ar-EG')}\n⏳ **النهاية:** ${new Date(leaveData.endDate).toLocaleDateString('ar-EG')}\n📌 **السبب:** ${leaveData.reason || "غير محدد"}`
                : "❌ **لا توجد إجازات نشطة**";

            // تحديد لون الـ Embed حسب حالة المستخدم
            const embedColor = paymentData && paymentData.insurancePaymentStatus === "paid" ? "#00ff00" : "#ff0000";
          
          const allowe = [
        config.goldFamily, // @・Gold Family
        config.silverFamily, // @・Silver Family
        config.bronzeFamily, // @・Bronze Family
        config.member2, // @・Member 2
        config.member1, // @・Member 1
        
        config.support, // @・Support
        config.familyManager, // @・Family Manager
        config.leadManagement, // @・Lead Mangment
        config.management, // @・Mangment
        config.topRole, // @・إشراف العائلة
      ];

      const adminRoles = [
     config.support, // @・Support
        config.familyManager, // @・Family Manager
        config.leadManagement, // @・Lead Mangment
        config.management, // @・Mangment
        config.topRole, // @・إشراف العائلة
     
      ];

const userRoles = selectedMember.roles.cache.map(role => role.id);


let adminRole = null;
let familyRole = null;

for (let i = allowe.length - 1; i >= 0; i--) {
    if (userRoles.includes(allowe[i])) {
        if (!adminRole && adminRoles.includes(allowe[i])) adminRole = `<@&${allowe[i]}> (إدارية)`;
        if (!familyRole && !adminRoles.includes(allowe[i])) familyRole = `<@&${allowe[i]}> (العائلة)`;
        if (adminRole && familyRole) break;
    }
}
// النتيجة النهائية
// النتيجة النهائية
let finalRoleDisplay = "";
if (familyRole) finalRoleDisplay += `${familyRole}\n`;
if (adminRole) finalRoleDisplay += `${adminRole}`;
if (!finalRoleDisplay) finalRoleDisplay = "غير متوفر";


        // جلب عدد الملاحظات من قاعدة البيانات
        const userNotes = await UserNotes.findOne({ userId: selectedMember.user.id });
        const notesCount = userNotes ? userNotes.notes.length : 0;

        // تنسيق تاريخ الانضمام للعائلة
      
// تحويل تاريخ الانضمام إلى Timestamp مناسب لديسكورد
   const formatDate = (date) => {
  if (!date) return "❌ لم يتم التصفير بعد";
   
const d = new Date(date);
  const day = d.getDate();
  const month = d.getMonth() + 1; // لأن getMonth() يرجع القيم من 0 إلى 11
  const year = d.getFullYear();
  const formattedDate = d.toLocaleDateString("en-EG").replace(/\//g, "/");
  const formattedTime = d.toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });

  return `**\`${day}/${month}/${year}\`** || || **\`${formattedTime}\`**`;
};

// استخدامه
const lastPromotion = formatDate(userData.lastPromotionDate);
const lastResetDate = formatDate(userData.lastResetDate);
const joinDate = formatDate(userData.loginDate);


        // إنشاء Embed جديد ومحسّن
        const embed = new MessageEmbed()
            .setColor("#0099ff") // لون جذاب
            .setTitle("👤 معلومات المستخدم")
            .setDescription(`ℹ️ تفاصيل حساب <@${selectedMember.user.id}>`)
            .addFields(
        { name: "👤 الاسم", value: userData.User_name || "غير متوفر", inline: true },
        { name: "🎮 اسم داخل اللعبة", value: userData.User_name_game || "غير متوفر", inline: true },
        { name: "📌 حالة التأمين", value: insuranceStatus, inline: true },
        { name: "📆 حالة الإجازة", value: leaveStatus, inline: true },
        { name: "⭐ أعلى رتبة", value: finalRoleDisplay, inline: true },
        { name: "🗒️ عدد الملاحظات", value: `> ${notesCount} ملاحظة`, inline: true },
        { name: "🗒️ آخر ترقية", value: lastPromotion, inline: true },
        { name: "🗒️ آخر تصفير للتقارير", value: lastResetDate, inline: true },
        { name: "📅 تاريخ الانضمام للعائلة", value: joinDate, inline: true }
            )
            .setTimestamp(); // وقت الإرسال

        // إرسال الإيمبد
        return interaction.update({ content: null, embeds: [embed], components: [row1, row2, row3, row4], ephemeral: true });

        }
    
    
    
    
    }
};

/**
 * دالة لحساب الرتبة الجديدة للترقية (أي رتبة أعلى من الرتبة الحالية)
 * يتم الترقية فقط ضمن نطاق الرتب المسموح بها.
 */
function getPromotionRole(currentRoles, guild, allowedRoles) {
    const sortedRoles = Array.from(guild.roles.cache.filter(role => allowedRoles.includes(role.id)).values())
        .sort((a, b) => b.position - a.position);
    // إذا لم يكن لدى العضو أي رتبة من الرتب المسموح بها، نعطيه أدنى رتبة
    const currentRole = sortedRoles.find(role => currentRoles.includes(role.id));
    if (!currentRole) {
        return sortedRoles[sortedRoles.length - 1] ? sortedRoles[sortedRoles.length - 1].id : null;
    }
    const index = sortedRoles.findIndex(role => role.id === currentRole.id);
    // إذا لم يكن أعلى رتبة (أي index > 0)، نحصل على الرتبة التي أعلى منه
    if (index > 0) {
        return sortedRoles[index - 1].id;
    }
    return null; // لا يمكن الترقية أكثر من ذلك
}

function getDemotionRole(currentRoles, guild, allowedRoles2) {
    const sortedRoles = allowedRoles2
        .map(roleId => guild.roles.cache.get(roleId))
        .filter(role => role) // إزالة القيم غير الموجودة
        .sort((a, b) => b.position - a.position); // ترتيب تنازليًا بناءً على الـ position

    const currentRole = sortedRoles.find(role => currentRoles.includes(role.id));
    if (!currentRole) {
        return null; // العضو ليس لديه أي من الرتب المسموحة
    }

    const index = sortedRoles.findIndex(role => role.id === currentRole.id);
    if (index < sortedRoles.length - 1) {
        return sortedRoles[index + 1].id; // إعادة الرتبة الأدنى
    }

    return null; // لا يمكن التخفيض أكثر
}

// دالة مساعدة لإنشاء شريط التقدم
function createProgressBar(percentage, length = 10) {
    percentage = Math.max(0, Math.min(percentage, 100));
    const filledLength = Math.round((percentage / 100) * length);
    const emptyLength = length - filledLength;
    const color = percentage >= 75 ? '🟩' : percentage >= 50 ? '🟨' : percentage >= 25 ? '🟧' : '🟥';
    return `**[${color.repeat(filledLength)}${'⬜'.repeat(emptyLength)}]** ${percentage.toFixed(1)}%`;
}

// دالة مساعدة لتحديد مستوى النجاح
function getSuccessLevel(percentage) {
    if (percentage >= 75) return '🏆 **ممتاز**';
    if (percentage >= 50) return '🔹 **جيد**';
    if (percentage >= 25) return '⚠️ **متوسط**';
    return '❌ **ضعيف**';
}

// دالة مساعدة لحساب النسب المئوية
function calculatePercentage(part, total) {
    if (total === 0) return 0;
    return ((part / total) * 100).toFixed(2);
}