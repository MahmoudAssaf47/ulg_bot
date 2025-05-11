const { ModalBuilder, TextInputBuilder, MessageComponentInteraction, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageActionRow, MessageButton, Modal, MessageAttachment, MessageSelectMenu, Permissions, MessageEmbed, TextInputComponent } = require('discord.js');
const Seller  = require('../models/Sales'); // تأكد من مسار ملف قاعدة البيانات
const Store = require("../models/Store"); // استيراد المودل
const config = require('../config');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الدوال المساعدة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// دالة لإرسال اللوج إلى القناة المحددة

module.exports = {
    name: 'interactionCreate',
  async execute(interaction, client) {
        if (!interaction.isButton() && !interaction.isSelectMenu() && !interaction.isModalSubmit()) return;
        // التعامل مع تفاعل الأزرار
        if (interaction.isButton()) {
            // زر البداية الذي يطلق عملية اختيار العضو
        
  if (interaction.customId === "select_seller") {
   const rolesToRemove = [config.rolesellerManager]; // الرتب المسموح لها
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
  

    const roleId = config.seller; // معرف الرتبة المطلوبة لتصفية الأعضاء

    try {

        // جلب الأعضاء الذين لديهم الرتبة المطلوبة
        const membersWithRole = await interaction.guild.members.fetch().then(members =>
            members.filter(member => member.roles.cache.has(roleId))
        );

        if (membersWithRole.size === 0) {
            return interaction.reply({ content: '❌ لا يوجد أعضاء بهذه الرتبة.' });
        }

        // جلب بيانات الأعضاء من MongoDB وترتيبهم حسب تاريخ التسجيل (الأقدم أولًا)
        const userIds = [...membersWithRole.keys()];
        const sortedUsers = await Seller.find({ userId: { $in: userIds } })
            .sort({ createdAt: 1 }) // 1 للأقدم، -1 للأحدث
            .lean();

        // ترتيب الأعضاء في الـ Guild حسب قاعدة البيانات
        const sortedMembers = sortedUsers
            .map(user => membersWithRole.get(user.userId))
            .filter(member => member); // إزالة أي بيانات غير متطابقة

        if (sortedMembers.length === 0) {
            return interaction.reply({ content: '❌ لا يوجد بيانات متطابقة في قاعدة البيانات.' });
        }

        // تقسيم الأعضاء إلى مجموعات من 25 عضوًا
        const chunkSize = 25;
        const memberChunks = [];
        for (let i = 0; i < sortedMembers.length; i += chunkSize) {
            memberChunks.push(sortedMembers.slice(i, i + chunkSize));
        }

        // إرسال قائمة لكل مجموعة من 25 عضوًا
        for (let i = 0; i < memberChunks.length; i++) {
            const options = memberChunks[i].map(member => ({
                label: member.displayName,
                value: member.user.id
            }));

            const selectMenu = new MessageSelectMenu()
                .setCustomId(`select_seller_${i}`)
                .setPlaceholder(`🔍 اختر العضو (${i + 1}/${memberChunks.length})`)
                .addOptions(options);

            const selectRow = new MessageActionRow().addComponents(selectMenu);

         await interaction.reply({ 
                content: `👤 اختر العضو من القائمة (${i + 1}/${memberChunks.length}):`, 
                components: [selectRow], 
                ephemeral: true 
            });
        }

    } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        return interaction.reply({ content: '❌ حدث خطأ أثناء جلب البيانات.' });
    }
}
          
            if (
                interaction.customId.startsWith('outuser_') ||
                interaction.customId.startsWith('editidentity_') ||
                interaction.customId.startsWith('contactseller_') ||
                interaction.customId.startsWith('seladdnotes_') ||
                interaction.customId.startsWith('shownotes_') ||
                interaction.customId.startsWith('clearnotes_')||
                              interaction.customId.startsWith('removewarning_')||
                                            interaction.customId.startsWith('removereport_')||

                              interaction.customId.startsWith('addwarning_')

            ) {
                const [action, selectedMemberId] = interaction.customId.split('_');
                const selectedMember = await interaction.guild.members.fetch(selectedMemberId).catch(() => null);
                if (!selectedMember) {
                    await interaction.deferReply({ ephemeral: true });
                    return interaction.editReply({ content: '❌ العضو غير موجود.', components: [] });
                }

                if (action === 'outuser') {
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
                 '1353437573707727009' // إضافة الرتبة الجديدة للإزالة
            ]; 

            // إزالة الرتب المحددة من العضو
            const rolesToRemove = selectedMember.roles.cache.filter(role => allowe.includes(role.id));
            await selectedMember.roles.remove(rolesToRemove, 'إزالة الرتب المحددة');

            // إضافة الرتبة الجديدة
            const newRoleId = '1349146756679467110';
            await selectedMember.roles.add(newRoleId, 'إضافة رتبة جديدة');

            await Seller.findOneAndDelete({ userId: selectedMember.user.id });

            // حذف المنتجات التي أنشأها العضو
            await Store.updateMany(
                { "products.sellerId": selectedMember.user.id },
                { $pull: { products: { sellerId: selectedMember.user.id } } }
            );

            // إعادة تعيين اسم المستخدم
            await selectedMember.setNickname(null).catch(() => {});

            // تحديث التفاعل مع المستخدم
            await i.update({ content: `✅ تم طرد ${selectedMember.user.username} بنجاح، وتمت إضافته إلى الرتبة الجديدة.`, components: [] });

            // إرسال اللوج
        } catch (error) {
            console.error(error);
            await i.update({ content: '❌ حدث خطأ أثناء محاولة تنفيذ الأمر.', components: [] });

            // إرسال اللوج في حالة الخطأ
        }
    } else if (i.customId === 'cancel_kick') {
        await i.update({ content: '❌ تم إلغاء عملية الطرد.', components: [] });
    }

    collector.stop(); // إيقاف المجمع بعد التفاعل
});

                }
              else if (action === 'editidentity') {
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
                        }
                    } catch (error) {
                        await interaction.followUp({ content: '❌ حدث خطأ أثناء تغيير الهوية.', ephemeral: true });

                        // إرسال اللوج في حالة الخطأ
                    }
                } 
              else if (action === 'clearnotes') {
                
                
    // جلب ملاحظات المستخدم
    let userNotes = await Seller.findOne({ userId: selectedMember.user.id });
    if (!userNotes || userNotes.notes.length === 0) {
        return interaction.update({
            content: "❌ لا توجد ملاحظات لحذفها.",
            embeds: [],
            components: [],
            ephemeral: true
        });
    }

    // تنظيف العناصر التي تكون فيها noteId null لتفادي مشكلة الفهرس
    await Seller.updateOne(
        { userId: selectedMember.user.id },
        { $pull: { notes: { noteId: null } } }
    );

    // تحديث البيانات بعد التنظيف
    userNotes = await Seller.findOne({ userId: selectedMember.user.id });
    
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

        let results = await Seller.findOneAndUpdate(
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

   await Seller.findOneAndUpdate(
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
            const updatedUserNotes = await Seller.findOne({ userId: selectedMember.user.id });
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
              else if (action === 'shownotes') {
                    const userNotes = await Seller.findOne({ userId: selectedMember.user.id });

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
                } 
              else if (action === 'seladdnotes') {
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
                        const userNotes = await Seller.findOneAndUpdate(
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
                    } catch (error) {
                        await interaction.editReply({ content: '⏳ انتهى الوقت ولم يتم إدخال أي ملاحظة.', ephemeral: true });

                        // إرسال اللوج في حالة الخطأ
                    }
                } 
              else if (action === 'contactseller') {
                    const selectedMemberId = selectedMember?.id; // تأكد من أن selectedMember معرف

                    if (!selectedMemberId) {
                        return interaction.reply({ content: '❌ حدث خطأ، لم يتم العثور على العضو.', ephemeral: true });
                    }

                    // إنشاء مودال لكتابة الرسالة
                    const modal = new Modal()
                        .setCustomId(`contact_seller_${selectedMemberId}`)
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
                } 
              
              else if (action === 'removereport') {
    const selectedMemberId = selectedMember?.id;
    if (!selectedMemberId) {
        return interaction.reply({ content: '❌ حدث خطأ، لم يتم العثور على العضو.', ephemeral: true });
    }

    // إنشاء المودال لطلب عدد البلاغات
    const modal = new Modal()
        .setCustomId(`removereport_modal_${selectedMemberId}`)
        .setTitle('إزالة البلاغات')
        .addComponents(
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId('report_count')
                    .setLabel('كم عدد البلاغات التي تريد إزالتها؟')
                    .setStyle('SHORT')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(100)
                    .setPlaceholder('اكتب رقمًا (1 أو أكثر)')
            )
        );

    await interaction.showModal(modal);
}

                            else if (action === 'removewarning') {
    const selectedMemberId = selectedMember?.id;
    if (!selectedMemberId) {
        return interaction.reply({ content: '❌ حدث خطأ، لم يتم العثور على العضو.', ephemeral: true });
    }

    // إنشاء المودال لطلب عدد الإنذارات
    const modal = new Modal()
        .setCustomId(`removewarning_modal_${selectedMemberId}`)
        .setTitle('إزالة الإنذارات')
        .addComponents(
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId('warning_count')
                    .setLabel('كم عدد الإنذارات التي تريد إزالتها؟')
                    .setStyle('SHORT')
                    .setRequired(true)
                  .setMinLength(1)
                .setMaxLength(100)
                    .setPlaceholder('اكتب رقمًا (1 أو أكثر)')
            )
        );

    // إرسال المودال للمستخدم
    await interaction.showModal(modal);
}
              
              
              
                   else if (action === 'addwarning') {
    const selectedMemberId = selectedMember?.id;
    if (!selectedMemberId) {
        return interaction.reply({ content: '❌ حدث خطأ، لم يتم العثور على العضو.', ephemeral: true });
    }

    // إنشاء المودال لطلب عدد الإنذارات
    const modal = new Modal()
        .setCustomId(`addwarning_modal_${selectedMemberId}`)
        .setTitle('إضافة الإنذارات')
        .addComponents(
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId('warning_count')
                    .setLabel('كم عدد الإنذارات التي تريد إضافتها؟')
                    .setStyle('SHORT')
                    .setRequired(true)
                  .setMinLength(1)
                .setMaxLength(100)
                    .setPlaceholder('اكتب رقمًا (1 أو أكثر)')
            )
        );

    // إرسال المودال للمستخدم
    await interaction.showModal(modal);
}
       
          }
    
     }
    
       if (interaction.isModalSubmit() && interaction.customId.startsWith('addwarning_modal_')) {

    const selectedMemberId = interaction.customId.replace('addwarning_modal_', '');
    const selectedMember = await interaction.guild.members.fetch(selectedMemberId).catch(() => null);

    if (!selectedMember) {
        return interaction.editReply({ content: '❌ العضو غير موجود.' });
    }

    try {
        const warningCount = interaction.fields.getTextInputValue('warning_count');
        const warningsToAdd = parseInt(warningCount, 10);

        if (isNaN(warningsToAdd) || warningsToAdd < 1) {
            return interaction.reply({ content: '❌ يجب إدخال رقم صالح لا يقل عن 1.', ephemeral: true });
        }

        // نجيب الإنذارات الحالية قبل التعديل
        const existingData = await Seller.findOne({ userId: selectedMemberId });
        const currentWarnings = existingData?.warningsCount || 0;

        // نحدث عدد الإنذارات
        const updatedData = await Seller.findOneAndUpdate(
            { userId: selectedMemberId },
            { $inc: { warningsCount: warningsToAdd } },
            { new: true, upsert: true }
        );

        await interaction.reply({
            content: `✅ تم إضافة **${warningsToAdd}** إنذار(ات) إلى العضو <@${selectedMemberId}>.\nالعدد السابق: **${currentWarnings}**\nالعدد الجديد: **${updatedData.warningsCount}**`,
            ephemeral: true
        });

    } catch (error) {
        console.error(error);
        return interaction.reply({ content: '❌ حدث خطأ أثناء إضافة الإنذارات.', ephemeral: true });
    }
}

    if (interaction.isModalSubmit() && interaction.customId.startsWith('removereport_modal_')) {

    const selectedMemberId = interaction.customId.replace('removereport_modal_', '');
    const selectedMember = await interaction.guild.members.fetch(selectedMemberId).catch(() => null);

    if (!selectedMember) {
        return interaction.editReply({ content: '❌ العضو غير موجود.' });
    }

    try {
        const reportCount = interaction.fields.getTextInputValue('report_count');
        const reportsToRemove = parseInt(reportCount, 10);

        if (isNaN(reportsToRemove) || reportsToRemove < 1) {
            return interaction.reply({ content: '❌ يجب إدخال رقم صالح لا يقل عن 1.', ephemeral: true });
        }

        const memberData = await Seller.findOne({ userId: selectedMemberId });

        if (!memberData || memberData.reportsCount === 0) {
            return interaction.reply({ content: `⚠️ هذا العضو ليس لديه أي بلاغات لحذفها.`, ephemeral: true });
        }

        if (reportsToRemove > memberData.reportsCount) {
            return interaction.reply({
                content: `⚠️ لا يمكنك حذف **${reportsToRemove}** بلاغ(ات)، لأن هذا العضو لديه فقط **${memberData.reportsCount}** بلاغ(ات).`,
                ephemeral: true
            });
        }

        const row = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('confirm_remove_report')
                .setLabel('✅ نعم')
                .setStyle('SUCCESS'),
            new MessageButton()
                .setCustomId('cancel_remove_report')
                .setLabel('❌ لا')
                .setStyle('DANGER')
        );

        await interaction.reply({
            content: `⚠️ هل أنت متأكد أنك تريد إزالة **${reportsToRemove}** بلاغ من العضو؟`,
            components: [row],
            ephemeral: true
        });

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId === 'confirm_remove_report') {
                await Seller.findOneAndUpdate(
                    { userId: selectedMemberId },
                    { $inc: { reportsCount: -reportsToRemove } },
                    { new: true }
                );

                await buttonInteraction.update({ content: `✅ تم إزالة **${reportsToRemove}** بلاغ(ات) بنجاح.`, components: [] });
            } else if (buttonInteraction.customId === 'cancel_remove_report') {
                await buttonInteraction.update({ content: '❌ تم إلغاء العملية.', components: [] });
            }
            collector.stop();
        });

    } catch (error) {
        console.error(error);
        return interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ العملية.', ephemeral: true });
    }
}

    
          
