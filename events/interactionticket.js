// 📁 events/interactionCreate.js
const {ModalBuilder, TextInputBuilder,MessageComponentInteraction , TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle ,MessageActionRow, MessageButton, Modal, MessageAttachment ,MessageSelectMenu, Permissions, MessageEmbed, TextInputComponent } = require('discord.js');
const config = require('../config');
const { createTranscript } = require('discord-html-transcripts');
const Blacklist = require('../models/Blacklist');
const BotSettings = require('../models/bot');
const UserNotes = require('../models/UserNotes'); // تأكد من مسار ملف قاعدة البيانات
const BotStatus  = require('../models/restart'); //
const Ticket  = require('../models/ticket'); // 
const productData = {};
let productConfirmEmbed; // تعريف متغير التأكيد خارجيًا
const ticketsup  = require('../models/ticketsup'); // تأكد من مسار ملف قاعدة البيانات

async function setRestartingState(client, state) {
    await BotStatus.findOneAndUpdate({}, { isRestarting: state }, { upsert: true });
    client.isRestarting = state;
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // منع أي تفاعل أثناء إعادة التشغيل
      if (client.isRestarting) {
        return interaction.reply({
          content: '⚠️ البوت قيد إعادة التشغيل، انتظر حتى يكتمل!',
          components: [],
          ephemeral: true
        }).catch(() => {});
      }

      if (interaction.isButton()) await handleButtons(interaction, client);
            if (interaction.isButton()) await handleButtons2(interaction, client);
                  if (interaction.isButton()) await handleButtons3(interaction, client);
      if (interaction.isSelectMenu()) await handleSelectMenu(interaction, client);
      if (interaction.isModalSubmit()) await handleModalSubmit(interaction, client);

    } catch (error) {
      console.error('Interaction Error:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ حدث خطأ غير متوقع!', ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: '❌ حدث خطأ غير متوقع!', ephemeral: true }).catch(() => {});
      }
    }
  }
};


