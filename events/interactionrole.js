const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const config = require('../config');

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isButton()) return;


    const roleId = config.roles[interaction.customId];
    if (!roleId) return;

    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) return;
    
    const member = interaction.member;

    if (member.roles.cache.has(role.id)) {
       await member.roles.remove(role);

      const removedEmbed = new MessageEmbed()
        .setColor("#ff4d4d") // لون أحمر لطيف
        .setDescription(`🗑️ **تمت إزالة الرتبة التالية من حسابك:** <@&${role.id}>`);

       interaction.reply({
        embeds: [removedEmbed],
        ephemeral: true,
      });

    } else {
       await member.roles.add(role);

      const addedEmbed = new MessageEmbed()
        .setColor("#4caf50") // لون أخضر رايق
        .setDescription(`🎉 **مبروك! حصلت على الرتبة التالية:** <@&${role.id}>`);

       interaction.reply({
        embeds: [addedEmbed],
        ephemeral: true,
      });
    }

    // ✅ بعد التفاعل حدث الزرار بعدد الأعضاء
    try {
const getRoleMemberCount = async (roleId) => {
  try {

      const fetchedMembers = await interaction.guild.members.fetch();
    const count = fetchedMembers.filter(member => member.roles.cache.has(roleId)).size;
   
    return count;
  } catch (error) {
    console.error(error);
    return 0;
  }
};

// تنفيذ جميع الدوال في وقت واحد باستخدام Promise.all
  const roleIds = [
    config.roles.md_role_shop,
    config.roles.md_role_family,
    config.roles.md_role_xp,
    config.roles.md_role_man,
    config.roles.md_role_woman
  ];

  // استخدام Promise.all لتنفيذ جميع الدوال بشكل متوازي
  const counts = await Promise.all(roleIds.map(roleId => getRoleMemberCount(roleId)));

  // تعيين النتائج
  const [shopCount, familyCount, xpCount, manCount, womanCount] = counts;

      const updatedButtons = new MessageActionRow().addComponents(
     
        new MessageButton()
          .setCustomId("md_role_shop")
          .setLabel(`🛒 المتجر (${shopCount})`)
          .setStyle("SECONDARY"),
     
       //   .setDisabled(true),
        new MessageButton()
          .setCustomId("md_role_xp")
          .setLabel(`📈 (${xpCount}) XP نظام الـ`)
          .setStyle("SECONDARY")
      );

      const updatedButtons2 = new MessageActionRow().addComponents(
       
      /*  new MessageButton()
          .setCustomId("md_role_man")
          .setLabel(`👨 رجل (${manCount})`)
          .setStyle("SECONDARY"),
        new MessageButton()
          .setCustomId("md_role_woman")
          .setLabel(`👩‍🦰 فتاة (${womanCount})`)
          .setStyle("SECONDARY"),
        */
      
      );
   const speedButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setLabel('الدعم الفني')
        .setStyle('LINK')
        .setURL('https://discord.com/channels/@me/1345894199282761750')
    ,
    
    );
      // هنا بنحدث نفس الرسالة لو محتاجة تتحدث
      if (interaction.message.editable) {
        
        await interaction.message.edit({ components: [updatedButtons, speedButtonRow] });
      }
    } catch (err) {
      console.error(err);
    }
  },
};