if (interaction.isModalSubmit() && interaction.customId.startsWith('removewarning_modal_'))  {

            const selectedMemberId = interaction.customId.replace('removewarning_modal_', '');
            const selectedMember = await interaction.guild.members.fetch(selectedMemberId).catch(() => null);

            if (!selectedMember) {
                return interaction.editReply({ content: '❌ العضو غير موجود.' });
            }
  
    try {
        const warningCount = interaction.fields.getTextInputValue('warning_count');
        const warningsToRemove = parseInt(warningCount, 10);

        if (isNaN(warningsToRemove) || warningsToRemove < 1) {
            return interaction.reply({ content: '❌ يجب إدخال رقم صالح لا يقل عن 1.', ephemeral: true });
        }

        const memberWarnings = await Seller.findOne({ userId: selectedMemberId });

        if (!memberWarnings || memberWarnings.warningsCount === 0) {
            return interaction.reply({ content: `⚠️ هذا العضو ليس لديه أي إنذارات لحذفها.`, ephemeral: true });
        }

        if (warningsToRemove > memberWarnings.warningsCount) {
            return interaction.reply({
                content: `⚠️ لا يمكنك حذف **${warningsToRemove}** إنذار(ات)، لأن هذا العضو لديه فقط **${memberWarnings.warningsCount}** إنذار(ات).`,
                ephemeral: true
            });
        }

        const row = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('confirm_remove_warning')
                .setLabel('✅ نعم')
                .setStyle('SUCCESS'),
            new MessageButton()
                .setCustomId('cancel_remove_warning')
                .setLabel('❌ لا')
                .setStyle('DANGER')
        );

        await interaction.reply({
            content: `⚠️ هل أنت متأكد أنك تريد إزالة **${warningsToRemove}** إنذار من العضو؟`,
            components: [row],
            ephemeral: true
        });

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId === 'confirm_remove_warning') {
                await Seller.findOneAndUpdate(
                    { userId: selectedMemberId },
                    { $inc: { warningsCount: -warningsToRemove } }, // تقليل العدد بدلاً من زيادته
                    { new: true }
                );

                await buttonInteraction.update({ content: `✅ تم إزالة **${warningsToRemove}** إنذار(ات) بنجاح.`, components: [] });
            } else if (buttonInteraction.customId === 'cancel_remove_warning') {
                await buttonInteraction.update({ content: '❌ تم إلغاء العملية.', components: [] });
            }
            collector.stop();
        });

    } catch (error) {
        console.error(error);
        return interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ العملية.', ephemeral: true });
    }
}
          
     if (interaction.isModalSubmit() && interaction.customId.startsWith('contact_seller_')) {
       
            await interaction.deferReply({ ephemeral: true });

            const selectedMemberId = interaction.customId.replace('contact_seller_', '');
            const selectedMember = await interaction.guild.members.fetch(selectedMemberId).catch(() => null);

            if (!selectedMember) {
                return interaction.editReply({ content: '❌ العضو غير موجود.' });
            }

            const messageContent = interaction.fields.getTextInputValue('contact_message');

            try {
                await selectedMember.send(`📩 **رسالة جديدة من ${interaction.user.tag}:**\n\`\`\`${messageContent}\`\`\``);
                await interaction.editReply({ content: '✅ تم إرسال الرسالة بنجاح!' });

                // إرسال اللوج
            } catch (error) {
                await interaction.editReply({ content: '❌ لا يمكن إرسال رسالة لهذا العضو، ربما لديه الرسائل الخاصة معطلة.' });

                // إرسال اللوج في حالة الخطأ
            }
        }
