const { MessageEmbed, MessageActionRow, MessageButton, MessageComponentInteraction } = require('discord.js');
const Application_user = require('../models/Application.js');
const config = require('../config');

module.exports = {
    name: 'udasdsadasdasdpsadasdsadas',
    description: 'نظام متكامل لرفع التقارير مع التعديل الفوري',
    async execute(message) {
      
        const allowedChannelId = '1345889457777148047'; // 🛑 استبدل هذا بالـ ID الخاص بالروم المسموح به

        if (message.channel.id !== allowedChannelId) {
            return; 
        }
      
      
                 const rolesToRemove = ['1341094527615762464', '1341094526248554566', '1341094524897984702','1341094507294359603','1341094528622264461','1341094529721438240'];


        // التحقق من امتلاك العضو لأحد الأدوار المسموحة
        if (!message.member.roles.cache.some(role => rolesToRemove.includes(role.id))) {
            return;
        }
    
      
        const userId = message.author.id;
        const reportChannelId = '1345885896825901157';
        const finalChannelId = '1345887678486548572';
        let currentStep = 0;
        let mainMessage;
        const collectedData = {};
        let activeCollectors = [];

        try {
            // التحقق من وجود بيانات المستخدم
            const userData = await Application_user.findOne({ userId });
            if (!userData) {
                return sendTemporaryMessage('❌ لا توجد بيانات مسجلة لك!');
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // وظائف مساعدة محسنة
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            function createEmbed(step) {
                const embeds = {
                    1: new MessageEmbed()
                        .setTitle('📋 بدء رفع التقرير')
                        .setDescription('⏳ لديك 15 دقيقة لإكمال العملية')
                        .addField('الخطوة الحالية', 'اختر نوع التقرير من الأزرار أدناه')
                        .setColor(config.embedColor || '#5865F2'),

                    2: new MessageEmbed()
                        .setTitle('📝 كتابة الوصف')
                        .addField('الخطوة الحالية', 'أرسل وصف التقرير كنص عادي')
                        .setFooter({ text: 'اكتب "إلغاء" لوقف العملية' })
                        .setColor('#FEE75C'),

                    3: new MessageEmbed()
                        .setTitle('🖼️ إرفاق الصورة')
                        .addField('الخطوة الحالية', 'أرسل صورة التقرير كمرفق')
                        .setFooter({ text: 'الصيغ المسموحة: PNG, JPG, JPEG' })
                        .setColor('#57F287'),

                    4: new MessageEmbed()
                        .setTitle('✅ مراجعة نهائية')
                        .addFields(
                            { name: 'النوع', value: collectedData.reportType || '❌ غير محدد', inline: true },
                            { name: 'الوصف', value: collectedData.description?.slice(0, 1024) || '❌ غير محدد', inline: true }
                        )
.setFooter({ text: collectedData.reportType === 'مزرعة' ? 'Farm' : collectedData.reportType === 'إجرام' ? 'Crime' : 'Daily' })
                  .setImage(collectedData.reportImage)
                        .setColor('#EB459E')
                };
                return embeds[step];
            }

            async function updateMainMessage(embed, components = []) {
                try {
                    if (mainMessage && !mainMessage.deleted) {
                        return await mainMessage.edit({ embeds: [embed], components });
                    } else {
                        mainMessage = await message.channel.send({ embeds: [embed], components });
                        return mainMessage;
                    }
                } catch (error) {
                    console.error('فشل في تحديث الرسالة:', error);
                }
            }

            async function sendTemporaryMessage(content, timeout = 5000) {
                try {
                    const msg = await message.channel.send(content);
                    setTimeout(() => msg.delete().catch(() => {}), timeout);
                } catch (error) {
                    console.error('فشل إرسال الرسالة المؤقتة:', error);
                }
            }

            function cleanupCollectors() {
                activeCollectors.forEach(collector => {
                    if (!collector.ended) collector.stop();
                });
                activeCollectors = [];
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // نظام الخطوات الرئيسي
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            async function startReportProcess() {
                cleanupCollectors();
                currentStep = 1;
                
                const buttons = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId('daily')
        .setLabel('📅 يومي')
        .setStyle('PRIMARY'),
    new MessageButton()
        .setCustomId('farm')
        .setLabel('🌾 مزرعة')
        .setStyle('SECONDARY'),
    new MessageButton()
        .setCustomId('crime')
        .setLabel('🔫 إجرام')
        .setStyle('SECONDARY'),
    new MessageButton()
        .setCustomId('cancel')
        .setLabel('🚫 إلغاء')
        .setStyle('DANGER')
);


                await updateMainMessage(createEmbed(1), [buttons]);
                setupTypeCollector();
            }

            function setupTypeCollector() {
const filter = i => i.user.id === userId && ['daily', 'farm', 'crime', 'cancel'].includes(i.customId);
                const collector = mainMessage.createMessageComponentCollector({ 
                    filter, 
                    time: 900000,
                    componentType: 'BUTTON'
                });

                activeCollectors.push(collector);

                collector.on('collect', handleTypeSelection);
                collector.on('end', () => activeCollectors = activeCollectors.filter(c => c !== collector));
            }

       async function handleTypeSelection(i) {
    if (i.customId === 'cancel') return handleCancellation(i);
    
    const reportTypes = {
        daily: 'يومي',
        farm: 'مزرعة',
        crime: 'إجرام'
    };
    
    collectedData.reportType = reportTypes[i.customId];
    await i.deferUpdate();
    startDescriptionStep();
}
            async function startDescriptionStep() {
                currentStep = 2;
                await updateMainMessage(createEmbed(2));
                
                const filter = m => m.author.id === userId && !m.interaction;
                const collector = message.channel.createMessageCollector({ 
                    filter, 
                    time: 900000,
                    max: 1,
                    dispose: true
                });

                activeCollectors.push(collector);

                collector.on('collect', handleDescriptionInput);
                collector.on('end', (collected) => {
                    if (!collected.size) sendTemporaryMessage('⌛ انتهى الوقت المخصص لإدخال الوصف!');
                    activeCollectors = activeCollectors.filter(c => c !== collector);
                });
            }

            async function handleDescriptionInput(m) {
                if (m.content.toLowerCase().trim() === 'إلغاء') return handleCancellation(m);
                
                collectedData.description = m.content;
                await m.delete().catch(() => {});
                startImageStep();
            }

            async function startImageStep() {
                currentStep = 3;
                await updateMainMessage(createEmbed(3));

                const filter = m => m.author.id === userId && m.attachments.size > 0;
                const collector = message.channel.createMessageCollector({ 
                    filter, 
                    time: 900000,
                    max: 1,
                    dispose: true
                });

                activeCollectors.push(collector);

                collector.on('collect', handleImageUpload);
                collector.on('end', (collected) => {
                    if (!collected.size) sendTemporaryMessage('⌛ انتهى الوقت المخصص لإرسال الصورة!');
                    activeCollectors = activeCollectors.filter(c => c !== collector);
                });
            }

            async function handleImageUpload(m) {
                const attachment = m.attachments.first();
                
                if (!attachment.contentType?.startsWith('image/')) {
                    await sendTemporaryMessage('❌ يرجى إرسال صورة حقيقية!');
                    return startImageStep();
                }

                try {
                    const uploaded = await message.guild.channels.cache.get(reportChannelId)
                        .send({ files: [attachment.url] });
                    
                    collectedData.reportImage = uploaded.attachments.first().url;
                    await m.delete().catch(() => {});
                    showConfirmation();
                } catch (error) {
                    console.error('فشل تحميل الصورة:', error);
                    startImageStep();
                }
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // نظام التعديل الذكي
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  async function showConfirmation() {
                currentStep = 4;
                const buttons = new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId('confirm')
                        .setLabel('✅ تأكيد الإرسال')
                        .setStyle('SUCCESS'),
                    new MessageButton()
                        .setCustomId('edit')
                        .setLabel('✏️ تعديل البيانات')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('cancel')
                        .setLabel('🚫 إلغاء العملية')
                        .setStyle('DANGER')
                );

                await updateMainMessage(createEmbed(4), [buttons]);
                setupConfirmationCollector();
            }

            function setupConfirmationCollector() {
                const filter = i => i.user.id === userId && ['confirm', 'edit', 'cancel'].includes(i.customId);
                const collector = mainMessage.createMessageComponentCollector({ 
                    filter, 
                    time: 900000,
                    componentType: 'BUTTON'
                });

                activeCollectors.push(collector);

                collector.on('collect', handleConfirmation);
                collector.on('end', () => activeCollectors = activeCollectors.filter(c => c !== collector));
            }

            async function handleConfirmation(i) {
                if (i.customId === 'confirm') return handleFinalSubmission(i);
                if (i.customId === 'cancel') return handleCancellation(i);
                
                await i.deferUpdate();
                showEditOptions();
            }

            async function showEditOptions() {
                const buttons = new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId('edit_type')
                        .setLabel('🔄 تعديل النوع')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('edit_desc')
                        .setLabel('📝 تعديل الوصف')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('edit_image')
                        .setLabel('🖼️ تعديل الصورة')
                        .setStyle('PRIMARY')
                );

                await updateMainMessage(
                    new MessageEmbed()
                        .setTitle('📌 اختر الجزء المراد تعديله')
                        .setColor('#FFD700')
                        .setDescription('يمكنك تعديل أي جزء من بيانات التقرير:'),
                    [buttons]
                );
                
                setupEditCollector();
            }

            function setupEditCollector() {
                const filter = i => i.user.id === userId && i.customId.startsWith('edit_');
                const collector = mainMessage.createMessageComponentCollector({ 
                    filter, 
                    time: 900000,
                    componentType: 'BUTTON'
                });

                activeCollectors.push(collector);

                collector.on('collect', handleEditSelection);
                collector.on('end', () => activeCollectors = activeCollectors.filter(c => c !== collector));
            }

            async function handleEditSelection(i) {
                await i.deferUpdate();
                
                switch(i.customId) {
                    case 'edit_type': 
                        currentStep = 1;
                        await startReportProcess();
                        break;
                    case 'edit_desc': 
                        await startDescriptionStep();
                        break;
                    case 'edit_image': 
                        await startImageStep();
                        break;
                }
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // معالجة النتائج النهائية
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            async function handleFinalSubmission(interaction) {
                try {
                    const reportEmbed = new MessageEmbed()
                        .setTitle(`📄 تقرير ${collectedData.reportType}`)
                        .addFields(
                            { name: '👤 المرسل', value: `<@${userId}>`, inline: true },
                            { name: '📝 الوصف', value: collectedData.description.slice(0, 1024) || 'لا يوجد وصف', inline: true }
                        )
                        .setImage(collectedData.reportImage)
 .setFooter({ text: collectedData.reportType === 'مزرعة' ? 'Farm' : collectedData.reportType === 'إجرام' ? 'Crime' : 'Daily' })
                    .setColor(config.embedColor || '#5865F2');

                    const actionRow = new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId('accept_report')
                            .setLabel('✅ قبول')
                            .setStyle('SUCCESS'),
                        new MessageButton()
                            .setCustomId('reject_report')
                            .setLabel('❌ رفض')
                           .setStyle('DANGER'),
                        new MessageButton()
                            .setCustomId('reject_with_reason')
                            .setLabel('📝 رفض بسبب')
                            .setStyle('SECONDARY')
                    );

                    const reportMessage = await message.guild.channels.cache.get(finalChannelId).send({
                        content: `<@&${config.ADMIN_ROLE_ID}> 📢 تقرير جديد يحتاج مراجعة!`,
                        embeds: [reportEmbed],
                        components: [actionRow]
                    });


                    await interaction.update({
                        content: '✅ تم إرسال التقرير بنجاح إلى فريق المراجعة!',
                        embeds: [],
                        components: []
                    });

                    // تحديث pendingReports
                    await Application_user.findOneAndUpdate(
                        { userId },
                        { $inc: { pendingReports: 1 } },
                        { upsert: true, new: true }
                    );

                } catch (error) {
                    console.error('فشل الإرسال النهائي:', error);
                } finally {
                    cleanupCollectors();
                }
            }

          
            async function handleCancellation(source) {
                cleanupCollectors();
                
                try {
                    if (source instanceof MessageComponentInteraction) {
                        await source.update({ 
                            content: '❌ تم إلغاء العملية بنجاح', 
                            embeds: [], 
                            components: [] 
                        });
                    } else {
                        await source.delete().catch(() => {});
                        if (mainMessage && !mainMessage.deleted) {
                            await mainMessage.edit({ 
                                content: '❌ تم إلغاء العملية بنجاح', 
                                embeds: [], 
                                components: [] 
                            });
                        }
                    }
                } catch (error) {
                    console.error('فشل في معالجة الإلغاء:', error);
                }
            }

            // بدء العملية الرئيسية
            startReportProcess();

        } catch (error) {
            console.error('حدث خطأ جسيم:', error);
        }
    }
};