// 📁 main.js
const {Client, Intents, Collection ,ModalBuilder, TextInputBuilder,MessageComponentInteraction , TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle ,MessageActionRow, MessageButton, Modal, MessageAttachment ,MessageSelectMenu, Permissions, MessageEmbed, TextInputComponent } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs'); 
const path = require('path');
const config = require('./config');

const uptime = require('./uptime');
const bot = require('./bot');
const BotSettings = require('./models/bot');
const server = require('./server');

 
const cron = require('node-cron');
const moment = require('moment-timezone');

const familyMessage = 'تم فتح التقديم إلى العائلة للساعة 5 عصرا.';
const allianceMessage = 'تم فتح تقديم تحالف للساعة 2 عصرا.';
const closedMessage = 'حالة التقديم معلقة.'; 

// حساب توقيت مصر باستخدام مكتبة moment-timezone
const egyptTimeZone = 'Africa/Cairo';

require('dotenv').config();
const ytdl = require("ytdl-core"); // تستخدم لتشغيل الصوت من الروابط المباشرة فقط
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_WEBHOOKS
  ],
  partials: ['MESSAGE', 'GUILD_CHANNEL', 'REACTION'] // تعديل partials لاستخدام GUILD_CHANNEL بدلاً من CHANNEL
});

setInterval(async () => {
    try {
        const start = Date.now();
        await mongoose.connection.db.admin().ping();
        client.mongoPing = Date.now() - start;
    } catch (e) {
        client.mongoPing = -1;
    }
}, 10000); // كل 10 ثواني يحدث البنح

 /*

// ألوان مختلفة للحالات
const STATUS_COLORS = {
    'مفتوح': '#00FF00',
    'مغلق': '#FF0000'
};
function getNextOpening(current) {
    const tz = 'Africa/Cairo';
    let nextSunday = moment(current).tz(tz).day(0); // الأحد
    let nextWednesday = moment(current).tz(tz).day(3); // الأربعاء
    
    // تعديل أوقات الفتح
    nextSunday.set({ hour: 14, minute: 0, second: 0, millisecond: 0 }); // 2 ظهرًا
    nextWednesday.set({ hour: 15, minute: 0, second: 0, millisecond: 0 }); // 3 عصرًا
    
    // إذا كان يوم الأحد قد مر، ننتقل إلى الأحد المقبل
    if (current.day() === 0 && current.isAfter(nextSunday)) {
        nextSunday.add(1, 'week');
    } else if (current.day() !== 0 && nextSunday.isBefore(current)) {
        nextSunday.add(1, 'week');  // إذا كان يوم الأحد في الأسبوع الحالي قد مر
    }
    
    // إذا كان يوم الأربعاء قد مر، ننتقل إلى الأربعاء المقبل
    if (current.day() === 3 && current.isAfter(nextWednesday)) {
        nextWednesday.add(1, 'week');
    } else if (current.day() !== 3 && nextWednesday.isBefore(current)) {
        nextWednesday.add(1, 'week');  // إذا كان يوم الأربعاء في الأسبوع الحالي قد مر
    }
    
    return moment.min(nextSunday, nextWednesday);
}

function getNextClosing(current) {
    const tz = 'Africa/Cairo';
    let nextSundayClose = moment(current).tz(tz).day(0); // الأحد
    let nextWednesdayClose = moment(current).tz(tz).day(3); // الأربعاء
    
    // تعديل أوقات الإغلاق
    nextSundayClose.set({ hour: 22, minute: 0, second: 0, millisecond: 0 }); // 10 مساءً
    nextWednesdayClose.set({ hour: 23, minute: 0, second: 0, millisecond: 0 }); // 11 مساءً
    
    // إذا كان يوم الأحد قد مر بالفعل، ننتقل إلى الأحد المقبل
    if (current.day() === 0 && current.isAfter(nextSundayClose)) {
        nextSundayClose.add(1, 'week');
    } else if (current.day() !== 0 && nextSundayClose.isBefore(current)) {
        nextSundayClose.add(1, 'week');  // إذا كان يوم الأحد في الأسبوع الحالي قد مر
    }
    
    // إذا كان يوم الأربعاء قد مر بالفعل، ننتقل إلى الأربعاء المقبل
    if (current.day() === 3 && current.isAfter(nextWednesdayClose)) {
        nextWednesdayClose.add(1, 'week');
    } else if (current.day() !== 3 && nextWednesdayClose.isBefore(current)) {
        nextWednesdayClose.add(1, 'week');  // إذا كان يوم الأربعاء في الأسبوع الحالي قد مر
    }
    
    return moment.min(nextSundayClose, nextWednesdayClose);
}

function checkStatus(current) {
    const tz = 'Africa/Cairo';
    current = moment(current).tz(tz);
    
    // تعديل أوقات الفتح والإغلاق
    const sundayOpening = moment(current).tz(tz).day(0).set({ hour: 14, minute: 0, second: 0 }); // 2 ظهرًا
    const sundayClosing = moment(current).tz(tz).day(0).set({ hour: 22, minute: 0, second: 0 }); // 10 مساءً
    const wednesdayOpening = moment(current).tz(tz).day(3).set({ hour: 15, minute: 0, second: 0 }); // 3 عصرًا
    const wednesdayClosing = moment(current).tz(tz).day(3).set({ hour: 23, minute: 0, second: 0 }); // 11 مساءً
    
    if ((current.day() === 0 && current.isBetween(sundayOpening, sundayClosing)) || 
        (current.day() === 3 && current.isBetween(wednesdayOpening, wednesdayClosing))) {
        return { 
            status: 'مفتوح ✅', 
            status2: 'مفتوح ✅', 
            nextChange: getNextClosing(current),
            color: STATUS_COLORS['مفتوح']
        };
    }
    
    return { 
        status: 'مغلق ❌', 
        status2: 'مغلق ❌', 
        nextChange: getNextOpening(current),
        color: STATUS_COLORS['مغلق']
    };
}

async function updateStatusMessage() {
    try {
   const channel = await client.channels.fetch(config.supch1);
        const message = await channel.messages.fetch(config.supch1msg1);
        const channel2 = await client.channels.fetch(config.supch2);
        const message2 = await channel2.messages.fetch(config.supch2msg2);
        
        const now = moment();
        const { status, status2, nextChange, color } = checkStatus(now);
        const embed = new MessageEmbed()
            .setTitle('📢 **حالة التحالف والتقديم** 📢')
            .setColor(color)
        
        .setDescription('📝 **الحالة الرسمية للتحالف ونظام التقديم**\n**إذا واجهت أي مشكلة، يرجى كتابة الأمر في خاص البوت:**\n# ```!request``` ')

            .addFields(
                { name: '🛡️ **حالة التحالف**', value: `> **${status2}**`, inline: true },
                { name: '📥 **حالة التقديم للعائلة**', value: `> **${status}**`, inline: true }
            );
        
        // إذا كانت الحالة مفتوحة، نعرض موعد الإغلاق القادم
        if (status === 'مفتوح ✅') {
            embed.addFields(
                { 
                    name: '⏰ موعد الإغلاق القادم', 
                    value: `> **\`${moment(nextChange).format('D/MM/YYYY')}\` \`${moment(nextChange).format('dddd')}\` \`${moment(nextChange).format('h:mm A')}\`**`, 
                    inline: false 
                }
            );

            // جعل روم مغلق مخفي وروم مفتوح ظاهر
            const visibleChannel = await client.channels.fetch(config.supch1);
            const hiddenChannel = await client.channels.fetch(config.supch2);
            
            await visibleChannel.permissionOverwrites.edit(visibleChannel.guild.roles.everyone, { VIEW_CHANNEL: true });  // إظهار الغرفة
            await hiddenChannel.permissionOverwrites.edit(hiddenChannel.guild.roles.everyone, { VIEW_CHANNEL: false });  // إخفاء الغرفة
        } else {
            // إذا كانت الحالة مغلقة، نعرض موعد الفتح القادم
            embed.addFields(
                { 
                    name: '⏳ موعد الفتح القادم', 
                    value: `> **\`${moment(nextChange).format('D/MM/YYYY')}\` \`${moment(nextChange).format('dddd')}\` \`${moment(nextChange).format('h:mm A')}\`**`, 
                    inline: false 
                }
            );

            // جعل روم مغلق ظاهر وروم مفتوح مخفي
            const visibleChannel = await client.channels.fetch(config.supch2);
            const hiddenChannel = await client.channels.fetch(config.supch1);
            
            await visibleChannel.permissionOverwrites.edit(visibleChannel.guild.roles.everyone, { VIEW_CHANNEL: true });  // إظهار الغرفة
            await hiddenChannel.permissionOverwrites.edit(hiddenChannel.guild.roles.everyone, { VIEW_CHANNEL: false });  // إخفاء الغرفة
        }

        // تعديل الرسالة بالإمبد الجديد
        await message.edit({
            content: null,
            embeds: [embed]
        });
      
        await message2.edit({
            content: null,
            embeds: [embed]
        });
      
      
               // إرسال منشور عند الفتح أو الإغلاق
        if (status === 'مفتوح ✅') {
            const statusMessage = await channel.send(`@everyone`);
            
            // حذف المنشور بعد 5 ثواني
            setTimeout(() => {
                statusMessage.delete();
            }, 5000);
        }
      
    } catch (error) {
        console.error('حدث خطأ أثناء تحديث الرسالة:', error);
    }
}
*/



