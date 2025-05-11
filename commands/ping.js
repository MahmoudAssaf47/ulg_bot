// 📁 commands/ping.js
const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const config = require('../config');
const path = require('path');
const fs = require('fs');

const uptimeFilePath = path.join(__dirname, '../uptime.json');

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

// تحديث وقت التشغيل
function updateUptime() {
  const uptime = readUptime();


  // زيادة الوقت الوهمي بالثواني
  uptime.uptime += 1;

  // حفظ التحديثات
  writeUptime(uptime);
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


// تحديث وقت التشغيل كل ثانية
setInterval(updateUptime, 1000);




function generateRandomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}

    
    
    
const os = require('os');
const si = require('systeminformation');

// دالة لإرسال حالة السيرفر

module.exports = {
  name: 'ping',
  async execute(message, args, client) { // تعديل هنا لاستقبال args
    

//         const startTime = Date.now();  // Capture start time

//         // Send a message and measure response time
//         const sentMessage = await message.channel.send('Pinging...');

//         const latency = Date.now() - startTime;  // Calculate latency in milliseconds
//     const wsLatency = client.ws.ping;  // Now client is defined

//     const uptime = readUptime();
//     const formattedUptime = formatTime(uptime.uptime);


//         // Create and send the embed message
//         const embed = new MessageEmbed()
//             .setColor('#00FF00')
//             .setTitle('Pong! 🏓')
//             .setDescription(`**Latency**: ${latency} ms\n**WebSocket Ping**: ${wsLatency} ms\n**Uptime**: ${formattedUptime}`);

//         sentMessage.edit({ content: null, embeds: [embed] });
    async function sendServerStatus(channel) {

        // const formattedUptime = formatTime(uptime.uptime);

  try {
      const ping = client.ws.ping;
           const uptime = readUptime();

    // const hours = Math.floor(uptime / 3600);
    // const minutes = Math.floor((uptime % 3600) / 60);
    // const seconds = Math.floor(uptime % 60);
    const formattedUptime = formatTime(uptime.uptime)

//     // جلب بيانات التخزين
//     const disks = await si.fsSize();
//     let totalDiskSize = disks.reduce((acc, disk) => acc + disk.size, 0);
//     let usedDiskSize = disks.reduce((acc, disk) => acc + disk.used, 0);
//     let diskInfo3 = `Used: \`${formatMemory(usedDiskSize)}\` GB / Total: \`${formatMemory(totalDiskSize)}\` GB`;
//     let diskInfo = disks.map(disk => ` \`${formatMemory(disk.used)}\` GB / \`${formatMemory(disk.size)}\` GB`).join("\n");

//     // جلب بيانات المعالج
//     const cpu = await si.cpu();

    
    
    
//const totalMemory = formatMemory(os.totalmem())
const serverMemory = 62.7 * 1024 * 1024 * 1024;  // الذاكرة الكلية للبوت (بالبايت)

const formatMemory = (bytes) => {
  const GB = bytes / (1024 * 1024 * 1024);
  return GB.toFixed(2);
};

let previousUsedMemory = 1.5; // مثال على الذاكرة المستخدمة في البداية

const getSmartUsedMemory = () => {
  const minChange = -.8;
  const maxChange = .8;

  const change = Math.random() * (maxChange - minChange) + minChange;

  let newUsedMemory = previousUsedMemory + change;

  newUsedMemory = Math.max(1.325, Math.min(7.38, newUsedMemory));  // نحدد الحد الأقصى والأدنى للذاكرة

  newUsedMemory = Math.min(os.totalmem() / (1024 * 1024 * 1024), newUsedMemory);  // نتأكد من أن الذاكرة لا تتجاوز الحد الأقصى للبوت

  previousUsedMemory = newUsedMemory;

  return newUsedMemory;
};

const totalMemory = os.totalmem();
const freeMemory = os.freemem();
const usedMemory = totalMemory - freeMemory;
const usedMemoryPercentage = (usedMemory / totalMemory) * 100;
const freeMemoryPercentage = (freeMemory / totalMemory) * 100;
const botMemoryPercentage = (usedMemory / serverMemory) * 100;
const botMe = serverMemory - usedMemory;

// حساب النسبة المئوية للبوت من إجمالي الذاكرة

const embed = new MessageEmbed()
  .addFields(
        { name: '📶 Ping', value: `${ping} ms`, inline: false },
    { name: '💾 Total Memory', value: `Bot: ${formatMemory(os.totalmem())} GB **\`${botMemoryPercentage.toFixed(2)}%\`**\n**From** Server: 62.79 GB Free ${formatMemory(botMe)} GB`, inline: false },
      
    { name: '🟢 Free Memory', value: `${formatMemory(os.freemem())} GB  (${freeMemoryPercentage.toFixed(2)}%)`, inline: false },
        { name: '🔴 Used Memory', value: `${formatMemory(usedMemory)} GB (${usedMemoryPercentage.toFixed(2)}%)`, inline: false },
    
    { name: '🚀 CPU Load', value: `${os.loadavg()[0].toFixed(2)}%`, inline: false },
    { name: '⏳ Uptime', value: formattedUptime, inline: false }
  )
    

channel.send({ embeds: [embed] });

  } catch (error) {
    console.error('❌ خطأ في إرسال حالة السيرفر:', error);
  }
}
// دالة لتحويل الذاكرة من بايت إلى جيجابايت
function formatMemory(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}



    sendServerStatus(message.channel);

    
  }
};