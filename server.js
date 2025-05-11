const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton, Modal, TextInputComponent } = require('discord.js');
const mongoose = require('mongoose');
const config = require('./config');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const auctionSchema = new mongoose.Schema({
    messageId: String,
    itemName: String,
    startingPrice: Number,
    currentPrice: Number,
    auctionEndTime: Number,
    auctionOwner: String,  // صاحب المزاد
    auctionMaxPrice: Number,  // الحد الأقصى للمزاد
    bidders: [{ userId: String, bidAmount: Number }],
    image: String,
    ownerId: String,  // صاحب السلعة
    winnerId: String,  // الفائز بالمزاد
    isClosed: { type: Boolean, default: false }  // حالة المزاد (مفتوح/مغلق)

});
 

const Auction = mongoose.model('Auction', auctionSchema);
const bidSchema = new mongoose.Schema({
    userId: String,
    lastBidTime: Number,
}); 

const BidCooldown = mongoose.model('BidCooldown', bidSchema);

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));
client.mongoPing = 0;


// عند محاولة تحديث رسالة مزاد
/*async function updateAuctionMessage(auction, message) {
    try {
        const biddersSorted = auction.bidders.sort((a, b) => b.bidAmount - a.bidAmount);
        const topBidder = biddersSorted[0];
        const auctionEmbed = new MessageEmbed()
            .setTitle(`🏆 مزاد: ${auction.itemName} 🏆`)
            .addField('🛍️ إسم السلعة', auction.itemName)
            .addField('💵 السعر البدائي', `${auction.startingPrice} دولار`)
            .addField('⏳ مدة المزاد', `<t:${Math.floor(auction.auctionEndTime / 1000)}:R>`)
            .addField('👤 صاحب السلعة:', `<@${String(auction.ownerId || 'غير متوفر')}>`)
            .setColor('BLUE');

        if (auction.image) {
            auctionEmbed.setImage(auction.image);
        }

        await message.edit({ embeds: [auctionEmbed] });
    } catch (error) {
        if (error.code === 10008) { // Unknown Message
            console.log('تم حذف رسالة المزاد، يتم حذف المزاد من قاعدة البيانات.');
            await Auction.deleteOne({ messageId: auction.messageId });
        } else {
            console.error('Error updating auction message:', error);
        }
    }
}*/
async function editMessageSafely(fullMessageId, embed) {
    try {
        const [channelId, messageId] = fullMessageId.split('-');
        const channel = await client.channels.fetch(channelId);
        
        if (!channel) {
            console.log(`❌ Channel not found, deleting auction: ${fullMessageId}`);
            await Auction.deleteOne({ messageId: fullMessageId });
            return;
        }

        const message = await channel.messages.fetch(messageId).catch(() => null);
        
        if (!message) {
            console.log(`❌ Message not found, deleting auction: ${fullMessageId}`);
            await Auction.deleteOne({ messageId: fullMessageId });
            return;
        }

        await message.edit({ embeds: [embed], components: [] });
    } catch (error) {
        if (error.code === 10008) {
            console.log(`Message deleted, deleting auction: ${fullMessageId}`);
            await Auction.deleteOne({ messageId: fullMessageId });
        } else {
            console.error('❌ Error editing message:', error);
        }
    }
}