// التعامل مع القائمة المنسدلة
if (interaction.isSelectMenu() && interaction.customId.startsWith('select_seller_')) {


    const selectedMemberId = interaction.values[0];
    const selectedMember = await interaction.guild.members.fetch(selectedMemberId).catch(() => null);

    if (!selectedMember) {
        return interaction.update({ content: '❌ العضو غير موجود.', components: [] });
    }

   // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الأزرار الأساسية (إدارة العضو)
const memberManagementRow = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId(`editidentity_${selectedMemberId}`)
        .setLabel('📝 تغيير الهوية')
        .setStyle('PRIMARY'),
        
    new MessageButton()
        .setCustomId(`contactseller_${selectedMemberId}`)
        .setLabel('✉️ تواصل مع البائع')
        .setStyle('SUCCESS'),
        
    new MessageButton()
        .setCustomId(`outuser_${selectedMemberId}`)
        .setLabel('🚫 طرد')
        .setStyle('DANGER')
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// أزرار الملاحظات والإنذارات
const notesWarningsRow = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId(`shownotes_${selectedMemberId}`)
        .setLabel('📖 عرض الملاحظات')
        .setStyle('PRIMARY'),
        
    new MessageButton()
        .setCustomId(`addnotes_${selectedMemberId}`)
        .setLabel('📝 إضافة ملاحظات')
        .setStyle('SUCCESS'),
        
    new MessageButton()
        .setCustomId(`clearnotes_${selectedMemberId}`)
        .setLabel('🗑️ مسح الملاحظات')
        .setStyle('DANGER')
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// أزرار جديدة: الإنذارات والبلاغات
const modActionsRow = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId(`addwarning_${selectedMemberId}`)
        .setLabel('⚠️ إضافة إنذار') // الزر الجديد
        .setStyle('SECONDARY'),
        
    new MessageButton()
        .setCustomId(`removewarning_${selectedMemberId}`)
        .setLabel('✅ إزالة إنذار')
        .setStyle('SECONDARY'),
        
    new MessageButton()
        .setCustomId(`removereport_${selectedMemberId}`)
        .setLabel('❌ إزالة بلاغ') // الزر الجديد
        .setStyle('DANGER')
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  
          const seller = await Seller.findOne({ userId: selectedMemberId });

    if (!seller) {
      return interaction.reply({
        content: "⚠️ **هذا البائع غير مسجل كبائع في النظام!**",
        ephemeral: true
      });
    }
    const ratingsArray = seller.ratings;  // التقييمات المخزنة
const totalRatings = ratingsArray.length;

let ratingStars = "🌟 لم يتم التقييم بعد";  // القيمة الافتراضية إذا لم يتم وجود تقييمات

if (totalRatings > 0) {
    // جمع التقييمات وتحويلها إلى أعداد صحيحة
    const totalSum = ratingsArray.reduce((acc, rating) => acc + rating.rating, 0);  // استخدم rating.rating مباشرةً لأنه عدد صحيح
    
    // حساب التقييم المتوسط
    const averageRating = totalSum / totalRatings;

    // حساب النسبة المئوية

    // بناء النجوم بناءً على التقييم المتوسط
    const filledStars = "🌟".repeat(Math.round(averageRating));  // استخدام 🌟 فقط
    // دمج النجوم والنسبة المئوية
    ratingStars = `\`${filledStars}\` || || (**${averageRating.toFixed(1)}**)`;
}

 

const sellerEmbed = new MessageEmbed()
    .setColor("#0099ff")
    .setTitle("👤 معلومات البائع")
    .setDescription(`ℹ️ تفاصيل حساب <@${selectedMember.user.id}>`)
    .addFields(
        { name: "✅ **تم التحقق؟**", value: seller.isVerified ? "🟢 نعم" : "🔴 لا", inline: true },
        { name: "📦 **المنتجات المتاحة**", value: `\`${seller.availableProducts}\` 🏷`, inline: true },
        { name: "🛍 **إجمالي المنتجات**", value: `\`${seller.totalSellerProducts}\` 📦`, inline: true },
        { name: "📈 **عدد المبيعات**", value: `\`${seller.salesCount}\` 📊`, inline: true },
        { name: "🚨 **عدد البلاغات**", value: `\`${seller.reportsCount}\` ⚠️`, inline: true },
        { name: "⚠️ **عدد التحذيرات**", value: `\`${seller.warningsCount}\` ⚠️`, inline: true },
        { name: "📝 **عدد الملاحظات**", value: `\`${seller.notes.length}\` 🗒`, inline: true },
        { name: "⭐ **التقييم العام**", value: ratingStars, inline: true },
              { name: "📅 **تاريخ الانضمام كبائع**", value: `<t:${Math.floor((seller.createdAt) / 1000)}:F>`, inline: true }

    )
    .setTimestamp();


  
    // إرسال الإيمبد
    return interaction.update({ content: null, embeds: [sellerEmbed], components: [memberManagementRow, notesWarningsRow, modActionsRow]
, ephemeral: true });
  
 
          
}
          
          
        
      
    }
};