async function handleButtons3(interaction, client) {
  
  
               const customIdParts = interaction.customId.split("_");  // تقسيم customId إلى أجزاء
const action = customIdParts[0];  // 'add'
const decision = customIdParts[1];  // 'comment'
const sellerId = customIdParts[3];  // sellerId
const userId = customIdParts[4];  // userId
const rating = customIdParts[5];  // rating

    if (action === "add" && decision === "comment") {
        if (interaction.user.id !== userId) {
            return await interaction.update({
                content: "❌ **أنت لست صاحب التقييم.**",
                ephemeral: true
            });
        }

        if (interaction.customId.includes("yes")) {

             const modal = new Modal()
            .setCustomId(`ticketrate_${sellerId}_${userId}_${rating}`) // تمرير sellerId و userId و rating
                .setTitle('تعليقك');

            const reasonInput = new TextInputComponent()
  .setCustomId('commentInput')
                    .setLabel('اكتب تعليقك هنا')
                    .setStyle('PARAGRAPH')  // يمكن للمستخدم كتابة نص طويل
                    .setPlaceholder('اكتب تعليقك هنا...')
                    .setRequired(true)  // اجعل الحقل مطلوب
      

            const modalRow = new MessageActionRow().addComponents(reasonInput);
            modal.addComponents(modalRow);

            await interaction.showModal(modal);
      
        } else {
            // لو قال لا
            await ticketsup.updateOne(
                { userId: sellerId },
                {
                    $push: {
                        ratings: {
                            userId: interaction.user.id,
                            rating: parseInt(rating),
                            comment: null,
                            createdAt: new Date(),
                        },
                    },
                }
            );
  const sellerUser = await interaction.client.users.fetch(sellerId);

  const nameToShow = sellerUser?.displayName || sellerUser.username;
          const dmChannel = await interaction.user.createDM();
const cachedMessageId = msgdm.get(interaction.user.id)?.messageId;

    const message = await dmChannel.messages.fetch(cachedMessageId);


await message.edit({
  
        components:[new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId("rating_done")

          .setLabel(`⭐ ${rating}/5 | ${nameToShow}`)
            .setStyle("SUCCESS")
            .setDisabled(true)
    )],
    });

    await interaction.update({
                content: `✅ تم حفظ تقييمك بدون تعليق! شكراً لك 🌟`,
        ephemeral: true,
      components:[]
    });

    // إرسال إشعار للبائع
    const embed = new MessageEmbed()
        .setColor("#FFD700")
        .setTitle("📊 تم تلقي تقييم جديد!")
        .setDescription(`لقد حصلت على تقييم جديد من ${interaction.user}`)
        .addFields(
            { name: "⭐ التقييم", value: `${rating}/5 نجوم`, inline: true }, // التقييم المستخرج من customId
            { name: "📅 التاريخ", value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
        );

    // إرسال التنبيه للبائع عبر DM
    await sellerUser.send({ embeds: [embed] }).catch(() => null);
          
          
          
          
              
      
    const guild = await interaction.client.guilds.fetch("1349061146929532968");


const logChannel = guild.channels.cache.get("1370526211406823474"); // احصل على قناة الـ log من السيرفر if (logChannel && logChannel.isText()) {
if (logChannel && logChannel.isText()) {
  const ticketsups = await ticketsup.findOne({ userId: sellerId });


  const ratingsArray = ticketsups.ratings;
  const totalRatings = ratingsArray.length;

  let ratingStars = "🌟 لم يتم التقييم بعد";
  let previousRatings = "";

  if (totalRatings > 0) {
    const totalSum = ratingsArray.reduce((acc, rating) => acc + rating.rating, 0);
    const averageRating = totalSum / totalRatings;
    const filledStars = "🌟".repeat(Math.round(averageRating));
    ratingStars = `\`${filledStars}\` || || (**${averageRating.toFixed(1)}**)`;

    // إضافة التقييمات السابقة
    previousRatings = ratingsArray.map(rating => `⭐ **${rating.rating}/5** - ${rating.comment || "لا يوجد تعليق"}`).join("\n");
  }

  const logEmbed = new MessageEmbed()
    .setTitle("📊 تقييم الدعم الفني")
          .setDescription(`لقد حصل على تقييم جديد من ${interaction.user}`)
    .addFields(
      { name: "👤 مسئول التذكرة", value: `<@${sellerId}>`, inline: false },
      { name: "⭐ التقييم", value: `${rating}/5 نجوم`, inline: true }, // التقييم المستخرج من customId
      { name: "⭐ التقييم العام", value: ratingStars, inline: false },
      { name: "📅 التاريخ", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    )
    .setColor("GREEN");

  logChannel.send({ content: `<@${sellerId}>`, embeds: [logEmbed] }).catch(console.error);
}

          
          
                       const ticketsups = await ticketsup.findOne({ userId: sellerId });
// حساب التقييم المتوسط
    const totalRatings = ticketsups.ratings.length;
    const totalSum = ticketsups.ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const averageRating = totalSum / totalRatings;

let newRole = "";
let roleChangeMessage = "";

if (averageRating >= 4.5) {
    newRole = "1370547604781535293"; // مستوى 3 (مسئول تذاكر 3)
    roleChangeMessage = "🎉 تم ترقيتك إلى ** الدعم الفني 3 **! 🏅";
} else if (averageRating >= 3.5) {
    newRole = "1370547619159347240"; // مستوى 2 (مسئول تذاكر 2)
    roleChangeMessage = "🎉 تم ترقيتك إلى ** الدعم الفني 2 **! 🏅";
} else if (averageRating >= 2.5) {
    newRole = "1370547622414258287"; // مستوى 1 (مسئول تذاكر 1)
    roleChangeMessage = "🎉 تم ترقيتك إلى ** الدعم الفني 1 **! 🏅";
} else {
    newRole = "1370547622414258287"; // الدعم الفني 1
    roleChangeMessage = "❌ تم تقليل رتبتك إلى **الدعم الفني 1** بسبب انخفاض تقييمك. حاول تحسينه.";
} 
// جلب العضو
const member = await guild.members.fetch(sellerId);

// رتب التذاكر كلها
const ticketRoles = [
    "1370547622414258287", // الدعم الفني 1
    "1370547619159347240", // الدعم الفني 2
    "1370547604781535293"  // الدعم الفني 3
];

// إزالة الرتب القديمة لو غير الرتبة الحالية
const rolesToRemove = ticketRoles.filter(roleId => roleId !== newRole && member.roles.cache.has(roleId));
if (rolesToRemove.length > 0) {
    await member.roles.remove(rolesToRemove);
}

// إضافة الرتبة الجديدة إذا مش معاه
if (!member.roles.cache.has(newRole)) {
    const role = guild.roles.cache.get(newRole);
    if (role) {
        await member.roles.add(role);
        await member.send(roleChangeMessage).catch(() => null);
    }
}        
        }
    }
}

async function handleButtons2(interaction, client) {
    const types = ['alliance', 'family', 'organization'];
  const labels = {
    alliance: "التقديم على التحالف",
    family: "التقديم على العائلة",
    organization: "التقديم على المنظمة"
  };
  const statusText = (status) => status ? "🟢 **مفتوح** - يمكن التقديم الآن" : "🔴 **مغلق** - غير متاح حالياً";
  const statusEmoji = (status) => status ? "🟢" : "🔴";
  const toggleLabel = (status) => status ? "إغلاق التقديم" : "فتح التقديم";

  const typeMatch = types.find(type => interaction.customId === `set_apply_${type}`);
  if (!typeMatch) return;

         const rolesToRemove = [config.support]; // الرتب المسموح لها
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
  // جلب البيانات
  let botData = await BotSettings.findOne({ botId: interaction.client.user.id });
  if (!botData) {
    botData = await BotSettings.create({
      botId: interaction.client.user.id, 
      TicketMessageId: '',
      Ticketalliance: true,
      Ticketfamily: true,
      Ticketorganization: true,
      statusEnabled: true,
      blacklist: []
    });
  }

  // تعديل الحالة
  const key = `Ticket${typeMatch}`;
  botData[key] = !botData[key];
  await botData.save();

  // إرسال رسالة التأكيد
  await interaction.reply({
    content: `تم تغيير حالة ${labels[typeMatch]} إلى: ${statusText(botData[key])}`,
    ephemeral: true
  }).catch(() => {});

  // تحديث الرسائل
  const buildEmbed = (withImage = false) => {
    const desc = types.map(type => `> ${labels[type]} - ${statusText(botData[`Ticket${type}`])}`).join('\n');
    const embed = new MessageEmbed()
      .setDescription(`> **حالة التقديمات الحالية:**\n\n${desc}`)
      .setColor("#0099ff");
 
    if (withImage) {
      embed.setImage("https://images-ext-1.discordapp.net/external/GBK3NNjsKy9ULt9plPYcFuSiUZ1Ts-STbT8vlWUbJ3E/%3Fsize%3D1024%26width%3D1024%26height%3D0/https/cdn.discordapp.com/banners/1345881410325712968/a_212b911b6fa0a5a57000c7c77a222ac7.gif");
    }

    return embed;
  };

  const buildMainButtons = () => new MessageActionRow().addComponents(
    ...types.map(type =>
      new MessageButton()
        .setCustomId(`apply_${type}`)
        .setLabel(labels[type])
        .setStyle("SECONDARY")
        .setEmoji(statusEmoji(botData[`Ticket${type}`]))
        .setDisabled(!botData[`Ticket${type}`])
    ),
    new MessageButton()
      .setCustomId("ticket_support")
      .setLabel("الدعم الفني")
      .setStyle("SECONDARY")
      .setEmoji("🛠️")
  );

  const buildControlButtons = () => new MessageActionRow().addComponents(
    ...types.map(type =>
      new MessageButton()
        .setCustomId(`set_apply_${type}`)
        .setLabel(toggleLabel(botData[`Ticket${type}`]))
        .setStyle("SECONDARY")
        .setEmoji(botData[`Ticket${type}`] ? "🔴" : "🟢")
    )
  );

  const controlChannel = interaction.guild.channels.cache.get('1367145687262953513');
  if (!controlChannel) return;

  const controlMessage = await controlChannel.messages.fetch(botData.TicketMessageId).catch(() => {});
  const controlMessage2 = await interaction.channel.messages.fetch("1369364284575846400").catch(() => {});
  if (!controlMessage || !controlMessage2) return;

  await Promise.all([
    controlMessage.edit({
      embeds: [buildEmbed(true)],
      components: [buildMainButtons()]
    }),
    controlMessage2.edit({
      embeds: [buildEmbed(false)],
      components: [buildControlButtons()]
    })
  ]); 

  const logChannel = interaction.guild.channels.cache.get("1367145750919778424"); // ← حط هنا ID روم اللوج

if (logChannel && logChannel.isText()) {
  const status = botData[key];
  const time = Math.floor(Date.now() / 1000);

  const smartLogEmbed = new MessageEmbed()
    .setTitle(`🛠️ تعديل حالة التقديم: ${labels[typeMatch]}`)
    .setDescription(`**تم تعديل حالة التقديم من قبل:** <@${interaction.user.id}>`)
    .addFields(
      { name: "🔖 نوع التقديم", value: `${labels[typeMatch]}`, inline: false },
      { name: "📌 الحالة الجديدة", value: `${status ? "🟢 مفتوح" : "🔴 مغلق"}`, inline: false },
      { name: "🕒 الوقت", value: `<t:${time}:f>`, inline: false }
    )
    .setColor(status ? "GREEN" : "RED")
 

  logChannel.send({ embeds: [smartLogEmbed] }).catch(console.error);
} 
}
const sendLog = async (interaction, roleId, sectionName) => {
  const logChannel = interaction.guild.channels.cache.get("1367145754296188990");
  if (!logChannel || !logChannel.isText()) return;

  const logEmbed = new MessageEmbed()
    .setTitle("📣 تم استدعاء الإدارة")
    .addFields(
      { name: "👤 من قبل", value: `<@${interaction.user.id}>`, inline: true },
      { name: "🏷️ القسم", value: `\`${sectionName}\``, inline: true },
      { name: "🕒 الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
    )
    .setColor("ORANGE")
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `ID: ${interaction.user.id}` });

  logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

const msgdm = new Map(); // تقدر تحطها في ملف الكاش العام للبوت

async function handleRating(i, rating) {
    const customIdParts = i.customId.split("_");
    const sellerId = customIdParts[2];
    const userId = customIdParts[3];

    if (i.user.id !== userId) {
        return await i.reply({
            content: "❌ **أنت لست صاحب هذا التقيم.**",
            ephemeral: true
        });
    }
  msgdm.set(i.user.id, {
        messageId: i.message.id, // هنا بتسجل ID الرسالة الأصلية
    });
    // نسأله لو حابب يضيف تعليق
    await i.reply({
        content: "هل تود إضافة تعليق مع تقييمك؟",
        components: [
            new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId(`add_comment_yes_${sellerId}_${userId}_${rating}`)
                    .setLabel("نعم")
                    .setStyle("PRIMARY"),
                new MessageButton()
                    .setCustomId(`add_comment_no_${sellerId}_${userId}_${rating}`)
                    .setLabel("لا")
                    .setStyle("SECONDARY")
            )
        ],
        ephemeral: true
    });
}