// ألوان مختلفة للحالات
const STATUS_COLORS = {
    'مفتوح': '#00FF00',
    'مغلق': '#FF0000'
};

function getNextOpening(current) {
    const tz = 'Africa/Cairo';
    let nextOpening = moment(current).tz(tz);
    
    // إذا كان الوقت الحالي قبل الساعة 3 عصرًا، يمكننا فتح اليوم
    if (current.hour() < 15) {
        nextOpening.set({ hour: 15, minute: 0, second: 0, millisecond: 0 });
    } else {
        // وإلا ننتظر إلى يوم غدٍ الساعة 3 عصرًا
        nextOpening.add(1, 'day').set({ hour: 15, minute: 0, second: 0, millisecond: 0 });
    }
    
    return nextOpening;
}

function getNextClosing(current) {
    const tz = 'Africa/Cairo';
    let nextClosing = moment(current).tz(tz);
    
    // إذا كان الوقت الحالي قبل الساعة 11 مساءً، يتم الإغلاق اليوم الساعة 11
    if (current.hour() < 23) {
        nextClosing.set({ hour: 23, minute: 0, second: 0, millisecond: 0 });
    } else {
        // وإلا ننتظر إلى يوم غدٍ الساعة 11 مساءً
        nextClosing.add(1, 'day').set({ hour: 23, minute: 0, second: 0, millisecond: 0 });
    }
    
    return nextClosing;
}

function checkStatus(current) {
    const tz = 'Africa/Cairo';
    current = moment(current).tz(tz);
    
    const openingTime = moment(current).set({ hour: 15, minute: 0, second: 0 });
    const closingTime = moment(current).set({ hour: 23, minute: 0, second: 0 });
    
    if (current.isBetween(openingTime, closingTime)) {
        return { 
            status: 'مفتوح ✅', 
            status2: 'مفتوح ✅', 
            nextChange: getNextClosing(current),
            color: STATUS_COLORS['مفتوح']
        };
    }
    
    return { 
        status: 'مغلق ❌', 
        status2: 'مغلق ❌', 
        nextChange: getNextOpening(current),
        color: STATUS_COLORS['مغلق']
    };
}

// async function updateStatusMessage() {
//     try {
//         const channel = await client.channels.fetch(config.supch1);
//         const message = await channel.messages.fetch(config.supch1msg1);
//         const channel2 = await client.channels.fetch(config.supch2);
//         const message2 = await channel2.messages.fetch(config.supch2msg2);
        
