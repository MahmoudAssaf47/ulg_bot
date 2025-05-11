// 📁 main.js
const { Client, Intents, MessageActionRow, MessageButton, MessageEmbed, Modal, TextInputComponent } = require('discord.js');
const Request = require('./models/Mod'); // استيراد نموذج الطلبات
const mongoose = require('mongoose');
const Leave  = require('./models/LeaveSystem');
const Blacklist = require('./models/Blacklist');
const config = require('./config');

require('dotenv').config(); 
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
  partials: ['CHANNEL', 'MESSAGE', 'USER', 'REACTION']
});

// اتصال قاعدة البيانات
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// حدث عند تشغيل البوت
client.on('ready', () => {
  console.log(`✅ ${client.user.tag} is running!`);
});
const cooldownUsers = new Map(); // userId => timeout

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
   if (!message.guild) { // فقط في الرسائل الخاصة (DM)
    try {
        const userId = message.author.id;

        // التحقق من وجود المستخدم في كولداون
        if (cooldownUsers.has(userId)) return;

        // البحث عن الطلب بطريقة فعالة
      const existingRequest = await Request.findOne({ 
    userId, 
    $or: [
        { status: 'pending' },
        { status: 'accepted' }
    ]
});

        // إذا لم يكن هناك طلب نشط، عرض خيار التواصل
        if (!existingRequest) {
            const row = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('accept_contact')
                    .setLabel('نعم')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId('decline_contact')
                    .setLabel('لا')
                    .setStyle('DANGER')
            );

            await message.reply({
                content: "📩 هل تريد فتح تواصل مع الإدارة؟",
                components: [row]
            });
        }
        
    } catch (error) {
      return;
    }
}
});



