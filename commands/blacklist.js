const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const Blacklist = require('../models/Blacklist');

module.exports = {
  name: 'blackliasdasdasdst',
  description: 'إدارة قائمة البلاك ليست',
  async execute(message, args) {
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
    
    const subcommand = args[0];
const userId = args[1]?.replace(/\D/g, ''); // يزيل أي شيء غير الأرقام من المنشن أو ID
const user = message.client.users.cache.get(userId) || await message.client.users.fetch(userId).catch(() => null);

    const reason = args.slice(2).join(' ') || 'No reason provided.';

   if (!subcommand || !['add', 'remove', 'check', 'list'].includes(subcommand)) {
      return message.reply('❌ **الاستخدام الصحيح:**\n`!blacklist add @user [سبب]`\n`!blacklist remove @user`\n`!blacklist check @user`\n`!blacklist list`');
    }

  

    if (subcommand === 'add') {
        if (!user) {
      return message.reply('❌ يجب عليك تحديد مستخدم.');
    }
      const exists = await Blacklist.findOne({ userId: user.id });
      if (exists) {
        return message.reply(`❌ المستخدم <@${user.id}> محظور بالفعل.`);
      }

      await Blacklist.create({ userId: user.id, reason, addedBy: message.author.id });

      return message.channel.send(`✅ تم حظر <@${user.id}>.\n📝 **السبب:** ${reason}`);

    } else if (subcommand === 'remove') {
        if (!user) {
      return message.reply('❌ يجب عليك تحديد مستخدم.');
    }
      const removed = await Blacklist.findOneAndDelete({ userId: user.id });
      if (!removed) {
        return message.reply(`❌ المستخدم <@${user.id}> غير موجود في البلاك ليست.`);
      }

      return message.channel.send(`✅ تم إزالة <@${user.id}> من البلاك ليست.`);

    } else if (subcommand === 'check') {
        if (!user) {
      return message.reply('❌ يجب عليك تحديد مستخدم.');
    }
      const blacklisted = await Blacklist.findOne({ userId: user.id });
      if (!blacklisted) {
        return message.reply(`✅ المستخدم <@${user.id}> **غير محظور**.`);
      }

      const embed = new MessageEmbed()
        .setColor('#ff0000')
        .setTitle('🚫 المستخدم محظور')
        .setDescription(`👤 **المستخدم:** <@${user.id}>\n📝 **السبب:** ${blacklisted.reason}\n👮‍♂️ **تم الحظر بواسطة:** <@${blacklisted.addedBy}>`)
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }  else if (subcommand === 'list') {
      const blacklist = await Blacklist.find();
      if (!blacklist.length) return message.reply('✅ **لا يوجد مستخدمون في البلاك ليست.**');

      const itemsPerPage = 5;
      let currentPage = 0;
      const totalPages = Math.ceil(blacklist.length / itemsPerPage);

      function getPage(page) {
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        return blacklist.slice(start, end);
      }

      function generateEmbed(page) {
        const pageData = getPage(page);
        const embed = new MessageEmbed()
          .setColor('#ff0000')
          .setTitle(`🚫 قائمة البلاك ليست (${page + 1}/${totalPages})`)
          .setDescription(
            pageData.map((entry, index) =>
              `**${index + 1 + page * itemsPerPage}.** <@${entry.userId}>\n📝 **السبب:** ${entry.reason}\n👮‍♂️ **تم الحظر بواسطة:** <@${entry.addedBy}>`
            ).join('\n\n')
          )
          .setFooter(`صفحة ${page + 1} من ${totalPages}`)
          .setTimestamp();

        return embed;
      }

      const row = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId('prev')
            .setLabel('⬅️ السابق')
            .setStyle('PRIMARY')
            .setDisabled(currentPage === 0),
          new MessageButton()
            .setCustomId('next')
            .setLabel('➡️ التالي')
            .setStyle('PRIMARY')
            .setDisabled(currentPage === totalPages - 1)
        );

      const messageEmbed = await message.channel.send({ embeds: [generateEmbed(currentPage)], components: [row] });

      const collector = messageEmbed.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async (interaction) => {
        if (!interaction.isButton()) return;
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({ content: '❌ لا يمكنك استخدام هذه الأزرار.', ephemeral: true });
        }

        if (interaction.customId === 'prev' && currentPage > 0) {
          currentPage--;
        } else if (interaction.customId === 'next' && currentPage < totalPages - 1) {
          currentPage++;
        }

        await interaction.update({
          embeds: [generateEmbed(currentPage)],
          components: [
            new MessageActionRow()
              .addComponents(
                new MessageButton()
                  .setCustomId('prev')
                  .setLabel('⬅️ السابق')
                  .setStyle('PRIMARY')
                  .setDisabled(currentPage === 0),
                new MessageButton()
                  .setCustomId('next')
                  .setLabel('➡️ التالي')
                  .setStyle('PRIMARY')
                  .setDisabled(currentPage === totalPages - 1)
              )
          ]
        });
      });

      collector.on('end', () => {
        messageEmbed.edit({ components: [] });
      });
    }
  }
};