//         const now = moment();
//         const { status, status2, nextChange, color } = checkStatus(now);
//       const embed = new MessageEmbed()
//     .setTitle('📢 **حالة التحالف والتقديم** 📢')
//     .setColor(color)
//   /*  .setDescription('📝 **الحالة الرسمية للتحالف ونظام التقديم**\n\n' +
//                    '**إذا واجهت أي مشكلة، يرجى كتابة الأمر في خاص البوت:**\n' +
//                    '> # ```!request```\n\n' +
//                    '**⚠️ ملاحظة هامة:**\n' +
//                    '> # عند اكتمال العدد المطلوب سيتم إغلاق التذكرة تلقائياً')*/
//           .setDescription(
//         '📝 **الحالة الرسمية للتحالف ونظام التقديم**\n'+                 //               '✧ **عدد المقاعد المتاحة**\n' +
//                //     '> # **`5 أشخاص فقط`**\n' +

//                     '**⚠️ ملاحظة هامة:**\n' +
//                    '> **`عند اكتمال العدد المطلوب سيتم إغلاق التذكرة تلقائياً`**'
//     )
//     .addFields(
//         { name: '🛡️ **حالة التحالف**', value: `> **${status2}**`, inline: true },
//         { name: '📥 **حالة التقديم**', value: `> **${status}**`, inline: true },
//     );
        
//         if (status === 'مفتوح ✅') {
//             embed.addFields(
//                 { 
//                     name: '⏰ موعد الإغلاق القادم', 
//                     value: `> **\`${moment(nextChange).format('D/MM/YYYY')}\` \`${moment(nextChange).format('dddd')}\` \`${moment(nextChange).format('h:mm A')}\`**`, 
//                     inline: true 
//                 }
//             );

//             const visibleChannel = await client.channels.fetch(config.supch1);
//             const hiddenChannel = await client.channels.fetch(config.supch2);
            
//             await visibleChannel.permissionOverwrites.edit(visibleChannel.guild.roles.everyone, { VIEW_CHANNEL: false }); //true
//             await hiddenChannel.permissionOverwrites.edit(hiddenChannel.guild.roles.everyone, { VIEW_CHANNEL: false });
//         } else {
//             embed.addFields(
//                 { 
//                     name: '⏳ موعد الفتح القادم', 
//                     value: `> **\`${moment(nextChange).format('D/MM/YYYY')}\` \`${moment(nextChange).format('dddd')}\` \`${moment(nextChange).format('h:mm A')}\`**`, 
//                     inline: false 
//                 }
//             );

//             const visibleChannel = await client.channels.fetch(config.supch1);
//             const hiddenChannel = await client.channels.fetch(config.supch2);
            
//             await visibleChannel.permissionOverwrites.edit(visibleChannel.guild.roles.everyone, { VIEW_CHANNEL: false });//true
//             await hiddenChannel.permissionOverwrites.edit(hiddenChannel.guild.roles.everyone, { VIEW_CHANNEL: false });
//         }

//         await message.edit({
//              content: `# >>> **\`لأي استفسار أو مشكلة، يُرجى التواصل مع الإدارة مباشرة\`**\n# **\`عن طريق إرسال رسالة إلى البوت، وسيتم الرد عليك في أقرب وقت ممكن\`**`,

//             embeds: [embed]
//         });
      
//         await message2.edit({
//       content: `# >>> **\`لأي استفسار أو مشكلة، يُرجى التواصل مع الإدارة مباشرة\`**\n# **\`عن طريق إرسال رسالة إلى البوت، وسيتم الرد عليك في أقرب وقت ممكن\`**`,
//           embeds: [embed]
//         });
      
//        /* if (status === 'مفتوح ✅') {
//             const statusMessage = await channel.send(`@everyone`);
//             setTimeout(() => {
//                 statusMessage.delete();
//             }, 5000);
//         }*/
      
//     } catch (error) {
//         console.error('حدث خطأ أثناء تحديث الرسالة:', error);
//     }
// }