client.on("interactionCreate", async (interaction) => {
      if (!interaction.isButton()) return;
  try {

  if (interaction.customId === 'reply_request_user') {
  

    // إنشاء الـ Modal للرد على الطلب
    const modal = new Modal()
        .setCustomId('reply_modal_User')
        .setTitle('Reply to Request');

    // إدخال نص الرد
    const replyMessageInput = new TextInputComponent()
        .setCustomId('reply_message')
        .setLabel('Your Reply')
        .setStyle('PARAGRAPH')
        .setRequired(true);

    // إضافة الإدخال إلى الـ Modal
    const actionRow = new MessageActionRow().addComponents(replyMessageInput);
    modal.addComponents(actionRow);

    // إظهار الـ Modal للمستخدم
    await interaction.showModal(modal);
}

    else if (interaction.customId.startsWith('add_repliers_')) {

    const userId = interaction.customId.split('_')[2];

    const request = await Request.findOne({ userId, status: 'accepted' });

    // التحقق من أن الشخص الذي ضغط على الزر هو نفسه الذي قبل الطلب
    if (interaction.user.id !== request.acceptedBy) {
        return interaction.reply({
            content: '❌ فقط الشخص الذي قبل الطلب يمكنه إضافة أشخاص.',
            ephemeral: true
        });
    }

    // إنشاء نموذج (Modal) لإدخال معرف الشخص
    const modal = new Modal()
        .setCustomId(`add_replier_modal_${userId}`)
        .setTitle('إضافة شخص للرد');

    const userIdInput = new TextInputComponent()
        .setCustomId('user_id')
        .setLabel('معرف الشخص (User ID أو Mention)')
        .setStyle('SHORT')
        .setRequired(true);

    const actionRow = new MessageActionRow().addComponents(userIdInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
}
  
 else if (interaction.customId.startsWith('replyagin_request_')) {
      const userId = interaction.customId.split('_')[2];

      const rolesToRemove = [config.rolerequestManager];
 const allowedUserIds = ['298011146584064000']; 
    const request = await Request.findOne({ userId, status: 'accepted' });


// التحقق من الصلاحيات
// التحقق من الصلاحيات
if (
    !(
        allowedUserIds.includes(interaction.user.id) ||
        interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) ||
        interaction.user.id === request.acceptedBy ||
        request.allowedRepliers.includes(interaction.user.id)
    )
) {
    return interaction.reply({
        content: '❌ ليس لديك الصلاحية للرد على هذا الطلب.',
        ephemeral: true
    });
}


    const modal = new Modal()
        .setCustomId(`replyagin_modal_${userId}`)
        .setTitle('Reply to Request');

    const replyMessageInput = new TextInputComponent()
        .setCustomId('reply_message')
        .setLabel('Your Reply')
        .setStyle('PARAGRAPH')
        .setRequired(true);

    const actionRow = new MessageActionRow().addComponents(replyMessageInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
}
    
else if (interaction.customId.startsWith('accept_request_')) {
      const userId = interaction.customId.split('_')[2];
    const user = await interaction.client.users.fetch(userId);

    const rolesToRemove = [config.rolerequestManager]; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000']; 

    if (
        !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
        !allowedUserIds.includes(interaction.user.id)
    ) {
        return interaction.reply({
            content: "❌ ليس لديك الصلاحية لاستخدام هذا الأمر.",
            ephemeral: true
        });
    }

    if (!userId) return interaction.reply({ content: "❌ لم يتم العثور على معرف المستخدم.", ephemeral: true });

    const request = await Request.findOne({ userId: user.id, status: "pending" });
    if (!request) {
        return interaction.reply({ content: "❗ الطلب غير موجود أو تم حله بالفعل.", ephemeral: true });
    }

    // تحديث حالة الطلب
  

const updatedEmbed = new MessageEmbed()
    .setColor("GREEN")
    .setDescription([
        `**📌 النوع:** ${request.type}`,
        `**📝 الوصف:** ${request.description}`,
        `**⏰ وقت الإنشاء:** <t:${Math.floor(Date.now() / 1000)}:R>`,
        `**👤 المسؤول:** <@${interaction.user.id}>`
    ].join('\n'))
    // فتح تذكرة جديدة باسم المستخدم

    const ticketChannel = await interaction.guild.channels.create(`📩-${user.username}`, {
        type: "GUILD_TEXT",
        parent: config.ticketsCategoryId,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: ["VIEW_CHANNEL"] },
            { id: interaction.user.id, allow: ["VIEW_CHANNEL", "SEND_MESSAGES"] },
            //{ id: config.rolerequestManager, allow: ["VIEW_CHANNEL", "SEND_MESSAGES"] }
        ]
    });
 
    // إنشاء أزرار التفاعل داخل التذكرة
    const ticketButtons = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId(`reply_request_${userId}`)
            .setLabel("📩 رد على الطلب")
            .setStyle("PRIMARY"),
        new MessageButton()
            .setCustomId(`close_ticket_${userId}`)
            .setLabel("🔒 إغلاق التذكرة")
            .setStyle("DANGER"),
        new MessageButton()
            .setCustomId(`add_repliers_${userId}`)
            .setLabel("➕ إضافة أشخاص")
            .setStyle("SUCCESS")
    );

try {
    // إرسال رسالة داخل التذكرة مع معالجة الأخطاء
    const msg = await ticketChannel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [updatedEmbed],
        components: [ticketButtons]
    });

    // تحديث حالة الطلب في قاعدة البيانات
    await Request.updateOne(
        { userId: user.id }, // استخدام معرف الطلب بدلاً من userId لأكثر دقة
        {
            $set: {
                status: "accepted",
                acceptedBy: interaction.user.id,
                room: ticketChannel.id,
                msg: msg.id,
                updatedAt: new Date()
            }
        }
    );
    const request = await Request.findOne({ userId: user.id, status: "accepted" });


const updatedEmbed3 = new MessageEmbed()
    .setColor("GREEN")
    .setTitle("✅ تم قبول طلبك")
    .setDescription([
        `**📌 النوع:** ${request.type}`,
        `**📝 الوصف:** ${request.description}`,
        `**⏰ وقت الإنشاء:** <t:${Math.floor(Date.now() / 1000)}:R>`,
      `👤 **تم القبول بواسطة:** <@${request.acceptedBy}>`,
         `**الروم**: ${ticketChannel}`
    ].join('\n'))
    // فتح تذكرة جديدة باسم المستخدم

    // إرسال إشعار للمستخدم
  const updatedEmbed2 = new MessageEmbed()
 .setColor("GREEN")
    .setTitle("✅ تم قبول طلبك")
    .setDescription([
        `**📌 النوع:** ${request.type}`,
        `**📝 الوصف:** ${request.description}`,
        `**⏰ وقت الإنشاء:** <t:${Math.floor(Date.now() / 1000)}:R>`,
      `👤 **تم القبول بواسطة:** <@${request.acceptedBy}>`
    ].join('\n'))

    interaction.update({ embeds: [updatedEmbed3], components: [] });
      user.send({ embeds: [updatedEmbed2] }).catch(() => null);

} catch (error) {
    console.error('❌ خطأ في معالجة الطلب المقبول:', error);
    throw error; // أو معالجة الخطأ بشكل مناسب
}


}