async function handleButtons(interaction, client) {
  const adminOrganizationRoleId = '1367281135452815420';
const adminAllianceRoleId = '1367145437840277544';
const adminFamilyRoleId = '1367281081576853554';
  
 

if (interaction.customId.startsWith("ratetickets_")) {
    const customIdParts = interaction.customId.split("_");
    const rating = parseInt(customIdParts[1]);

 const userId = interaction.user.id;
    const dmChannel = await interaction.user.createDM();

    try {
        const messages = await dmChannel.messages.fetch({ limit: 30 });
      await handleRating(interaction, rating);

    } catch (error) {
    }

}

  
 if (interaction.customId === 'ticket_support') {
  return interaction.reply({
    embeds: [
      new MessageEmbed()
        .setColor("#0099ff")
        .setTitle("📩 الدعم الفني")
        .setDescription(`# >>> **\`لأي استفسار أو مشكلة، يُرجى التواصل مع الإدارة مباشرة\`**\n# **\`عن طريق إرسال رسالة إلى خاص\`${client.user}\`وسيتم الرد عليك في أقرب وقت ممكن\`**`)
    ],
    ephemeral: true
  });
}

const callAdmin = async (interaction, roleId, sectionName) => {
  await interaction.reply({
    content: `✅ تم استدعاء إدارة **${sectionName}** بنجاح!`,
    ephemeral: true
  });

  await interaction.channel.send({
    content: `📢 <@&${roleId}> يوجد طلب جديد يحتاج مساعدتكم في قسم **${sectionName}**!`
  });

  await sendLog(interaction, roleId, sectionName);
};

if (interaction.customId === 'call_admin_family') {
  await callAdmin(interaction, adminFamilyRoleId, "العائلة");
}

if (interaction.customId === 'call_admin_alliance') {
  await callAdmin(interaction, adminAllianceRoleId, "التحالف");
}

if (interaction.customId === 'call_admin_Organization') {
  await callAdmin(interaction, adminOrganizationRoleId, "المنظمة");
}
  
         async function handleClaim(interaction, roleIds, sectionKey, sectionName, tickroom) {
  const userid = interaction.customId.split('_')[3];
  const allowedUserIds = ['298011146584064000'];

  if (
    !interaction.member.roles.cache.some(role => roleIds.includes(role.id)) &&
    !allowedUserIds.includes(interaction.user.id)
  ) {
    return interaction.reply({
      embeds: [
        new MessageEmbed()
          .setColor("RED")
          .setDescription("❌ ليس لديك الصلاحية لاستخدام هذا الزر.")
      ],
      ephemeral: true
    });
  }

  const userName = interaction.user.nickname || interaction.user.username;

  // تحديث الأزرار
  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(`claim_ticket_${sectionKey}_${userid}`)
      .setLabel(`استلمها ${userName}`)
      .setDisabled(true)
      .setStyle('SECONDARY'),

    new MessageButton()
      .setCustomId(`leave_ticket_${sectionKey}_${interaction.user.id}_${userid}`)
      .setLabel('❌ ترك التذكرة')
      .setStyle('SECONDARY'),

    new MessageButton()
      .setCustomId(`ticketclose_ticket_${userid}`)
      .setLabel('🔒 قفل التذكرة')
      .setStyle('SECONDARY'),

    new MessageButton()
      .setCustomId(`call_admin_${sectionKey}`)
      .setLabel('📣 استدعاء الإدارة')
      .setStyle('SECONDARY'),

    new MessageButton()
      .setCustomId(`call_user_${userid}`)
      .setLabel('👤 استدعاء العضو')
      .setStyle('SECONDARY')
  );

  await interaction.update({ components: [row] });

  // إرسال تأكيد للمستخدم
  await interaction.followUp({
    embeds: [
      new MessageEmbed()
        .setColor("GREEN")
        .setDescription(`✅ تم استلام التذكرة بواسطة **${interaction.user}**`)
    ],
    ephemeral: false
  });

  // إرسال لوج لروم محدد
  const logChannel = interaction.guild.channels.cache.get("1367145754296188990");
  if (logChannel && logChannel.isText()) {
    const logEmbed = new MessageEmbed()
      .setTitle("📥 تم استلام تذكرة")
      .addFields(
        { name: "📂 القسم", value: sectionName, inline: false },
        { name: "👤 المستلم", value: `<@${interaction.user.id}>`, inline: false },
                { name: "🎫 التكت", value: `<#${tickroom}>`, inline: false },

        { name: "🕒 الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
      )
      .setColor("BLUE")

    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
  }
           
           try {
  const member = await interaction.guild.members.fetch(userid);
  if (member) {
    await member.send({
      embeds: [
        new MessageEmbed()
          .setColor("YELLOW")
          .setDescription(`مرحبًا <@${userid}>، تم استلام تذكرتك من قبل **${interaction.user}**.`)
      ]
    });
  }
} catch (err) {
}
}

// استخدام الدالة حسب القسم
if (interaction.customId.startsWith("claim_ticket_family_")) {
  await handleClaim(interaction, ["1367281081576853554"], "family", "العائلة",interaction.channel.id);
}

if (interaction.customId.startsWith("claim_ticket_alliance_")) {
  await handleClaim(interaction, [config.AllianceManager], "alliance", "التحالف",interaction.channel.id);
}

if (interaction.customId.startsWith("claim_ticket_Organization_")) {
  await handleClaim(interaction, ["1367281135452815420"], "Organization", "المنظمة",interaction.channel.id);
}
  
  if (interaction.customId.startsWith("call_user_")) {
  const rolesToRemove = ["1367281135452815420", "1367281081576853554", config.AllianceManager];
  const allowedUserIds = ['298011146584064000'];

  if (
    !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
    !allowedUserIds.includes(interaction.user.id)
  ) {
    return interaction.reply({
      embeds: [
        new MessageEmbed()
          .setColor("RED")
          .setDescription("❌ ليس لديك الصلاحية لاستخدام هذا الزر.")
      ],
      ephemeral: true
    });
  }

  const userid = interaction.customId.split('_')[2];
  const user = await interaction.client.users.fetch(userid);

  let dmSuccess = true;

  try {
    await user.send({
      embeds: [
        new MessageEmbed()
          .setColor("BLUE")
          .setDescription(`📩 تم استدعاؤك من قبل الإدارة.\nيرجى التوجه إلى تذكرتك <#${interaction.channel.id}> في السيرفر بأسرع وقت ممكن للمساعدة.`)
      ]
    });
  } catch (error) {
    dmSuccess = false;
  }

  // رد داخل التذكرة
  await interaction.reply({
    embeds: [
      new MessageEmbed()
        .setColor(dmSuccess ? "GREEN" : "ORANGE")
        .setDescription(
          dmSuccess
            ? `✅ تم استدعاء <@${userid}> وتم إرسال رسالة خاصة له.`
            : `⚠️ تم استدعاء <@${userid}> لكن تعذر إرسال رسالة خاصة له.`
        )
    ],
    ephemeral: true
  });

  // إرسال لوج إلى روم مخصص
  const logChannel = interaction.guild.channels.cache.get("1367145754296188990");
  if (logChannel && logChannel.isText()) {
    const logEmbed = new MessageEmbed()
      .setTitle("📣 تم استدعاء عضو")
      .addFields(
        { name: "👤 العضو", value: `<@${userid}>`, inline: true },
        { name: "🧑‍💼 المستدعي", value: `<@${interaction.user.id}>`, inline: true },
        { name: "🎫 التذكرة", value: `<#${interaction.channel.id}>`, inline: false },
        { name: "📩 الرسالة الخاصة", value: dmSuccess ? "✅ تم الإرسال" : "❌ تعذر الإرسال", inline: false },
        { name: "🕒 الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
      )
      .setColor(dmSuccess ? "GREEN" : "ORANGE");

    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
  }
}

if (interaction.customId.startsWith("leave_ticket_")) {
  const [_, __, ticketType, userId, ticketOwnerId] = interaction.customId.split('_');
  const allowedUserIds = ['298011146584064000'];
  const channelId = interaction.channel.id;

  if (userId !== interaction.user.id) {
    return await interaction.reply({
      embeds: [
        new MessageEmbed()
          .setColor("RED")
          .setDescription("❌ أنت لست الشخص الذي استلم هذه التذكرة.")
      ],
      ephemeral: true
    });
  }

  // صلاحيات حسب النوع
  const permissions = {
    family: ["1367281081576853554"],
    Organization: ["1367281135452815420"],
    alliance: [config.AllianceManager]
  };

  const sectionName = {
    family: "قسم العائلة",
    Organization: "قسم المنظمة",
    alliance: "قسم التحالف"
  };

  const rolesToRemove = permissions[ticketType];

  if (
    !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
    !allowedUserIds.includes(interaction.user.id)
  ) {
    return interaction.reply({
      embeds: [
        new MessageEmbed()
          .setColor("RED")
          .setDescription("❌ ليس لديك الصلاحية لاستخدام هذا الزر.")
      ],
      ephemeral: true
    });
  }

  // تحديث الأزرار بعد ترك التذكرة
  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(`claim_ticket_${ticketType}_${ticketOwnerId}`)
      .setLabel('📥 استلام التذكرة')
      .setStyle('SECONDARY'),

    new MessageButton()
      .setCustomId(`ticketclose_ticket_${ticketOwnerId}`)
      .setLabel('🔒 قفل التذكرة')
      .setStyle('SECONDARY'),

    new MessageButton()
      .setCustomId(`call_admin_${ticketType}`)
      .setLabel('📣 استدعاء الإدارة')
      .setStyle('SECONDARY'),

    new MessageButton()
      .setCustomId(`call_user_${ticketOwnerId}`)
      .setLabel('👤 استدعاء العضو')
      .setStyle('SECONDARY')
  );

  await interaction.update({ components: [row] });

  await interaction.followUp({
    embeds: [
      new MessageEmbed()
        .setColor("ORANGE")
        .setDescription(`📤 تم ترك التذكرة من قبل <@${interaction.user.id}>.`)
    ],
    ephemeral: false
  });

  // إرسال لوج
  const logChannel = interaction.guild.channels.cache.get("1367145754296188990");
  if (logChannel && logChannel.isText()) {
    const logEmbed = new MessageEmbed()
      .setTitle("📤 تـرك تذكرة")
      .addFields(
        { name: "📂 القسم", value: sectionName[ticketType], inline: false },
        { name: "👤 المستلم السابق", value: `<@${interaction.user.id}>`, inline: false },
        { name: "🎫 التذكرة", value: `<#${channelId}>`, inline: false },
        { name: "🕒 الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
      )
      .setColor("ORANGE");

    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
  }
}
  
if (interaction.customId.startsWith("ticketclose_ticket_")) {
  const userid = interaction.customId.split('_')[2];
     const rolesToRemove = ["1367281135452815420","1367281081576853554", config.AllianceManager, config.support, config.topRole]; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000']; 
                if (
                    !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
                    !allowedUserIds.includes(interaction.user.id)
                ) {
                    return interaction.reply({
                        content: '❌ ليس لديك الصلاحية لاستخدام هذا الزر.',
                        ephemeral: true
                    });
                }
         const modal = new Modal()
                .setCustomId(`ticket_reason_modal_${userid}`)
                .setTitle('Reason for closing the ticket');

            const reasonInput = new TextInputComponent()
                .setCustomId(`close_reason`)
                .setLabel('Write the reason for closing')
                .setStyle('PARAGRAPH')
            .setPlaceholder('اشرح السبب')

            const modalRow = new MessageActionRow().addComponents(reasonInput);
            modal.addComponents(modalRow);

            await interaction.showModal(modal);
     }
       
  

  
  
   if (interaction.customId === 'apply_family') {
     
     
     
  const existingTicket = await Ticket.findOne({ userId: interaction.user.id, status: 'open' });

if (existingTicket) {
  const ticketChannel = interaction.guild.channels.cache.get(existingTicket.channelId);

  if (!ticketChannel) {
    await Ticket.updateOne(
      { _id: existingTicket._id },
      { status: 'closed' }
    );
  } else {
    return interaction.reply({
      content: `⚠️ You already have an open ticket: <#${existingTicket.channelId}>`,
      ephemeral: true
    });
  }
}
     
     
 const isBlacklisted = await Blacklist.findOne({ userId: interaction.user.id });


  if (isBlacklisted) {
    
const embed = new MessageEmbed()
    .setColor('#FF0000') // لون أحمر للدلالة على المنع
    .setTitle('🚫 لا يمكنك التقديم!')
    .setDescription(`أنت في **قائمة البلاك ليست** ولا يمكنك التقديم على العائلة.\n\n📝 **السبب:** ${isBlacklisted.reason}`)
    .setFooter({ text: 'يرجى التواصل مع الإدارة إذا كنت تعتقد أن هناك خطأ.', iconURL: interaction.client.user.displayAvatarURL() });
    return interaction.update({content: null, embeds: [embed], components: [], ephemeral: true });
    
  }
     
    const modal = new Modal()
      .setCustomId('apply_family_Modal')
      .setTitle('نموذج التقديم علي العائلة');

  // حقل اسم الحساب
    const accountName = new TextInputComponent()
      .setCustomId('account_name')
      .setLabel('اسم الحساب (يجب أن يكون متطابق مع الديسكورد)')
      .setStyle('SHORT')
      .setRequired(true);

    // حقل اسم الشخصية
    const characterName = new TextInputComponent()
      .setCustomId('character_name')
      .setLabel('اسم الشخصية في اللعبة')
      .setStyle('SHORT')
      .setRequired(true);

    // حقل الأيدي
    const gameId = new TextInputComponent()
      .setCustomId('game_id')
      .setLabel('الأيدي داخل اللعبة (ID)')
      .setStyle('SHORT')
      .setRequired(true);

    // حقل اللفل
    const level = new TextInputComponent()
      .setCustomId('level')
      .setLabel('اللفل (المستوى) الحالي')
      .setStyle('SHORT')
      .setRequired(true);

    // حقل الموافقة على التأمين
    const insurance = new TextInputComponent()
      .setCustomId('insurance_agreement')
      .setLabel('موافق على دفع التأمين؟ (نعم/لا فقط)')
      .setStyle('SHORT')
      .setPlaceholder('يجب كتابة "نعم" أو "لا" فقط')
      .setRequired(true);



    const firstRow = new MessageActionRow().addComponents(accountName);
    const secondRow = new MessageActionRow().addComponents(characterName);
    const thirdRow = new MessageActionRow().addComponents(gameId);
    const fourthRow = new MessageActionRow().addComponents(level);
    const fifthRow = new MessageActionRow().addComponents(insurance);

    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

    await interaction.showModal(modal);
  }
   if (interaction.customId === 'apply_alliance') {
     
     
     
  const existingTicket = await Ticket.findOne({ userId: interaction.user.id, status: 'open' });

if (existingTicket) {
  const ticketChannel = interaction.guild.channels.cache.get(existingTicket.channelId);

  if (!ticketChannel) {
    await Ticket.updateOne(
      { _id: existingTicket._id },
      { status: 'closed' }
    );
  } else {
    return interaction.reply({
      content: `⚠️ You already have an open ticket: <#${existingTicket.channelId}>`,
      ephemeral: true
    });
  }
}
     
     
 const isBlacklisted = await Blacklist.findOne({ userId: interaction.user.id });


  if (isBlacklisted) {
    
const embed = new MessageEmbed()
    .setColor('#FF0000') // لون أحمر للدلالة على المنع
    .setTitle('🚫 لا يمكنك التقديم!')
    .setDescription(`أنت في **قائمة البلاك ليست** ولا يمكنك التقديم على تحالف.\n\n📝 **السبب:** ${isBlacklisted.reason}`)
    .setFooter({ text: 'يرجى التواصل مع الإدارة إذا كنت تعتقد أن هناك خطأ.', iconURL: interaction.client.user.displayAvatarURL() });
    return interaction.update({content: null, embeds: [embed], components: [], ephemeral: true });
    
  }
     
     const modal = new Modal()
    .setCustomId('apply_alliance_Modal')
    .setTitle('📜 تقديم طلب تحالف');

// 🔹 السؤال الأول: اسم العائلة
const familyNameInput = new TextInputComponent()
    .setCustomId('family_name')
    .setLabel('🔹 ما اسم العائلة؟')
    .setStyle('SHORT')
    .setPlaceholder('اكتب اسم العائلة هنا')
    .setRequired(true);

// 🔹 السؤال الثاني: مالك العائلة
const familyOwnerInput = new TextInputComponent()
    .setCustomId('family_owner')
    .setLabel('👑 من هو مالك العائلة؟')
    .setStyle('SHORT')
    .setPlaceholder('اكتب اي دي المالك داخل اللعبة')
    .setRequired(true);

// 🔹 السؤال الثالث: سبب تقديم التحالف
const allianceReasonInput = new TextInputComponent()
    .setCustomId('alliance_reason')
    .setLabel('📜 ما سبب تقديم طلب التحالف؟')
    .setStyle('PARAGRAPH')
    .setPlaceholder('اشرح السبب الذي يدفعك لتقديم التحالف')
    .setRequired(true);

// 🔹 إضافة الأسئلة إلى النموذج
modal.addComponents(
    new MessageActionRow().addComponents(familyNameInput),
    new MessageActionRow().addComponents(familyOwnerInput),
    new MessageActionRow().addComponents(allianceReasonInput)
);

await interaction.showModal(modal);
  }
    if (interaction.customId === 'apply_organization') {
     
     
     
  const existingTicket = await Ticket.findOne({ userId: interaction.user.id, status: 'open' });

if (existingTicket) {
  const ticketChannel = interaction.guild.channels.cache.get(existingTicket.channelId);

  if (!ticketChannel) {
    await Ticket.updateOne(
      { _id: existingTicket._id },
      { status: 'closed' }
    );
  } else {
    return interaction.reply({
      content: `⚠️ You already have an open ticket: <#${existingTicket.channelId}>`,
      ephemeral: true
    });
  }
}
     
     
 const isBlacklisted = await Blacklist.findOne({ userId: interaction.user.id });


  if (isBlacklisted) {
    
const embed = new MessageEmbed()
    .setColor('#FF0000') // لون أحمر للدلالة على المنع
    .setTitle('🚫 لا يمكنك التقديم!')
    .setDescription(`أنت في **قائمة البلاك ليست** ولا يمكنك التقديم على منظمة.\n\n📝 **السبب:** ${isBlacklisted.reason}`)
    .setFooter({ text: 'يرجى التواصل مع الإدارة إذا كنت تعتقد أن هناك خطأ.', iconURL: interaction.client.user.displayAvatarURL() });
    return interaction.update({content: null, embeds: [embed], components: [], ephemeral: true });
    
  }
     const modal = new Modal()
  .setCustomId('apply_Organization_Modal')
  .setTitle('📜 تقديم طلب انضمام للمنظمة');

// 🔹 السؤال الأول: اسم الحساب
const accountNameInput = new TextInputComponent()
  .setCustomId('account_name')
  .setLabel('👤 ما اسم حسابك؟')
  .setStyle('SHORT')
  .setPlaceholder('اكتب اسم الحساب هنا')
  .setRequired(true);

// 🔹 السؤال الثاني: اسم الشخصية
const characterNameInput = new TextInputComponent()
  .setCustomId('character_name')
  .setLabel('🎮 ما اسم شخصيتك؟')
  .setStyle('SHORT')
  .setPlaceholder('اكتب اسم الشخصية هنا')
  .setRequired(true);

// 🔹 السؤال الثالث: المستوى
const levelInput = new TextInputComponent()
  .setCustomId('level')
  .setLabel('📈 ما هو مستواك؟')
  .setStyle('SHORT')
  .setPlaceholder('اكتب المستوى هنا')
  .setRequired(true);

// 🔹 السؤال الرابع: هل كان في منظمة من قبل؟
const organizationInput = new TextInputComponent()
  .setCustomId('previous_organization')
  .setLabel('🏢 هل كنت في منظمة من قبل؟')
  .setStyle('SHORT')
  .setPlaceholder('اكتب نعم أو لا')
  .setRequired(true);




// 🔹 إضافة الأسئلة إلى النموذج
modal.addComponents(
    new MessageActionRow().addComponents(accountNameInput),
    new MessageActionRow().addComponents(characterNameInput),
    new MessageActionRow().addComponents(levelInput),
      new MessageActionRow().addComponents(organizationInput)
);

await interaction.showModal(modal);
  }
  
}


async function handleSelectMenu(interaction, client) {
}


  async function handleModalSubmit(interaction, client) {
    
    if (interaction.customId.startsWith('ticketrate_')) {
    // تحليل customId للحصول على sellerId و rating من المعرف
  const customIdParts = interaction.customId.split("_");
      
      const action = customIdParts[0];  // 'ticketrate'
const sellerId = customIdParts[1];  // sellerId
const userId = customIdParts[2];  // userId
const rating = customIdParts[3];  // rating


      // استرجاع التعليق الذي كتبه المستخدم
    const comment = interaction.fields.getTextInputValue('commentInput');  

    // تخزين التعليق في قاعدة البيانات مع التقييم
    await ticketsup.updateOne(
        { userId: sellerId },
        {
            $push: {
                ratings: {
                    userId: interaction.user.id,
                    rating: parseInt(rating),  // استخدام التقييم المستخرج من customId
                    comment: comment,  // التعليق المدخل
                    createdAt: new Date(),
                },
            },
        },
        { upsert: true }
    );

       const sellerUser = await interaction.client.users.fetch(sellerId);

  const nameToShow = sellerUser?.displayName || sellerUser.username;

          const dmChannel = await interaction.user.createDM();
const cachedMessageId = msgdm.get(interaction.user.id)?.messageId;

    const message = await dmChannel.messages.fetch(cachedMessageId);


await message.edit({
  
        components:[new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId("rating_done")

          .setLabel(`⭐ ${rating}/5 | ${nameToShow}`)
            .setStyle("SUCCESS")
            .setDisabled(true)
    )],
    });

    await interaction.update({
        content: `✅ تم حفظ تقييمك مع التعليق: "${comment}"! شكراً لك 🌟`,
        ephemeral: true,
      components:[]
    });

    // إرسال إشعار للبائع
    const embed = new MessageEmbed()
        .setColor("#FFD700")
        .setTitle("📊 تم تلقي تقييم جديد!")
        .setDescription(`لقد حصلت على تقييم جديد من ${interaction.user}`)
        .addFields(
            { name: "⭐ التقييم", value: `${rating}/5 نجوم`, inline: true }, // التقييم المستخرج من customId
            { name: "💬 التعليق", value: comment || "لا يوجد", inline: false },
            { name: "📅 التاريخ", value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
        );

    // إرسال التنبيه للبائع عبر DM
    await sellerUser.send({ embeds: [embed] }).catch(() => null);
      
      
    const guild = await interaction.client.guilds.fetch("1349061146929532968");


const logChannel = guild.channels.cache.get("1370526211406823474"); // احصل على قناة الـ log من السيرفر if (logChannel && logChannel.isText()) {
if (logChannel && logChannel.isText()) {
  const ticketsups = await ticketsup.findOne({ userId: sellerId });


  const ratingsArray = ticketsups.ratings;
  const totalRatings = ratingsArray.length;

  let ratingStars = "🌟 لم يتم التقييم بعد";
  let previousRatings = "";

  if (totalRatings > 0) {
    const totalSum = ratingsArray.reduce((acc, rating) => acc + rating.rating, 0);
    const averageRating = totalSum / totalRatings;
    const filledStars = "🌟".repeat(Math.round(averageRating));
    ratingStars = `\`${filledStars}\` || || (**${averageRating.toFixed(1)}**)`;

    // إضافة التقييمات السابقة
    previousRatings = ratingsArray.map(rating => `⭐ **${rating.rating}/5** - ${rating.comment || "لا يوجد تعليق"}`).join("\n");
  }

  const logEmbed = new MessageEmbed()
    .setTitle("📊 تقييم الدعم الفني")
          .setDescription(`لقد حصل على تقييم جديد من ${interaction.user}`)
    .addFields(
      { name: "👤 مسئول التذكرة", value: `<@${sellerId}>`, inline: false },
      { name: "⭐ التقييم", value: `${rating}/5 نجوم`, inline: true }, // التقييم المستخرج من customId
      { name: "⭐ التقييم العام", value: ratingStars, inline: false },
      { name: "📅 التاريخ", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    )
    .setColor("GREEN");

  logChannel.send({ content: `<@${sellerId}>`, embeds: [logEmbed] }).catch(console.error);
}

            const ticketsups = await ticketsup.findOne({ userId: sellerId });
// حساب التقييم المتوسط
    const totalRatings = ticketsups.ratings.length;
    const totalSum = ticketsups.ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const averageRating = totalSum / totalRatings;

let newRole = "";
let roleChangeMessage = "";

if (averageRating >= 4.5) {
    newRole = "1370547604781535293"; // مستوى 3 (مسئول تذاكر 3)
    roleChangeMessage = "🎉 تم ترقيتك إلى ** الدعم الفني 3 **! 🏅";
} else if (averageRating >= 3.5) {
    newRole = "1370547619159347240"; // مستوى 2 (مسئول تذاكر 2)
    roleChangeMessage = "🎉 تم ترقيتك إلى ** الدعم الفني 2 **! 🏅";
} else if (averageRating >= 2.5) {
    newRole = "1370547622414258287"; // مستوى 1 (مسئول تذاكر 1)
    roleChangeMessage = "🎉 تم ترقيتك إلى ** الدعم الفني 1 **! 🏅";
} else {
    newRole = "1370547622414258287"; // الدعم الفني 1
    roleChangeMessage = "❌ تم تقليل رتبتك إلى **الدعم الفني 1** بسبب انخفاض تقييمك. حاول تحسينه.";
} 
// جلب العضو
const member = await guild.members.fetch(sellerId);

// رتب التذاكر كلها
const ticketRoles = [
    "1370547622414258287", // الدعم الفني 1
    "1370547619159347240", // الدعم الفني 2
    "1370547604781535293"  // الدعم الفني 3
];

// إزالة الرتب القديمة لو غير الرتبة الحالية
const rolesToRemove = ticketRoles.filter(roleId => roleId !== newRole && member.roles.cache.has(roleId));
if (rolesToRemove.length > 0) {
    await member.roles.remove(rolesToRemove);
}

// إضافة الرتبة الجديدة إذا مش معاه
if (!member.roles.cache.has(newRole)) {
    const role = guild.roles.cache.get(newRole);
    if (role) {
        await member.roles.add(role);
    }
}

// إرسال رسالة للعضو
await member.send(roleChangeMessage).catch(() => null);

      
}

    
    
    
  if (interaction.customId.startsWith("ticket_reason_modal_")) {
  const userid = interaction.customId.split('_')[3];
  
      const channel = interaction.channel;
    const reason = interaction.fields.getTextInputValue('close_reason') || 'No reason provided.';

    // ✅ الرد على المودال لمنع أي مشاكل
    await interaction.reply({ content: "Closing the ticket...", ephemeral: true });

    // ✅ استدعاء الدالة بعد الرد

        const ticket = await Ticket.findOne({ channelId: channel.id });
        if (!ticket) return interaction.channel.delete();


        if (ticket.status === 'closed') {
            return interaction.channel.delete();
        }

        // ✅ تحديث بيانات التذكرة في الداتابيز
        await Ticket.updateOne(
            { _id: ticket._id },
            { 
                status: 'closed',
            }
        );




    if (!interaction) {
        console.error("❌ Error: interaction is not defined!");
        return;
      
    }    try {
      const member = await interaction.guild.members.fetch(userid);

        // 📜 Generate the transcript file
        const attachment = await createTranscript(channel, {
            limit: -1, 
            returnType: 'attachment', 
            filename: `${channel.name}.html`, 
            minify: true, 
            saveImages: false
        });

        // 📨 Create an embed message
        // ✅ إنشاء زر لتحميل الملف
       const transcriptChannel = await interaction.client.channels.cache.get(config.imgslogs); // القناة المستهدفة

if (!transcriptChannel) {
    console.error("❌ Channel not found!");
    return;
}

// ✅ إرسال الملف إلى القناة
const sentMessage = await transcriptChannel.send({ files: [attachment] });

// ✅ الحصول على رابط الملف
const fileURL = await sentMessage.attachments.first()?.url;

if (!fileURL) {
    console.error("❌ Failed to retrieve file URL!");
    return;
}

// ✅ زر التحميل برابط مباشر
const row = new MessageActionRow().addComponents(
    new MessageButton()
        .setLabel('📄 Download Ticket')
        .setStyle('LINK')
        .setURL(fileURL) // ✅ استخدم الرابط الصحيح
);
      
      

const ratingRow = new MessageActionRow().addComponents(
    // 🔴 تقييم 1 - سيء جداً
    new MessageButton()
        .setCustomId(`ratetickets_1_${interaction.user.id}_${member.user.id}`)
        .setLabel('⭐ 1 🔴')
        .setStyle('SECONDARY')
        .setEmoji('😡'),

    // 🟠 تقييم 2 - سيء
    new MessageButton()
        .setCustomId(`ratetickets_2_${interaction.user.id}_${member.user.id}`)
        .setLabel('⭐ 2 🟠')
        .setStyle('SECONDARY')
        .setEmoji('😠'),

    // 🟡 تقييم 3 - مقبول
    new MessageButton()
        .setCustomId(`ratetickets_3_${interaction.user.id}_${member.user.id}`)
        .setLabel('⭐ 3 🟡')
        .setStyle('SECONDARY')
        .setEmoji('😐'),

    // 🟢 تقييم 4 - جيد
    new MessageButton()
        .setCustomId(`ratetickets_4_${interaction.user.id}_${member.user.id}`)
        .setLabel('⭐ 4 🟢')
        .setStyle('SECONDARY')
        .setEmoji('😊'),

    // 🔵 تقييم 5 - ممتاز
    new MessageButton()
        .setCustomId(`ratetickets_5_${interaction.user.id}_${member.user.id}`)
        .setLabel('⭐ 5 🔵')
        .setStyle('SECONDARY')
        .setEmoji('😍')
);

// إرسال الفاتورة مع الأزرار

// ✅ إرسال رسالة للمستخدم
const embed = new MessageEmbed()
    .setTitle('📌 **Your Ticket Has Been Closed**')
    .setColor('#ff3333')
    .setDescription(
        `Hey <@${member.user.id}>, your ticket has been closed.\n\n` +
        `🔹 **Reason:**\n> ${reason || 'No reason provided.'}\n\n` +
        `🔹 **Closed by:** <@${interaction.user.id}>\n\n` +
        `📅 **Closed on:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n`+
              `🎯 **من فضلك قيّم الشخص اللي ساعدك، تقييمك بيفرق جدًا معانا!**`
    )
    .setFooter({ text: 'Thanks for reaching out! Stay safe. 🚀' })
   await  member.user.send({ embeds: [embed], components: [row] });
         await  member.user.send({  components: [ratingRow] });

        await channel.delete();

        const logChannel = interaction.guild.channels.cache.get("1367145754296188990");
  if (logChannel && logChannel.isText()) {
    const logEmbed = new MessageEmbed()
      .setTitle("📭 قفل التذكرة")
      .addFields(
        { name: "👤 من قام بالقفل", value: `<@${interaction.user.id}>`, inline: false },
        { name: "📅 السبب", value: `${reason || "لا يوجد سبب"}`, inline: false },
        { name: "🕒 الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setColor("YELLOW");

    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
  }
      
    } catch (error) {
        await channel.delete();

    }
      
      

  
}
    
    
    
    if (interaction.customId === 'apply_family_Modal') {
      // استخراج البيانات من النموذج
      const formData = {
        accountName: interaction.fields.getTextInputValue('account_name'),
        characterName: interaction.fields.getTextInputValue('character_name'),
        gameId: interaction.fields.getTextInputValue('game_id'),
        level: interaction.fields.getTextInputValue('level'),
        insurance: interaction.fields.getTextInputValue('insurance_agreement'),
      };

      // التحقق من صحة إجابة التأمين
      if (!['نعم', 'لا'].includes(formData.insurance.toLowerCase())) {
        return await interaction.reply({
          content: 'يجب أن تكون إجابة التأمين "نعم" أو "لا" فقط',
          ephemeral: true
        });
      }

      // إنشاء رسالة التأكيد
      const confirmEmbed = new MessageEmbed()
        .addFields(
          { name: 'اسم الحساب', value: formData.accountName, inline: false },
          { name: 'اسم الشخصية', value: formData.characterName, inline: false },
          { name: 'الأيدي', value: formData.gameId, inline: false },
          { name: 'المستوى', value: formData.level, inline: false },
          { name: 'موافق على التأمين؟', value: formData.insurance, inline: false },
        )

      // أزرار التأكيد والإلغاء
      const confirmButtons = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('confirm_family_application')
          .setLabel('تأكيد التقديم')
          .setStyle('SUCCESS'),
        new MessageButton()
          .setCustomId('cancel_family_application')
          .setLabel('إلغاء')
          .setStyle('DANGER')
      );

      // إرسال رسالة التأكيد
      await interaction.reply({
        content: '**يرجى مراجعة المعلومات قبل التأكيد:**',
        embeds: [confirmEmbed],
        components: [confirmButtons],
        ephemeral: true
      });
        const buttonFilter = i => i.user.id === interaction.user.id;
const reasonCollector = interaction.channel.createMessageComponentCollector({
  filter: buttonFilter,
  time: 15000,
  max: 1
});
    reasonCollector.on('collect', async btnInteraction => {
 

        if (btnInteraction.customId === 'confirm_family_application') {

          
  const existingTicket = await Ticket.findOne({ userId: interaction.user.id, status: 'open' });

if (existingTicket) {
  const ticketChannel = interaction.guild.channels.cache.get(existingTicket.channelId);

  if (!ticketChannel) {
    await Ticket.updateOne(
      { _id: existingTicket._id },
      { status: 'closed' }
    );
  } else {
    return interaction.reply({
      content: `⚠️ You already have an open ticket: <#${existingTicket.channelId}>`,
      ephemeral: true
    });
  }
}
     
          
            const ticketChannel = await interaction.guild.channels.create(`تقديم-للعائلة`, {
    type: 'GUILD_TEXT',
    parent: "1367228732821078078",
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone, deny: ['VIEW_CHANNEL'] },
        { id: interaction.user.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES'] },
        { id: "1367281081576853554", allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }
    ]
  });
           
          await Ticket.findOneAndUpdate(
  { userId: interaction.user.id }, 
  {
    $set: {
      status: 'open',
      channelId: ticketChannel.id,
    }
  },
  {
    upsert: true,     
    setDefaultsOnInsert: true 
  }
);
          const confirmEmbed = new MessageEmbed()
  .setColor('#2F3136')
  .addFields(
    { name: '👤 اسم الحساب', value: formData.accountName || 'غير محدد', inline: true },
    { name: '🎮 اسم الشخصية', value: formData.characterName || 'غير محدد', inline: true },
    { name: '🆔 الأيدي', value: formData.gameId || 'غير محدد', inline: true },
    { name: '📈 المستوى', value: formData.level || 'غير محدد', inline: true },
    { name: '✅ موافق على التأمين؟', value: formData.insurance || 'غير محدد', inline: false },
  )
          
          const row = new MessageActionRow().addComponents(
  new MessageButton()
    .setCustomId(`claim_ticket_family_${interaction.user.id}`)
    .setLabel('📥 استلام التذكرة')
    .setStyle('SECONDARY'),

  new MessageButton()
    .setCustomId(`ticketclose_ticket_${interaction.user.id}`)
    .setLabel('🔒 قفل التذكرة')
    .setStyle('SECONDARY'),

  new MessageButton()
    .setCustomId('call_admin_family')
    .setLabel('📣 استدعاء الإدارة')
    .setStyle('SECONDARY'),

  new MessageButton()
    .setCustomId(`call_user_${interaction.user.id}`)
    .setLabel('👤 استدعاء العضو')
    .setStyle('SECONDARY')
);
          await ticketChannel.send({ content: `<@&1367281081576853554>, <@${interaction.user.id}>`,  embeds: [confirmEmbed],components: [row] });

         
          await btnInteraction.update({
            content: `تم فتح طلب التقديم في التذكرة ${ticketChannel}`,
            embeds: [],
            components: []
          });
          
            const logChannel = interaction.guild.channels.cache.get("1367145754296188990");  // قناة اللوج
  if (logChannel && logChannel.isText()) {
    const logEmbed = new MessageEmbed()
      .setTitle("📥 تم فتح تذكرة جديدة")
      .addFields(
        { name: "👤 المستخدم", value: `<@${interaction.user.id}>`, inline: false },
        { name: "📂 القسم", value: "العائلة", inline: false },
        { name: "🕒 الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setColor("BLUE");

    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
  }
        } 
        else if (btnInteraction.customId === 'cancel_family_application') {
          await btnInteraction.update({
            content: '❌ تم إلغاء طلب التقديم',
            embeds: [],
            components: []
          });
        }
      });
    }
 
    
      if (interaction.customId === 'apply_alliance_Modal') {
      // استخراج البيانات من النموذج
      const formData = {
  familyName: interaction.fields.getTextInputValue('family_name'),
  familyOwner: interaction.fields.getTextInputValue('family_owner'),
  allianceReason: interaction.fields.getTextInputValue('alliance_reason')
      };
let ownerMention = 'لا يوجد';

try {
  const member = await interaction.guild.members.fetch(formData.familyOwner);
  if (member) {
    ownerMention = `<@${member.id}>`;
  }
} catch (err) {
  // مش عضو في السيرفر أو الأيدي غلط
  ownerMention = 'لا يوجد';
}
      // إنشاء رسالة التأكيد
      const confirmEmbed = new MessageEmbed()
        .addFields(
    { name: '🏘️ اسم العائلة', value: formData.familyName || 'غير محدد', inline: false },
    { name: '👑 مالك العائلة', value: ownerMention, inline: false },
    { name: '📜 سبب تقديم التحالف', value: formData.allianceReason || 'غير محدد', inline: false }
        )

      // أزرار التأكيد والإلغاء
      const confirmButtons = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('confirm_alliance_application')
          .setLabel('تأكيد التقديم')
          .setStyle('SUCCESS'),
        new MessageButton()
          .setCustomId('cancel_alliance_application')
          .setLabel('إلغاء')
          .setStyle('DANGER')
      );

      // إرسال رسالة التأكيد
      await interaction.reply({
        content: '**يرجى مراجعة المعلومات قبل التأكيد:**',
        embeds: [confirmEmbed],
        components: [confirmButtons],
        ephemeral: true
      });
   const buttonFilter = i => i.user.id === interaction.user.id;
const reasonCollector = interaction.channel.createMessageComponentCollector({
  filter: buttonFilter,
  time: 15000,
  max: 1
});
    reasonCollector.on('collect', async btnInteraction => {

       /*العائلة */
         if (btnInteraction.customId === 'confirm_alliance_application') {

          
  const existingTicket = await Ticket.findOne({ userId: interaction.user.id, status: 'open' });

if (existingTicket) {
  const ticketChannel = interaction.guild.channels.cache.get(existingTicket.channelId);

  if (!ticketChannel) {
    await Ticket.updateOne(
      { _id: existingTicket._id },
      { status: 'closed' }
    );
  } else {
    return interaction.reply({
      content: `⚠️ You already have an open ticket: <#${existingTicket.channelId}>`,
      ephemeral: true
    });
  }
}
     
          
            const ticketChannel = await interaction.guild.channels.create(`تقديم-تحالف`, {
    type: 'GUILD_TEXT',
    parent: "1367228820813512714",
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone, deny: ['VIEW_CHANNEL'] },
        { id: interaction.user.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES'] },
        { id: "1367145437840277544", allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }
    ]
  });
               
          await Ticket.findOneAndUpdate(
  { userId: interaction.user.id }, 
  {
    $set: {
      status: 'open',
      channelId: ticketChannel.id,
    }
  },
  {
    upsert: true,     
    setDefaultsOnInsert: true 
  }
);
          const confirmEmbed = new MessageEmbed()
  .setColor('#2F3136')
  .addFields(
    { name: '🏘️ اسم العائلة', value: formData.familyName || 'غير محدد', inline: true },
    { name: '👑 مالك العائلة', value: ownerMention, inline: true },
    { name: '📜 سبب تقديم التحالف', value: formData.allianceReason || 'غير محدد', inline: true }
  )
          
          const row = new MessageActionRow().addComponents(
  new MessageButton()
    .setCustomId(`claim_ticket_alliance_${interaction.user.id}`)
    .setLabel('📥 استلام التذكرة')
    .setStyle('SECONDARY'),

  new MessageButton()
    .setCustomId(`ticketclose_ticket_${interaction.user.id}`)
    .setLabel('🔒 قفل التذكرة')
    .setStyle('SECONDARY'),

  new MessageButton()
    .setCustomId('call_admin_alliance')
    .setLabel('📣 استدعاء الإدارة')
    .setStyle('SECONDARY'),

  new MessageButton()
    .setCustomId(`call_user_${interaction.user.id}`)
    .setLabel('👤 استدعاء العضو')
    .setStyle('SECONDARY')
);
          await ticketChannel.send({ content: `<@&1367145437840277544>, <@${interaction.user.id}>`,  embeds: [confirmEmbed],components: [row] });

      
          await btnInteraction.update({
            content: `تم فتح طلب التقديم في التذكرة ${ticketChannel}`,
            embeds: [],
            components: []
          });
           
             const logChannel = interaction.guild.channels.cache.get("1367145754296188990");  // قناة اللوج
  if (logChannel && logChannel.isText()) {
    const logEmbed = new MessageEmbed()
      .setTitle("📥 تم فتح تذكرة جديدة")
      .addFields(
        { name: "👤 المستخدم", value: `<@${interaction.user.id}>`, inline: false },
        { name: "📂 القسم", value: "التحالف", inline: false },
        { name: "🕒 الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
      )
      .setColor("BLUE");

    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
  }
        } 
        else if (btnInteraction.customId === 'cancel_alliance_application') {
          await btnInteraction.update({
            content: '❌ تم إلغاء طلب التقديم',
            embeds: [],
            components: []
          });
        }
        
      
        
        
      });
    }
    
    
      if (interaction.customId === 'apply_Organization_Modal') {
            // التحقق من صحة إجابة التأمين
 

      // استخراج البيانات من النموذج
 const formData = {
  accountNameInput: interaction.fields.getTextInputValue('account_name'),
  characterName: interaction.fields.getTextInputValue('character_name'),
  level: interaction.fields.getTextInputValue('level'),
  previousOrganization: interaction.fields.getTextInputValue('previous_organization')
};

        
    if (!['نعم', 'لا'].includes(formData.previousOrganization.toLowerCase())) {
  return await interaction.reply({
    content: 'يجب أن تكون إجابة "هل كنت في منظمة من قبل؟" "نعم" أو "لا" فقط',
    ephemeral: true
  });
}
      const confirmEmbed = new MessageEmbed()
        .addFields(
    { name: '👤 اسم الحساب', value: formData.accountName || 'غير محدد', inline: false },
    { name: '🎮 اسم الشخصية', value: formData.characterName || 'غير محدد', inline: false },
    { name: '📈 المستوى', value: formData.level || 'غير محدد', inline: false },
    { name: '🏢 هل كنت في منظمة من قبل؟', value: formData.previousOrganization || 'غير محدد', inline: false }
  
        )

      // أزرار التأكيد والإلغاء
      const confirmButtons = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('confirm_Organization_application')
          .setLabel('تأكيد التقديم')
          .setStyle('SUCCESS'),
        new MessageButton()
          .setCustomId('cancel_Organization_application')
          .setLabel('إلغاء')
          .setStyle('DANGER')
      );

      // إرسال رسالة التأكيد
      await interaction.reply({
        content: '**يرجى مراجعة المعلومات قبل التأكيد:**',
        embeds: [confirmEmbed],
        components: [confirmButtons],
        ephemeral: true
      });
   const buttonFilter = i => i.user.id === interaction.user.id;
const reasonCollector = interaction.channel.createMessageComponentCollector({
  filter: buttonFilter,
  time: 15000,
  max: 1
});
    reasonCollector.on('collect', async btnInteraction => {

       /*العائلة */
         if (btnInteraction.customId === 'confirm_Organization_application') {

               
     
  const existingTicket = await Ticket.findOne({ userId: interaction.user.id, status: 'open' });

if (existingTicket) {
  const ticketChannel = interaction.guild.channels.cache.get(existingTicket.channelId);

  if (!ticketChannel) {
    await Ticket.updateOne(
      { _id: existingTicket._id },
      { status: 'closed' }
    );
  } else {
    return interaction.reply({
      content: `⚠️ You already have an open ticket: <#${existingTicket.channelId}>`,
      ephemeral: true
    });
  }
}
     
          
            const ticketChannel = await interaction.guild.channels.create(`تقديم-المنظمة`, {
    type: 'GUILD_TEXT',
    parent: "1367228941152288849",
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone, deny: ['VIEW_CHANNEL'] },
        { id: interaction.user.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES'] },
        { id: "1367281135452815420", allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }
    ]
  });
             
          await Ticket.findOneAndUpdate(
  { userId: interaction.user.id }, 
  {
    $set: {
      status: 'open',
      channelId: ticketChannel.id,
    }
  },
  {
    upsert: true,     
    setDefaultsOnInsert: true 
  }
);
          const confirmEmbed = new MessageEmbed()
  .setColor('#2F3136')
  .addFields(
    { name: '👤 اسم الحساب', value: formData.accountName || 'غير محدد', inline: true },
    { name: '🎮 اسم الشخصية', value: formData.characterName || 'غير محدد', inline: true },
    { name: '📈 المستوى', value: formData.level || 'غير محدد', inline: true },
    { name: '🏢 هل كنت في منظمة من قبل؟', value: formData.previousOrganization || 'غير محدد', inline: true }
  
  )
          
          const row = new MessageActionRow().addComponents(
  new MessageButton()
    .setCustomId(`claim_ticket_Organization_${interaction.user.id}`)
    .setLabel('📥 استلام التذكرة')
    .setStyle('SECONDARY'),

  new MessageButton()
    .setCustomId(`ticketclose_ticket_${interaction.user.id}`)
    .setLabel('🔒 قفل التذكرة')
    .setStyle('SECONDARY'),

  new MessageButton()
    .setCustomId('call_admin_Organization')
    .setLabel('📣 استدعاء الإدارة')
    .setStyle('SECONDARY'),

  new MessageButton()
    .setCustomId(`call_user_${interaction.user.id}`)
    .setLabel('👤 استدعاء العضو')
    .setStyle('SECONDARY')
);
          await ticketChannel.send({ content: `<@&1367281135452815420>, <@${interaction.user.id}>`,  embeds: [confirmEmbed],components: [row] });

        
          await btnInteraction.update({
            content: `تم فتح طلب التقديم في التذكرة ${ticketChannel}`,
            embeds: [],
            components: []
          });
             const logChannel = interaction.guild.channels.cache.get("1367145754296188990");  // قناة اللوج
  if (logChannel && logChannel.isText()) {
    const logEmbed = new MessageEmbed()
      .setTitle("📥 تم فتح تذكرة جديدة")
      .addFields(
        { name: "👤 المستخدم", value: `<@${interaction.user.id}>`, inline: false },
        { name: "📂 القسم", value: "المنظمة", inline: false },
        { name: "🕒 الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
      )
      .setColor("BLUE");

    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
  }
        } 
        else if (btnInteraction.customId === 'cancel_Organization_application') {
          await btnInteraction.update({
            content: '❌ تم إلغاء طلب التقديم',
            embeds: [],
            components: []
          });
        }
        
      
        
        
      });
    }
 
  }





