async function endAuction(auction, message) {
    try {
        const channelId = config.channelmazad; // ID القناة
        const messageId = message.id;

        // فرز المزايدين من الأعلى إلى الأقل
  // التحقق من وجود المزايدين وأنها مصفوفة
 const biddersSorted = Array.isArray(auction.bidders)
            ? auction.bidders
                .filter(b => b.bidAmount && !isNaN(b.bidAmount)) // تجنب القيم غير الصالحة
                .sort((a, b) => b.bidAmount - a.bidAmount)
            : [];
      
        const topBidder = biddersSorted.length > 0 ? biddersSorted[0] : null;


        if (!topBidder || !topBidder.userId) {
         
          
        const itemName = auction?.itemName ? String(auction.itemName) : 'غير متوفر';
const startingPrice = auction?.startingPrice ? String(auction.startingPrice) : 'غير متوفر';
const ownerId = auction?.ownerId ? `<@${auction.ownerId}>` : 'غير متوفر';

const embed = new MessageEmbed()
    .addField('🛍️ إسم السلعة:', itemName)
    .addField('💲 سعر بداية المزاد:', startingPrice)
    .addField('🎉 الفائز في المزاد:', '🎉 لا يوجد مزايدين، المزاد انتهى.')
    .addField('👤 صاحب السلعة:', ownerId)
    .setColor('RED');

if (auction?.image) {
    embed.setImage(auction.image);
}

            // تعديل الرسالة بشكل آمن
await editMessageSafely(auction.messageId, embed);

            // إرسال رسالة إضافية
            await message.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle('📢 تنبيه: مزاد انتهى بدون فائز!')
                        .setDescription(`**🛍️ اسم السلعة:** ${auction.itemName}\n**🎉 لا يوجد مزايدين، المزاد انتهى!**`)
                        .setColor('RED')
                ]
            });


            // حذف المزاد إذا لم يكن هناك مزايدين
            await Auction.deleteOne({ messageId: auction.messageId });
        } else {

          
            const winner = `<@${topBidder.userId}>`;
            const winningAmount = topBidder.bidAmount;

            const embed = new MessageEmbed()
                .addField('🛍️ إسم السلعة:', String(auction.itemName || 'غير متوفر'))
                .addField('💲 سعر بداية المزاد:', String(auction.startingPrice || 'غير متوفر'))
                .addField('🎉 الفائز في المزاد:', String(winner || 'لا يوجد فائز'))
                .addField('💰 أتم المزاد بسعر:', String(winningAmount || 'غير متوفر'))
                .addField('👤 صاحب السلعة:', `<@${String(auction.ownerId || 'غير متوفر')}>`)
                .setColor('GREEN');

         
          
                const auctionRow = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('bid')
            .setLabel('💰 مزايدة في السعر')
            .setStyle('PRIMARY')
            .setDisabled(true), // تعطيل الزر

        new MessageButton()
            .setCustomId('top_bidders')
            .setLabel('🏆 المتصدرين في المزاد')
            .setStyle('SECONDARY')
            .setDisabled(true), // تعطيل الزر

        new MessageButton()
            .setCustomId('end_auction')
            .setLabel('⏹️ إنهاء المزاد')
            .setStyle('DANGER')
            .setDisabled(true) // تعطيل الزر
    );
const detailsEmbed = new MessageEmbed()
    .setTitle('📢 تفاصيل المزاد')
    .setColor('RED') // لون يوضح أن المزاد انتهى
    .addFields(
        { name: '🛍️ إسم السلعة', value: String(auction.itemName || 'غير متوفر'), inline: false },
        { name: '💵 السعر البدائي', value: `${String(auction.startingPrice || 'غير متوفر')} دولار`, inline: false },
        { name: '⏳ مدة المزاد', value: '🔴 انتهى المزاد!', inline: false },
        { name: '👤 صاحب السلعة', value: `<@${String(auction.ownerId || 'غير متوفر')}>`, inline: false }
    )
    if (auction.image) {
                detailsEmbed.setImage(auction.image);
            }
          

            
          
          
                  await message.edit({ embeds: [detailsEmbed], components: [auctionRow] });

            // تعديل الرسالة بشكل آمن

            const customId = `claim_prize_${topBidder.userId}_${config.channelmazad}_${messageId}`;
            const button = new MessageButton()
                .setCustomId(customId)
                .setLabel('🎁 الحصول على الجائزة 🎁')
                .setStyle('SUCCESS');

            const row = new MessageActionRow().addComponents(button);

            // إرسال رسالة جديدة مع الزر
            await message.reply({
                embeds: [embed],
                components: [row],
                content: `<@${topBidder.userId}>`
            });

            // تحديث حالة المزاد
            await Auction.findOneAndUpdate(
                { _id: auction._id },
                { $set: { isClosed: true, winnerId: topBidder.userId } }
            );
        }
    } catch (error) {
        // التعامل مع الأخطاء بشكل هادئ
        console.error('حدث خطأ أثناء إنهاء المزاد:', error);
    }
}