else if (interaction.customId.startsWith('reply_request_')) {
        const userId = interaction.customId.split('_')[2];

      const rolesToRemove = [config.rolerequestManager];
 const allowedUserIds = ['298011146584064000']; 
    const request = await Request.findOne({ userId, status: 'accepted' });

   // التحقق من الصلاحيات
// التحقق من الصلاحيات
if (
    !(
        allowedUserIds.includes(interaction.user.id) ||
        interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) ||
        interaction.user.id === request.acceptedBy ||
        request.allowedRepliers.includes(interaction.user.id)
    )
) {
    return interaction.reply({
        content: '❌ ليس لديك الصلاحية للرد على هذا الطلب.',
        ephemeral: true
    });
}


    const modal = new Modal()
        .setCustomId(`reply_modal_${userId}`)
        .setTitle('Reply to Request');

    const replyMessageInput = new TextInputComponent()
        .setCustomId('reply_message')
        .setLabel('Your Reply')
        .setStyle('PARAGRAPH')
        .setRequired(true);

    const actionRow = new MessageActionRow().addComponents(replyMessageInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
}
    

else if (interaction.customId.startsWith('delete_request_')) {
        const userId = interaction.customId.split('_')[2];

   const rolesToRemove = [config.rolerequestManager]; // الرتب المسموح لها
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
         
  
  const request = await Request.findOneAndDelete({ userId, status: 'pending' });
  if (!request) {
    return interaction.reply({ content: '❗ Request not found or already resolved.', ephemeral: true });
  }
 
 const deletedEmbed = new MessageEmbed()
  .setColor('GREY')
  .setTitle('❌ طلب محذوف')
  .setDescription([
    `📌 **نوع الطلب:** ${request.type}`,
    `📝 **الوصف:** ${request.description}`,
    `⏰ **وقت الحذف:** <t:${Math.floor(Date.now() / 1000)}:R>`
  ].join('\n'));

const user = await client.users.fetch(userId);
await user.send({
  embeds: [
    new MessageEmbed()
      .setColor('RED')
      .setTitle('❌ تم حذف طلبك')
      .setDescription([
        `📌 **النوع:** ${request.type}`,
        `📝 **الوصف:** ${request.description}`,
        `⏰ **الوقت:** <t:${Math.floor(Date.now() / 1000)}:R>`
      ].join('\n'))
  ]
}).catch(() => null);

await interaction.update({ 
  embeds: [deletedEmbed], 
  components: [] 
});
  const requestChannel = client.channels.cache.get(config.reviewRequests);
  await interaction.followUp(`Request from <@${userId}> has been deleted by <@${interaction.user.id}>.`);
}

    
          else if (interaction.customId.startsWith('close_ticket_')) {

            const userId = interaction.customId.split('_')[2];

    const request = await Request.findOne({ userId, status: 'accepted' });
    
    if (!request) {
        return interaction.reply({
            content: "❗ Request not found or already resolved.",
            ephemeral: true,
        });
    }
// الصلاحيات المطلوبة
const rolesToRemove = [config.rolerequestManager];
 const allowedUserIds = ['298011146584064000']; 

// التحقق من الصلاحيات
if (
    !(
        allowedUserIds.includes(interaction.user.id) ||
        interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) ||
        interaction.user.id === request.acceptedBy ||
        request.allowedRepliers.includes(interaction.user.id)
    )
) {
    return interaction.reply({
        content: '❌ ليس لديك الصلاحية للرد على هذا الطلب.',
        ephemeral: true
    });
}


