const { MessageEmbed, WebhookClient, MessageAttachment } = require("discord.js");
const Gamedig = require('gamedig');
const { createCanvas } = require('canvas');
const fs = require('fs');

const WBID = "1212358424273358888";
const ServerInfo = ["51.83.173.177", "22003"];
var IntervalPlay = false;

const webhookClient = new WebhookClient({ url: "https://discord.com/api/webhooks/1354496976430829669/DSVZiti8o6rd1x_LWCb8pQKDDMgsfKqVoganhFqoIHHyRt8dfLqRdGd3lPxgecXhht3d" });

function secondsToDhms(seconds) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    var dDisplay = d >= 0 ? d + (d == 1 ? " يوم " : " أيام ") : "";
    var hDisplay = h >= 0 ? h + (h == 1 ? " ساعة " : " ساعات ") : "";
    var mDisplay = m >= 0 ? m + (m == 1 ? " دقيقة " : " دقائق ") : "";
    var sDisplay = s >= 0 ? s + (s == 1 ? " ثانية" : " ثواني ") : "";
    return sDisplay + " / " + mDisplay + " / " + hDisplay + " / " + dDisplay;
}

var upTime = 0;

function StartServerCollector() {
    setInterval(() => {
        if (IntervalPlay) {
            upTime = upTime + 1;
        } else {
            upTime = 0;
        }
    }, 1000);
}

const UpdateServerStats = async () => {
    var current = new Date();
    var playersNow = 0;
    let data = fs.readFileSync('Stats.json');
    let ArabScriptTopStats = JSON.parse(data);
    // قراءة حالة الميناء البحري
    let portStatusData = fs.readFileSync('port_status.json');
    let portStatus = JSON.parse(portStatusData);
    
    // قراءة حالة الجريمة
    let crimeStatusData = fs.readFileSync('crime_status.json');
    let crimeStatus = JSON.parse(crimeStatusData);

    Gamedig.query({
        type: 'mtasa',
        host: ServerInfo[0],
        port: ServerInfo[1]
    }).then(async (state) => {

        if (state.ping >= 1) {
            playersNow = state.players?.length || 0;

            const canvas = createCanvas(840, 36);
            const ctx = canvas.getContext('2d');
            const bar_width = 900;
            const serverMembers = playersNow;
            const maxMembers = state.maxplayers;

            let ServerStatsJson = { TopPlayers: serverMembers };
            let jsonData = JSON.stringify(ServerStatsJson, null, 2);

            if (ArabScriptTopStats.TopPlayers < serverMembers) {
                fs.writeFileSync('Stats.json', jsonData);
            }

            ctx.lineJoin = "miter";
            ctx.lineWidth = 30;
            ctx.strokeStyle = "grey";
            ctx.strokeRect(10, 10, bar_width, 0);
            ctx.strokeStyle = "#01A02C";
            ctx.strokeRect(10, 10, (bar_width * serverMembers / maxMembers), 0);

            fs.writeFileSync('./ArabScript.png', canvas.toBuffer('image/png'));
            IntervalPlay = true;

            const file = new MessageAttachment('./ArabScript.png');
            const ServerStats = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("> **🟢 أونلاين **")
                .addFields(
                    { name: '**⚡ أسم الخادم**', value: "**" + state.name + "**", inline: true },
                    { name: '**<a:750483154774655050:781324719193980938> المتصلين**', value: `**${playersNow}/${state.maxplayers}**`, inline: true },
                    { name: '**<a:649680101511790653:781324714668589086> سرعة الأتصال**', value: "**" + state.ping + "**", inline: true },
                    { name: '**⏱ مدة تشغيل الخادم**', value: "**" + secondsToDhms(upTime) + "**", inline: true },
                    { name: '**🛳 حالة الميناء البحري**', value: "**" + (portStatus[0].status === "open" ? "مفتوح 🟢" : "مغلق 🔴") + "**", inline: true },
                    { name: '**🚨 حالة الجريمة**', value: "**" + (crimeStatus[0].status === "high" ? "مرتفعة 🔴" : "منخفضة 🟢") + "**", inline: true },
                    { name: '**🔗 أيبي السيرفر**', value: "**" + state.connect + "\n`connect " + state.connect + "`\nmtasa://" + state.connect + "**", inline: false },
                    { name: '**📊 الإحصائية**', value: "** أعلي متصلين: " + ArabScriptTopStats.TopPlayers + "**", inline: false },
                )
               
                .setImage("attachment://ArabScript.png")
                .setFooter('Roleplay Stats [By ArabScript] - ' + current.toLocaleTimeString());

            const sent = await webhookClient.send({
                embeds: [ServerStats],
                files: [file]
            });

            if (sent) WBID = sent.id;

        } else {
            IntervalPlay = false;
            const ServerStats = new MessageEmbed()
                .setColor("RED")
                .setTitle("> **🔴 أوفلاين **")
                .setDescription('**سيرفر أوفلاين راجعين لكم بأقرب وقت**')
                .setFooter('Roleplay Stats [By ArabScript] - ' + current.toLocaleTimeString());

            await webhookClient.send({ embeds: [ServerStats] });
        }

    }).catch(async (e) => {
        console.log(e);
        IntervalPlay = false;
        const ServerStats = new MessageEmbed()
            .setColor("ORANGE")
            .setTitle("> **🟠  خطأ**")
            .setDescription('**هنالك مشكلة عند التأكد من حالة الـسيرفر - أنتظر قليلاً.**')
            .setFooter('Roleplay Stats [By ArabScript] - ' + current.toLocaleTimeString());

        await webhookClient.send({ embeds: [ServerStats] });
    });
}

IntervalPlay = true;
StartServerCollector();
console.log("System Ready.");



setInterval(() => {
    UpdateServerStats();
}, 120000);