client.once("ready", async () => {
  
  
const uptimeFilePath = path.join(__dirname, './uptime.json');

// قراءة وقت التشغيل من ملف JSON
function readUptime() {
  try {
    const data = fs.readFileSync(uptimeFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { uptime: 5 }; // البداية من 5 ثواني

   // return {  uptime: (8 * 24 * 3600) + (2 * 3600) }; // إذا لم يكن الملف موجود، البداية من 8 أيام بالثواني
  }
} 

// كتابة وقت التشغيل إلى ملف JSON
function writeUptime(uptime) {
  const data = JSON.stringify(uptime, null, 2);
  fs.writeFileSync(uptimeFilePath, data, 'utf8');
}
  
function formatTime(seconds) {
  // دالة تنسيق موحدة للوحدات الزمنية
  const formatUnit = (value, unit) => value > 0 ? `${value} ${unit}${value > 1 ? 's' : ''}` : '';

  // حساب الأيام، الساعات، الدقائق، والثواني
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  // تجميع الأجزاء الزمنية في مصفوفة
  const timeParts = [
    formatUnit(days, 'day'),
    formatUnit(hours, 'hour'),
    formatUnit(minutes, 'minute'),
    formatUnit(seconds, 'second')
  ].filter(part => part); // تصفية الأجزاء التي تحتوي على قيم

  // إذا كانت كل الأجزاء صفرية، إرجاع "0 seconds"
  return timeParts.length ? timeParts.join(', ') : '0 seconds';
}


    // إعداد الرسالة المعدلة
//     const updateMessage = async () => {
//       try {
             
  


//     const channel = await client.channels.fetch('1365975339301605388'); // استبدل بـ ID القناة
//     const messageId = '1365976156347826217'; // ID الرسالة التي تريد تعديلها

//           const message = await channel.messages.fetch(messageId);
// const ping = client.ws.ping;
// const uptime = readUptime();
// const formattedUptime = formatTime(uptime.uptime);
// const os = require('os');
// //const totalMemory = formatMemory(os.totalmem())
// const serverMemory = 62.7 * 1024 * 1024 * 1024;  // الذاكرة الكلية للبوت (بالبايت)

// const formatMemory = (bytes) => {
//   const GB = bytes / (1024 * 1024 * 1024);
//   return GB.toFixed(2);
// };

// let previousUsedMemory = 1.5; // مثال على الذاكرة المستخدمة في البداية

// const getSmartUsedMemory = () => {
//   const minChange = -.8;
//   const maxChange = .8;

//   const change = Math.random() * (maxChange - minChange) + minChange;

//   let newUsedMemory = previousUsedMemory + change;

//   newUsedMemory = Math.max(1.325, Math.min(7.38, newUsedMemory));  // نحدد الحد الأقصى والأدنى للذاكرة

//   newUsedMemory = Math.min(os.totalmem() / (1024 * 1024 * 1024), newUsedMemory);  // نتأكد من أن الذاكرة لا تتجاوز الحد الأقصى للبوت

//   previousUsedMemory = newUsedMemory;

//   return newUsedMemory;
// };

// const totalMemory = os.totalmem();
// const freeMemory = os.freemem();
// const usedMemory = totalMemory - freeMemory;
// const usedMemoryPercentage = (usedMemory / totalMemory) * 100;
// const freeMemoryPercentage = (freeMemory / totalMemory) * 100;
// const botMemoryPercentage = (usedMemory / serverMemory) * 100;
// const botMe = serverMemory - usedMemory;

// // حساب النسبة المئوية للبوت من إجمالي الذاكرة

// const embed = new MessageEmbed()
//   .addFields(
//     { name: '💾 Total Memory', value: `Bot: ${formatMemory(os.totalmem())} GB **\`${botMemoryPercentage.toFixed(2)}%\`** **From** Server: 62.79 GB Free ${formatMemory(botMe)} GB`, inline: false },
      
//     { name: '🟢 Free Memory', value: `${formatMemory(os.freemem())} GB  (${freeMemoryPercentage.toFixed(2)}%)`, inline: false },
//         { name: '🔴 Used Memory', value: `${formatMemory(usedMemory)} GB (${usedMemoryPercentage.toFixed(2)}%)`, inline: false },
    
//     { name: '🚀 CPU Load', value: `${os.loadavg()[0].toFixed(2)}%`, inline: false },
//     { name: '⏳ Uptime', value: formattedUptime, inline: false }
//   )

//         // تعديل الرسالة
//         await message.edit({ embeds: [embed] });
 
//       } catch (error) {
        
//       }
//     };

//     // تعديل الرسالة كل 10 ثوانٍ
//     setInterval(updateMessage, 5000); // 10000 ملي ثانية = 10 ثوانٍ
  
  // تحديث الحالة فور التشغيل
   // updateStatusMessage();
    
  //  // تحديث الحالة كل دقيقة
  //  setInterval(updateStatusMessage, 60000);
    
    console.log(`✅ ${client.user.tag} جاهز للبث!`);

    // تحديد القناة الصوتية المستهدفة
    const channel = client.channels.cache.get(config.voicetargetChannelId);
    if (!channel || channel.type !== "GUILD_VOICE") {
        return console.error("❌ قناة الصوت غير موجودة أو غير صحيحة!");
    }

    // التأكد من أنه لا يوجد بث مكرر
    if (client.voiceConnections && client.voiceConnections.has(channel.guild.id)) {
        console.log("❌ البوت بالفعل في القناة الصوتية.");
        return;
    }

    try {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        // إعدادات البث الصوتي
        const player = createAudioPlayer();
        const resource = createAudioResource("http://live.mp3quran.net:9984/"); // رابط البث

        player.play(resource);
        connection.subscribe(player);

        console.log(`📻 بدأ البث في ${channel.name}`);

        // التعامل مع حدث انتهاء البث
        player.on(AudioPlayerStatus.Idle, () => {
            console.log("✅ تم إنهاء البث.");
            connection.destroy(); // إنهاء الاتصال بعد انتهاء البث
        });

        // التعامل مع أخطاء البث
        player.on("error", (err) => {
            console.error("❌ خطأ أثناء البث:", err);
            connection.destroy(); // إنهاء الاتصال في حالة حدوث خطأ
        });

    } catch (err) {
        console.error("❌ خطأ عند الانضمام للقناة:", err);
    }
});





// مسار ملف قاعدة البيانات JSON
const DB_PATH = path.join(__dirname, 'muted_users.json');

// تهيئة قاعدة البيانات إذا لم تكن موجودة
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ mutedUsers: [] }), 'utf8');
}

// دالة لقراءة قاعدة البيانات
function readDatabase() {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
}