// إنشاء Embed لإغلاق الطلب
const closedEmbed = new MessageEmbed()
    .setColor("GREY")
    .setTitle("🚪 طلب مغلق")
    .setDescription([
        `📌 **نوع الطلب:** ${request.type}`,
        `📝 **الوصف:** ${request.description}`,
        `🔒 **تم الإغلاق بواسطة:** <@${interaction.user.id}>`,
        `⏰ **وقت الإغلاق:** <t:${Math.floor(Date.now() / 1000)}:R>`
    ].join('\n'));

// إرسال رسالة Embed إلى صاحب الطلب
const user = await client.users.fetch(userId);
await user.send({
    embeds: [
        new MessageEmbed()
            .setColor("GREY")
            .setTitle("🚪 تم إغلاق طلبك")
            .setDescription([
                `📌 **النوع:** ${request.type}`,
                `📝 **الوصف:** ${request.description}`,
                `👤 **المشرف:** <@${interaction.user.id}>`,
                `🕒 **الوقت:** <t:${Math.floor(Date.now() / 1000)}:R>`
            ].join('\n'))
    ]
}).catch(() => null);

// تحديث الرسالة الأصلية مع تعطيل الأزرار
await interaction.update({ 
    embeds: [closedEmbed], 
    components: [] 
});
await Request.findOneAndDelete({ userId, status: "accepted" });
    // إرسال رد في القناة
    await interaction.followUp(`Request from <@${userId}> has been Closed by <@${interaction.user.id}>.`);


    // **🔴 حذف القناة بعد 5 ثوانٍ**
    setTimeout(async () => {
        if (interaction.channel && interaction.channel.deletable) {
            await interaction.channel.delete().catch(console.error);
        }
    }, 5000); // 5 ثوانٍ
}
    