client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // تشغيل الفحص كل 60 ثانية (60000 ملي ثانية)
   setInterval(async () => {
    try {
        // جلب المزادات التي انتهى وقتها ولم تُغلق بعد
        const auctions = await Auction.find({ 
            auctionEndTime: { $lte: Date.now() }, 
            isClosed: false 
        });

        if (!auctions.length) return;

        for (const auction of auctions) {
            try {
                const [channelId, messageId] = auction.messageId.split('-');
                
                const channel = await client.channels.fetch(channelId).catch(() => null);
                if (!channel) {
                    await Auction.deleteOne({ _id: auction._id });
                    continue;
                }

                const message = await channel.messages.fetch(messageId).catch(() => null);
                if (!message) {
                    await Auction.deleteOne({ _id: auction._id });
                    continue;
                }

                await endAuction(auction, message);
            } catch (error) {
                console.error(`❌ خطأ أثناء معالجة المزاد ${auction._id}:`, error);
            }
        }
    } catch (error) {
        console.error('❌ خطأ أثناء جلب المزادات:', error);
    }
}, 10000); // الفحص كل 10 ثوانٍ
});




/*
client.on('messageCreate', async message => {
    if (message.content.startsWith('!start')) {
      const serverName = message.guild.name;

    // تصميم الـ Embed
    const embed = new MessageEmbed()
      .setColor('#2F3136') // اللون الداكن مثل الصورة
      .setTitle('📌✨ نظام المزاد ✨📌')
      .setDescription(`
مرحبًا بك في **\`${serverName}\`**!  
للبدء في المزاد، اضغط على الزر أدناه لكتابة تفاصيل المزاد.
      
📌 **تفاصيل المزاد**:
برجاء الإجابة على السؤال التالي:

1. ما اسم السلعة؟
2. السعر البدائي:
3. مدة المزاد:
4. صاحب السلعة:
5. الحد الأقصى للمزاد:
      `)
      .setFooter({ text: 'اضغط على الزر لبدء المزاد' });

    // زر بدء المزاد
    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('start_auction')
        .setLabel('بدء المزاد')
        .setStyle('PRIMARY') // لون الزر
    );

    // إرسال الـ Embed مع الزر
    await message.channel.send({ embeds: [embed], components: [row] });
      
    }
});
*/
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'start_auction') {
        const roleId = '1367145439039852637'; // دور مطلوب لبدء المزاد

     
        if (!interaction.member.roles.cache.has(roleId)) {
            return interaction.reply({ content: 'ليس لديك الصلاحية لبدء المزاد.', ephemeral: true });
        }

        const filter = response => response.author.id === interaction.user.id;
        const questions = [
            "ما اسم السلعة؟",
            "ما السعر البدائي؟",
            "ما مدة المزاد بالدقائق؟",
            "من هو صاحب السلعة؟",
            "ما هو الحد الأقصى للمزاد؟"
        ];
        let answers = { itemName: null, startingPrice: null, duration: null, ownerId: null, auctionMaxPrice: null };

        let currentQuestionIndex = 0;
        const detailsEmbed = new MessageEmbed()
            .setTitle('تفاصيل المزاد')
            .setDescription(`برجاء الإجابة على السؤال التالي:\n${questions[currentQuestionIndex]}`)
            .setColor('YELLOW')
            .addFields(
                { name: 'اسم السلعة', value: '---', inline: true },
                { name: 'السعر البدائي', value: '---', inline: true },
                { name: 'مدة المزاد', value: '---', inline: true },
                { name: 'صاحب السلعة', value: '---', inline: true },
                { name: 'الحد الأقصى للمزاد', value: '---', inline: true }
            );

      var detailsMessage = await interaction.reply({
            embeds: [detailsEmbed],
            ephemeral: true,
            fetchReply: true
        });

        while (currentQuestionIndex < questions.length) {
            try {
                const collected = await interaction.channel.awaitMessages({
                    filter,
                    max: 1,
                    time: 60000,
                    errors: ['time']
                });

                const answer = collected.first().content;

                if (currentQuestionIndex === 0) {
                    answers.itemName = answer;
                } else if (currentQuestionIndex === 1) {
                    if (isNaN(answer)) {
                        await interaction.channel.send('السعر البدائي يجب أن يكون رقم.');
                        continue;
                    }
                    answers.startingPrice = parseFloat(answer);
                } else if (currentQuestionIndex === 2) {
                    if (isNaN(answer)) {
                        await interaction.channel.send('مدة المزاد يجب أن تكون رقم.');
                        continue;
                    }
                    answers.duration = parseInt(answer);
                } else if (currentQuestionIndex === 3) {
                    if (answer.startsWith('<@') && answer.endsWith('>')) {
                        answers.ownerId = answer.slice(2, -1);
                    } else if (answer.match(/^\d{18}$/)) {
                        answers.ownerId = answer;
                    } else {
                        await interaction.channel.send('يرجى ذكر صاحب السلعة بشكل صحيح (mention).');
                        continue;
                    }
                } else if (currentQuestionIndex === 4) {
                    if (isNaN(answer)) {
                        await interaction.channel.send('الحد الأقصى للمزاد يجب أن يكون رقم.');
                        continue;
                    }
                    answers.auctionMaxPrice = parseFloat(answer);
                }

                detailsEmbed.fields = [
                    { name: 'اسم السلعة', value: answers.itemName || '---', inline: true },
                    { name: 'السعر البدائي', value: answers.startingPrice ? answers.startingPrice.toString() : '---', inline: true },
                    { name: 'مدة المزاد', value: answers.duration ? `${answers.duration} دقيقة` : '---', inline: true },
                    { name: 'صاحب السلعة', value: `<@${answers.ownerId || '---'}>`, inline: true },
                    { name: 'الحد الأقصى للمزاد', value: answers.auctionMaxPrice ? `${answers.auctionMaxPrice} دولار` : '---', inline: true }
                ];

                currentQuestionIndex++;
                if (currentQuestionIndex < questions.length) {
                    detailsEmbed.setDescription(`برجاء الإجابة على السؤال التالي:\n${questions[currentQuestionIndex]}`);
                } else {
                    detailsEmbed.setDescription(`هل تريد إضافة صورة للمزاد؟`);
                }

                await interaction.editReply({ embeds: [detailsEmbed], ephemeral: true }).catch(() => null);
                await collected.first().delete();

            } catch (error) {
                return await interaction.editReply({ content: 'تم إلغاء إنشاء المزاد بسبب عدم الرد أو خطأ في التفاعل.', components: [], embeds: [] });
            }
        }

        const imageRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('add_image')
                    .setLabel('إضافة صورة')
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('skip_image')
                    .setLabel('تخطي')
                    .setStyle('SECONDARY')
            );

        await interaction.editReply({ components: [imageRow], ephemeral: true });

        const buttonFilter = i => i.user && i.user.id === interaction.user.id;

        let imageUrl = null;
        try {
            const imageInteraction = await detailsMessage.awaitMessageComponent({ filter: buttonFilter, time: 60000 });

         if (imageInteraction.customId === 'add_image') {
    await imageInteraction.update({
        content: 'قم بإرسال صورة المزاد الآن.',
        embeds: [],
        components: []
    });

    try {
        // فلتر للحصول على صورة من المستخدم فقط
        const imageFilter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
        const imageCollected = await interaction.channel.awaitMessages({
            filter: imageFilter,
            max: 1,
            time: 60000,
            errors: ['time']
        });

        const imageMsg = await imageCollected.first();
        const userImage = imageMsg.attachments.first().url; // أخذ رابط الصورة التي أرسلها المستخدم

        // إرسال الصورة إلى الروم المحدد
        const targetChannel = client.channels.cache.get(config.imgslogs);
        let sentMessage = null;
        if (targetChannel) {
            // إرسال الصورة إلى الروم المحدد
            sentMessage = await targetChannel.send({
                content: `📌 صورة للمزاد: ${answers.itemName}`,
                files: [userImage]
            });
        }

        // أخذ رابط الصورة التي أرسلها البوت (من الرسالة المرسلة في الروم المحدد)
        const botSentImageUrl = sentMessage.attachments.first().url;
       imageUrl = botSentImageUrl
        // تحديث الـ embed مع رابط الصورة التي أرسلها البوت
        detailsEmbed.setImage(botSentImageUrl).setDescription('تم تحديث تفاصيل المزاد');

        await interaction.editReply({
            embeds: [detailsEmbed],
            components: [],
            ephemeral: true
        });

        // حذف الرسالة التي تحتوي على الصورة في الروم الأصلي
        await imageMsg.delete().catch(console.error);

    } catch (error) {
        return await interaction.editReply({
            content: 'تم إلغاء إنشاء المزاد بسبب عدم إرسال الصورة.',
            components: [],
            embeds: []
        });
    }
} else if (imageInteraction.customId === 'skip_image') {
                await imageInteraction.update({
                    content: null,
                    embeds: [detailsEmbed],
                    components: []
                });
            }
        } catch (error) {
            return await interaction.editReply({ content: 'تم إلغاء إنشاء المزاد بسبب عدم الرد.', components: [], embeds: [] });
        }

        detailsEmbed.setDescription(`الرجاء تأكيد إنشاء المزاد أدناه.`);
        const confirmRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('confirm')
                    .setLabel('نعم')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId('cancel')
                    .setLabel('لا')
                    .setStyle('DANGER')
            );
        await interaction.editReply({ embeds: [detailsEmbed], components: [confirmRow], ephemeral: true });

        try {
         const confirmation = await detailsMessage.awaitMessageComponent({ 
                filter: buttonFilter, 
                time: 60000, 
                max: 1
            });
          

            if (confirmation.customId === 'confirm') {
                const channel = await client.channels.fetch(config.channelmazad);
                const auctionRow = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('bid')
    .setLabel('💰 مزايدة في السعر')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId('top_bidders')
    .setLabel('🏆 المتصدرين في المزاد')
                            .setStyle('SECONDARY'),
                        new MessageButton()
                            .setCustomId('end_auction')
    .setLabel('⏹️ إنهاء المزاد')
                            .setStyle('DANGER')
                      
           
                      
                    );
                const auctionEndTime = Date.now() + answers.duration * 60000;

                detailsEmbed.fields = [];
                detailsEmbed.setDescription(``);
                detailsEmbed.addField('🛍️ إسم السلعة', answers.itemName);
                detailsEmbed.addField('💵 السعر البدائي', `${answers.startingPrice} دولار`);
                detailsEmbed.addField('⏳ مدة المزاد', `<t:${Math.floor(auctionEndTime / 1000)}:R>`);
                detailsEmbed.addField('صاحب السلعة', `<@${answers.ownerId}>`);
                detailsEmbed.setColor('BLUE');

                if (imageUrl) {
                    detailsEmbed.setImage(imageUrl);
                }

                var msg = await channel.send({ content: null, embeds: [detailsEmbed], components: [auctionRow] });
       const auction = new Auction({
    messageId: `${channel.id}-${msg.id}`, // تخزين المعرف المركب
                    itemName: answers.itemName,
                    startingPrice: answers.startingPrice,
                    currentPrice: answers.startingPrice,
                    auctionEndTime,
                    auctionOwner: interaction.user.id, // الشخص الذي كتب الأمر
                    auctionMaxPrice: answers.auctionMaxPrice,
                    bidders: [],
                    image: imageUrl,
                    ownerId: answers.ownerId
                });
                await auction.save();
              
                await interaction.editReply({ content: 'تم إنشاء المزاد بنجاح!', embeds: [], components: [] });

            } else if (confirmation.customId === 'cancel') {
                await interaction.editReply({ content: 'تم إلغاء إنشاء المزاد.', components: [], embeds: [] });
            }
        } catch (error) {
            console.error(error);
            return await interaction.editReply({ content: 'تم إلغاء إنشاء المزاد بسبب عدم الرد.', components: [], embeds: [] });
        }
    }
    
})