// دالة لكتابة قاعدة البيانات
function writeDatabase(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// دالة لإضافة مستخدم إلى القاعدة
function addMutedUser(userId) {
    const db = readDatabase();
    if (!db.mutedUsers.includes(userId)) {
        db.mutedUsers.push(userId);
        writeDatabase(db);
    }
}

// دالة لإزالة مستخدم من القاعدة
function removeMutedUser(userId) {
    const db = readDatabase();
    db.mutedUsers = db.mutedUsers.filter(id => id !== userId);
    writeDatabase(db);
}

// دالة للتحقق من وجود مستخدم في القاعدة
function isUserMuted(userId) {
    const db = readDatabase();
    return db.mutedUsers.includes(userId);
}

client.on("voiceStateUpdate", async (oldState, newState) => {
    const targetChannelId = config.voicetargetChannelId; // ⬅️ معرف القناة الصوتية المستهدفة

    // ========== 1- رجوع البوت للروم المحددة ==========
    if (oldState.member?.id === client.user.id && oldState.channelId && !newState.channelId) {
        const channel = client.channels.cache.get(targetChannelId);
        if (!channel || channel.type !== "GUILD_VOICE") return console.error("❌ قناة الصوت غير موجودة أو غير صحيحة!");

        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();
            const resource = createAudioResource("http://live.mp3quran.net:9984/");

            player.play(resource);
            connection.subscribe(player);

            console.log(`📻 بدأ البث في ${channel.name}`);

            player.on(AudioPlayerStatus.Idle, () => {
                console.log("✅ تم إنهاء البث.");
                connection.destroy();
            });

            player.on("error", (err) => {
                console.error("❌ خطأ أثناء البث:", err);
                connection.destroy();
            });

        } catch (err) {
            console.error("❌ خطأ عند الانضمام للقناة:", err);
        }
    }

    // ========== 2- رجوع البوت إلى الروم المحددة لو تم نقله ==========
    if (newState.member?.id === client.user.id && newState.channelId !== targetChannelId) {
        try {
            const channel = newState.guild.channels.cache.get(targetChannelId);
            if (channel && channel.type === "GUILD_VOICE") {
                await newState.setChannel(channel);
            }
        } catch (error) {
            console.error("❌ خطأ في إعادة البوت للقناة:", error);
        }
    }

    // ========== 3- تجاهل البوتات ==========
    if (newState.member?.user?.bot) return;

    // ========== 4- كتم أي شخص يدخل الروم المحددة ==========
    if (newState.channelId === targetChannelId && oldState.channelId !== targetChannelId) {
        try {
            await newState.member.voice.setMute(true, "Mute by bot (دخول الروم القران)");
            addMutedUser(newState.member.id); // إضافة المستخدم إلى قاعدة البيانات
        } catch (error) {
            console.error("❌ خطأ في كتم المستخدم:", error);
        }
    }

    // ========== 5- منع فك الميوت داخل الروم ==========
    if (newState.channelId === targetChannelId && !newState.serverMute) {
        try {
            await newState.member.voice.setMute(true, "إعادة الميوت تلقائيًا داخل القناة القران.");
          
            addMutedUser(newState.member.id); // التأكد من وجود المستخدم في القاعدة
        } catch (error) {
            console.error("❌ خطأ في إعادة كتم المستخدم:", error);
        }
    }
    // ========== 6- معالجة خروج المستخدم من الروم ==========
    if (oldState.channelId === targetChannelId) {
        // إذا خرج من الروم المحددة
        if (isUserMuted(oldState.member.id)) {
            // الحالة 1: انتقل إلى روم آخر
            if (newState.channelId && newState.channelId !== targetChannelId) {
                try {
                    await newState.member.voice.setMute(false, "فك الميوت لأنه خرج من الروم القران.");
                    removeMutedUser(oldState.member.id);
                } catch (error) {
                    if (error.code !== 40032) {
                        console.error("❌ خطأ في فك ميوت المستخدم:", error);
                    }
                }
            }
          
        }
    }

    // ========== 7- فك الميوت إذا دخل أي روم آخر وهو مسجل في القاعدة ==========
    if (newState.channelId && newState.channelId !== targetChannelId && isUserMuted(newState.member.id)) {
        try {
            await newState.member.voice.setMute(false, "فك الميوت تلقائيًا عند دخول أي روم آخر.");
            removeMutedUser(newState.member.id);
        } catch (error) {
            console.error("❌ خطأ في فك ميوت المستخدم عند دخول روم آخر:", error);
        }
    }

});


const allowedGuilds = config.allowedGuilds; // السيرفرات المسموح بها

// تحميل الأوامر تلقائيًا
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('name' in command && 'execute' in command) {
    client.commands.set(command.name, command);
  } else {
    console.log(`[تحذير] الأمر في ${filePath} يفتقد إلى خصائص "name" أو "execute" المطلوبة`);
  }
}

// اتصال قاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('تم الاتصال بـ MongoDB بنجاح'))
  .catch(err => console.error('خطأ في الاتصال بـ MongoDB:', err));

const defaultStatuses = [
  { name: "📊 تحليل التقارير", type: "PLAYING" },
  { name: "🛡️ مراجعة الترقيات", type: "WATCHING" },
  { name: "👂 يستمع للأعضاء", type: "LISTENING" },
  { name: "📩 إدارة التواصل", type: "COMPETING" },
  { name: "📜 تدقيق البيانات", type: "PLAYING" },
  { name: "⏳ متابعة المهام", type: "WATCHING" },
  { name: "🔢 فرز البيانات", type: "COMPETING" }
];

let i = 0;

async function updateStatus(client) {
  try {
    const botData = await BotSettings.findOne({ botId: client.user.id });

    if (!botData.statusEnabled) {
      client.user.setActivity(null); // إيقاف أي حالة حالية
      return; // إيقاف التحديث إذا كان النظام متوقفًا
    }

    let allStatuses = botData.statuses.length ? botData.statuses : defaultStatuses;

    if (botData.statusEnabled === true) {
      const status = allStatuses[i % allStatuses.length];
      await client.user.setActivity(status.name, { type: status.type });
      i++;
    } else {
      await client.user.setActivity(null); // إيقاف أي حالة حالية
    }
  } catch (err) {
    console.error("❌ خطأ أثناء تحديث الحالة:", err);
  }
}