else if (interaction.customId.startsWith('reject_request_')) {
              const userId = interaction.customId.split('_')[2];

       const rolesToRemove = [config.rolerequestManager]; // الرتب المسموح لها
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

       
   const request = await Request.findOneAndDelete({ userId, status: 'pending' });
      if (!request) {
        return interaction.reply({ content: '❗ Request not found or already resolved.', ephemeral: true });
      }

const rejectedEmbed = new MessageEmbed()
    .setColor('RED')
    .setTitle('❌ طلب مرفوض')
    .setDescription([
        `📛 **نوع الطلب:** ${request.type}`,
        `📄 **الوصف:** ${request.description}`,
        `👤 **تم الرفض بواسطة:** <@${interaction.user.id}>`,
        `⏰ **وقت الرفض:** <t:${Math.floor(Date.now() / 1000)}:R>`
    ].join('\n'));

const user = await client.users.fetch(userId);
await user.send({
    embeds: [
        new MessageEmbed()
            .setColor('RED')
            .setTitle('❌ تم رفض طلبك')
            .setDescription([
                `📛 **النوع:** ${request.type}`,
                `📄 **الوصف:** ${request.description}`,
                `👮 **المشرف:** <@${interaction.user.id}>`,
                `🕒 **الوقت:** <t:${Math.floor(Date.now() / 1000)}:R>`,
                `\n> ℹ️ يمكنك تعديل الطلب وإعادة إرساله إذا كان ذلك ممكناً`
            ].join('\n'))
    ]
}).catch(() => null);

await interaction.update({
    embeds: [rejectedEmbed],
    components: []
});
    }

    
 
  
    const { customId, user, message } = interaction;

    if (customId === 'accept_contact') {
        const existingRequest = await Request.findOne({ userId: interaction.user.id, status: 'pending' });
    if (existingRequest) {
      
           await interaction.message.delete().catch(() => null);

        return interaction.reply({ content: '❗ You already have an open request. Please wait until it is resolved.', ephemeral: true });
    }

            const sentMessage = await interaction.message.edit({ content: "⏳ جاري تجهيز النموذج...", components:[] });
// مؤقت حذف الرد لو ما حصلش تفاعل
setTimeout(async () => {
  try {
    // نتأكد الرسالة لسه موجودة
    const fetched = await interaction.channel.messages.fetch(sentMessage.id).catch(() => null);
    if (fetched) {
      await fetched.delete().catch(() => null);
    }
  } catch (err) {
  }
}, 120000); // 5 دقايق
      
        const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
        if (isBlacklisted) {
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('🚫 لا يمكنك إرسال طلب!')
                .setDescription(`أنت في **قائمة البلاك ليست** ولا يمكنك إرسال هذا الطلب.\n\n📝 **السبب:** ${isBlacklisted.reason}\n👤 **تمت إضافتك بواسطة:** <@${isBlacklisted.addedBy}>\n📅 **وقت الإضافة:** <t:${Math.floor(new Date(isBlacklisted.addedAt).getTime() / 1000)}:F>`);
            return message.reply({ embeds: [embed] }).catch(() => null);
        }

        // التحقق من إجازة
        const existingLeave = await Leave.findOne({ userId: user.id, status: "مقبولة" });
      

   

if (existingLeave) {
    return interaction.reply({ 
        content: `🚫 لا يمكنك ارسال طلب الآن لأنك في إجازة.`,
        ephemeral: true 
    });
}

    const originalMessage = interaction.message.reference
      ? (await interaction.channel.messages.fetch(interaction.message.reference.messageId)).content
      : interaction.message.content;
      
  const modal = new Modal()
    .setCustomId(`request_modal_${sentMessage.id}`) // حفظ معرف الرسالة في الـ modal
    .setTitle('Create Request');

  const requestTypeInput = new TextInputComponent()
    .setCustomId('request_type')
      .setLabel('نوع الطلب')
    .setPlaceholder('مثلاً: استفسار / مشكلة / اقتراح')
    .setStyle('SHORT')
    .setRequired(true);

  const requestDescriptionInput = new TextInputComponent()
    .setCustomId('request_description')
      .setLabel('الرسالة')
    .setStyle('PARAGRAPH')
    .setRequired(true)
        .setPlaceholder('معي مشكلة .....')
      .setValue(originalMessage || '');

  const firstActionRow = new MessageActionRow().addComponents(requestTypeInput);
  const secondActionRow = new MessageActionRow().addComponents(requestDescriptionInput);

  modal.addComponents(firstActionRow, secondActionRow);
  await interaction.showModal(modal);
      
    }

    else if (customId === 'decline_contact') {
    const userId = interaction.user.id;

      cooldownUsers.set(userId, true);
    setTimeout(() => {
        cooldownUsers.delete(userId);
    }, 60 * 1000); // 60 ثانية
        await interaction.message.delete().catch(() => null);
    }
    
      } catch (error) {
        console.error('Error in reply modal handler:', error);
      }
    
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  try {

  if (interaction.customId.startsWith('add_replier_modal_')) {
    const targetUse = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, ''); // إزالة أي mentions
    const userId = interaction.customId.split('_')[3];

    const request = await Request.findOne({ userId, status: 'accepted' });

    // التحقق من أن الشخص الذي أرسل النموذج هو نفسه الذي قبل الطلب
    if (interaction.user.id !== request.acceptedBy) {
        return interaction.reply({
            content: '❌ فقط الشخص الذي قبل الطلب يمكنه إضافة أشخاص.',
            ephemeral: true
        });
    }

 async function addUserToRequest(userId, interaction, request) {
    try {
        // 1. جلب معلومات العضو من السيرفر
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) {
            return {
                success: false,
                ephemeral: true,
                message: '❌ لم يتم العثور على المستخدم في السيرفر'
            };
        }

        // 1. التحقق من عدم وجود المستخدم مسبقاً
        if (request.allowedRepliers.includes(member.id)) {
            return { success: false,ephemeral: true, message: `❌ ${member} موجود بالفعل في قائمة المسموح لهم بالرد.` };
        }

        // 2. تحديث قاعدة البيانات (باستخدام atomic update)
        const updatedRequest = await Request.findByIdAndUpdate(
            request._id,
            {
                $addToSet: { allowedRepliers: member.id }, // يمنع التكرار تلقائياً
            },
            { new: true }
        );

await interaction.channel.permissionOverwrites.edit(member, {
                SEND_MESSAGES: false,  // السماح له بالكتابة
                VIEW_CHANNEL: true,   // السماح له برؤية القناة
            });
        return { 
            success: true, 
          ephemeral: false,
            message: `✅ تمت إضافة ${member} بنجاح`,
            request: updatedRequest
        };

    } catch (error) {
        console.error('❌ خطأ في إضافة المستخدم:', error);
        return { 
            success: false, 
          ephemeral: false,
            message: '⚠️ حدث خطأ أثناء إضافة المستخدم'
        };
    }
}

