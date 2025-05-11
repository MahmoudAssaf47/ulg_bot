const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");

module.exports = {
  name: "send_role_message",
  description: "إرسال رسالة لجميع الأعضاء في رتبة معينة",
  async execute(message) {
    try {
      // التحقق من صلاحيات المستخدم
      if (!message.member.permissions.has("ADMINISTRATOR")) {
        return message.reply("⚠️ تحتاج إلى صلاحية الأدمن لاستخدام هذا الأمر!").then(msg => setTimeout(() => msg.delete(), 5000));
      }

      const roles = message.guild.roles.cache
        .filter(role => role.id !== message.guild.id)
        .sort((a, b) => b.position - a.position);

      if (roles.size === 0) {
        return message.reply("❌ لا توجد رتب متاحة في السيرفر!").then(msg => setTimeout(() => msg.delete(), 5000));
      }

      const pageSize = 5;
      const totalPages = Math.ceil(roles.size / pageSize);
      let currentPage = 1;

      // إنشاء أزرار الرتب مع ترقيم الصفحات
      const generateRoleButtons = (page) => {
        const start = (page - 1) * pageSize;
        const end = Math.min(page * pageSize, roles.size);
        const pageRoles = Array.from(roles.values()).slice(start, end);

        const rows = [];
        let currentRow = new MessageActionRow();

        pageRoles.forEach((role, index) => {
          currentRow.addComponents(
            new MessageButton()
              .setCustomId(`dmrole_${role.id}`)
              .setLabel(role.name.length > 20 ? `${role.name.substring(0, 17)}...` : role.name)
              .setStyle("SECONDARY")
          );

          if ((index + 1) % 5 === 0 || index === pageRoles.length - 1) {
            rows.push(currentRow);
            currentRow = new MessageActionRow();
          }
        });

        if (totalPages > 1) {
          const navRow = new MessageActionRow().addComponents(
            new MessageButton()
              .setCustomId("prev_page")
              .setLabel("السابق")
              .setStyle("SECONDARY")
              .setDisabled(page === 1),
            new MessageButton()
              .setCustomId("page_info")
              .setLabel(`الصفحة ${page} من ${totalPages}`)
              .setStyle("SECONDARY")
              .setDisabled(true),
            new MessageButton()
              .setCustomId("next_page")
              .setLabel("التالي")
              .setStyle("SECONDARY")
              .setDisabled(page === totalPages)
          );
          rows.push(navRow);
        }

        return rows;
      };

      // إنشاء رسالة التحكم الرئيسية
      const mainEmbed = new MessageEmbed()
        .setTitle("📩 إرسال رسالة جماعية")
        .setColor("#5865F2")
        .setFooter({ text: "سيتم إلغاء العملية بعد 5 دقائق من عدم النشاط" });

      // المراحل المختلفة للعملية
      let currentStage = "select_role";
      let selectedRole = null;
      let userMessage = null;

      const updateMainMessage = async () => {
        switch (currentStage) {
          case "select_role":
            mainEmbed
              .setDescription("**الخطوة 1:** اختر الرتبة المستهدفة من القائمة أدناه")
              .setFields([]);
            break;
          
          case "enter_message":
            mainEmbed
              .setDescription(`**الخطوة 2:** الرجاء إرسال الرسالة التي تريد إرسالها لأعضاء رتبة ${selectedRole.name}`)
              .addField("ملاحظات:", "- يمكنك استخدام علامات التنسيق مثل **عريض** أو *مائل*\n- سيتم إرسال الرسالة كرسالة خاصة لكل عضو");
            break;
          
          case "confirm_send":
            // جلب العدد الفعلي للأعضاء بعد التحديث
            const membersCount = selectedRole.members.size;
            mainEmbed
              .setDescription(`**الخطوة 3:** تأكيد الإرسال لـ ${membersCount} عضو`)
              .addField("الرسالة:", userMessage)
              .addField("تفاصيل:", `- الرتبة: ${selectedRole.name}\n- عدد الأعضاء: ${membersCount}`);
            break;
          
          case "sending":
            mainEmbed
              .setDescription(`⏳ جاري إرسال الرسالة لـ ${selectedRole.members.size} عضو...`)
              .setFields([]);
            break;
          
          case "results":
            // سيتم ملؤها بعد الانتهاء من الإرسال
            break;
        }

        let components = [];
        if (currentStage === "select_role") {
          components = generateRoleButtons(currentPage);
        } else if (currentStage === "confirm_send") {
          components = [
            new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId("confirm_send")
                .setLabel("✅ تأكيد الإرسال")
                .setStyle("SUCCESS"),
              new MessageButton()
                .setCustomId("cancel_send")
                .setLabel("❌ إلغاء العملية")
                .setStyle("DANGER"),
              new MessageButton()
                .setCustomId("back")
                .setLabel("↩️ الرجوع")
                .setStyle("SECONDARY")
            )
          ];
        }

        return { embeds: [mainEmbed], components };
      };

      // إرسال الرسالة الرئيسية
      const mainMessage = await message.channel.send(await updateMainMessage());

      // متابع التفاعلات مع الأزرار
      const buttonCollector = mainMessage.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 300000
      });

      // متابع الرسائل النصية
      let messageCollector;

      buttonCollector.on("collect", async interaction => {
        try {
          await interaction.deferUpdate();

          if (interaction.customId === "prev_page" && currentPage > 1) {
            currentPage--;
            await mainMessage.edit(await updateMainMessage());
          } 
          else if (interaction.customId === "next_page" && currentPage < totalPages) {
            currentPage++;
            await mainMessage.edit(await updateMainMessage());
          }
          else if (interaction.customId.startsWith("dmrole_")) {
            const roleId = interaction.customId.split("_")[1];
            selectedRole = await message.guild.roles.fetch(roleId, { force: true });

            if (!selectedRole) {
              return interaction.followUp({
                content: "❌ هذه الرتبة لم تعد موجودة!",
                ephemeral: true
              });
            }

            // تحديث بيانات الأعضاء للرتبة
            await message.guild.members.fetch();
            
            console.log(`[DEBUG] عدد الأعضاء في رتبة ${selectedRole.name}: ${selectedRole.members.size}`);
            
            currentStage = "enter_message";
            await mainMessage.edit(await updateMainMessage());

            messageCollector = message.channel.createMessageCollector({
              filter: m => m.author.id === message.author.id && !m.content.startsWith("!"),
              max: 1,
              time: 120000
            });

            messageCollector.on("collect", async msg => {
              userMessage = msg.content;
              currentStage = "confirm_send";
              await mainMessage.edit(await updateMainMessage());
              try { await msg.delete(); } catch {}
            });

            messageCollector.on("end", async collected => {
              if (collected.size === 0 && currentStage === "enter_message") {
                currentStage = "select_role";
                mainMessage.edit(await updateMainMessage());
                interaction.followUp({
                  content: "⌛ انتهى الوقت المخصص لكتابة الرسالة!",
                  ephemeral: true
                });
              }
            });
          }
          else if (interaction.customId === "confirm_send") {
            currentStage = "sending";
            await mainMessage.edit(await updateMainMessage());

            let successCount = 0;
            let failedCount = 0;
            const failedMembers = [];

            // تأكد من وجود أحدث بيانات الأعضاء
            await message.guild.members.fetch();
            
            const members = selectedRole.members;
            const totalMembers = members.size;
            
            console.log(`[DEBUG] بدء الإرسال لـ ${totalMembers} عضو`);

            // إضافة تأخير بين كل إرسال لتجنب rate limits
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

            for (const member of members.values()) {
              try {
                if (member.user.bot) {
                  console.log(`[DEBUG] تخطي بوت: ${member.user.tag}`);
                  continue;
                }

                await member.send({
                  content: `🔔 رسالة من سيرفر ${message.guild.name}:\n\n${userMessage}`,
                  allowedMentions: { parse: [] }
                });
                successCount++;
                await delay(1000); // تأخير 1 ثانية بين كل إرسال
              } catch (err) {
                failedCount++;
                failedMembers.push(member.user.tag);
              }
            }

            currentStage = "results";
            mainEmbed
              .setTitle("✅ نتائج الإرسال")
              .setColor("#57F287")
              .setDescription("")
              .setFields(
                { name: "الرتبة المستهدفة", value: `<@&${selectedRole.id}>`, inline: true },
                { name: "إجمالي الأعضاء", value: totalMembers.toString(), inline: true },
                { name: "تم الإرسال بنجاح", value: successCount.toString(), inline: true },
                { name: "فشل في الإرسال", value: failedCount.toString(), inline: true }
              );

            if (failedCount > 0) {
              mainEmbed.addField(
                "ملاحظة:",
                failedMembers.length > 0 
                  ? "بعض الأعضاء لا يستقبلون رسائل خاصة (قد يكون لديهم إعدادات الخصوصية مغلقة)"
                  : "حدثت أخطاء أثناء الإرسال"
              );
              
              if (failedMembers.length > 0) {
                mainEmbed.addField(
                  "الأعضاء الذين فشل الإرسال لهم",
                  failedMembers.slice(0, 10).join(", ") + 
                  (failedMembers.length > 10 ? ` و${failedMembers.length - 10} أكثر...` : "")
                );
              }
            }

            await mainMessage.edit({
              embeds: [mainEmbed],
              components: []
            });
          }
          else if (interaction.customId === "cancel_send" || interaction.customId === "back") {
            if (messageCollector) messageCollector.stop();
            
            if (interaction.customId === "cancel_send") {
              mainEmbed
                .setTitle("❌ تم الإلغاء")
                .setDescription("تم إلغاء عملية إرسال الرسائل الجماعية")
                .setColor("#ED4245")
                .setFields([]);
              
              await mainMessage.edit({
                embeds: [mainEmbed],
                components: []
              });
            } else {
              currentStage = "select_role";
              await mainMessage.edit(await updateMainMessage());
            }
          }
        } catch (err) {
          console.error("Error handling interaction:", err);
          interaction.followUp({
            content: "❌ حدث خطأ أثناء معالجة طلبك!",
            ephemeral: true
          });
        }
      });

      buttonCollector.on("end", () => {
        if (messageCollector) messageCollector.stop();
        mainMessage.edit({ components: [] }).catch(() => {});
      });

    } catch (error) {
      console.error("Error in send_role_message command:", error);
      message.reply("❌ حدث خطأ غير متوقع أثناء تنفيذ الأمر!").then(msg => setTimeout(() => msg.delete(), 5000));
    }
  }
};