const BotStatus = require('./models/restart'); // تأكد من مسار ملف قاعدة البيانات
async function setRestartingState(client, state) {
  await BotStatus.findOneAndUpdate({}, { isRestarting: state }, { upsert: true });
  client.isRestarting = state;
}
/*
// إعداد الأحداث
client.once("ready", async () => {
  const Application_user = require('./models/Application');

    //const result = await Application_user.updateMany(
  //          { lastResetDate: { $exists: false } }, // تحديث فقط من ليس لديهم الحقل
    //        { $set: { lastResetDate: null } } // إضافة الحقل بقيمة افتراضية
    //    );

  await setRestartingState(client, false); // عند انتهاء إعادة التشغيل

    await updateStatus(client);

  console.log(`✅ تم تسجيل الدخول كـ ${client.user.tag}`);
   // خروج البوت من جميع السيرفرات ما عدا السيرفر المسموح

    try {
        const guilds = await client.guilds.fetch(); // جلب جميع السيرفرات

        guilds.forEach(guild => {
            if (!allowedGuilds.includes(guild.id)) {
                console.log(`❌ Leaving guild: ${guild.name} (${guild.id})`);
                guild.leave().catch(err => console.error(`❌ Failed to leave ${guild.name}:`, err));
            } else {
                console.log(`✅ Staying in allowed guild: ${guild.name} (${guild.id})`);
            }
        });

    } catch (error) {
        console.error('❌ Error fetching guilds:', error);
    }
  setInterval(async () => {
    try {
        const Leave = require('./models/LeaveSystem');

        // جلب جميع الإجازات المنتهية بشكل صحيح
        const expiredLeaves = await Leave.find({ status: "مقبولة", endDate: { $lt: new Date() } }); 
        if (expiredLeaves.length === 0) return;

        const guild = client.guilds.cache.get(config.serverid); // ID السيرفر
        if (!guild) return console.log("❌ لم يتم العثور على السيرفر.");

        const channel = await guild.channels.fetch(config.botlogs).catch(() => null);

        for (const leave of expiredLeaves) {
            const member = await guild.members.fetch(leave.userId).catch(() => null);
            if (!member) continue;

            // جميع الرتب الحالية في السيرفر
            const serverRoles = new Set(guild.roles.cache.map(role => role.id));

            // فلترة الرتب الأصلية للتأكد من صلاحيتها
            const validRoles = leave.previousRoles.filter(role => serverRoles.has(role));

            // إزالة رتب الإجازة
            await member.roles.remove([config.vacation, config.familyrole]).catch(console.error);

            // إضافة الرتب الأصلية بعد التحقق
            if (validRoles.length > 0) {
                await member.roles.add(validRoles).catch(console.error);
            }

            // إرسال إشعار في القناة
            if (channel) {
                await channel.send(`✅ <@${member.id}> انتهت إجازتك، وتمت إعادة رتبك الأصلية.`); 
            }

            // إرسال إشعار خاص للعضو
            await member.send(`✅ انتهت إجازتك وتمت إعادة رتبك الأصلية.`).catch(() => null);

            // حذف السجل من قاعدة البيانات
            await leave.deleteOne();
        }
    } catch (error) {
        console.error("❌ حدث خطأ أثناء معالجة الإجازات:", error);
    }
}, 15000); // التحقق كل 15 ثانية

  
});*/


client.once("ready", async () => {
  const Application_user = require('./models/Application');

  await setRestartingState(client, false); // عند انتهاء إعادة التشغيل
  await updateStatus(client);

  console.log(`✅ تم تسجيل الدخول كـ ${client.user.tag}`);

  // خروج البوت من جميع السيرفرات ما عدا السيرفرات المسموح بها
  try {
    const guilds = await client.guilds.fetch(); // جلب جميع السيرفرات

    const leavePromises = guilds.map(guild => {
      if (!allowedGuilds.includes(guild.id)) {
        console.log(`❌ Leaving guild: ${guild.name} (${guild.id})`);
        return guild.leave().catch(err => console.error(`❌ Failed to leave ${guild.name}:`, err));
      } else {
        console.log(`✅ Staying in allowed guild: ${guild.name} (${guild.id})`);
      }
    });

    // تنفيذ جميع الوعود بشكل متوازي
    await Promise.all(leavePromises);

  } catch (error) {
    console.error('❌ Error fetching guilds:', error);
  }

  setInterval(async () => {
    try {
      const Leave = require('./models/LeaveSystem');
      
      // جلب جميع الإجازات المنتهية بشكل صحيح
      const expiredLeaves = await Leave.find({ status: "مقبولة", endDate: { $lt: new Date() } }); 
      if (expiredLeaves.length === 0) return;

      const guild = client.guilds.cache.get(config.serverid); // ID السيرفر
      if (!guild) return console.log("❌ لم يتم العثور على السيرفر.");

      const channel = await guild.channels.fetch(config.botlogs).catch(() => null);

      // جلب الأعضاء الذين لديهم إجازات منتهية
      const memberPromises = expiredLeaves.map(async (leave) => {
        const member = await guild.members.fetch(leave.userId).catch(() => null);
        if (!member) return;

        // جميع الرتب الحالية في السيرفر
        const serverRoles = new Set(guild.roles.cache.map(role => role.id));

        // فلترة الرتب الأصلية للتأكد من صلاحيتها
        const validRoles = leave.previousRoles.filter(role => serverRoles.has(role));

        // إزالة رتب الإجازة
        await member.roles.remove([config.vacation, config.familyrole]).catch(console.error);

        // إضافة الرتب الأصلية بعد التحقق
        if (validRoles.length > 0) {
          await member.roles.add(validRoles).catch(console.error);
        }

        // إرسال إشعار في القناة
        if (channel) {
          await channel.send(`✅ <@${member.id}> انتهت إجازتك، وتمت إعادة رتبك الأصلية.`); 
        }

        // إرسال إشعار خاص للعضو
        await member.send(`✅ انتهت إجازتك وتمت إعادة رتبك الأصلية.`).catch(() => null);

        // حذف السجل من قاعدة البيانات
        await leave.deleteOne();
      });

      // تنفيذ جميع الوعود بشكل متوازي
      await Promise.all(memberPromises);

    } catch (error) {
      console.error("❌ حدث خطأ أثناء معالجة الإجازات:", error);
    }
  }, 15000); // التحقق كل 15 ثانية
});



client.on('guildCreate', guild => {
    // التحقق سريعًا إذا كان السيرفر مسموحًا
    if (!allowedGuilds.includes(guild.id)) {
        console.log(`❌ Left new guild: ${guild.name} (${guild.id})`);
        // الخروج من السيرفر بأسرع شكل ممكن
        guild.leave().catch(err => console.error(`❌ Failed to leave ${guild.name}:`, err));
    } else {
        console.log(`✅ Joined allowed guild: ${guild.name} (${guild.id})`);
    }
});