// طريقة الاستخدام
const result = await addUserToRequest(targetUse, interaction, request);
await interaction.reply({ 
    content: result.message, 
    ephemeral: result.ephemeral 
});
    
  
    
    
    

    
}
  
  

else if (interaction.customId.startsWith('request_modal_')) {
  

    const requestType = interaction.fields.getTextInputValue('request_type');
    const messageId = interaction.customId.split('_')[2]; // الحصول على معرف الرسالة
    const requestDescription = interaction.fields.getTextInputValue('request_description');
  
  

try {
    let targetMessage = await interaction.channel.messages.fetch(messageId);

  
    // التحقق من وجود طلب مفتوح للمستخدم
    const existingRequest = await Request.findOne({ userId: interaction.user.id, status: 'pending' });
    if (existingRequest) {
      
           await interaction.message.delete().catch(() => null);

        return interaction.reply({ content: '❗ You already have an open request. Please wait until it is resolved.', ephemeral: true });
    }
// إنشاء Embed للطلب الجديد
const requestEmbed = new MessageEmbed()
    .setColor('#0099FF')
    .setTitle('📄 طلب جديد')
    .setDescription('طلب إداري يحتاج إلى مراجعة من الفريق المختص')
    .addFields(
        { name: '👤 المستخدم', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📌 النوع', value: requestType, inline: true },
        { name: '📝 الوصف', value: requestDescription, inline: false }
    )
    .setFooter({ text: `وقت الإنشاء: ${new Date().toLocaleString('ar-SA')}` })

// إنشاء أزرار التحكم بالطلب
const buttons = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId(`accept_request_${interaction.user.id}`)
        .setLabel('✅ قبول')
        .setStyle('SUCCESS'),
    new MessageButton()
        .setCustomId(`reject_request_${interaction.user.id}`)
        .setLabel('❌ رفض')
        .setStyle('DANGER'),
    new MessageButton()
        .setCustomId(`delete_request_${interaction.user.id}`)
        .setLabel('🗑️ حذف')
        .setStyle('SECONDARY')
);

// إرسال الطلب إلى قناة المراجعة
const guild = client.guilds.cache.get(config.serverid);
const requestChannel = guild.channels.cache.get(config.reviewRequests) || 
                      await guild.channels.fetch(config.reviewRequests).catch(() => null);

if (!requestChannel) {
    console.error('❌ خطأ: قناة المراجعة غير موجودة!');
    return interaction.reply({ 
        content: '⚠️ تعذر إرسال الطلب بسبب مشكلة تقنية. يرجى إبلاغ الإدارة', 
        ephemeral: true 
    });
}

try {
    const sentMessage = await requestChannel.send({
        content: `<@&${config.rolerequestManager}> 📢 هناك طلب جديد يحتاج إلى مراجعتك!`,
        embeds: [requestEmbed],
        components: [buttons]
    });
    
    // تأكيد إرسال الطلب للمستخدم
     interaction.reply({
        content: '✅ تم إرسال طلبك بنجاح وسيتم مراجعته قريباً',
        ephemeral: true
    });
    
} catch (error) {
    console.error('❌ خطأ في إرسال الطلب:', error);
    await interaction.reply({
        content: '⚠️ حدث خطأ أثناء إرسال طلبك. يرجى المحاولة لاحقاً',
        ephemeral: true
    });
}
    // إنشاء طلب جديد في قاعدة البيانات
    const newRequest = new Request({
        userId: interaction.user.id,
        type: requestType,
        description: requestDescription,
        status: 'pending',
    });

    await newRequest.save(); // حفظ الطلب في قاعدة البيانات

           await interaction.message.delete().catch(() => null);


    // إرسال رد مؤقت للمستخدم
    await interaction.reply({ content: '✅ Your request has been submitted successfully!', ephemeral: true });
    
} catch (error) {

  try {
    await interaction.reply({
      content: "❗ انتهت مدة إرسال النموذج. من فضلك أعد إرسال الطلب مرة أخرى.",
      ephemeral: true
    });
  } catch (replyError) {

  }
}

  
}
  else if (interaction.customId.startsWith('replyagin_modal_')) {
    const userId = interaction.customId.split('_')[2];
    const replyMessage = interaction.fields.getTextInputValue('reply_message');

    
    const user = await client.users.fetch(userId);
    const existingRequest = await Request.findOne({ userId: user.id });

    if (!existingRequest) {
        return interaction.reply({ content: '❌ هذه التذكرة غير موجودة أو تم حذفها.', ephemeral: true });
    }

    if (existingRequest.status !== 'accepted') {
        return interaction.reply({ content: '❌ تم غلق هذه التذكرة بالفعل، لا يمكنك إرسال أي ردود.', ephemeral: true });
    }
  
   
// تأجيل الرد بحيث يسمح باستخدام followUp لاحقًا
await interaction.deferReply();

// جلب بيانات المستخدم الذي قبل الطلب
const request = await Request.findOne({ userId });
const userss = await client.users.fetch(request.acceptedBy);

// إنشاء الرسالة المرسلة للمستخدم
const replyMessageEmbed = new MessageEmbed()
    .setTitle('تم الرد على طلبك')
    .setDescription(`**تم الرد عليك بواسطة <@${interaction.user.id}>**\n\n**الرد هو:**\n${replyMessage}\n\nللرد على هذه الرسالة، اضغط على زر "Reply" أدناه.`)
    .setColor('#0099ff')

// إرسال الرسالة للمستخدم
await user.send({ content: replyMessage }).catch(() => null);
  await interaction.message.edit({ components: [] });
  
const replyEmbed = new MessageEmbed()
    .setColor('#0099ff') // اللون الأساسي
    .setDescription(`✅ Your reply has been sent to the user.\n > \`\`\`${replyMessage}\`\`\``)
    

// إرسال الرسالة للمستخدم
 const ticketButtonsadmin = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId(`replyagin_request_${userId}`)
            .setLabel("📩 رد على الطلب")
            .setStyle("PRIMARY"),
     
    );