// التعامل مع التفاعلات (مزايدة، عرض المتصدرين، إنهاء المزاد)
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
  
  
  
  
if (interaction.customId.startsWith('claim_prize_')) {
       // فصل الـ customId باستخدام _ بدلاً من المسافة
    const splitId = interaction.customId.split('_');
    
    // استخراج الـ userId، channelId، messageId
    const userId = splitId[2];
    const channelId = splitId[3];
    const messageId = splitId[4];


    // التأكد من أن الشخص الذي ضغط على الزر هو الفائز فقط
    if (interaction.user.id !== userId) {
        return interaction.reply({ content: 'عذرًا، هذا الزر مخصص فقط للفائز في المزاد.', ephemeral: true });
    }

    // البحث عن المزاد في قاعدة البيانات باستخدام معرّف الغرفة ومعرّف الرسالة
    const auction = await Auction.findOne({ messageId: `${config.channelmazad}-${messageId}` });
    if (!auction) {
        return interaction.reply({ content: 'لم يتم العثور على بيانات المزاد في قاعدة البيانات.', ephemeral: true });
    }

    
    try {
      // تعطيل الزر وتغيير النص إلى "تم الحصول على الجائزة"
    const button = new MessageButton()
        .setCustomId(`claim_prize_${userId}`)
        .setLabel('تم الحصول على الجائزة')
        .setStyle('SUCCESS')
        .setDisabled(true);  // تعطيل الزر

    // إنشاء صف العمل مع الزر المعطل
    const rowsss = new MessageActionRow().addComponents(button);

        // تعديل الرسالة مع الزر المعطل
        await interaction.update({ components: [rowsss] });

     // إنشاء قناة تذكرة جديدة بإسم الفائز واسم السلعة
// احصل على كائن العضو للفائز وصاحب السلعة
const winnerMember = await interaction.guild.members.fetch(auction.winnerId);
const ownerMember = await interaction.guild.members.fetch(auction.ownerId);

const originalMessage = interaction.message;

if (!winnerMember || !ownerMember) {
    return interaction.followUp({ content: 'لم يتم العثور على الفائز أو صاحب المزاد.', ephemeral: true });
}

const guild = interaction.guild;

const ticketChannel = await guild.channels.create(`مزاد-${auction.itemName}`, {
    type: 'GUILD_TEXT',
    parent: "1367194490107985952", // تأكد من أن هذا هو الـ ID الصحيح للقسم
    permissionOverwrites: [
        { id: guild.id, deny: ['VIEW_CHANNEL'] }, // منع الجميع من رؤية القناة
        { id: winnerMember.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }, // السماح للفائز
        { id: ownerMember.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] } // السماح لصاحب المزاد
    ]
});
      
      const customId = `award_delivered_${auction.winnerId}_${config.channelmazad}_${messageId}`;

const row = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId(customId)
        .setLabel('🎁 تم تسليم الجائزة')
        .setStyle('SUCCESS')
        .setDisabled(false) // الزر متاح
);
// التأكد من أن الرسالة الأصلية تحتوي على `embeds`
if (originalMessage.embeds && originalMessage.embeds.length > 0) {
    await ticketChannel.send({ content: `<@${auction.winnerId}> <@${auction.ownerId}>`, embeds: [originalMessage.embeds[0]], components: [row] });
} else {
    await ticketChannel.send({ content: `<@${auction.winnerId}> <@${auction.ownerId}>` });
}