const interactionCreate = require('./events/interactionCreate');
const interactionReport = require('./events/interactionReport');
const interactionpy = require('./events/interactionpy');
const interactionleave = require('./events/interactionleave');
const interactionshop = require('./events/interactionshop');
const interactionmod = require('./events/interactionmod');
const interactionrole = require('./events/interactionrole');
const interactionticket = require('./events/interactionticket');

client.on('interactionCreate', async (interaction) => {
  try {
    // استخدام Promise.all لتشغيل جميع الأحداث بشكل متوازٍ
    await Promise.all([
      interactionCreate.execute(interaction, client),
      interactionReport.execute(interaction, client),
      interactionpy.execute(interaction, client),
      interactionmod.execute(interaction, client),
      interactionleave.execute(interaction, client),
      interactionshop.execute(interaction, client),
      interactionrole.execute(interaction, client),
            interactionticket.execute(interaction, client)

    ]);
  } catch (error) {
    console.error('Error in interactionCreate event:', error);
  }
});


/*

client.once('ready', async () => {
    console.log('Bot is online!');

    const guild = await client.guilds.fetch('1169464655727579207'); // ID السيرفر

    if (guild) {
        // تغيير أسماء قنوات التحالف
        await guild.channels.fetch('1357245036433117184').then(channel => channel.setName('🌟〢فويس-التحالف'));
        await guild.channels.fetch('1357245063738167298').then(channel => channel.setName('🌟〢شات-التحالف'));
        await guild.channels.fetch('1357249064609255555').then(channel => channel.setName('🌟〢تنويه-التحالف'));
        
        // تغيير أسماء قنوات المزرعة
        await guild.channels.fetch('1357189316580737118').then(channel => channel.setName('🌳〢تنويه-المزرعة'));
        await guild.channels.fetch('1357189285094228028').then(channel => channel.setName('🌳〢فويس-المزرعة'));
        await guild.channels.fetch('1357189318002610277').then(channel => channel.setName('🌳〢تقارير-المزرعة'));
        await guild.channels.fetch('1357189319651233863').then(channel => channel.setName('🌳〢شات-المزرعة'));
 
        // تغيير أسماء قنوات الاجرام
        await guild.channels.fetch('1357189320716455937').then(channel => channel.setName('💀〢تنويه-الاجرام'));
        await guild.channels.fetch('1357189322427600906').then(channel => channel.setName('💀〢تقارير-الاجرام'));
        await guild.channels.fetch('1357189323799400589').then(channel => channel.setName('💀〢شات-الاجرام'));
        await guild.channels.fetch('1357189324931600446').then(channel => channel.setName('💀〢فويس-الاجرام'));

        // تغيير أسماء قنوات سجلات البوت
        await guild.channels.fetch('1357240728463347814').then(channel => channel.setName('📝〢تصحيح-تقارير'));
        await guild.channels.fetch('1357240809090711582').then(channel => channel.setName('📝〢تصحيح-دفع'));
        await guild.channels.fetch('1357240866099695718').then(channel => channel.setName('📝〢مراجعة-اجازات'));
        await guild.channels.fetch('1357238314742317157').then(channel => channel.setName('📝〢طلبات-بائعين'));
        await guild.channels.fetch('1357256752818819193').then(channel => channel.setName('📝〢مراجعة-طلبات'));
        await guild.channels.fetch('1357233499618410506').then(channel => channel.setName('📝〢سجل-البوت'));
        await guild.channels.fetch('1357238626135707843').then(channel => channel.setName('🖼〢سجل-الصور'));
        await guild.channels.fetch('1357242107198443602').then(channel => channel.setName('✅〢سجل-التفعيل'));

        // تغيير أسماء قنوات إدارة التحالف
        await guild.channels.fetch('1357250176665911306').then(channel => channel.setName('🔧〢omda-إدارة'));
        await guild.channels.fetch('1357251068043591784').then(channel => channel.setName('🔧〢escobar-إدارة'));
        await guild.channels.fetch('1357252595894194267').then(channel => channel.setName('🔧〢shadow-إدارة'));

        // تغيير أسماء قنوات التيكتات
        await guild.channels.fetch('1357189335438589962').then(channel => channel.setName('📨〢تيكت-لوج'));

        // تغيير أسماء قنوات العائلة
        await guild.channels.fetch('1357189326869626911').then(channel => channel.setName('🔰〢تنويه-العائلة'));
        await guild.channels.fetch('1357189328647884841').then(channel => channel.setName('🔰〢دردشة-العائلة'));
        await guild.channels.fetch('1357189332607438870').then(channel => channel.setName('🔰〢لوحة-التحكم'));
        await guild.channels.fetch('1357189334087893072').then(channel => channel.setName('🔰〢إدارة-عليا'));

        // تغيير أسماء قنوات التذاكر
        await guild.channels.fetch('1357235861238059088').then(channel => channel.setName('📩〢الدعم-الفني'));
        await guild.channels.fetch('1357189304727769159').then(channel => channel.setName('📩〢التذاكر'));
        await guild.channels.fetch('1357231222157479946').then(channel => channel.setName('📩〢التذاكر'));

        // تغيير أسماء قنوات المقابلة
        await guild.channels.fetch('1357189286633537677').then(channel => channel.setName('✅〢تفعيل-العائلة'));
        await guild.channels.fetch('1357189277833756744').then(channel => channel.setName('💼〢ناجح-المقابلة'));
        await guild.channels.fetch('1357189279444635831').then(channel => channel.setName('💼〢المسؤولين'));
        await guild.channels.fetch('1357190437458149516').then(channel => channel.setName('💼〢شرح-المقابلة'));
        await guild.channels.fetch('1357189281348583546').then(channel => channel.setName('💼〢انتظار-التقديم'));

        // تغيير أسماء قنوات راديو العائلة
        await guild.channels.fetch('1357189289535995955').then(channel => channel.setName('🔊〢راديو-العائلة-1'));
        await guild.channels.fetch('1357189291981410367').then(channel => channel.setName('🔊〢راديو-العائلة-2'));
        await guild.channels.fetch('1357189294162317315').then(channel => channel.setName('🔊〢راديو-المسؤولين'));
      
      // تغيير أسماء قنوات المتجر والإدارات الأخرى
await guild.channels.fetch('1357236776527200327').then(channel => channel.setName('🛒〢المتجر'));
await guild.channels.fetch('1357236820928233482').then(channel => channel.setName('📝〢تقديم-بائع'));
await guild.channels.fetch('1357237086100652063').then(channel => channel.setName('🔧〢مركز-الإدارة'));
await guild.channels.fetch('1357237400333717635').then(channel => channel.setName('💬〢شات-البائعين'));
await guild.channels.fetch('1357236931918041128').then(channel => channel.setName('🔧〢لوحة-التحكم'));
await guild.channels.fetch('1357237345325420667').then(channel => channel.setName('❗〢البلاغات'));
await guild.channels.fetch('1357237317668179978').then(channel => channel.setName('📦〢المنتجات'));
await guild.channels.fetch('1357235709228093643').then(channel => channel.setName('🔰〢دخول-العائلات'));
await guild.channels.fetch('1357235569175957555').then(channel => channel.setName('📄〢طلب-إجازة'));
await guild.channels.fetch('1357263616973213806').then(channel => channel.setName('💬〢شات-العائلة'));
await guild.channels.fetch('1357235446932836463').then(channel => channel.setName('📊〢إرسال-تقارير'));
await guild.channels.fetch('1357246678964633731').then(channel => channel.setName('📊〢تقارير-يومية'));
    }

    console.log('Channel names have been updated!');
});

// دالة لإحضار جميع القنوات داخل الفئات
async function getChannelsInCategories(guild) {
  const categoriesData = [];

  // تصفية الفئات
  const categories = guild.channels.cache.filter(channel => channel.type === 'GUILD_CATEGORY');

  // لكل فئة، اجلب القنوات التي بداخلها
  for (const category of categories.values()) {
    const categoryName = category.name;
    const categoryNameid = category.id;

    // تصفية القنوات التابعة لهذه الفئة، وترتيبها حسب ترتيب السيرفر نفسه
    const channelsInCategory = guild.channels.cache
      .filter(channel => channel.parentId === category.id)  // تصفية القنوات التي تتبع نفس الفئة
      .sort((a, b) => a.position - b.position)  // ترتيب القنوات حسب الترتيب داخل السيرفر
      .map(channel => `${channel.name} (ID: ${channel.id})`);  // عرض اسم القناة مع الـ ID

    // إضافة معلومات الفئة والقنوات إليها
    categoriesData.push({
      category: categoryName,
      categoryid: categoryNameid,
      channels: channelsInCategory.length > 0 ? channelsInCategory.join('\n') : 'لا توجد قنوات داخل هذه الفئة'
    });
  }

  return categoriesData;
}

// دالة لتقسيم الرسالة إلى أجزاء
function splitMessage(message, maxLength = 2000) {
  const parts = [];
  while (message.length > maxLength) {
    let part = message.substring(0, maxLength);
    let lastSpaceIndex = part.lastIndexOf(' ');
    if (lastSpaceIndex !== -1) {
      part = part.substring(0, lastSpaceIndex); // قطع الرسالة في آخر مسافة
    }
    parts.push(part);
    message = message.substring(part.length); // إزالة الجزء المرسل
  }
  parts.push(message); // إضافة الجزء المتبقي
  return parts;
}

// حدث عندما يتم إرسال رسالة
client.on('messageCreate', async (message) => {
  if (message.content === '!getCatalog') {
    try {
      const categoriesData = await getChannelsInCategories(message.guild);

      if (categoriesData.length === 0) {
        return message.channel.send('لا توجد فئات أو قنوات داخلها.');
      }

      // بناء الرسالة بشكل منسق لعرضها
      const catalogMessage = categoriesData.map(data => {
        return `**${data.category} (ID: ${data.categoryid})**:\n${data.channels}`;
      }).join('\n\n');

      // تقسيم الرسالة إلى أجزاء إذا كانت طويلة جدًا
      const messageParts = splitMessage(catalogMessage);

      // إرسال كل جزء من الرسالة بشكل منفصل
      for (const part of messageParts) {
        await message.channel.send(part);
      }

    } catch (error) {
      console.error('Error getting catalog:', error);
      message.channel.send('حدث خطأ أثناء الحصول على الكتالوج.');
    }
  }
});
*/
const voiceRole = require('./events/voiceStateUpdate');





client.on('voiceStateUpdate', async (oldState, newState) => {
    await voiceRole.execute(oldState, newState);
});
client.on('messageCreate', async message => {
    if (message.author.bot) return; // تجاهل رسائل البوت

    const allowedChannelIds = [config.sendReports, config.dashboard, config.highManagement, config.adminDashboard, "1367194573960642711"]; // قائمة الرومات

    if (!allowedChannelIds.includes(message.channel.id)) return; // التحقق من الروم

    // تحديد مدة الحذف (10 ثوانٍ للصور، 5 ثوانٍ للنصوص)
  const deleteDelay = message.attachments.size > 0 ? 5000 : 500;

    setTimeout(async () => {
        try {
            const fetchedMessage = await message.channel.messages.fetch(message.id);
            if (fetchedMessage) {
                await fetchedMessage.delete();
            }
        } catch (error) {
        }
    }, deleteDelay);
});


client.on('messageCreate', async message => {
  if (!message.content.startsWith(config.PREFIX) || message.author.bot) return;

  const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) 
    || client.commands.find(cmd => cmd.aliases?.includes(commandName));

  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error('خطأ في تنفيذ الأمر:', error);
    message.reply('حدث خطأ أثناء تنفيذ هذا الأمر!');
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