// إرسال تأكيد في القناة العامة بعد تأجيل الرد
await interaction.followUp({ 
    content: `✅ Your reply has been sent to the user.\n >>> ${replyMessage}`,
  components: [ticketButtonsadmin],
    ephemeral: false 
});


  
  
} 
      else if (interaction.customId === 'reply_modal_User') {
    try {
      
        const replyMessage = interaction.fields.getTextInputValue('reply_message');
        const existingRequest = await Request.findOne({ 
            userId: interaction.user.id,
            status: 'accepted' // تأكد من أن الحالة مكتوبة بشكل صحيح
        });

        if (!existingRequest) {
            return await interaction.reply({ 
                content: '❌ هذه التذكرة غير موجودة أو تم حذفها.', 
                ephemeral: true 
            });
        }

        // إزالة الأزرار من الرسالة الأصلية
        await interaction.message.edit({ components: [] }).catch(console.error);

        // تأجيل الرد
        await interaction.deferReply({ ephemeral: false });

        const replyChannel = client.channels.cache.get(existingRequest.room);
        if (!replyChannel) {
            console.error('❌ القناة غير موجودة أو غير قابلة للوصول.');
            return await interaction.followUp({ 
                content: '❌ حدث خطأ في إرسال الرد. يرجى إعلام الإدارة.', 
                ephemeral: true 
            });
        }

        const ticketButtonsAdmin = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId(`reply_request_${interaction.user.id}`)
                .setLabel("📩 رد على الطلب")
                .setStyle("PRIMARY"),
            new MessageButton()
                .setCustomId(`close_ticket_${interaction.user.id}`)
                .setLabel("🔒 إغلاق التذكرة")
                .setStyle("DANGER")
        );

        await replyChannel.send({
            content: `**رد جديد من <@${interaction.user.id}> إلى <@${existingRequest.acceptedBy}>**\n${replyMessage}`,
            components: [ticketButtonsAdmin]
        });

        await interaction.followUp({ 
            content: '✅ تم إرسال ردك إلى الإدارة بنجاح!', 
            ephemeral: false 
        });

    } catch (error) {
        console.error('Error in reply modal handler:', error);
        await interaction.followUp({ 
            content: '❌ حدث خطأ غير متوقع أثناء معالجة ردك. يرجى المحاولة مرة أخرى.', 
            ephemeral: true 
        });
    }
      } 
    else if (interaction.customId.startsWith('reply_modal_')) {
    const replyMessage = interaction.fields.getTextInputValue('reply_message');
    const userId = interaction.customId.split('_')[2];

  
  
    const user = await client.users.fetch(userId);
    const existingRequest = await Request.findOne({ userId: user.id });

    if (!existingRequest) {
        return interaction.reply({ content: '❌ هذه التذكرة غير موجودة أو تم حذفها.', ephemeral: true });
    }

    if (existingRequest.status !== 'accepted') {
        return interaction.reply({ content: '❌ تم غلق هذه التذكرة بالفعل، لا يمكنك إرسال أي ردود.', ephemeral: true });
    }
  
   
   const ticketButtons = new MessageActionRow().addComponents(

        new MessageButton()
            .setCustomId(`close_ticket_${userId}`)
            .setLabel("🔒 إغلاق التذكرة")
            .setStyle("DANGER"),
        new MessageButton()
            .setCustomId(`add_repliers_${userId}`)
            .setLabel("➕ إضافة أشخاص")
            .setStyle("SUCCESS")
    );
  
  // إزالة الأزرار من الرسالة الأصلية
await interaction.message.edit({ components: [ticketButtons] });

// تأجيل الرد بحيث يسمح باستخدام followUp لاحقًا
await interaction.deferReply();

// إنشاء زر "Reply"
const reply = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId('reply_request_user')
        .setLabel('Reply')
        .setStyle('PRIMARY')
);