// الرد في الدردشة عند نجاح إنشاء القناة
await interaction.followUp({ content: `تم إنشاء قناة تذكرة المزاد بنجاح: <#${ticketChannel.id}>`, ephemeral: true });

   


    } catch (error) {
        console.error(error);
        return interaction.followUp({ content: 'حدث خطأ أثناء إنشاء القناة أو إضافة الأعضاء.', ephemeral: true });
    }
}
if (interaction.customId.startsWith('award_delivered')) {
       // فصل الـ customId باستخدام _ بدلاً من المسافة
    const splitId = interaction.customId.split('_');
    
    // استخراج الـ userId، channelId، messageId
    const userId = splitId[2];
    const channelId2 = splitId[3];
    const messageId3 = splitId[4];


 
    // البحث عن المزاد في قاعدة البيانات باستخدام معرّف الغرفة ومعرّف الرسالة
    const auction = await Auction.findOne({ messageId: `${config.channelmazad}-${messageId3}` });
    if (!auction) {
        return interaction.reply({ content: 'لم يتم العثور على بيانات المزاد في قاعدة البيانات.', ephemeral: true });
    }
  if (interaction.user.id !== auction.ownerId && !interaction.member.roles.cache.has("1367145439039852637")) {
        return interaction.reply({
            content: 'عذرًا، فقط صاحب السلعة أو صاحب الرتبة المصرح لها يمكنه الضغط على هذا الزر.',
            ephemeral: true,
        });
    }
        const customId2 = `close_auction_${auction.winnerId}_${config.channelmazad}_${messageId3}`;

    await interaction.update({
        content: `<@${auction.winnerId}> <@${auction.ownerId}> تم تسليم الجائزة.`,
        components: [
            new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId("award_delivered")
                    .setLabel('🎁 تم تسليم الجائزة')
                    .setStyle('SUCCESS')
                    .setDisabled(true),
                new MessageButton()
                    .setCustomId(customId2)
                    .setLabel('❌ إغلاق المزاد')
                    .setStyle('DANGER')
                    .setDisabled(false) // الزر متاح فقط إذا كان الشخص يمتلك الرتبة المطلوبة
            )
        ]
    });
}