// جلب بيانات المستخدم الذي قبل الطلب
const request = await Request.findOne({ userId });
const userss = await client.users.fetch(request.acceptedBy);

// إنشاء الرسالة المرسلة للمستخدم
const replyMessageEmbed = new MessageEmbed()
    .setTitle('تم الرد على طلبك')
    .setDescription(`**تم الرد عليك بواسطة <@${interaction.user.id}>**\n\n**الرد هو:**\n${replyMessage}\n\nللرد على هذه الرسالة، اضغط على زر "Reply" أدناه.`)
    .setColor('#0099ff')

// إرسال الرسالة للمستخدم
await user.send({ content: `**تم الرد عليك بواسطة <@${interaction.user.id}>**\n\n**الرد هو:**\n${replyMessage}\n\nللرد على هذه الرسالة، اضغط على زر "Reply" أدناه.`, components: [reply] }).catch(() => null);
 const ticketButtonsadmin = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId(`replyagin_request_${userId}`)
            .setLabel("📩 رد على الطلب")
            .setStyle("PRIMARY"),
     
    );

  
  
const replyEmbed = new MessageEmbed()
    .setColor('#0099ff') // اللون الأساسي
    .setDescription(`✅ Your reply has been sent to the user.\n > \`\`\`${replyMessage}\`\`\``)
    


// إرسال تأكيد في القناة العامة بعد تأجيل الرد
await interaction.followUp({ 
    content: `✅ Your reply has been sent to the user.\n >>> ${replyMessage}`,
  components: [ticketButtonsadmin],
    ephemeral: false 
});


  


}
  


      } catch (error) {
        console.error('Error in reply modal handler:', error);
      }
    
})



client.on('error', error => {
    console.error('Client error:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
});


// تشغيل البوت
client.login(process.env.TOKEN);