if (interaction.customId.startsWith('close_auction_')) {
       // فصل الـ customId باستخدام _ بدلاً من المسافة
    const splitId = interaction.customId.split('_');
    
    // استخراج الـ userId، channelId، messageId
    const userId = splitId[2];
    const channelId2 = splitId[3];
    const messageId3 = splitId[4];


  if (!interaction.member.roles.cache.has("1367145439039852637")) {
        return interaction.reply({
            content: 'عذرًا، فقط صاحب السلعة أو صاحب الرتبة المصرح لها يمكنه الضغط على هذا الزر.',
            ephemeral: true,
        });
    }
   const auction = await Auction.findOne({ messageId: `${config.channelmazad}-${messageId3}` });
    if (!auction) {
        return interaction.reply({ content: 'لم يتم العثور على بيانات المزاد في قاعدة البيانات.', ephemeral: true });
    }
  
    await Auction.deleteOne({ messageId: auction.messageId });
    await interaction.reply({ content: 'تم إغلاق المزاد بنجاح!', ephemeral: true });
    await interaction.channel.delete();
}


    const auction = await Auction.findOne({ messageId: `${config.channelmazad}-${interaction.message.id}` });
    if (!auction) return;


if (interaction.customId === 'bid') {
  const userId = interaction.user.id;
    const cooldownTime = 15000; // 3 ثواني
    const now = Date.now();

    // التحقق من آخر وقت مزايدة للمستخدم
    const userCooldown = await BidCooldown.findOne({ userId });

  
if (userCooldown) {
    const remainingTime = cooldownTime - (now - userCooldown.lastBidTime);
    
    if (remainingTime > 0) {
        const futureTime = Math.floor((Date.now() + remainingTime) / 1000); // تحويل إلى Timestamp
        const timeDisplay = remainingTime <= 1000 ? '**يمكنك المزايدة الآن!**' : `<t:${futureTime}:R>`; 

        const embed = new MessageEmbed()
            .setColor('#ff0000') // لون أحمر يوحي بالتحذير
            .setTitle('⏳ مزايدتك مرفوضة مؤقتًا!')
            .setDescription(`يجب عليك الانتظار حتى ${timeDisplay} قبل أن تتمكن من المزايدة مرة أخرى.`)
            .setFooter({ text: '⚡ تأكد من المزايدة في الوقت المناسب لتفوز!' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

    // تحديث أو إنشاء وقت المزايدة الجديد
    await BidCooldown.findOneAndUpdate(
        { userId },
        { lastBidTime: now },
        { upsert: true, new: true }
    );
  
    const modal = new Modal()
        .setCustomId('bid_modal')
        .setTitle('إدخال المزايدة');

    const bidInput = new TextInputComponent()
        .setCustomId('bid_amount')
        .setLabel('المبلغ الذي تريد المزايدة به')
        .setStyle('SHORT')
        .setRequired(true);

    modal.addComponents(new MessageActionRow().addComponents(bidInput));

    await interaction.showModal(modal);

    try {
        const modalFilter = i => i.user.id === interaction.user.id;
        const modalInteraction = await interaction.awaitModalSubmit({ filter: modalFilter, time: 60000 });

        const bidAmount = parseFloat(modalInteraction.fields.getTextInputValue('bid_amount'));
        if (isNaN(bidAmount)) return modalInteraction.reply({ content: 'المبلغ يجب أن يكون رقمًا!', ephemeral: true });

        if (bidAmount <= auction.currentPrice) return modalInteraction.reply({ content: 'يجب أن تكون المزايدة أعلى من السعر الحالي.', ephemeral: true });

        if (bidAmount > auction.auctionMaxPrice) return modalInteraction.reply({ content: `لا يمكن المزايدة بعد الآن،.`, ephemeral: true });

   
        // تحديث بيانات المزايدة
        auction.bidders = auction.bidders.filter(bid => bid.userId !== userId);
        auction.bidders.push({ userId, bidAmount });

        auction.currentPrice = Math.max(...auction.bidders.map(bid => bid.bidAmount));

        await Promise.all([
            Auction.findOneAndUpdate({ _id: auction._id }, { $set: { currentPrice: auction.currentPrice, bidders: auction.bidders } }),
            modalInteraction.reply({ content: `✅ تمت المزايدة بنجاح! السعر الجديد: ${auction.currentPrice} دولار`, ephemeral: true })
        ]);

    } catch (error) {

    }
}
 else if (interaction.customId === 'top_bidders') {
        const pageSize = 10;
        let page = 0;

        const generateBiddersEmbed = (bidders, page) => {
            const start = page * pageSize;
            const end = start + pageSize;
            const biddersPage = bidders.slice(start, end);
            const embed = new MessageEmbed()
                .setTitle('أعلى المزايدين')
                .setDescription(
                    biddersPage.map((bidder, index) => 
                        `${start + index + 1}. <@${bidder.userId}>: ${bidder.bidAmount} دولار`
                    ).join('\n')
                )
                .setFooter(`الصفحة ${page + 1} من ${Math.ceil(bidders.length / pageSize)}`)
                .setColor('PURPLE');
            return embed;
        };

        const bidders = auction.bidders.sort((a, b) => b.bidAmount - a.bidAmount);
        let embed = generateBiddersEmbed(bidders, page);

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('previous_page')
                    .setLabel('السابق')
                    .setStyle('SECONDARY')
                    .setDisabled(page === 0),
                new MessageButton()
                    .setCustomId('next_page')
                    .setLabel('التالي')
                    .setStyle('SECONDARY')
                    .setDisabled((page + 1) * pageSize >= bidders.length)
            );

        const biddersMessage = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });
        const collector = biddersMessage.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'previous_page') {
                page--;
            } else if (i.customId === 'next_page') {
                page++;
            }
            const updatedEmbed = generateBiddersEmbed(bidders, page);
            const updatedRow = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('previous_page')
                        .setLabel('السابق')
                        .setStyle('SECONDARY')
                        .setDisabled(page === 0),
                    new MessageButton()
                        .setCustomId('next_page')
                        .setLabel('التالي')
                        .setStyle('SECONDARY')
                        .setDisabled((page + 1) * pageSize >= bidders.length)
                );
            await i.update({ embeds: [updatedEmbed], components: [updatedRow] });
        });

collector.on('end', (collected, reason) => {
            biddersMessage.edit({ components: [] });
        });

  } else if (interaction.customId === 'end_auction') {

    // التحقق إذا كان المستخدم هو صاحب المزاد أو يمتلك الرتبة المطلوبة
    if (interaction.user.id !== auction.auctionOwner && !interaction.member.roles.cache.has("1367145439039852637")) {
        return interaction.reply({
            content: 'عذرًا، فقط صاحب المزاد أو صاحب الرتبة المصرح لها يمكنه إنهاء المزاد.',
            ephemeral: true,
        });
    }

    // إنهاء المزاد
    await endAuction(auction, interaction.message).catch(() => null);

    // الرد بإشعار بأن المزاد تم إنهاؤه
    await interaction.reply({
        content: 'تم إنهاء المزاد بنجاح!',
        ephemeral: true,
    });
}
});


client.on('error', error => {
    console.error('Client error:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', error => {

});

client.login(process.env.TOKEN);