// 📁 events/interactionCreate.js
const {ModalBuilder, TextInputBuilder,MessageComponentInteraction , TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle ,MessageActionRow, MessageButton, Modal, MessageAttachment ,MessageSelectMenu, Permissions, MessageEmbed, TextInputComponent } = require('discord.js');
const config = require('../config');
const { createTranscript } = require('discord-html-transcripts');
const Blacklist = require('../models/Blacklist');
  const Application = require('../models/Application'); // استيراد قاعدة البيانات
const BotSettings = require('../models/bot');
const cooldowns = new Map();
const Application_user = require('../models/Application');
const fetch = require('node-fetch'); // استدعاء المكتبة
const Leave  = require('../models/LeaveSystem');
const Request = require('../models/Mod'); // استيراد نموذج الطلبات
  const PaymentSystem = require('../models/PaymentSystem'); // استدعاء الموديل
const UserNotes = require('../models/UserNotes'); // تأكد من مسار ملف قاعدة البيانات
const Family = require('../models/Family'); // تأكد من مسار ملف قاعدة البيانات
const BotStatus  = require('../models/restart'); // 
const Seller  = require('../models/Sales'); // تأكد من مسار ملف قاعدة البيانات
const Store = require("../models/Store"); // استيراد المودل
const productData = {};
let productConfirmEmbed; // تعريف متغير التأكيد خارجيًا

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

async function handleModalSubmit(interaction, client) {
  
  
   if (interaction.customId.startsWith('contact_reporter_')) {
       
            await interaction.deferReply({ ephemeral: true });

    const rolesToRemove = [config.rolesellerManager]; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000']; 

    if (
        !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
        !allowedUserIds.includes(interaction.user.id)
    ) {
        return interaction.editReply({
            content: '❌ ليس لديك الصلاحية لاستخدام هذا الأمر.',
            ephemeral: true
        });
    }
  
            const selectedMemberId = interaction.customId.replace('contact_reporter_', '');
            const selectedMember = await interaction.guild.members.fetch(selectedMemberId).catch(() => null);

            if (!selectedMember) {
                return interaction.editReply({ content: '❌ العضو غير موجود.' });
            }

            const messageContent = interaction.fields.getTextInputValue('contact_message');

            try {
                await selectedMember.send(`📩 **رسالة جديدة من ${interaction.user.tag}:**\n\`\`\`${messageContent}\`\`\``);
                await interaction.editReply({ content: '✅ تم إرسال الرسالة بنجاح!' });

                // إرسال اللوج
            } catch (error) {
                await interaction.editReply({ content: '❌ لا يمكن إرسال رسالة لهذا العضو، ربما لديه الرسائل الخاصة معطلة.' });

                // إرسال اللوج في حالة الخطأ
            }
        }
  
  if (interaction.customId.startsWith("report_modal_")) {
        const { MessageEmbed } = require('discord.js');

           const customIdParts = interaction.customId.split("_");
    const sellerId = customIdParts[2];
    const productMessageId = customIdParts[3];
    

    // التحقق من وجود المنتج
    const productged = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": productMessageId,
        "products.sellerId": sellerId
    });

    if (!productged) {
 interaction.reply({ content: "❌ ** لا يتوفر بيانات لهذا المنتج.**", ephemeral: true });
          return interaction.message.delete();
    }

    // التحقق من البائع
    const seller = await Seller.findOne({ userId: sellerId });
    if (!seller) {
      return interaction.reply({
        content: "⚠️ **هذا البائع غير مسجل كبائع في النظام!**",
        ephemeral: true
      });
    }
            const reportContent = interaction.fields.getTextInputValue('report_text');

            // إرسال تأكيد للمستخدم قبل إرسال البلاغ
            const confirmEmbed = new MessageEmbed()
                .setColor("RED")
                .setTitle("🚨 تأكيد البلاغ")
                .setDescription(`هل أنت متأكد أنك تريد إرسال البلاغ التالي ضد البائع؟\n**البلاغ:**\`\`\`${reportContent}\`\`\``)
                .addFields(
        { name: "📛 البائع:", value: `<@${sellerId}>`, inline: true },
    )

            const confirmationRow = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId("confirm_report")
                    .setLabel("✅ تأكيد")
                    .setStyle("SUCCESS"),
                new MessageButton()
                    .setCustomId("cancel_report")
                    .setLabel("❌ إلغاء")
                    .setStyle("DANGER")
            );

            await interaction.reply({
                content: "يرجى تأكيد البلاغ أو إلغاؤه.",
                embeds: [confirmEmbed],
                components: [confirmationRow],
                ephemeral: true
            });

            // التعامل مع تأكيد البلاغ
            const confirmFilter = (button) => button.user.id === interaction.user.id;
            const confirmCollector = interaction.channel.createMessageComponentCollector({ filter: confirmFilter, time: 30000 });

            confirmCollector.on("collect", async (button) => {
                if (button.customId === "confirm_report") {
        await button.deferUpdate(); // تأكيد أن التحديث يتم عبر الزر
                  
                    // إرسال البلاغ إلى القناة
                    const reportChannel = await interaction.guild.channels.fetch(config.reportChannel);
      
const reportEmbed = new MessageEmbed()
    .setColor("#FF5733") // اللون الأحمر الداكن
    .setTitle("🚨 بلاغ ضد بائع")
    .setDescription(`\`\`\`${reportContent}\`\`\``)
    .addFields(
        { name: "📛 البائع:", value: `<@${sellerId}>`, inline: false },
        { name: "👋 بواسطة:", value: `<@${interaction.user.id}>`, inline: false },
        { name: "🕒 الوقت:", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    );

const contactButton = new MessageActionRow().addComponents(
    new MessageButton()
        .setLabel("📩 تواصل مع المشتكي")
        .setStyle("PRIMARY") // اللون الأزرق للزر
        .setCustomId(`contact_reporter_${interaction.user.id}`)
);

await reportChannel.send({ 
    content: `<@${sellerId}> | <@&${config.rolesellerManager}>`, 
    embeds: [reportEmbed], 
    components: [contactButton] 
});

 await Seller.findOneAndUpdate(
  { userId: sellerId }, // تحديد المستخدم
  {
    $inc: { 
      reportsCount: 1 // زيادة عدد التقارير بمقدار واحد
    }
  
  },
  { new: true } // إرجاع الوثيقة بعد التحديث
);

                     await interaction.editReply({ content: "✅ تم إرسال البلاغ بنجاح.", embeds: [], components: [] });

                } else if (button.customId === "cancel_report") {
                      await interaction.editReply({ content: "❌ تم إلغاء البلاغ.", embeds: [], components: [] });

                
                }
            });
        }
  
  
  
  
  
  
  if (interaction.customId.startsWith("buyquantitymodal_")) {
   const customIdParts = interaction.customId.split("_");
    const sellerId = customIdParts[1];
    const msgid = customIdParts[2];
    const quantityToBuy = parseInt(interaction.fields.getTextInputValue("quantity_to_buy"));
    const productss = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": msgid,
        "products.sellerId": sellerId
    });

    if (!productss) {
        return await interaction.reply({ content: "❌ **لا توجد بيانات لهذا المنتج.**", ephemeral: true });
    }

    const product = productss.products.find(p => p.messageId === msgid);

   if (isNaN(quantityToBuy) || quantityToBuy <= 0) {
    return await interaction.reply({ content: "❌ **الكمية المطلوبة غير صالحة.**", ephemeral: true });
}

// حساب النسبة بناءً على الكمية المتاحة
let maxQuantity = product.stock;  // الكمية المتاحة
let minQuantity = Math.ceil(maxQuantity * 0.02);  // الحد الأدنى 10% من الكمية المتاحة

// إذا كانت الكمية المطلوبة أكبر من الكمية المتاحة أو أقل من الحد الأدنى
if (quantityToBuy > maxQuantity) {
    return await interaction.reply({ content: `❌ **الكمية المطلوبة أكثر من المتاحة. أقصى كمية متاحة هي ${maxQuantity}.**`, ephemeral: true });
} else if (quantityToBuy < minQuantity) {
    return await interaction.reply({ content: `❌ **الكمية المطلوبة أقل من الحد الأدنى. الحد الأدنى للشراء هو ${minQuantity}.**`, ephemeral: true });
}

    

    const totalPrice = product.price * quantityToBuy;
    const { MessageEmbed } = require('discord.js');

    // إرسال تأكيد للمستخدم
    const confirmEmbed = new MessageEmbed()
        .setColor("#00cc44")
        .setTitle("✅ تأكيد الشراء")
        .setDescription(`هل أنت متأكد من أنك تريد شراء ${quantityToBuy} من المنتج: **${product.name}**؟\n`)
        .addFields(
            { name: "💰 **سعر الوحدة**", value: `${product.price} 💵`, inline: true },
            { name: "📦 **الكمية المطلوبة**", value: `${quantityToBuy}`, inline: true },
            { name: "💰 **إجمالي السعر**", value: `${totalPrice} 💵`, inline: true }
        )
        .setFooter("اضغط على نعم لتأكيد الشراء.");

    const confirmRow = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId(`confirm_buy_${sellerId}_${msgid}_${quantityToBuy}`) // إضافة sellerId في الزر
            .setLabel("نعم")
            .setStyle("SUCCESS"),
        new MessageButton()
            .setCustomId("cancel_buy")
            .setLabel("إلغاء")
            .setStyle("DANGER")
    );
   await interaction.deferUpdate();

    // إرسال تأكيد للمستخدم
     interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow], ephemeral: true });
}
if (interaction.customId.startsWith("updatepricemodal_")) {
          const sellerId = interaction.customId.split("_")[1]; // استخراج ID البائع

    const newPrice = parseFloat(interaction.fields.getTextInputValue("new_price"));


// تحقق إن الرقم صالح وأكبر من أو يساوي 1
if (isNaN(newPrice) || newPrice < 1) {
    return await interaction.reply({ content: "❌ **السعر لازم يكون رقم أكبر أو يساوي 1.**", ephemeral: true });
}

// تحقق إن السعر فيه رقم عشري واحد فقط أو عدد صحيح
if (!/^\d+(\.\d)?$/.test(newPrice)) {
    return await interaction.reply({ content: "❌ **السعر لازم يكون عدد صحيح أو عشري فيه رقم واحد بعد الفاصلة زي 1 أو 1.5 بس مش 1.55**", ephemeral: true });
}

    // جلب البيانات الخاصة بالمنتج
    const productss = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": interaction.message.id,
        "products.sellerId": sellerId
    });


    if (!productss) {
        return await interaction.reply({ content: "❌ **لا توجد بيانات لهذا المنتج.**", ephemeral: true });
    }

    const product = productss.products.find(p => p.messageId === interaction.message.id);
if (product && product.sellerId !== interaction.user.id) {
    return await interaction.reply({ content: "❌ **أنت لست البائع لهذا المنتج.**", ephemeral: true });
}
    // تحديث السعر في قاعدة البيانات
    product.price = newPrice;
    await productss.save();

    // تحديث الرسالة في القناة
    const finalRoom = interaction.guild.channels.cache.get(config.shop_products);
    const { MessageEmbed } = require('discord.js');

    const productEmbed = new MessageEmbed()
        .setColor("#00cc44")
        .setTitle("✅ تم تعديل السعر")
        .setDescription(
            `📝 **الوصف:**\n${product.description || "لا يوجد وصف."}\nتم إضافة هذا المنتج من قبل البائع: <@${product.sellerId}>`
        )
        .addFields(
            { name: "📌 **الاسم**", value: product.name, inline: false },
            { name: "📦 **الكمية**", value: `${product.stock}`, inline: false },
            { name: "💰 **السعر الجديد**", value: `${newPrice} 💵`, inline: false },
            { name: "📂 **التصنيف**", value: product.category, inline: false },
            { 
                name: "💰 **طريقة الدفع**", 
                value: 
                    product.preferredPaymentMethod === "legal" 
                        ? "✅ شرعي" 
                        : product.preferredPaymentMethod === "illegal" 
                            ? "❌ غير شرعي" 
                            : "⚖️ شرعي وغير شرعي", 
                inline: false 
            }
        )
        .setImage(product.image);

    await finalRoom.messages.fetch(product.messageId).then((message) => {
        message.edit({ embeds: [productEmbed] });
    });

    // رد على البائع
    await interaction.reply({ content: `✅ **تم تحديث السعر إلى ${newPrice}.**`, ephemeral: true });
}

  
  if (interaction.customId === "update_stock_modal") {
    const newQuantity = parseInt(interaction.fields.getTextInputValue("new_quantity"));

    // تحقق من أن الكمية هي عدد صحيح أكبر من 0
    if (isNaN(newQuantity) || newQuantity < 0) {
        return await interaction.reply({ content: "❌ **الكمية يجب أن تكون عدد صحيح أكبر من 0.**", ephemeral: true });
    }
    
    if (isNaN(newQuantity) || newQuantity <= 0) {
    return await interaction.reply({ content: "❌ **لا يمكن تحديد كمية المنتج لتكون صفر أو أقل.**", ephemeral: true });
}

    // جلب البيانات الخاصة بالمنتج
    const productss = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": interaction.message.id,
        "products.sellerId": interaction.user.id
    });

    if (!productss) {
        return await interaction.reply({ content: "❌ **لا توجد بيانات لهذا المنتج.**", ephemeral: true });
    }

    const product = productss.products.find(p => p.messageId === interaction.message.id);
console.log(product)

    // تحديث الكمية في قاعدة البيانات
    product.stock = newQuantity;
    await productss.save();
    // تحديث الرسالة في القناة
    const finalRoom = interaction.guild.channels.cache.get(config.shop_products);
        const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

    const productEmbed = new MessageEmbed()
        .setColor("#00cc44")
        .setTitle("✅ تم تعديل الكمية")
   .setDescription(
        `📝 **الوصف:**\n${product.description || "لا يوجد وصف."}\nتم إضافة هذا المنتج من قبل البائع: <@${product.sellerId}>`
    )
    .addFields(
            { name: "📌 **الاسم**", value: product.name, inline: false },
            { name: "📦 **الكمية**", value: `${newQuantity}`, inline: false },
            { name: "💰 **السعر**", value: `${product.price} 💵`, inline: false },
            { name: "📂 **التصنيف**", value: product.category, inline: false },
            { 
                name: "💰 **طريقة الدفع**", 
               value: 
                product.preferredPaymentMethod === "legal" 
                    ? "✅ شرعي" 
                    : product.preferredPaymentMethod === "illegal" 
                        ? "❌ غير شرعي" 
                        : "⚖️ شرعي وغير شرعي", 
            inline: false 
            }
        )
        .setImage(product.image);

    await finalRoom.messages.fetch(product.messageId).then((message) => {
        message.edit({ embeds: [productEmbed] });
    });

    // رد على البائع
    await interaction.reply({ content: `✅ **تم تحديث الكمية إلى ${newQuantity}.**`, ephemeral: true });
}

  
  
  if (interaction.customId === "custom_order_modal") {
    await interaction.deferReply({ ephemeral: true });

    // استخراج المدخلات
    const quantity = parseInt(interaction.fields.getTextInputValue("order_quantity").replace(/[^\d]/g, ''), 10);
    const price = parseFloat(interaction.fields.getTextInputValue("order_price").replace(/[^\d.]/g, ''));
const description = interaction.fields.getTextInputValue("order_description")?.trim().replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1').replace(/`/g, '');

    // تحقق من صحة المدخلات
    if (!description || description.length < 10 || description.length > 300) {
        return await interaction.editReply({ content: "❌ **وصف الطلبية يجب أن يكون بين 10 و 300 حرفًا.**" });
    }

    if (!quantity || isNaN(quantity) || quantity <= 0) {
        return await interaction.editReply({ content: "❌ **يجب أن تكون الكمية رقمًا أكبر من 0.**" });
    }

    if (!price || isNaN(price) || price <= 0) {
        return await interaction.editReply({ content: "❌ **أقل سعر يجب أن يكون رقمًا أكبر من 0.**" });
    }

    // حفظ بيانات الطلب مؤقتًا للمستخدم
    if (!global.orders) global.orders = {};
    global.orders[interaction.user.id] = {
        userId: interaction.user.id,
        quantity,
        price,
        description,
        category: null, // هيتم تعيينها لاحقًا
    };

    // إرسال رسالة لاختيار نوع المنتج
    const { MessageActionRow, MessageButton, MessageSelectMenu, MessageEmbed } = require("discord.js");

    const categorySelect = new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId("select_order_category")
            .setPlaceholder("🗂️ اختر نوع المنتج")
            .addOptions([
             
                { label: "خشب", value: "kshb", emoji: "🪵" },
                { label: "ممنوعات", value: "mmn3", emoji: "🚫" },
                { label: "دجاج", value: "djaj", emoji: "🐔" },
                { label: "أسلحة", value: "slh", emoji: "🔫" },
                { label: "أخرى", value: "other", emoji: "📁" },
                { label: "سمك", value: "fish", emoji: "🐟" },
                { label: "خضروات", value: "vegetables", emoji: "🥦" },
                { label: "نفط", value: "oil", emoji: "🛢️" },
                { label: "قماش", value: "fabric", emoji: "🧵" },
                { label: "معادن", value: "metals", emoji: "⛓️" }
            ])
    );

    const embed = new MessageEmbed()
        .setColor("#00C896")
        .setTitle("📂 اختر نوع المنتج")
        .setDescription("يرجى اختيار نوع المنتج الذي ترغب بطلبه من القائمة أدناه:");

    await interaction.editReply({
        embeds: [embed],
        components: [categorySelect],
    });
}

  
  
  
  if (interaction.customId === "product_modal") {
    await interaction.deferReply({ ephemeral: true });

    // استخراج البيانات من المدخلات
   const productName = interaction.fields.getTextInputValue("product_name");
const productQuantity = parseInt(interaction.fields.getTextInputValue("product_quantity").replace(/[^\d]/g, ''), 10); // إزالة أي حرف غير رقم
const productPrice = parseFloat(interaction.fields.getTextInputValue("product_price").replace(/[^\d.]/g, '')); // إزالة أي حرف غير رقم أو فاصلة عشرية
const productDescription = interaction.fields.getTextInputValue("product_description") || "لا يوجد وصف";

// التحقق من الشروط
if (!productPrice || productPrice <= 1) {
    return await interaction.editReply({embeds: [], components: [], content: "❌ **يجب أن يكون السعر رقمًا أكبر من 1.**", ephemeral: true });
}

if (isNaN(productQuantity) || productQuantity <= 0) {
    return await interaction.editReply({ embeds: [], components: [], content: "❌ **يجب أن تكون الكمية رقمًا أكبر من 0.**", ephemeral: true });
}

if (productName.length > 50) {
    return await interaction.editReply({embeds: [], components: [], content: "❌ **اسم المنتج يجب أن لا يتجاوز 50 حرفًا.**", ephemeral: true });
}

if (productDescription.length > 300) {
    return await interaction.editReply({ embeds: [], components: [], content: "❌ **وصف المنتج يجب أن لا يتجاوز 300 حرفًا.**", ephemeral: true });
}

    // تخزين البيانات في المتغير العام بعد التحقق
productData[interaction.user.id] = {
    sellerId: interaction.user.id,
    name: productName,
    stock: productQuantity,
    price: productPrice,
    description: productDescription,
    category: '',
    messageId: "",
    image:""
};
    // يسأل عن الصورة

const { MessageEmbed } = require('discord.js');

    const askImageEmbed = new MessageEmbed()
        .setColor("#0099ff")
        .setTitle("📸 هل لديك صورة للمنتج؟")
        .setDescription("اضغط على **نعم** إذا كنت تريد إضافة صورة لهذا المنتج.");

    const imageButtons = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId("x_produc_add_product_image_yes")
            .setLabel("✅ نعم")
            .setStyle("SUCCESS"),
        new MessageButton()
            .setCustomId("add_product_image_no")
            .setLabel("❌ لا")
            .setStyle("DANGER")
    );

    await interaction.editReply({ embeds: [askImageEmbed], components: [imageButtons] });
}


  
  if (interaction.customId === 'agree_seller_plus_form') {
            const whatSell = interaction.fields.getTextInputValue('what_sell');
            const whySell = interaction.fields.getTextInputValue('why_sell');

            // إنشاء أزرار القبول والرفض
            const row = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('accept_seller') 
                    .setLabel('✅ قبول')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId('reject_seller')
                    .setLabel('❌ رفض')
                    .setStyle('DANGER')
            );

            // البحث عن قناة الإدارة
            const adminChannel = interaction.client.channels.cache.get(config.shop_submit_seller);
            if (!adminChannel) {
                return await interaction.reply({
                    content: '⚠️ حدث خطأ، لم يتم العثور على قناة الإدارة!',
                    ephemeral: true
                });
            }
const { MessageEmbed } = require('discord.js');

            // إنشاء الـ Embed
            const confirmationEmbed = new MessageEmbed()
                .setColor('#3498db')
                .setTitle('📜 طلب تقديم بائع جديد')
                .addFields(
                    { name: '🛒 ما الذي يبيعه؟', value: `\`\`\`${whatSell}\`\`\``, inline: false },
                    { name: '❓ لماذا يريد أن يصبح بائعًا؟', value: `\`\`\`${whySell}\`\`\``, inline: false },
                     { name: '🆔 مقدم الطلب', value: `${interaction.user}`, inline: false }

                )

            // إرسال الرسالة إلى قناة الإدارة
            await adminChannel.send({
                  content: `<@&${config.rolesellerManager}>`, 
                embeds: [confirmationEmbed],
                components: [row]
            });

            // الرد على المستخدم
            await interaction.update({
                content: '✅ تم إرسال طلبك للإدارة بنجاح، سيتم مراجعته قريبًا.',
                ephemeral: true,
              embeds: [],
                components: []
            });
        }
  
  if (interaction.customId.startsWith('contact_owner_modal_')) {
    await interaction.deferReply({ ephemeral: true });


    const carOwner = await interaction.guild.members.fetch(interaction.customId.split("_")[3]).catch(() => null);
    if (!carOwner) return interaction.editReply({ content: '❌ مسجل السيارة غير موجود.' });

    const messageContent = interaction.fields.getTextInputValue('contact_message');

    const row = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId(`send_plain_${interaction.customId.split("_")[3]}`)
            .setLabel('📩 إرسال رسالة عادية')
            .setStyle('SECONDARY'),
        new MessageButton()
            .setCustomId(`send_embed_${interaction.customId.split("_")[3]}`)
            .setLabel('🌟 إرسال رسالة Embed')
            .setStyle('PRIMARY')
    );

    await interaction.editReply({ content: 'اختر طريقة إرسال الرسالة:', components: [row] });

    const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });
collector.on('collect', async (i) => {
    if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ هذا الزر ليس لك.', ephemeral: true });

    collector.stop(); // 💥 دي اهم حاجة عشان يقفل بعد اول استخدام

    if (i.customId === `send_plain_${interaction.customId.split("_")[3]}`) {
await carOwner.send(`
╭━━━⊰ 🌟 ⸝⸝ **رسالة رسمية من إدارة تسجيل السيارات والكراج** ⊱━━━╮

> **📬 الرسالة:**  
\`\`\`ansi
[1;34m[🔔] محتوى الرسالة:[0m
[0;37m${messageContent}[0m
\`\`\`

> **👤 المرسل:**  
> ↳  || <@${interaction.user.id}> ||  ( \`${interaction.user.tag}\` )

> **🕒 الوقت:**  
> ⏳ <t:${Math.floor(Date.now() / 1000)}:R> — ⏰ <t:${Math.floor(Date.now() / 1000)}:t> — 🗓️ <t:${Math.floor(Date.now() / 1000)}:F>

╰━━━⊰ 💠 **مع تحيات إدارة تسجيل السيارات والكراج** 💠 ⊱━━━╯

> 🟣 *جميع الحقوق محفوظة — Discord RP Car System*
───────────────────────────────
`);

const logChannel = interaction.guild.channels.cache.get(config.botlogs); // هنا حط ID الروم بتاع السجل
await logChannel.send(`
╭━━━⊰ 🌟 ⸝⸝ **رسالة رسمية من إدارة تسجيل السيارات والكراج** ⊱━━━╮

> **📬 الرسالة:**  
\`\`\`ansi
[1;34m[🔔] محتوى الرسالة:[0m
[0;37m${messageContent}[0m
\`\`\`

> **👤 المرسل:**  
> ↳  || <@${interaction.user.id}> ||  ( \`${interaction.user.tag}\` )

> **🕒 الوقت:**  
> ⏳ <t:${Math.floor(Date.now() / 1000)}:R> — ⏰ <t:${Math.floor(Date.now() / 1000)}:t> — 🗓️ <t:${Math.floor(Date.now() / 1000)}:F>

╰━━━⊰ 💠 **مع تحيات إدارة تسجيل السيارات والكراج** 💠 ⊱━━━╯

> 🟣 *جميع الحقوق محفوظة — Discord RP Car System*
───────────────────────────────
`);

        await i.update({ content: '✅ تم إرسال الرسالة العادية بنجاح!', components: [] }).catch(() => null);

    } else if (i.customId === `send_embed_${interaction.customId.split("_")[3]}`) {
        await i.update({ content: '🔄 قريبًا سيتم إتاحة هذه الميزة.', components: [] });
    }
});


    collector.on('end', async () => {
        await interaction.editReply({ content: '⏰ انتهى وقت اختيار نوع الرسالة.', components: [] });
    });
}

async function handleTimeout(interaction) {
    await interaction.editReply({ 
        content: '⏳ **انتهى الوقت! لم يتم إرسال الصورة في الوقت المطلوب. يرجى إعادة التسجيل.**', 
        embeds: [],
        components: [
            new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('register_car')
                    .setLabel('🚗 إعادة التسجيل')
                    .setStyle('PRIMARY')
            )
        ]
    });
}

  
  if (interaction.customId === 'car_registration_form') {
    const carName = interaction.fields.getTextInputValue('car_name');
    const carID = interaction.fields.getTextInputValue('car_id');
    const registerStatus = interaction.fields.getTextInputValue('register_status');

    await interaction.reply({ content: '🖼 **الآن، يرجى إرسال صورة السيارة هنا**', ephemeral: true });

    const filter = (m) => m.author.id === interaction.user.id && m.attachments.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

    collector.on('collect', async (message) => {
        const imageAttachment = message.attachments.first();
        const targetChannel = interaction.guild.channels.cache.get(config.imgslogs); // روم الصور

        if (!targetChannel) {
            return interaction.followUp({ content: '❌ **حدث خطأ! لم يتم العثور على الروم المحدد للصور.**', ephemeral: true });
        }

        try {
            // إرسال الصورة إلى الروم المحدد
            const sentImage = await targetChannel.send({ files: [new MessageAttachment(imageAttachment.url)] });
            const carImageURL = sentImage.attachments.first().url;

            // حذف صورة المستخدم الأصلية من الروم
            await message.delete();

            // إنشاء Embed التأكيد
            const confirmationEmbed = new MessageEmbed()
                .setColor('#2F3136')
                .setTitle('🚘 تأكيد تسجيل السيارة')
                .setDescription(`
                    **🚗 اسم السيارة:** ${carName}
                    **🔢 رقم السيارة:** ${carID}
                    **📌 حالة التسجيل:** ${registerStatus}
                    ✅ **هل تريد تأكيد الإرسال؟**
                `)
                .setImage(carImageURL);

            const buttons = new MessageActionRow()
                .addComponents(
                    new MessageButton().setCustomId('confirm_registration').setLabel('✅ تأكيد').setStyle('SUCCESS'),
                    new MessageButton().setCustomId('cancel_registration').setLabel('❌ إلغاء').setStyle('DANGER')
                );

const confirmationMessage = await interaction.editReply({ content: null ,embeds: [confirmationEmbed], components: [buttons] });

            collector.stop();

            // انتظار استجابة المستخدم
            const buttonFilter = (i) => i.user.id === interaction.user.id;
            const buttonCollector = confirmationMessage.createMessageComponentCollector({ filter: buttonFilter, time: 60000 });

            buttonCollector.on('collect', async (i) => {
                if (i.customId === 'confirm_registration') {
const finalEmbed = new MessageEmbed()
    .setColor('#2F3136')
    .setTitle('🚘 تم تسجيل السيارة بنجاح!')
            .addField('🚗 اسم السيارة:', carName, true)
            .addField('🔢 رقم السيارة:', carID, true)
            .addField('📌 حالة التسجيل:', registerStatus, true)
            .addField('👤 مسجل السيارة:', `<@${interaction.user.id}>`, false)
    .setImage(carImageURL)

  const button = new MessageActionRow().addComponents(
       new MessageButton()
        .setCustomId('register_car')
        .setLabel('🚗 تسجيل السيارة')
        .setStyle('PRIMARY'), // لون الزر أزرق
            new MessageButton()
        .setCustomId(`contact_car_owner_${interaction.user.id}`)
        .setLabel('📩 تواصل مع مسجل السيارة')
        .setStyle('SECONDARY')
  
  
  );
                  
                  interaction.editReply({ content: "تم تسجيل السيارة بنجاح" ,embeds: [], components: [] });
                    await interaction.channel.send({ content: null ,embeds: [finalEmbed], components: [button] });
                  
                    await i.deferUpdate();
                } else if (i.customId === 'cancel_registration') {
                    await interaction.editReply({ content: '❌ **تم إلغاء العملية!**', embeds: [], components: [] });
                    await i.deferUpdate();
                }
            });
buttonCollector.on('end', async (_, reason) => {
    if (reason === 'time') await handleTimeout(interaction);
});
        } catch (error) {
            console.error('❌ فشل إرسال الصورة:', error);
            return interaction.editReply({ content: '❌ **فشل في رفع الصورة، حاول مرة أخرى.**', ephemeral: true });
        }
    });
    
  collector.on('end', async (_, reason) => {
    if (reason === 'time') await handleTimeout(interaction);
});


}

  
  
if (interaction.customId === "family_password_modal") {
    const password = interaction.fields.getTextInputValue("family_password");
    const family = await Family.findOne({ 
        $or: [{ memberPassword: password }, { adminPassword: password }]
    });

    if (!family) {
        return interaction.reply({ content: "❌ كلمة المرور هذه غير مسجلة لأي عائلة في النظام.", ephemeral: true });
    }
  
     const row = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId(`open_registration_modal_${password}`)
            .setLabel("📋 سجل بياناتك")
            .setStyle("PRIMARY")
    );

    // إرسال رسالة مع الزر
     interaction.reply({ 
        content: `✅ تم التحقق من كلمة المرور، اضغط على الزر أدناه للتسجيل في عائلة **${family.familyName}**.`,
        components: [row],
        ephemeral: true
    });
  
}

  
 const { MessageEmbed } = require('discord.js');

if (interaction.customId.startsWith("family_registration_modal_")) {
    await interaction.deferReply({ ephemeral: true });

    const logChannel = interaction.guild.channels.cache.get(config.botlogs);

    function sendLog(message) {
        if (logChannel) {
            const logEmbed = new MessageEmbed()
                .setColor('#2F3136')
                .setTitle('📜 لوج تسجيل العائلة')
                .setDescription(message)
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] });
        }
    }

    // استخراج كلمة المرور
    const password = interaction.customId.split("_").slice(3).join("_");
    sendLog(`🔍 جاري البحث عن العائلة بكلمة المرور ||${password}||...`);

    // البحث عن العائلة
    const family = await Family.findOne({
        $or: [{ memberPassword: password }, { adminPassword: password }]
    });

    if (!family) { 
        sendLog(`❌ كلمة المرور **${password}** غير مسجلة لأي عائلة.`);
        return interaction.followUp({ content: '❌ كلمة المرور هذه غير مسجلة لأي عائلة في النظام.', ephemeral: true });
    }

    sendLog(`✅ تم العثور على العائلة **${family.familyName}**.`);

    // استخراج البيانات
    const gameName = interaction.fields.getTextInputValue("User_name_game");
    const userId = interaction.fields.getTextInputValue("User_id");
    sendLog(`📥 البيانات المدخلة - اسم اللعبة: **${gameName}** - المعرف: **${userId}**.`);

    // التحقق من صحة الـ ID
    if (!/^\d+$/.test(userId)) {
        sendLog(`⚠️ المعرف **${userId}** غير صالح، يجب أن يكون أرقام فقط.`);
        return interaction.followUp({
            content: "🚀 الـ ID الخاص بحسابك يتكون من أرقام فقط، تأكد من إدخاله بشكل صحيح! 🔢✨",
            ephemeral: true
        });
    }

    let roleId, roleType;
    if (family.adminPassword === password) {
        roleId = family.adminRoleId;
        roleType = "أدمن";
        if (!family.admins.includes(interaction.user.id)) {
            family.admins.push(interaction.user.id);
        }
    } else {
        roleId = family.familyRoleId;
        roleType = "عضو";
    }

    sendLog(`🎭 تحديد الرتبة: **${roleType}**.`);

    // جلب الرتبة داخل السيرفر
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
        sendLog(`⚠️ فشل في تعيين الرتبة **${roleType}** للمستخدم <@${interaction.user.id}>.`);
        return interaction.followUp({ content: '⚠️ حدث خطأ في تعيين الرتبة.', ephemeral: true });
    }

    // إضافة الرتبة
    if (!interaction.member.roles.cache.has(roleId)) {
        await interaction.member.roles.add(role);
        await interaction.member.roles.add(family.familyRoleId).catch(() => {}); // إعطائه رتبة الإدارة

        sendLog(`✅ تم تعيين الرتبة **${roleType}** للمستخدم <@${interaction.user.id}>.`);
    }

    // إضافة رتبة إضافية
    const roleteam = await interaction.guild.roles.fetch(config.TeamFamily).catch(() => null);
    if (roleteam) {
        await interaction.member.roles.add(roleteam);
        sendLog(`✅ تم إضافة رتبة الفريق الإضافية.`);
    }

    let familyShortName = family.familyName.length > 1
        ? `${family.familyName.charAt(0)}${family.familyName.charAt(family.familyName.length - 1)}`
        : `${family.familyName}${family.familyName}`;

   const newNickname = `${gameName} | ${familyShortName} | ${userId}`;
const maxNicknameLength = 32; // الحد الأقصى لطول الاسم في ديسكورد

if (newNickname.length > maxNicknameLength) {
    sendLog(`⚠️ لم يتم تغيير اسم المستخدم لأن الاسم الجديد طويل جدًا.`);
    await interaction.followUp({
        content: `✅ تم تسجيلك في **${family.familyName}** ولكن نظرًا لأن اسمك طويل جدًا، لم يتم تغييره.`,
        ephemeral: true
    });
} else {
    try {
        await interaction.member.setNickname(newNickname);
        sendLog(`✅ تم تغيير اسم المستخدم إلى **${newNickname}**.`);
    } catch (error) {
        sendLog(`⚠️ لم يتم تغيير اسم المستخدم، البوت ليس لديه صلاحيات كافية.`);
        await interaction.followUp({
            content: `✅ تم تسجيلك في **${family.familyName}** ولكن لم يتم تغيير اسمك.`,
            ephemeral: true
        });
    }
}


    // إضافة المستخدم إلى قاعدة البيانات
    if (!family.members.includes(interaction.user.id)) {
        family.members.push(interaction.user.id);
    }
    await family.save();
    
    await interaction.followUp({
        content: `✅ تم إضافتك كـ **${roleType}** في **${family.familyName}** بنجاح! 🎉`, 
        ephemeral: true 
    });

    // تسجيل اللوج النهائي
    sendLog(`
**📜 تسجيل جديد في نظام العائلات**
👤 المستخدم: <@${interaction.user.id}>  
🏠 اسم العائلة: **${family.familyName}**  
🔑 كلمة المرور المستخدمة: ||${password}||  
📌 الرتبة المكتسبة: **${roleType}**  
🎮 الاسم داخل اللعبة: **${gameName}**  
🆔 المعرف: **${userId}**  
`);
}


   const fs = require('fs'); // لاستعمال نظام الملفات لتسجيل اللوغ

function logAction(action, userId, details = '') {
    const logMessage = `[${new Date().toLocaleString()}] ${action} | المستخدم: ${userId} | ${details}\n`;
    fs.appendFileSync('logs.txt', logMessage); // حفظ السجل في ملف
}

if (interaction.customId === 'leave_request_form') {
    const existingLeave = await Leave.findOne({ userId: interaction.user.id, status: "مقبولة" });

    if (existingLeave) {
        logAction('محاولة طلب إجازة مرفوضة', interaction.user.id, `إجازة سابقة حتى ${existingLeave.endDate.toLocaleDateString()}`);
        return interaction.reply({ content: `⚠ لديك بالفعل إجازة مقبولة حتى ${existingLeave.endDate.toLocaleDateString()}!`, ephemeral: true });
    }

    const leaveType = interaction.fields.getTextInputValue('leave_type');
    const startDate = interaction.fields.getTextInputValue('start_date');
    const endDate = interaction.fields.getTextInputValue('end_date');
    const reason = interaction.fields.getTextInputValue('reason');

    const dateRegex = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/;

    function isValidDate(dateStr) {
        const match = dateStr.match(dateRegex);
        if (!match) return false;
        const [_, day, month, year] = match.map(Number);
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
    }

    function parseDate(dateStr) {
        const [day, month, year] = dateStr.split(/[-\/.]/).map(Number);
        return new Date(year, month - 1, day);
    }

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
        logAction('إدخال تاريخ غير صالح', interaction.user.id, `تاريخ البداية: ${startDate}, النهاية: ${endDate}`);
        return interaction.reply({
            content: `❌ **يجب إدخال التاريخ بصيغة صحيحة مثل:**  
            🔹 \`13/3/2025\` أو \`13-03-2025\` أو \`13.3.2025\`  
            📌 **(اليوم/الشهر/السنة بأي تنسيق وأي فاصل)**`, 
            ephemeral: true 
        });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDateObj = parseDate(startDate);
    const endDateObj = parseDate(endDate);

    if (startDateObj < today || endDateObj < today) {
        logAction('طلب إجازة بتاريخ قديم', interaction.user.id, `تاريخ البداية: ${startDate}, النهاية: ${endDate}`);
        return interaction.reply({ 
            content: `❌ **لا يمكنك طلب إجازة بتاريخ أقدم من اليوم!**  
            📌 **تأكد أن تاريخ البداية والنهاية في المستقبل.**`, 
            ephemeral: true 
        });
    }

    const reviewChannel = interaction.client.channels.cache.get(config.reviewvacation);
    if (reviewChannel) {
        const embed = new MessageEmbed()
            .setTitle('📌 طلب إجازة جديد')
            .setColor('#0099ff')
            .addFields(
                { name: '🆔 المستخدم', value: `${interaction.user}`, inline: false },
                { name: '📌 نوع الإجازة', value: leaveType, inline: false },
                { name: '📅 تاريخ البدء', value: startDate, inline: false },
                { name: '📅 تاريخ الانتهاء', value: endDate, inline: false },
                { name: '📖 السبب', value: reason || 'لم يتم التوضيح' }
            )
            .setFooter({ text: '🔹 نظام إدارة الإجازات' });

        const buttons = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('leave_accept_leave')
                .setLabel('قبول')
                .setStyle('SUCCESS'),
            new MessageButton()
                .setCustomId('leave_reject_leave')
                .setLabel('رفض')
                .setStyle('DANGER'),
        );

        await reviewChannel.send({ embeds: [embed], components: [buttons] });

        logAction('تم تقديم طلب إجازة', interaction.user.id, `النوع: ${leaveType}, البداية: ${startDate}, النهاية: ${endDate}`);
    }

    await interaction.reply({
        content: 'تم تقديم طلب الإجازة بنجاح!',
        ephemeral: true,
    });
}

  
  
  if (interaction.customId === 'User_application_modal') {
        await interaction.deferReply({ ephemeral: true });

    const user = interaction.user; // الشخص الذي فتح التذكرة
    const member = interaction.guild.members.cache.get(user.id); // جلب بيانات المستخدم
    const applicationsChannel = interaction.guild.channels.cache.get(config.applicationsChannel); // قناة التقديمات

    if (!applicationsChannel) {
        return interaction.reply({ content: '⚠️ لم يتم العثور على قناة التقديمات!', ephemeral: true });
    }

    // استخراج المدخلات النصية من النموذج
    const User_name = interaction.fields.getTextInputValue('User_name');
    const User_id = interaction.fields.getTextInputValue('User_id');
    // التحقق من أن الإدخال يحتوي على أرقام فقط
if (!/^\d+$/.test(User_id)) {
    return interaction.followUp({
content: "🚀 مرحبًا! الـ ID الخاص بحسابك يتكون من أرقام فقط، تأكد من إدخاله بشكل صحيح وجرب مرة أخرى! 🔢✨",
        ephemeral: true
    });
}
    const User_name_game = interaction.fields.getTextInputValue('User_name_game');

    // التحقق مما إذا كان المستخدم مسجلًا بالفعل
    const existingApplication = await Application.findOne({ userId: member.id });

    if (existingApplication) {
        return interaction.reply({ content: '✅ حسابك مفعل بالفعل! لا تحتاج إلى تقديم مرة أخرى.', ephemeral: true });
    }
    // الرتب
const rolesToRemove = [config.allmemberrole]; // ضع ID الرتبتين هنا

const rolesToِAdd = [config.familyrole]; // ضع ID الرتبتين هنا



    // إضافة الرتبة وإزالة القديمة
    await member.roles.add(rolesToِAdd);
   // await member.roles.remove(rolesToRemove);

    // إضافة المستخدم إلى قاعدة البيانات

    
    
   const newApplication = new Application({
      userId: member.id,
      acceptedReports: 0,
      pendingReports: 0,
      dailyReports:  0,
      rejectedReports:  0,
      crimeReports:  0,
      agricultureReports: 0,
     User_name: User_name,
     User_id: User_id,
     User_name_game: User_name_game,
     loginDate: new Date() // تسجيل وقت الحفظ
    });

await newApplication.save()
const payment = await PaymentSystem.findOne({ userId: member.id });

if (!payment) {
    // إذا لم يكن هناك سجل، يتم إنشاء واحد جديد بحالة "unpaid"
    await PaymentSystem.create({ userId: member.id, insurancePaymentStatus: 'unpaid' });
} else if (payment.insurancePaymentStatus !== 'paid') {
    // إذا كانت حالة الدفع ليست "paid"، يتم تحديثها إلى "unpaid"
    await PaymentSystem.findOneAndUpdate(
        { userId: member.id },
        { insurancePaymentStatus: 'unpaid' },
        { new: true }
    );
}


    
      try {

                await member.setNickname(`${User_name_game} | ${User_id}`, 'تغيير الهوية بواسطة البوت');

  // عرض سؤال "ما تخصصك؟"
    const buttonsRow = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('crime_selection')
          
          .setLabel('🔪 إجرام')
           
          .setStyle('DANGER'),
            // new MessageButton()
            //     .setCustomId('farm_selection')
            //     .setLabel('🌾 مزرعة')
            //     .setStyle('SUCCESS')
        );

    // await interaction.followUp({ 
    //     content: '🔹 ما تخصصك؟', 
    //     components: [buttonsRow], 
    //     ephemeral: true 
    // });
   interaction.followUp({
  //   content: '🔹 ما تخصصك؟', 
       // components: [buttonsRow], 
    
        embeds: [
            new MessageEmbed()
                .setColor('GREEN')
                .setTitle('✅ تم التفعيل بنجاح !')
        ],
        ephemeral: true
    });

        // const crimeRole = config.vandal; // ID رتبة إجرام
        // await member.roles.add([crimeRole]);
                await member.roles.remove(config.VACRoleid);
        
    // إرسال رسالة في القناة الخاصة بالتقديمات
    const embedApplication = new MessageEmbed()
        .setColor('BLUE')
        .setTitle('📩 طلب تفعيل جديد')
        .setDescription(`تم قبول **${user}**`)
        .addField('Username:', `\`${User_name}\``)
            .addField('Username in game:', `\`${User_name_game}\``)
        .addField('ID:', `\`${User_id}\``);
       // إضافة الرتب المضافة إلى الرسالة
   
        await applicationsChannel.send({ embeds: [embedApplication] });


    // إرسال رسالة للمستخدم في الخاص
    try {
        await member.send({
            embeds: [
                new MessageEmbed()
                    .setColor('GOLD')
                    .setTitle('✅ تم تفعيل حسابك!')
                    .setDescription(`🎉 مرحبًا **${user}**، تم تفعيل حسابك بنجاح! يمكنك الآن التفاعل مع السيرفر.`)
            ]
        });
    } catch (error) {
        console.error(`❌ فشل إرسال رسالة للمستخدم ${User_name}: ${error.message}`);
    }
        
        
  } catch (error) {
    
//        const buttonsRow = new MessageActionRow()
//         .addComponents(
//             new MessageButton()
//                 .setCustomId('crime_selection')
              
//           .setLabel('🔪 إجرام')
           
//                 .setStyle('DANGER'),
            // new MessageButton()
            //     .setCustomId('farm_selection')
            //     .setLabel('🌾 مزرعة')
            //     .setStyle('SUCCESS')
      //  );

    
    // إرسال رسالة في القناة الخاصة بالتقديمات
    const embedApplication = new MessageEmbed()
        .setColor('BLUE')
        .setTitle('📩 طلب تفعيل جديد')
        .setDescription(`تم قبول **${user}**`)
        .addField('Username:', `\`${User_name}\``)
            .addField('Username in game:', `\`${User_name_game}\``)
        .addField('ID:', `\`${User_id}\``);
       // إضافة الرتب المضافة إلى الرسالة
      

        await applicationsChannel.send({ embeds: [embedApplication] });


    // إرسال رسالة للمستخدم في الخاص
    try {
        await member.send({
            embeds: [
                new MessageEmbed()
                    .setColor('GOLD')
                    .setTitle('✅ تم تفعيل حسابك!')
                    .setDescription(`🎉 مرحبًا **${user}**، تم تفعيل حسابك بنجاح! يمكنك الآن التفاعل مع السيرفر.`)
            ]
        });
    } catch (error) {
        console.error(`❌ فشل إرسال رسالة للمستخدم ${User_name}: ${error.message}`);
    }
    
    
        const crimeRole = config.vandal; // ID رتبة إجرام
        await member.roles.add([crimeRole]);
                await member.roles.remove(config.VACRoleid);
    
  return interaction.followUp({
  //   content: '🔹 ما تخصصك؟', 
       // components: [buttonsRow], 
    
        embeds: [
            new MessageEmbed()
                .setColor('GREEN')
                .setTitle('✅ تم التفعيل بنجاح ولكن لم يتم تغير اسمك نظرا ان رتبتك اعلي من رتبة البوت!')
        ],
        ephemeral: true
    });
    
    
  
  }
   


  
        } 
  if (interaction.customId.startsWith('levelup_modal')) {
    // تحليل البيانات من الـ customId
    const parts = interaction.customId.split('_');
    if(parts[2] === "farm") {
      const currentLevel = interaction.fields.getTextInputValue('family_level');
const currentXP = interaction.fields.getTextInputValue('family_current_xp');
const targetXP = interaction.fields.getTextInputValue('family_target_xp');

// التحقق من أن القيم أرقام
if (isNaN(currentLevel) || isNaN(currentXP) || isNaN(targetXP)) {
    return interaction.reply({ content: 'الرجاء إدخال أرقام صحيحة في جميع الحقول.', ephemeral: true });
}

      if (currentLevel <= 0 || currentXP < 0 || targetXP <= 0) {
    return interaction.reply({ 
        content: '❌ الرجاء إدخال أرقام أكبر من صفر في جميع الحقول.', 
        ephemeral: true 
    });
}
        
      
     
// تحويل القيم إلى أرقام
const currentLevelNum = parseInt(currentLevel);
const currentXPNum = parseInt(currentXP);
const targetXPNum = parseInt(targetXP);

// حساب XP المتبقي
const xpNeeded = targetXPNum - currentXPNum;

// إنشاء خيارات المواد للمزرعة (الجزر والتفاح والقمح فقط)
const row = new MessageActionRow()
    .addComponents(
        new MessageSelectMenu()
            .setCustomId(`material_select_${currentLevelNum}_${currentXPNum}_${targetXPNum}_${xpNeeded}_farm`)
            .setPlaceholder('🌾 اختر محصول المزرعة')
        .addOptions([
    {
        label: '🥕 جزر',
        description: 'حساب XP لمحصول الجزر',
        value: 'carrot',
        emoji: '🥕'
    },
    {
        label: '🍎 تفاح',
        description: 'حساب XP لمحصول التفاح',
        value: 'apple',
        emoji: '🍎'
    },
    {
        label: '🌾 قمح',
        description: 'حساب XP لمحصول القمح',
        value: 'wheat',
        emoji: '🌾'
    },
    {
        label: '🍊 برتقال',
        description: 'حساب XP لمحصول البرتقال',
        value: 'orange',
        emoji: '🍊'
    }
])
    );

// تخزين البيانات للاستخدام لاحقًا
interaction.farmData = {
    currentLevel: currentLevelNum,
    currentXP: currentXPNum,
    targetXP: targetXPNum,
    xpNeeded: xpNeeded
};

await interaction.reply({
    content: 'اختر محصول المزرعة الذي تريد حسابه:',
    components: [row],
    ephemeral: true
});
    } else {
      
       const currentLevel = interaction.fields.getTextInputValue('current_level');
        const currentXP = interaction.fields.getTextInputValue('current_xp');
        const targetXP = interaction.fields.getTextInputValue('target_xp');

        // التحقق من أن القيم أرقام
        if (isNaN(currentLevel) || isNaN(currentXP) || isNaN(targetXP)) {
            return interaction.reply({ content: 'الرجاء إدخال أرقام صحيحة في جميع الحقول.', ephemeral: true });
        }

      if (currentLevel <= 0 || currentXP < 0 || targetXP <= 0) {
    return interaction.reply({ 
        content: '❌ الرجاء إدخال أرقام أكبر من صفر في جميع الحقول.', 
        ephemeral: true 
    });
}
        
      
        // تحويل القيم إلى أرقام
        const currentLevelNum = parseInt(currentLevel);
        const currentXPNum = parseInt(currentXP);
        const targetXPNum = parseInt(targetXP);

        // حساب XP المتبقي
        const xpNeeded = targetXPNum - currentXPNum;

        // إنشاء خيارات المواد
const row = new MessageActionRow()
    .addComponents(
        new MessageSelectMenu()
            .setCustomId(`material_select_${currentLevelNum}_${currentXPNum}_${targetXPNum}_${xpNeeded}_user`)
            .setPlaceholder('🍽️ اختر نوع المادة')
       .addOptions([
    {
        label: '🍗 دجاج',
        description: 'حساب XP لمواد الدجاج',
        value: 'che',
        emoji: '🍗'
    },
    {
        label: '🐟 سمك',
        description: 'حساب XP لمواد السمك',
        value: 'fish',
        emoji: '🐟'
    },
    {
        label: '🥦 خضروات',
        description: 'حساب XP لمواد الخضروات',
        value: 'vegetables',
        emoji: '🥦'
    },
    {
        label: '🪵 خشب',
        description: 'حساب XP لمواد الخشب',
        value: 'wood',
        emoji: '🪵'
    },
    {
        label: '🛢️ نفط',
        description: 'حساب XP لمواد النفط',
        value: 'oil',
        emoji: '🛢️'
    },
    {
        label: '🧵 قماش',
        description: 'حساب XP لمادة القماش',
        value: 'fabric',
        emoji: '🧵'
    },
    {
        label: '🪙 ذهب',
        description: 'حساب XP لمعدن الذهب',
        value: 'gold',
        emoji: '🪙'
    },
    {
        label: '⛓️ حديد',
        description: 'حساب XP لمعدن الحديد',
        value: 'iron',
        emoji: '⛓️'
    }
])

    );

        // تخزين البيانات للاستخدام لاحقًا
        interaction.xpData = {
            currentLevel: currentLevelNum,
            currentXP: currentXPNum,
            targetXP: targetXPNum,
            xpNeeded: xpNeeded
        };

        await interaction.reply({
            content: 'اختر نوع المادة التي تريد حسابها:',
            components: [row],
            ephemeral: true
        });
    }
    
    
    }


  
  
if (interaction.customId === 'ticket_reason_modal') {
  
  
      const channel = interaction.channel;
    const reason = interaction.fields.getTextInputValue('close_reason') || 'No reason provided.';

    // ✅ الرد على المودال لمنع أي مشاكل
    await interaction.reply({ content: "Closing the ticket...", ephemeral: true });

    // ✅ استدعاء الدالة بعد الرد
    await closeTicket(channel, interaction, reason);
  
  
  
// التعامل مع استجابة المودال
} else if (interaction.customId === 'reject_reason_modal') {const allowedRoles = [
    '1342480295819218965',
    '1342480498588520449',
    '1342480586937208852',
    '1342480686107328564',
    '1341094488004886610'
];

// التحقق من امتلاك العضو لأحد الأدوار المسموحة
if (!interaction.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
    return interaction.reply({ 
        embeds: [new MessageEmbed()
            .setColor('#FF0000')
            .setTitle('⛔ | صلاحيات غير كافية')
            .setDescription('❌ لا يمكنك استخدام هذا الأمر! يجب أن تمتلك أحد **الأدوار الإدارية** المسموحة.')
        ],
        ephemeral: true 
    });
}

const reason = interaction.fields.getTextInputValue('rejection_reason');
const msg = await interaction.channel.messages.fetch(interaction.message.id).catch(() => null);
if (msg) await msg.delete().catch(console.error);

const userId = interaction.message.embeds[0]?.footer?.text.match(/\d+/)?.[0];
if (!userId) return interaction.reply({ embeds: [new MessageEmbed().setColor('RED').setDescription('❌ **User ID not found!**')], ephemeral: true });

const member = await interaction.guild.members.fetch(userId).catch(() => null);
if (!member) return interaction.reply({ embeds: [new MessageEmbed().setColor('RED').setDescription('❌ **Member not found in the server!**')], ephemeral: true });

// إرسال رسالة تأكيد في الشات
const rejectionEmbed = new MessageEmbed()
    .setColor('RED')
    .setTitle('❌ Application Rejected')
    .setDescription(`**The application of <@${userId}> has been rejected.**`)
    .addField('🛑 Reason:', reason)
    .setFooter({ text: `Rejected by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

await interaction.reply({ embeds: [rejectionEmbed], ephemeral: true });

// إرسال رسالة خاصة للعضو المرفوض
await member.send({
    embeds: [
        new MessageEmbed()
            .setColor('RED')
            .setTitle('❌ Your Application Has Been Rejected')
            .setDescription(`**Unfortunately, your application has been rejected.**`)
            .addField('🛑 Reason:', reason)
            .addField('👤 Rejected by:', `${interaction.user.username}`)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Server: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
    ]
}).catch(() => console.error(`Could not DM ${member.user.tag}.`));

// 📌 **إرسال اللوج إلى قناة تسجيل الوج (1350307752135888997)**
const logChannel = interaction.client.channels.cache.get(config.botlogs);

if (logChannel) {
    const logEmbed = new MessageEmbed()
        .setColor('YELLOW')
        .setTitle('📌 سجل رفض طلب')
        .addField('👤 المستخدم:', `<@${userId}>`, true)
        .addField('🛑 السبب:', reason, true)
        .addField('🛡 تم الرفض بواسطة:', `<@${interaction.user.id}>`, true)
        .setTimestamp();

    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
}

} else if (interaction.customId === 'alliance_application_modal') {

            
            const user = interaction.user; // الشخص الذي فتح التذكرة
    const type = "alliance"; // التحقق من وجود قيمة

    if (!type) {
        return interaction.reply({ content: '❌ نوع البلاغ غير محدد!', ephemeral: true });
    }

    const categoryId = config.ticketCategories[type];

    if (!categoryId) {
        return interaction.reply({ content: '❌ لا يوجد فئة مخصصة لهذا النوع من البلاغات!', ephemeral: true });
    }

    // استخراج المدخلات النصية من النموذج
 const familyName = interaction.fields.getTextInputValue('family_name');
    const familyOwner = interaction.fields.getTextInputValue('family_owner');
    const allianceReason = interaction.fields.getTextInputValue('alliance_reason');

    const { alliance } = require('../utils/alliance');

    // استدعاء الدالة مع البيانات المطلوبة
    await alliance(interaction, user, type, categoryId, config, familyName, familyOwner, allianceReason);

  
  
  
        } else if (interaction.customId === 'ticket_report_modal') {
    const user = interaction.user; // الشخص الذي فتح التذكرة
    const type = "report"; // التحقق من وجود قيمة

    if (!type) {
        return interaction.reply({ content: '❌ نوع البلاغ غير محدد!', ephemeral: true });
    }

    const categoryId = config.ticketCategories[type];

    if (!categoryId) {
        return interaction.reply({ content: '❌ لا يوجد فئة مخصصة لهذا النوع من البلاغات!', ephemeral: true });
    }

    // استخراج المدخلات النصية من النموذج
    const username = interaction.fields.getTextInputValue('report_username');
    const reportType = interaction.fields.getTextInputValue('report_type');
    const reportDescription = interaction.fields.getTextInputValue('report_description');

    const { report } = require('../utils/report');

    // استدعاء الدالة مع البيانات المطلوبة
    await report(interaction, user, type, categoryId, config, username, reportType, reportDescription);
}
}




function formatTime(seconds) {
  // دالة تنسيق موحدة للوحدات الزمنية
  const formatUnit = (value, unit) => value > 0 ? `${value} ${unit}${value > 1 ? 's' : ''}` : '';
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  const timeParts = [
    formatUnit(days, 'day'),
    formatUnit(hours, 'hour'),
    formatUnit(minutes, 'minute'),
    formatUnit(seconds, 'second')
  ].filter(part => part);

  return timeParts.length ? timeParts.join(', ') : '0 seconds';
}

     const mongoose = require('mongoose');


async function handleButtons(interaction, client) {
          const { customId } = interaction;
 
 if (interaction.customId === 'check_bot_speed') {
    const wsLatency = client.ws.ping;
    const uptime = readUptime();
    const formattedUptime = formatTime(uptime.uptime);

    // جلب آخر قيمة للبنغ بتاع المونجو المخزنة
    const mongoPing = client.mongoPing >= 0 ? `${client.mongoPing} ms` : '❌ خطأ في الاتصال';

    const embed = new MessageEmbed()
        .setColor('#00FF00')
        .setTitle('Pong! 🏓')
        .setDescription(`**WebSocket Ping**: ${wsLatency} ms\n**Database Ping**: ${mongoPing}\n**Uptime**: ${formattedUptime}`);

    await interaction.reply({ embeds: [embed], ephemeral: true });
}




  
  if (interaction.isButton() && interaction.customId === "confirm_custom_order") {
    const order = global.orders?.[interaction.user.id];
    if (!order) {
        return await interaction.reply({ content: "❌ لم يتم العثور على تفاصيل الطلبية.", ephemeral: true });
    }

    const typeMap = {
        
        kshb: { label: "خشب", emoji: "🪵" },
        mmn3: { label: "ممنوعات", emoji: "🚫" },
        djaj: { label: "دجاج", emoji: "🐔" },
        slh: { label: "أسلحة", emoji: "🔫" },
        other: { label: "أخرى", emoji: "📁" },
        fish: { label: "سمك", emoji: "🐟" },
        vegetables: { label: "خضروات", emoji: "🥦" },
        oil: { label: "نفط", emoji: "🛢️" },
        fabric: { label: "قماش", emoji: "🧵" },
        metals: { label: "معادن", emoji: "⛓️" }
    };

    const embed = new MessageEmbed()
        .setColor("#FFD700")
        .setTitle("📦 طلبية جديدة")
          .setDescription(`📝 **وصف الطلبية**: \`\`\`${order.description || "لا يوجد وصف"}\`\`\``)

        .addFields(
            { name: "👤 المشتري", value: `<@${interaction.user.id}>`, inline: false },
            { name: "📦 النوع", value: `${typeMap[order.category]?.emoji || ""} ${typeMap[order.category]?.label || "غير معروف"}`, inline: true },
            { name: "🔢 الكمية", value: order.quantity.toString(), inline: true },
            { name: "💰 اقل سعر ممكن يدفعه", value: order.price.toString(), inline: true },
        );

const orderDataString = [
  interaction.user.id,
  order.category,
  order.quantity,
  order.price,
].join("|");

const claimButton = new MessageActionRow().addComponents(
  new MessageButton()
    .setCustomId(`claim_order|${orderDataString}`)
    .setLabel("📬 استلام الطلبية")
    .setStyle("PRIMARY")
);

  const targetChannel = interaction.client.channels.cache.get(config.submit_product);
    if (targetChannel) {
        await targetChannel.send({
          content: `<@&${config.seller}>`,
            embeds: [embed],
            components: [claimButton]
        });
    }

    await interaction.update({
        content: "✅ تم إرسال طلبك بنجاح!",
        embeds: [],
        components: []
    });

    delete global.orders[interaction.user.id]; // حذف الطلبية بعد الإرسال
}
  
  if (interaction.customId.startsWith("claim_order|")) {
  const data = interaction.customId.split("|");

     const typeMap = {
        
        kshb: { label: "خشب", emoji: "🪵" },
        mmn3: { label: "ممنوعات", emoji: "🚫" },
        djaj: { label: "دجاج", emoji: "🐔" },
        slh: { label: "أسلحة", emoji: "🔫" },
        other: { label: "أخرى", emoji: "📁" },
        fish: { label: "سمك", emoji: "🐟" },
        vegetables: { label: "خضروات", emoji: "🥦" },
        oil: { label: "نفط", emoji: "🛢️" },
        fabric: { label: "قماش", emoji: "🧵" },
        metals: { label: "معادن", emoji: "⛓️" }
    };
  const buyerId = data[1];
  const category = data[2];
  const quantity = data[3];
  const price = data[4];
const embed3 = interaction.message.embeds[0];
if (!embed3) return interaction.reply({ content: "❌ لم أستطع العثور على بيانات الطلبية.", ephemeral: true });
if (buyerId === interaction.user.id) {
  try {

  const cancelButton = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId('cancel_order')
      .setLabel('📬 الغاء الطلبية')
      .setStyle('DANGER')
  );

  const reply = await interaction.reply({
    content: '❌ لا يمكنك استلام الطلبية الخاصة بك',
    components: [cancelButton],
    ephemeral: true,
    fetchReply: true, // ضروري عشان تقدر تنتظر الزر
  });

    const buttonInteraction = await reply.awaitMessageComponent({
      filter: (i) => i.customId === 'cancel_order' && i.user.id === interaction.user.id,
      time: 15000, // وقت انتظار الزر 15 ثانية مثلا
    });

    await buttonInteraction.update({
      content: '✅ تم الغاء الطلبية بنجاح',
      components: [],
      ephemeral: true,
    });
     await interaction.message.delete();


  } catch (error) {
    
  }
 return; 
}
  
let description = embed3.description || "غير محدد";

// نجيب كل الكود بلوكات في الرسالة
const codeBlocks = [...description.matchAll(/```([\s\S]*?)```/g)];

let orderText = "غير محدد";

if (codeBlocks.length > 0) {
    // ناخد آخر كود بلوك فقط
    const lastBlock = codeBlocks[codeBlocks.length - 1][1].trim();

    // نقسمه لأسطر
    const lines = lastBlock.split("\n");

    // نحاول نلاقي سطر بعد 📝
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("📝")) {
            const nextLine = lines[i + 1]?.trim();
            if (nextLine) {
                orderText = nextLine;
                found = true;
                break;
            }
        }
    }

    // لو مافيش 📝، ناخد كل محتوى البلوك كبديل
    if (!found) {
        orderText = lastBlock;
    }
}


  const catalogChannelId = config.Shop_CategoryId;
  const sellerMember = await interaction.guild.members.fetch(buyerId).catch(() => null);

  // إنشاء قناة تذكرة جديدة
  const ticketChannel = await interaction.guild.channels.create(`تذكرة-طلبية`, {
    type: 'GUILD_TEXT',
    topic: buyerId,
    parent: catalogChannelId,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone, deny: ['VIEW_CHANNEL'] },
    { id: interaction.user.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
        // Allow the seller (assuming sellerId is a valid user ID)
        { id: sellerMember.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }
    ]
  });

  const ticketEmbed = new MessageEmbed()
    .setColor("#00cc44")
    .setTitle("📦 تفاصيل الطلبية")
    .setDescription(`تم قبول طلب شراء **${quantity}** من المنتج في فئة **${typeMap[category]?.emoji || ""} ${typeMap[category]?.label || "غير معروف"}**\n من قبل <@${buyerId}>.\n\n📝 **وصف الطلبية**: \`\`\`${orderText}\`\`\` `)
    .addFields(
      { name: "💰 **السعر الإجمالي**", value: `${price * quantity} 💵`, inline: true },
      { name: "📦 **الكمية المطلوبة**", value: `${quantity}`, inline: true },
      { name: "💰 **سعر الوحدة**", value: `${price} 💵`, inline: true },
    );
const userNickname = interaction.user.username;

// تحديث الزر ليظهر أنه تم استلام الطلب
const row = new MessageActionRow()
  .addComponents(
    new MessageButton()
      .setCustomId('order_received')
      .setLabel(`تم استلام الطلب من ${userNickname}`)
      .setStyle('SUCCESS')
      .setDisabled(true) // تعطيل الزر بعد الاستلام
  );

// إرسال الرد مع تحديث الزر
await interaction.update({
    content: null,
  components: [row], // إضافة الزر المعدل
});
const orderDataString = [
  buyerId,
  category,
  quantity,
  price,
  interaction.user.id
].join("|");

    

    
  const deliveryButton = new MessageButton()
    .setCustomId(`confirm_order|${orderDataString}`)
    .setLabel("تم تسليم")
    .setStyle("SUCCESS");

  const cancelButton = new MessageButton()
      .setCustomId(`cancel_order|${orderDataString}`)

    .setLabel("إلغاء العملية")
    .setStyle("DANGER");

  // إرسال تفاصيل الطلبية في التذكرة
  await ticketChannel.send({
    content: `<@${interaction.user.id}> <@${buyerId}>.`,
    embeds: [ticketEmbed],
    components: [new MessageActionRow().addComponents(deliveryButton, cancelButton)]
  });


await interaction.followUp({
  content: null,
  embeds: [
    new MessageEmbed()
      .setColor('#00FF00') // اللون الأخضر أو أي لون تفضله
      .setTitle('📦 تم استلام الطلبية')
      .setDescription(`**نوع المنتج:** ${typeMap[category]?.label || "غير معروف"}\n**الكمية:** ${quantity}\n**الروم:** ${ticketChannel}`)
      .setTimestamp()
  ],
  components: [], // لو عايز تضيف أزرار تفاعلية
  ephemeral: true // لجعل الرد غير مرئي للمستخدمين الآخرين
});
  }
  
  if (interaction.customId.startsWith("cancel_order|")) {
  const data = interaction.customId.split("|");

     const typeMap = {
        
        kshb: { label: "خشب", emoji: "🪵" },
        mmn3: { label: "ممنوعات", emoji: "🚫" },
        djaj: { label: "دجاج", emoji: "🐔" },
        slh: { label: "أسلحة", emoji: "🔫" },
        other: { label: "أخرى", emoji: "📁" },
        fish: { label: "سمك", emoji: "🐟" },
        vegetables: { label: "خضروات", emoji: "🥦" },
        oil: { label: "نفط", emoji: "🛢️" },
        fabric: { label: "قماش", emoji: "🧵" },
        metals: { label: "معادن", emoji: "⛓️" }
    };
  const buyerId = data[1];
  const category = data[2];
  const quantity = data[3];
  const price = data[4];
      const sellerId = data[5];

   
   
   
      if (interaction.user.id !== sellerId) {
        return await interaction.reply({ content: "❌ **أنت لست بائع لهذا المنتج.**", ephemeral: true });
    }
    const embed3 = interaction.message.embeds[0];
if (!embed3) return interaction.reply({ content: "❌ لم أستطع العثور على بيانات الطلبية.", ephemeral: true });

let description = embed3.description || "غير محدد";

// نجيب كل الكود بلوكات في الرسالة
const codeBlocks = [...description.matchAll(/```([\s\S]*?)```/g)];

let orderText = "غير محدد";

if (codeBlocks.length > 0) {
    // ناخد آخر كود بلوك فقط
    const lastBlock = codeBlocks[codeBlocks.length - 1][1].trim();

    // نقسمه لأسطر
    const lines = lastBlock.split("\n");

    // نحاول نلاقي سطر بعد 📝
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("📝")) {
            const nextLine = lines[i + 1]?.trim();
            if (nextLine) {
                orderText = nextLine;
                found = true;
                break;
            }
        }
    }

    // لو مافيش 📝، ناخد كل محتوى البلوك كبديل
    if (!found) {
        orderText = lastBlock;
    }
}



const orderDataString = [
  buyerId,
  category,
  quantity,
  price,
].join("|");

    
    // إعداد الزر الجديد "قفل"
    const lockButton = new MessageButton()
        .setCustomId('lock_channel')
        .setLabel('قفل القناة')
        .setStyle('DANGER'); // يمكنك تغيير اللون أو الشكل إذا أردت

    // إنشاء الصف الذي يحتوي على الزر الجديد
    const row = new MessageActionRow().addComponents(lockButton);

    // تحديث الرسالة مع تعطيل الأزرار الحالية وإضافة الزر الجديد
    await interaction.update({
        content: "❌ **تم إلغاء العملية. تم إخفاء القناة عن الجميع.**", 
        components: [row], // إضافة الزر الجديد
    });
    
    
  
    
    // إخفاء القناة عن الجميع وإزالة جميع الأذونات
     await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: false }); // إخفاء القناة عن الجميع

    // إزالة الأذونات فقط للأشخاص الذين لديهم أذونات في خصائص القناة
    const permissionOverwrites = interaction.channel.permissionOverwrites.cache;

    permissionOverwrites.forEach((overwrite) => {
            interaction.channel.permissionOverwrites.edit(overwrite.id, { VIEW_CHANNEL: null, SEND_MESSAGES: null }); // إزالة الأذونات
        
    });
    
    const embed = new MessageEmbed()
        .setColor("#FFD700")
        .setTitle("📦 طلبية جديدة")
              .setDescription(`📝 **وصف الطلبية**: \`\`\`${orderText || "لا يوجد وصف"}\`\`\``)

        .addFields(
            { name: "👤 المشتري", value: `<@${buyerId}>`, inline: false },
            { name: "📦 النوع", value: `${typeMap[category]?.emoji || ""} ${typeMap[category]?.label || "غير معروف"}`, inline: true },
            { name: "🔢 الكمية", value: quantity, inline: true },
            { name: "💰 اقل سعر ممكن يدفعه", value: price, inline: true },
        );


const claimButton = new MessageActionRow().addComponents(
  new MessageButton()
    .setCustomId(`claim_order|${orderDataString}`)
    .setLabel("📬 استلام الطلبية")
    .setStyle("PRIMARY")
);

    const targetChannel = interaction.client.channels.cache.get(config.submit_product);
    if (targetChannel) {
        await targetChannel.send({
          content: `<@&${config.seller}>`,
            embeds: [embed],
            components: [claimButton]
        });
    }
    await interaction.channel.setName(`تم-إلغاء-العملية ❌`).catch(() => null);

    }


 if (interaction.customId.startsWith("confirm_order|")) {
  const data = interaction.customId.split("|");

     const typeMap = {
        
        kshb: { label: "خشب", emoji: "🪵" },
        mmn3: { label: "ممنوعات", emoji: "🚫" },
        djaj: { label: "دجاج", emoji: "🐔" },
        slh: { label: "أسلحة", emoji: "🔫" },
        other: { label: "أخرى", emoji: "📁" },
        fish: { label: "سمك", emoji: "🐟" },
        vegetables: { label: "خضروات", emoji: "🥦" },
        oil: { label: "نفط", emoji: "🛢️" },
        fabric: { label: "قماش", emoji: "🧵" },
        metals: { label: "معادن", emoji: "⛓️" }
    };
  const buyerId = data[1];
  const category = data[2];
  const quantity = data[3];
  const price = data[4];
     const sellerId = data[5];

const embed3 = interaction.message.embeds[0];
   
   
   
      if (interaction.user.id !== sellerId) {
        return await interaction.reply({ content: "❌ **أنت لست بائع لهذا المنتج.**", ephemeral: true });
    }
   const logChannel = await interaction.client.channels.fetch(config.log_feedback_shop);

const deliveryEmbed = new MessageEmbed()
  .setColor("#57F287") // لون أخضر يوحي بالنجاح
  .setTitle("📦 **تم تسليم الطلبية**")
  .setDescription(`
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
**تم تسليم الطلبية بنجاح إلى <@${buyerId}> ✅**
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
`)
  .addFields(
    { name: "**🛒 المنتج**", value: `> ${typeMap[category]?.emoji || ""} ${typeMap[category]?.label || "غير معروف"}`, inline: true },
    { name: "**📦 الكمية**", value: `> ${quantity}`, inline: true },
    { name: "**📅 تاريخ التسليم**", value: `> <t:${Math.floor(Date.now()/1000)}:F>`, inline: false }
  )
  .setTimestamp();



const ratingRow = new MessageActionRow().addComponents(
    // 🔴 تقييم 1 - سيء جداً
    new MessageButton()
        .setCustomId(`rate_1_${interaction.user.id}_${buyerId}`)
        .setLabel('⭐ 1 🔴')
        .setStyle('DANGER')
        .setEmoji('😡'),

    // 🟠 تقييم 2 - سيء
    new MessageButton()
        .setCustomId(`rate_2_${interaction.user.id}_${buyerId}`)
        .setLabel('⭐ 2 🟠')
        .setStyle('DANGER')
        .setEmoji('😠'),

    // 🟡 تقييم 3 - مقبول
    new MessageButton()
        .setCustomId(`rate_3_${interaction.user.id}_${buyerId}`)
        .setLabel('⭐ 3 🟡')
        .setStyle('SECONDARY')
        .setEmoji('😐'),

    // 🟢 تقييم 4 - جيد
    new MessageButton()
        .setCustomId(`rate_4_${interaction.user.id}_${buyerId}`)
        .setLabel('⭐ 4 🟢')
        .setStyle('SUCCESS')
        .setEmoji('😊'),

    // 🔵 تقييم 5 - ممتاز
    new MessageButton()
        .setCustomId(`rate_5_${interaction.user.id}_${buyerId}`)
        .setLabel('⭐ 5 🔵')
        .setStyle('SUCCESS')
        .setEmoji('😍')
);

// إرسال الفاتورة مع الأزرار
await logChannel.send({    content:`<@${buyerId}>, <@${interaction.user.id}>`,embeds: [deliveryEmbed], components: [ratingRow] }).catch(() => null);
    // إعداد الزر الجديد "قفل"
    const lockButton = new MessageButton()
        .setCustomId('lock_channel')
        .setLabel('قفل القناة')
        .setStyle('DANGER'); // يمكنك تغيير اللون أو الشكل إذا أردت

    // إنشاء الصف الذي يحتوي على الزر الجديد
    const row = new MessageActionRow().addComponents(lockButton);

    // تحديث الرسالة مع تعطيل الأزرار الحالية وإضافة الزر الجديد
     interaction.update({
        content: `✅ **تم تأكيد تسليم المنتج، وتم إرسال الفاتورة للمشتري.**`,
        components: [row], // إضافة الزر الجديد
    });
  await interaction.channel.setName(`تم-البيع ✅`).catch(() => null);
   
   
 }

  
  if (interaction.customId === "farm_calculator" || interaction.customId === "personal_calculator") {
    // تحديد نوع الحاسبة من الزر المضغوط
    const calculatorType = interaction.customId === "farm_calculator" ? "farm" : "personal";
    
    const modalTitle = `📈 حاسبة ${calculatorType === "farm" ? "المزرعة" : "الشخصية"}`;
    
    const modal = new Modal()
        .setCustomId(`levelup_modal_${calculatorType}`)
        .setTitle(modalTitle);

    let inputs = [];
    
    if (calculatorType === "farm") {
        // حقول المودال للمزرعة
        inputs = [
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("family_level")
                    .setLabel("ما هو لفل العائلة؟")
                    .setStyle("SHORT")
                    .setRequired(true)
            ),
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("family_current_xp")
                    .setLabel("كم XP تمتلك حالياً؟")
                    .setStyle("SHORT")
                    .setRequired(true)
            ),
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("family_target_xp")
                    .setLabel("ما هو XP المطلوب؟")
                    .setStyle("SHORT")
                    .setRequired(true)
            )
        ];
    } else {
        // حقول المودال للحساب الشخصي
        inputs = [
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("current_level")
                    .setLabel("ما هو مستواك الحالي؟")
                    .setStyle("SHORT")
                    .setRequired(true)
            ),
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("current_xp")
                    .setLabel("ما هو XP الحالي لديك؟")
                    .setStyle("SHORT")
                    .setRequired(true)
            ),
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("target_xp")
                    .setLabel("ما هو XP المطلوب للرفع؟")
                    .setStyle("SHORT")
                    .setRequired(true)
            )
        ];
    }
    
    // إضافة المكونات وعرض المودال
    modal.addComponents(...inputs);
    await interaction.showModal(modal);
}
 if (interaction.customId.startsWith("contact_reporter_")) {
   
    const rolesToRemove = [config.rolesellerManager]; // الرتب المسموح لها
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
  
   
    // استخراج sellerId و productMessageId من customId
    const customIdParts = interaction.customId.split("_");
    const userid = customIdParts[2];
               const selectedMember = await interaction.guild.members.fetch(userid).catch(() => null);

                    if (!selectedMember) {
                        return interaction.reply({ content: '❌ حدث خطأ، لم يتم العثور على العضو.', ephemeral: true });
                    }

                    // إنشاء مودال لكتابة الرسالة
                    const modal = new Modal()
                        .setCustomId(`contact_reporter_${selectedMember.id}`)
                        .setTitle('📩 إرسال رسالة للعضو');

                    // حقل إدخال نصي للرسالة
                    const messageInput = new TextInputComponent()
                        .setCustomId('contact_message')
                        .setLabel('📝 اكتب رسالتك هنا:')
                        .setStyle('PARAGRAPH')
                        .setRequired(true); // جعل الحقل مطلوبًا

                    // إضافة الحقل إلى المودال
                    const row = new MessageActionRow().addComponents(messageInput);
                    modal.addComponents(row);

                    // عرض المودال للمستخدم
                    await interaction.showModal(modal);
                } 
  
  
  
  if (interaction.customId === 'create_ticket') {


    const options = Object.entries(config.ticketTypes).map(([key, value]) => ({
      label: getLabel(key),
      value: key,
      emoji: getEmoji(key),
      disabled: !value
    }));

    const selectMenu = new MessageActionRow().addComponents(
      new MessageSelectMenu()
        .setCustomId('ticket_type')
        .setPlaceholder('Choose ticket type')
        .addOptions(options)
    );

    await interaction.reply({
      content: 'Please choose a ticket type:',
      components: [selectMenu],
      ephemeral: true
    });
  }

  
  
  
 if (interaction.customId === 'confirm_close') {
    try {
      
        
        // 🔹 البحث عن التذكرة في قاعدة البيانات
        const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
        if (!ticket) {
            return interaction.channel.delete();
        }

        // 🔹 التحقق مما إذا كانت التذكرة مغلقة مسبقًا
        if (ticket.status === 'closed') {
            return interaction.channel.delete();
        } else {

    // ✅ إرسال التذكرة إلى المستخدم
const topic = interaction.channel.topic;
const userId = topic?.match(/\d{17,}/)?.[0]; // استخراج ID من التوبيك

if (!userId) {
    return interaction.reply({
        content: '❌ لم يتم العثور على ID المستخدم في التوبيك!',
        ephemeral: true
    });
}

await sendTicketTranscript(userId, interaction.channel, interaction.user.id, 'No reason provided.', interaction);
      
        // 🔹 تحديث حالة التذكرة في قاعدة البيانات
        await Ticket.updateOne(
            { _id: ticket._id },
            { 
                status: 'closed',
            }
        );
      await interaction.reply({ content: "Closing the ticket...", ephemeral: true });

          await interaction.channel.delete();
        }




    } catch (error) {
        console.error("❌ حدث خطأ أثناء إغلاق التذكرة:", error);
        await interaction.reply({ content: '❌ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى!', ephemeral: true });
    }

   
   
        } else if (interaction.customId === 'close_with_reason') {
    const allowedRoles = [
        '1342480295819218965',
        '1342480498588520449',
        '1342480586937208852',
        '1342480686107328564',
        '1341094488004886610'
    ];

    // التحقق من امتلاك العضو لأحد الأدوار المسموحة
    if (!interaction.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
        return interaction.reply({ 
            embeds: [new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('⛔ | صلاحيات غير كافية')
                .setDescription('❌ لا يمكنك استخدام هذا الأمر! يجب أن تمتلك أحد **الأدوار الإدارية** المسموحة.')
            ],
            ephemeral: true 
        });
    }
          
            const modal = new Modal()
                .setCustomId('ticket_reason_modal')
                .setTitle('Reason for closing the ticket');

            const reasonInput = new TextInputComponent()
                .setCustomId('close_reason')
                .setLabel('Write the reason for closing')
                .setStyle('PARAGRAPH')
            .setPlaceholder('اشرح السبب')
    .setRequired(true);

            const modalRow = new MessageActionRow().addComponents(reasonInput);
            modal.addComponents(modalRow);

            await interaction.showModal(modal);
          
        } else if (interaction.customId === 'claim_ticket') {
          
      var channel = interaction.channel;

    await channel.send(`✅ Ticket has been claimed by ${interaction.user}`);

    // تعديل الرسالة الأصلية بدلاً من إرسال رد جديد
    await interaction.update({
        content: `🚀 Ticket claimed by ${interaction.user}!`,
        components: interaction.message.components.map(row =>
            new MessageActionRow().addComponents(
                row.components.map(button =>
                    button.customId === 'claim_ticket' ? button.setDisabled(true) : button
                )
            )
        )
    });
       
        } else if (interaction.customId === 'follow_up') {
          const ticketOwnerId = interaction.channel.topic?.match(/\d+/)?.[0];

if (!ticketOwnerId) {
    return interaction.reply({
        content: '❌ لا يمكن تحديد صاحب التذكرة!',
        ephemeral: true
    });
}

// التحقق مما إذا كان المستخدم هو صاحب التذكرة
if (interaction.user.id !== ticketOwnerId) {
    return interaction.reply({
        content: '❌ لا يمكنك استخدام هذا الزر! فقط صاحب التذكرة يمكنه ذلك.',
        ephemeral: true
    });
}
          
        const user = interaction.user;
        const channel = interaction.channel;

        // إرسال التعليمات الأولية
        await interaction.reply({
            content: `⚠️ **أولاً، قبل عملية التقديم:**
- من فضلك خذ **صورة لمستوى الخبرة** لديك.
- قم **بتغيير اسمك داخل اللعبة** بحيث يحتوي على "Escobar" في النهاية، مثل: \`Mahmoud Escobar\`.

عند الانتهاء، اضغط على **"أكمل"** للمتابعة.`,
            components: [
                new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId('complete_application')
                        .setLabel('أكمل')
                        .setStyle('PRIMARY')
                )
            ],
            ephemeral: true
        });
    } else if (interaction.customId === 'complete_application') {
   const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

const user = interaction.user;
let collectedData = {};
const channel = interaction.channel;

let mes = await interaction.reply({
    content: `⏳ لديك **5 دقائق** لإكمال البيانات.
1️⃣ **أرسل اسمك داخل اللعبة:**`,
    fetchReply: true
});

const filter = m => m.author.id === user.id;
const collector = channel.createMessageCollector({ filter, time: 300000 });

let step = 0;
collector.on('collect', async (message) => {
    try {
        if (step === 0) {
            collectedData.username = message.content.trim();
            await message.delete();
            await mes.edit('✅ تم تسجيل اسمك! \n2️⃣ **أرسل الآن الـ ID الخاص بك داخل اللعبة**.');
            step++;
        } else if (step === 1) {
            collectedData.gameId = message.content.trim();
            await message.delete();
            await mes.edit('✅ **تم تسجيل ID!** \n3️⃣ **ما تخصصك في العائلة؟ (إجرام أم مزرعة)**.');
            step++;
        } else if (step === 2) {
            const specialization = message.content.trim().toLowerCase();
       if (!/إجرام|مجرم|إجرامي|مزرعة|زرع|زراعة|فلاح|محصول/.test(specialization)) {
    return message.reply('⚠️ **من فضلك اختر "إجرام" أو "مزرعة" فقط!**').then(msg => {
        setTimeout(() => msg.delete(), 5000);
        setTimeout(() => message.delete(), 5000);
    });
}

            collectedData.specialization = specialization;
            await message.delete();
            await mes.edit('✅ **تم تسجيل تخصصك!** \n4️⃣ **الآن، قم بإرسال صورة لمستوى الخبرة**.');
            step++;
        } else if (step === 3) {
    if (message.attachments.size === 0) {
        return message.reply('⚠️ **يجب إرسال صورة لمستوى الخبرة فقط!**').then(msg => {
            setTimeout(() => msg.delete(), 5000);
            setTimeout(() => message.delete(), 5000);
        });
    }

    const imageUrl = message.attachments.first().url;
    const experienceChannel = message.guild.channels.cache.find(c => c.id === '1345885896825901157');
    if (!experienceChannel) {
        return message.reply('⚠️ **لم يتم العثور على قناة، برجاء إبلاغ الإدارة!**');
    }

    const sentMessage = await experienceChannel.send({ files: [imageUrl] });
    collectedData.experienceImage = sentMessage.attachments.first().url;
    await message.delete();
    await mes.delete();
    collector.stop();
}
  
    } catch (error) {
        console.error('خطأ أثناء جمع البيانات:', error);
    }
});

collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
        await mes.edit('⏳ انتهى الوقت! يمكنك إعادة المحاولة بالضغط على **"متابعة"**.');
        return;
    }

    const embed = new MessageEmbed()
        .setTitle('📝 معلومات التقديم')
        .setColor('#0099ff')
        .addFields([
            { name: '👤 **الاسم داخل اللعبة:**', value: collectedData.username || '❌ غير متوفر', inline: true },
            { name: '🆔 **ID داخل اللعبة:**', value: collectedData.gameId || '❌ غير متوفر', inline: true },
            { name: '🆔 **تخصصك:**', value: collectedData.specialization || '❌ غير متوفر', inline: true }
        ])
        .setFooter('يرجى التأكد من صحة المعلومات قبل الإرسال');

    if (collectedData.experienceImage) {
        embed.setImage(collectedData.experienceImage);
    }

    const embedMessage = await channel.send({
        content: 'يرجى المراجعة ثم الضغط على **تأكيد وإرسال** أو **إلغاء وإعادة المحاولة**.',
        embeds: [embed],
        components: [
            new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('confirm_send')
                    .setLabel('تأكيد وإرسال')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId('cancel_retry')
                    .setLabel('إلغاء وإعادة المحاولة')
                    .setStyle('DANGER')
            )
        ]
    });

    const buttonCollector = embedMessage.createMessageComponentCollector({ time: 60000 });

    buttonCollector.on('collect', async (interaction) => {
        if (interaction.customId === 'cancel_retry') {
            await embedMessage.delete();
            await interaction.reply({ content: '❌ تم إلغاء العملية. يمكنك البدء من جديد.', ephemeral: true });
        } else if (interaction.customId === 'confirm_send') {
            const applicationsChannel = interaction.guild.channels.cache.find(c => c.id === config.applicationsChannel);
            if (!applicationsChannel) {
                return interaction.reply({ content: '⚠️ لم يتم العثور على قناة التقديمات!', ephemeral: true });
            }

            const applicationEmbed = new MessageEmbed()
                .setTitle('📝 طلب تقديم جديد')
                .setColor('#0099ff')
                .addFields([
{ name: '👨**العضو:**', value: interaction.user.toString() || '❌ غير متوفر', inline: true },
                    { name: '👤 **الاسم داخل اللعبة:**', value: collectedData.username || '❌ غير متوفر', inline: true },
                    { name: '🆔 **ID داخل اللعبة:**', value: collectedData.gameId || '❌ غير متوفر', inline: true },
                    { name: '🆔 **تخصصك:**', value: collectedData.specialization || '❌ غير متوفر', inline: true }
                ])
                .setFooter(interaction.user.id);

            if (collectedData.experienceImage) {
                applicationEmbed.setImage(collectedData.experienceImage);
            }

            await applicationsChannel.send({
                content: `<@&${config.ADMIN_ROLE_ID}> **طلب جديد بحاجة للمراجعة**`,
                embeds: [applicationEmbed],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId('accept_application')
                            .setLabel('✅ قبول')
                            .setStyle('SUCCESS'),
                        new MessageButton()
                            .setCustomId('reject_application')
                            .setLabel('❌ رفض')
                            .setStyle('DANGER'),
                        new MessageButton()
                            .setCustomId('reject_with_reason')
                            .setLabel('⚠️ رفض مع سبب')
                            .setStyle('SECONDARY')
                    )
                ]
            });

            await embedMessage.delete();
const embed = new MessageEmbed()
    .setColor('#2F3136') // لون داكن راقي
    .setTitle('📌 تم إرسال طلبك!')
    .setDescription('شكراً لك! سيتم الرد عليك قريبًا.\n\n🔒 سيتم قفل هذه التذكرة خلال **5 ثواني**.');
          
interaction.reply({ embeds: [embed], ephemeral: true });
          setTimeout(async () => {
         // ✅ إرسال نسخة التذكرة للمستخدم

    // ✅ إرسال التذكرة إلى المستخدم
const topic = interaction.channel.topic;
const userId = topic?.match(/\d{17,}/)?.[0]; // استخراج ID من التوبيك

if (!userId) {
    return interaction.reply({
        content: '❌ لم يتم العثور على ID المستخدم في التوبيك!',
        ephemeral: true
    });
}

await sendTicketTranscript(userId, interaction.channel, interaction.client.user.id, 'No reason provided.', interaction);
      
            
        // ✅ حذف القناة بعد الرد بفترة قصيرة
        await channel.delete();
    }, 5000);
        }
    });
});

      } else if (interaction.customId === 'reject_with_reasonplus') {
        
        
        const allowedRoles = [
    '1342480295819218965',
    '1342480498588520449',
    '1342480586937208852',
    '1342480686107328564',
    '1341094488004886610'
];

// التحقق من امتلاك العضو لأحد الأدوار المسموحة
if (!interaction.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
    return interaction.reply({ 
        embeds: [new MessageEmbed()
            .setColor('#FF0000')
            .setTitle('⛔ | صلاحيات غير كافية')
            .setDescription('❌ لا يمكنك استخدام هذا الأمر! يجب أن تمتلك أحد **الأدوار الإدارية** المسموحة.')
        ],
        ephemeral: true 
    });
}

// إنشاء المودال
const modal = new Modal()
    .setCustomId('reject_reason_modal')
    .setTitle('❌ Reject Application');

// إنشاء حقل إدخال السبب
const reasonInput = new TextInputComponent()
    .setCustomId('rejection_reason')
    .setLabel('Enter the reason for rejection:')
    .setStyle('PARAGRAPH')
    .setPlaceholder('Write the reason here...')
    .setRequired(true);

// إضافة الحقل إلى المودال
const row = new MessageActionRow().addComponents(reasonInput);
modal.addComponents(row);

// عرض المودال للمسؤول
await interaction.showModal(modal);

// 📌 **إرسال اللوج إلى قناة تسجيل الأحداث (1350307752135888997)**
const logChannel = interaction.client.channels.cache.get(config.botlogs);

if (logChannel) {
    const logEmbed = new MessageEmbed()
        .setColor('YELLOW')
        .setTitle('⚠️ فتح نموذج رفض الطلب')
        .setDescription(`🔸 **تم عرض نموذج رفض الطلب بواسطة:** <@${interaction.user.id}>`)
        .setFooter({ text: `تم تفعيل المودال بواسطة ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
}

}


        
        
       else if (interaction.customId === 'reject_application') {const allowedRoles = [
    '1342480295819218965',
    '1342480498588520449',
    '1342480586937208852',
    '1342480686107328564',
    '1341094488004886610'
];

// التحقق من امتلاك العضو لأحد الأدوار المسموحة
if (!interaction.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
    return interaction.reply({ 
        embeds: [new MessageEmbed()
            .setColor('#FF0000')
            .setTitle('⛔ | صلاحيات غير كافية')
            .setDescription('❌ لا يمكنك استخدام هذا الأمر! يجب أن تمتلك أحد **الأدوار الإدارية** المسموحة.')
        ],
        ephemeral: true 
    });
}

const msg = await interaction.channel.messages.fetch(interaction.message.id).catch(() => null);
if (msg) await msg.delete().catch(console.error);

const userId = interaction.message.embeds[0]?.footer?.text.match(/\d+/)?.[0];
if (!userId) return interaction.reply({ embeds: [new MessageEmbed().setColor('RED').setDescription('❌ **User ID not found!**')], ephemeral: true });

const member = await interaction.guild.members.fetch(userId).catch(() => null);
if (!member) return interaction.reply({ embeds: [new MessageEmbed().setColor('RED').setDescription('❌ **Member not found in the server!**')], ephemeral: true });

// رسالة تأكيد الرفض في الشات
const rejectionEmbed = new MessageEmbed()
    .setColor('RED')
    .setTitle('❌ Application Rejected')
    .setDescription(`**The application of <@${userId}> has been rejected.**`)
    .addField('🛑 Reason:', 'No reason provided.')
    .setFooter({ text: `Rejected by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

await interaction.reply({ embeds: [rejectionEmbed], ephemeral: true });

// إرسال رسالة خاصة للعضو المرفوض
await member.send({
    embeds: [
        new MessageEmbed()
            .setColor('RED')
            .setTitle('❌ Your Application Has Been Rejected')
            .setDescription(`**Unfortunately, your application has been rejected.**`)
            .addField('🛑 Reason:', 'No reason provided.')
            .addField('👤 Rejected by:', `${interaction.user.username}`)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Server: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
    ]
}).catch(() => console.error(`Could not DM ${member.user.tag}.`));

// 📌 **إرسال اللوج إلى قناة تسجيل الأحداث (1350307752135888997)**
const logChannel = interaction.client.channels.cache.get(config.botlogs);

if (logChannel) {
    const logEmbed = new MessageEmbed()
        .setColor('DARK_RED')
        .setTitle('🚨 رفض طلب انضمام')
        .setDescription(`🔹 **تم رفض طلب العضو:** <@${userId}>`)
        .addField('👤 **تم الرفض بواسطة:**', `<@${interaction.user.id}>`, true)
        .addField('📅 **التاريخ:**', `<t:${Math.floor(Date.now() / 1000)}:F>`, true)
        .addField('🛑 **سبب الرفض:**', 'No reason provided.', false)
        .setFooter({ text: `تم بواسطة ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
}
}
  else if (interaction.customId === 'accept_application') {
   const allowedRoles = [
    '1342480295819218965',
    '1342480498588520449',
    '1342480586937208852',
    '1342480686107328564',
    '1341094488004886610'
];

// معرف قناة اللوج
const logChannelId = config.botlogs;

// دالة تسجيل الأحداث في اللوج
async function logAction(interaction, description, color = 'ORANGE') {
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const logEmbed = new MessageEmbed()
        .setColor(color)
        .setTitle('📜 | Log Event')
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    logChannel.send({ embeds: [logEmbed] });
}

// التحقق من امتلاك العضو لأحد الأدوار المسموحة
if (!interaction.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
    await logAction(interaction, `🚫 **${interaction.user.tag}** حاول استخدام الأمر لكنه لا يملك الصلاحيات!`, 'RED');
    return interaction.reply({
        embeds: [
            new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('⛔ | صلاحيات غير كافية')
                .setDescription('❌ لا يمكنك استخدام هذا الأمر! يجب أن تمتلك أحد **الأدوار الإدارية** المسموحة.')
        ],
        ephemeral: true
    });
}

const msg = await interaction.channel.messages.fetch(interaction.message.id).catch(() => null);
if (msg) await msg.delete().catch(console.error);

// استخراج الـ ID من الفوتر
const userId = interaction.message.embeds[0]?.footer?.text?.match(/\d+/)?.[0];
if (!userId) {
    await logAction(interaction, `❌ **${interaction.user.tag}** حاول استخدام الأمر لكن لم يتم العثور على ID المستخدم!`, 'RED');
    return interaction.reply({
        embeds: [new MessageEmbed().setColor('RED').setDescription('❌ **User ID not found!**')],
        ephemeral: true
    });
}

const member = await interaction.guild.members.fetch(userId).catch(() => null);
if (!member) {
    await logAction(interaction, `❌ **${interaction.user.tag}** حاول استخدام الأمر لكن لم يتم العثور على العضو في السيرفر!`, 'RED');
    return interaction.reply({
        embeds: [new MessageEmbed().setColor('RED').setDescription('❌ **Member not found in the server!**')],
        ephemeral: true
    });
}

// إنشاء Embed لاختيار التخصص
const embed = new MessageEmbed()
    .setColor('BLUE')
    .setTitle('📌 Choose a Role')
    .setDescription(`What is the specialty of <@${userId}>?`);

const row = new MessageActionRow().addComponents(
    new MessageButton().setCustomId(`role_farming_${userId}`).setLabel('🌾 Farming').setStyle('SUCCESS'),
    new MessageButton().setCustomId(`role_crime_${userId}`).setLabel('🔫 Crime').setStyle('DANGER'),
    new MessageButton().setCustomId(`role_together_${userId}`).setLabel('🌾 Farming AND 🔫 Crime').setStyle('PRIMARY')
);

await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

// تسجيل العملية في اللوج
await logAction(interaction, `✅ **${interaction.user.tag}** استخدم الأمر بنجاح لـ <@${userId}>!`, 'GREEN');
  }

// Handling role selection
if (interaction.customId.startsWith('role_')) {
const allowedRoles = [
    '1342480295819218965',
    '1342480498588520449',
    '1342480586937208852',
    '1342480686107328564',
    '1341094488004886610'
];

// معرف روم اللوج
const logChannelId = config.botlogs;

// دالة تسجيل الأحداث في اللوج
async function logAction(interaction, description, color = 'ORANGE') {
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const logEmbed = new MessageEmbed()
        .setColor(color)
        .setTitle('📜 | Log Event')
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    logChannel.send({ embeds: [logEmbed] });
}

// التأكد من الصلاحيات
if (!interaction.member.roles.cache.some(role => allowedRoles.includes(role.id))) {
    await logAction(interaction, `🚫 **${interaction.user.tag}** حاول استخدام الأمر لكنه لا يملك الصلاحيات!`, 'RED');
    return interaction.reply({
        embeds: [new MessageEmbed()
            .setColor('#FF0000')
            .setTitle('⛔ | صلاحيات غير كافية')
            .setDescription('❌ لا يمكنك استخدام هذا الأمر! يجب أن تمتلك أحد **الأدوار الإدارية** المسموحة.')
        ],
        ephemeral: true
    });
}

// استخراج البيانات من customId
const [_, type, userId] = interaction.customId.split('_');
const member = await interaction.guild.members.fetch(userId).catch(() => null);
if (!member) {
    await logAction(interaction, `❌ **${interaction.user.tag}** حاول قبول عضو ولكن لم يتم العثور عليه!`, 'RED');
    return interaction.reply({
        embeds: [new MessageEmbed().setColor('RED').setDescription('❌ **Member not found!**')],
        ephemeral: true
    });
}

// تعيين الرتب بناءً على التخصص
const roles = {
    farming: ['1341094528622264461', '1341094527615762464'],
    crime: ['1341094529721438240', '1341094527615762464'],
    together: ['1341094529721438240', '1341094528622264461', '1341094527615762464']
};

const selectedRoles = roles[type];
if (!selectedRoles) return;

const roleObjects = selectedRoles
    .map(roleid => interaction.guild.roles.cache.get(roleid))
    .filter(role => role); // إزالة القيم غير الموجودة

await member.roles.add(roleObjects);
await logAction(interaction, `✅ **${interaction.user.tag}** قام بإضافة الرتب <@${userId}> (${type.toUpperCase()}) بنجاح!`, 'GREEN');

// التحقق من وجود العضو في الداتابيز
const existingApplication = await Application.findOne({ userId });

if (!existingApplication) {
    await new Application({
        userId,
        acceptedReports: 0,
        pendingReports: 0,
        dailyReports: 0,
        rejectedReports: 0
    }).save();
    await logAction(interaction, `📥 **${interaction.user.tag}** أضاف <@${userId}> إلى قاعدة البيانات لأول مرة!`, 'BLUE');
} else {
    await Application.updateOne(
        { userId },
        { $set: { acceptedReports: 0, pendingReports: 0, dailyReports: 0, rejectedReports: 0 } }
    );
    await logAction(interaction, `🔄 **${interaction.user.tag}** قام بإعادة ضبط بيانات <@${userId}> في قاعدة البيانات!`, 'YELLOW');
}

// إرسال رسالة نجاح
const embedSuccess = new MessageEmbed()
    .setColor('GREEN')
    .setTitle('✅ Member Accepted')
    .setDescription(`**<@${userId}> has been accepted and assigned the appropriate roles!** 🎉`);

await interaction.update({ embeds: [embedSuccess], components: [], ephemeral: true });

// إرسال رسالة للعضو المقبول
await member.send({
    embeds: [
        new MessageEmbed()
            .setColor('GOLD')
            .setTitle('🎉 You Have Been Accepted!')
            .setDescription(`You have been accepted by **${interaction.user.username}**!`)
            .addField('📌 Next Steps:', `🔎 Please check the designated channel: <#1345904472739807282>`)
    ]
});
await logAction(interaction, `📩 **${interaction.user.tag}** أرسل إشعار القبول إلى <@${userId}> بنجاح!`, 'GREEN');
  
} else 
  if (customId === 'clear_reports') {
 const allowedUserIds = ['298011146584064000']; 
    const logChannelId = config.botlogs; // روم اللوج

if (!allowedUserIds.includes(interaction.user.id)) {
    return;
}

const confirmEmbed = new MessageEmbed()
    .setTitle('🗑 تأكيد مسح جميع التقارير')
    .setDescription('⚠️ هل أنت متأكد أنك تريد مسح **جميع التقارير**؟\n\n❗ لا يمكن التراجع عن هذه العملية.')
    .setColor('#FFA500');

const confirmButtons = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId('confirm_clear_reports')
        .setLabel('✅ تأكيد')
        .setStyle('DANGER'),
    new MessageButton()
        .setCustomId('cancel_clear_reports')
        .setLabel('❌ إلغاء')
        .setStyle('SECONDARY')
);

await interaction.reply({ embeds: [confirmEmbed], components: [confirmButtons], ephemeral: true });

// إنشاء اللوج عند التأكيد
const collector = interaction.channel.createMessageComponentCollector({ time: 30000 });


  }

         if (customId === 'confirm_clear_reports') {
           const logChannelId = config.botlogs; // روم اللوج

try {
  await Application.updateMany({}, { 
        acceptedReports: 0,
        pendingReports: 0,
        dailyReports:  0,
        rejectedReports:  0,
        crimeReports:  0,
        agricultureReports: 0,
        lastResetDate: new Date() // ✅ تصحيح التحديث ليكون تاريخًا صحيحًا

    });

  
    const successEmbed = new MessageEmbed()
        .setTitle('✅ تم مسح جميع التقارير')
        .setDescription('✔️ تم تصفير جميع التقارير بنجاح!')
        .setColor('#00FF00');

    await interaction.update({ embeds: [successEmbed], components: [], ephemeral: true });

    // إرسال اللوج في روم اللوج
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        const logEmbed = new MessageEmbed()
            .setTitle('📌 تقرير تصفير البيانات')
            .setDescription(`🗂 **تم تصفير جميع التقارير بواسطة:** ${interaction.user.tag}`)
            .addField('📅 التاريخ:', new Date().toLocaleString(), true)
            .setColor('#FFA500');

        await logChannel.send({ embeds: [logEmbed] });
    }
} catch (error) {
        await interaction.deferUpdate().catch(() => null);
    await interaction.update({ content: '❌ حدث خطأ أثناء تصفير التقارير!', components: [], ephemeral: true });
}
 }

    if (interaction.customId === 'cancel_clear_reports') {const logChannelId = config.botlogs; // روم اللوج

await interaction.update({ 
    content: '❌ تم **إلغاء** عملية مسح جميع التقارير.', 
    components: [], 
    ephemeral: true 
});

// إرسال اللوج في روم اللوج
const logChannel = interaction.guild.channels.cache.get(logChannelId);
if (logChannel) {
    const logEmbed = new MessageEmbed()
        .setTitle('🚫 إلغاء تصفير التقارير')
        .setDescription(`❌ **تم إلغاء عملية تصفير التقارير بواسطة:** ${interaction.user.tag}`)
        .addField('📅 التاريخ:', new Date().toLocaleString(), true)
        .setColor('#FF0000');

    await logChannel.send({ embeds: [logEmbed] });
}
 }

  
  if (customId === 'clear_users_data') {const logChannelId = config.botlogs; // روم اللوج

 const allowedUserIds = ['298011146584064000']; 
if (!allowedUserIds.includes(interaction.user.id)) {
    return;
}

const confirmEmbed = new MessageEmbed()
    .setTitle('🧹 تأكيد مسح جميع بيانات الأعضاء')
    .setDescription('⚠️ هل أنت متأكد أنك تريد **مسح جميع بيانات الأعضاء**؟\n\n❗ لا يمكن التراجع عن هذه العملية.')
    .setColor('#FF4500');

const confirmButtons = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId('confirm_clear_users_data')
        .setLabel('✅ تأكيد')
        .setStyle('DANGER'),
    new MessageButton()
        .setCustomId('cancel_clear_users_data')
        .setLabel('❌ إلغاء')
        .setStyle('SECONDARY')
);

await interaction.reply({ embeds: [confirmEmbed], components: [confirmButtons], ephemeral: true });

// إرسال اللوج في روم اللوج
const logChannel = interaction.guild.channels.cache.get(logChannelId);
if (logChannel) {
    const logEmbed = new MessageEmbed()
        .setTitle('⚠️ محاولة مسح بيانات الأعضاء')
        .setDescription(`🛑 **${interaction.user.tag}** بدأ عملية مسح بيانات الأعضاء.`)
        .addField('📅 التاريخ:', new Date().toLocaleString(), true)
        .setColor('#FFA500');

    await logChannel.send({ embeds: [logEmbed] });
}
}

// عند تأكيد مسح البيانات
if (customId === 'confirm_clear_users_data') {const logChannelId = config.botlogs; // روم اللوج

try {
    // مسح جميع بيانات الأعضاء من `Application`
    await Application.deleteMany({});
    await Leave.deleteMany({});
    await Request.deleteMany({});
    await PaymentSystem.deleteMany({});

    // إزالة الرتب المحددة من جميع الأعضاء الذين يمتلكونها
    const guild = interaction.guild;
    if (!guild) {
        throw new Error("لا يمكن العثور على السيرفر.");
    }

    // جلب جميع الأعضاء
    const members = await guild.members.fetch();

    // قائمة الرتب المراد مسحها
     const allowedRoles = [
       config.topRole,        // @・إشراف العائلة
  config.management,        // @・Mangment
  config.leadManagement,    // @・Lead Mangment
  config.familyManager,     // @・Family Manager
  config.support,           // @・Support
  config.goldFamily,        // @・Gold Family
  config.silverFamily,      // @・Silver Family
  config.bronzeFamily,      // @・Bronze Family
  config.member2,           // @・Member 2
  config.member1,           // @・Member 1
  config.vandal,           // @vandal
  config.Farmer,           // @・Farmer
                 
     ];

    // الرتبة الجديدة التي ستُعطى بعد المسح
    const newRoleId = config.allmemberrole;

    let affectedMembers = 0;

    for (const member of members.values()) {
        const rolesToRemove = member.roles.cache.filter(role => allowedRoles.includes(role.id));

        if (rolesToRemove.size > 0) {
            // إزالة الرتب القديمة
            await member.roles.remove(rolesToRemove);

            // إضافة الرتبة الجديدة
            await member.roles.add(newRoleId);
            
            affectedMembers++;
        }
    }

    const successEmbed = new MessageEmbed()
        .setTitle('✅ تم مسح جميع بيانات الأعضاء')
        .setDescription(`✔️ تم تصفير جميع بيانات الأعضاء بنجاح!\n👥 **${affectedMembers}** عضو تمت إزالة رتبهم وإعطاؤهم الرتبة الجديدة.`)
        .setColor('#00FF00');

    await interaction.update({ embeds: [successEmbed], components: [], ephemeral: true });

    // إرسال اللوج في روم اللوج
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        const logEmbed = new MessageEmbed()
            .setTitle('🚨 مسح بيانات الأعضاء')
            .setDescription(`🔴 **${interaction.user.tag}** قام بمسح جميع بيانات الأعضاء.`)
            .addField('📅 التاريخ:', new Date().toLocaleString(), true)
            .addField('👥 الأعضاء المتأثرين:', `${affectedMembers} عضو`, true)
            .setColor('#FF0000');

        await logChannel.send({ embeds: [logEmbed] });
    }
} catch (error) {
    console.error(error);
    await interaction.update({ content: '❌ حدث خطأ أثناء تصفير بيانات الأعضاء!', components: [], ephemeral: true });

    // تسجيل الخطأ في روم اللوج
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        const errorEmbed = new MessageEmbed()
            .setTitle('❌ خطأ أثناء مسح بيانات الأعضاء')
            .setDescription(`⚠️ **${interaction.user.tag}** حاول مسح البيانات ولكن حدث خطأ.`)
            .addField('📅 التاريخ:', new Date().toLocaleString(), true)
            .addField('❗ تفاصيل الخطأ:', `\`\`\`${error.message}\`\`\``)
            .setColor('#FF4500');

        await logChannel.send({ embeds: [errorEmbed] });
    }
}
}

// إلغاء العملية
if (interaction.customId === 'cancel_clear_users_data') {const logChannelId = config.botlogs; // روم اللوج

await interaction.update({ 
    content: '❌ تم **إلغاء** عملية مسح بيانات الأعضاء.', 
    components: [], 
    ephemeral: true 
});

// تسجيل اللوج في روم اللوج
const logChannel = interaction.guild.channels.cache.get(logChannelId);
if (logChannel) {
    const logEmbed = new MessageEmbed()
        .setTitle('🚫 إلغاء مسح بيانات الأعضاء')
        .setDescription(`🛑 **${interaction.user.tag}** قام بإلغاء عملية مسح بيانات الأعضاء.`)
        .addField('📅 التاريخ:', new Date().toLocaleString(), true)
        .setColor('#FFA500');

    await logChannel.send({ embeds: [logEmbed] });
}
}
else if (customId === 'avatar') {
  const logChannelId = config.botlogs; // معرف روم اللوج
 const allowedUserIds = ['298011146584064000']; 
if (!allowedUserIds.includes(interaction.user.id)) {
    return;
}

const logChannel = interaction.guild.channels.cache.get(logChannelId);

const avatarEmbed = new MessageEmbed()
    .setTitle('تغيير صورة البوت')
    .setDescription('📤 يرجى إرسال رابط الصورة أو رفع صورة مباشرة.')
    .setColor('#00FF00');

await interaction.reply({ embeds: [avatarEmbed], ephemeral: true });

// 📌 تسجيل بداية العملية في اللوج
if (logChannel) {
    const logEmbed = new MessageEmbed()
        .setTitle('🖼️ بدء عملية تغيير صورة البوت')
        .setDescription(`**${interaction.user.tag}** بدأ عملية تغيير صورة البوت.`)
        .setColor('#3498DB')
        .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] });
}

const filter = m => m.author.id === interaction.user.id;
const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

collector.on('collect', async m => {
    await m.delete().catch(() => {});

    let avatarURL;
    let isExternalURL = false;

    if (m.attachments.size > 0) {
        const attachment = m.attachments.first();
        if (attachment?.contentType?.startsWith('image/')) {
            avatarURL = attachment.url;
        } else {
            await interaction.followUp({ content: '❌ الملف ليس صورة.', ephemeral: true });

            // 📌 تسجيل محاولة إرسال ملف غير صالح في اللوج
            if (logChannel) {
                const logEmbed = new MessageEmbed()
                    .setTitle('⚠️ محاولة رفع ملف غير صالح')
                    .setDescription(`**${interaction.user.tag}** حاول رفع ملف غير صالح.`)
                    .setColor('#FF0000')
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
            return collector.stop();
        }
    } else if (m.content.match(/https?:\/\/[^\s]+\.(jpe?g|png|gif)/i)) {
        avatarURL = m.content;
        isExternalURL = true;
    } else {
        await interaction.followUp({ content: '❌ يرجى إرسال صورة صالحة.', ephemeral: true });

        // 📌 تسجيل محاولة إدخال رابط غير صالح في اللوج
        if (logChannel) {
            const logEmbed = new MessageEmbed()
                .setTitle('⚠️ محاولة إدخال رابط غير صالح')
                .setDescription(`**${interaction.user.tag}** حاول إدخال رابط غير صالح.`)
                .setColor('#FF0000')
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
        return collector.stop();
    }

    const targetChannel = interaction.guild.channels.cache.get(config.botlogs);
    if (!targetChannel?.isText()) {
        await interaction.followUp({ content: '❌ الروم غير صالح.', ephemeral: true });

        // 📌 تسجيل فشل العملية بسبب روم غير صالح
        if (logChannel) {
            const logEmbed = new MessageEmbed()
                .setTitle('⚠️ فشل عملية تغيير الصورة')
                .setDescription(`**${interaction.user.tag}** حاول تغيير الصورة لكن الروم غير صالح.`)
                .setColor('#FF0000')
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
        return collector.stop();
    }

    try {
        let file;
        if (isExternalURL) {
            const response = await fetch(avatarURL);
            const buffer = await response.buffer();
            file = new MessageAttachment(buffer, 'avatar.png');
        }

        const sentMessage = await targetChannel.send({
            content: '🖼️ تم استلام الصورة:',
            files: [file || avatarURL]
        });

        const confirmEmbed = new MessageEmbed()
            .setTitle('تأكيد التغيير')
            .setImage(sentMessage.attachments.first()?.url || avatarURL)
            .setColor('#FFA500');

        const confirmButtons = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId(`confirm_change_avatar:${sentMessage.id}`)
                .setLabel('✅ تأكيد')
                .setStyle('SUCCESS'),
            new MessageButton()
                .setCustomId('cancel_change_avatar')
                .setLabel('❌ إلغاء')
                .setStyle('DANGER')
        );

        await interaction.followUp({
            embeds: [confirmEmbed],
            components: [confirmButtons],
            ephemeral: true
        });

        // 📌 تسجيل نجاح استقبال الصورة
        if (logChannel) {
            const logEmbed = new MessageEmbed()
                .setTitle('✅ تم استلام صورة جديدة')
                .setDescription(`**${interaction.user.tag}** أرسل صورة جديدة بنجاح.`)
                .setColor('#00FF00')
                .setImage(sentMessage.attachments.first()?.url || avatarURL)
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }

    } catch (error) {
        console.error(error);
        await interaction.followUp({
            content: '❌ فشل إرسال الصورة.',
            ephemeral: true
        });

        // 📌 تسجيل فشل العملية بسبب خطأ تقني
        if (logChannel) {
            const logEmbed = new MessageEmbed()
                .setTitle('⚠️ خطأ أثناء تغيير الصورة')
                .setDescription(`**${interaction.user.tag}** حاول تغيير الصورة ولكن حدث خطأ.`)
                .setColor('#FF0000')
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }

    collector.stop();
});

collector.on('end', collected => {
    if (collected.size === 0) {
        interaction.followUp({
            content: '⌛ انتهى الوقت دون إرسال صورة.',
            ephemeral: true
        });

        // 📌 تسجيل انتهاء المهلة بدون إرسال صورة
        if (logChannel) {
            const logEmbed = new MessageEmbed()
                .setTitle('⌛ انتهاء المهلة')
                .setDescription(`**${interaction.user.tag}** لم يرسل أي صورة قبل انتهاء الوقت.`)
                .setColor('#FFA500')
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] });
        }
    }
});
}

if (customId.startsWith('confirm_change_avatar')) {const logChannelId = config.botlogs; // معرف روم اللوج

const messageId = customId.split(':')[1];
const targetChannel = interaction.guild.channels.cache.get(config.botlogs);

try {
    const sentMessage = await targetChannel.messages.fetch(messageId);
    const imageURL = sentMessage.attachments.first()?.url; // الرابط من المرفق

    if (!imageURL) throw new Error('لا توجد صورة');

    await client.user.setAvatar(imageURL);
    await interaction.update({ content: '✅ تم التغيير!', components: [], ephemeral: true });

    // حذف الرسالة من الروم المحدد (اختياري)
    await sentMessage.delete().catch(() => {});

    // إرسال لوج بنجاح التغيير
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel?.isText()) {
        logChannel.send(`✅ **${interaction.user.tag}** قام بتغيير صورة البوت بنجاح.\n🔗 **الرابط:** ${imageURL}`);
    }

} catch (error) {
    await interaction.update({ content: '❌ فشل التغيير.', components: [], ephemeral: true });

    // إرسال لوج بفشل العملية
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel?.isText()) {
        logChannel.send(`❌ **${interaction.user.tag}** حاول تغيير صورة البوت لكنه فشل.\n⚠️ **السبب:** ${error.message}`);
    }
}
}

if (customId === 'cancel_change_avatar') {
  const logChannelId = config.botlogs; // معرف روم اللوج

await interaction.update({
    content: '❌ تم الإلغاء.',
    components: [],
    embeds: [],
    ephemeral: true
});

// إرسال لوج بإلغاء العملية
const logChannel = interaction.guild.channels.cache.get(logChannelId);
if (logChannel?.isText()) {
    logChannel.send(`❌ **${interaction.user.tag}** قام بإلغاء تغيير صورة البوت.`);
}
}

//
   if (interaction.customId === 'end_leave') {
   const logChannelId = config.botlogs; // معرف روم اللوج

 const rolesaloow = [ 
  config.topRole,        // @・إشراف العائلة
  config.management,        // @・Mangment
  config.leadManagement,    // @・Lead Mangment
  config.familyManager,     // @・Family Manager
  config.support,           // @・Support
  config.goldFamily,        // @・Gold Family
  config.silverFamily,      // @・Silver Family
  config.bronzeFamily,      // @・Bronze Family
  config.member2,           // @・Member 2
  config.member1,           // @・Member 1
  config.vandal,           // @vandal
  config.Farmer,           // @・Farmer
  "1367145421885018244",
             "1367145423638233098",
  "1367145414180081785",
  "1367145424665841798",
  "1367145449768751136",
  "1367145451492479078",
  "1367180421892149328",
             config.familyrole,           // @・Farmer

            ];

// التحقق من امتلاك العضو لأحد الأدوار المسموحة
if (!interaction.member.roles.cache.some(role => rolesaloow.includes(role.id))) {
    return interaction.reply({ content: `❌ ليس لديك الصلاحية لإنهاء الإجازة.`, ephemeral: true });
}

const existingLeave = await Leave.findOne({ userId: interaction.user.id, status: "مقبولة" });

if (!existingLeave) {
    return interaction.reply({ content: `⚠ ليس لديك أي إجازات نشطة حاليًا.`, ephemeral: true });
}

const endDate = new Date(existingLeave.endDate).toLocaleDateString('ar-EG');

// استخراج أسماء الرتب التي يحملها المستخدم
const userRoles = interaction.member.roles.cache
    .filter(role => rolesaloow.includes(role.id))
    .map(role => `<@&${role.id}>`) // يضيف منشن للرتب
    .join(', ');

const confirmButtons = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId('confirm_end_leave')
        .setLabel('✅ نعم، إنهاء الإجازة')
        .setStyle('DANGER'),

    new MessageButton()
        .setCustomId('cancel_end_leave')
        .setLabel('❌ إلغاء')
        .setStyle('SECONDARY')
);

await interaction.reply({
    content: `🔔 **إجازتك ستنتهي في ${endDate}**\nهل أنت متأكد أنك تريد إنهاءها الآن؟`,
    components: [confirmButtons],
    ephemeral: true
});

// تسجيل المحاولة في روم اللوج
const logChannel = interaction.guild.channels.cache.get(logChannelId);
if (logChannel?.isText()) {
    logChannel.send(`📌 **${interaction.user.tag}** حاول إنهاء إجازته التي تنتهي في **${endDate}**.\n🎭 **الرتب المسموحة التي يحملها:** ${userRoles}\n🕒 الوقت: <t:${Math.floor(Date.now() / 1000)}:F>`);
}
}

if (interaction.customId === 'confirm_end_leave') {const logChannelId = config.botlogs; // معرف روم اللوج
const leaveRoleIds = [config.vacation, config.familyrole]; // الرتب التي يجب إزالتها عند إنهاء الإجازة

const existingLeave = await Leave.findOne({ userId: interaction.user.id, status: "مقبولة" });

if (!existingLeave) {
    return interaction.update({ content: `⚠ ليس لديك أي إجازات نشطة حاليًا.`, components: [] });
}

const guild = client.guilds.cache.get(config.serverid); // ضع ID السيرفر
if (!guild) return interaction.update({ content: "❌ لم يتم العثور على السيرفر.", components: [] });

const member = await guild.members.fetch(interaction.user.id).catch(() => null);
if (!member) return interaction.update({ content: "❌ لم يتم العثور على حسابك في السيرفر.", components: [] });

// جلب جميع الرتب الحالية في السيرفر
const serverRoles = guild.roles.cache.map(role => role.id);

// تصفية الرتب الأصلية من الرتب غير الموجودة في السيرفر
const validRoles = existingLeave.previousRoles?.filter(role => serverRoles.includes(role)) || [];

try {
    // إزالة رتب الإجازة
    await member.roles.remove(leaveRoleIds).catch(console.error);

    // استعادة الرتب الأصلية إن وجدت
    if (validRoles.length > 0) {
        await member.roles.add(validRoles).catch(console.error);
    }

    // إرسال إشعار خاص للمستخدم
    await member.send(`✅ لقد أنهيت إجازتك مبكرًا، وتمت استعادة رتبك الأصلية.`).catch(() => null);

    // حذف بيانات الإجازة من قاعدة البيانات
    await existingLeave.deleteOne();

    await interaction.update({ content: `✅ تم إنهاء الإجازة بنجاح، وتمت إعادة رتبك الأصلية.`, components: [] });

    // تسجيل المحاولة في اللوج
    const logChannel = guild.channels.cache.get(logChannelId);
    if (logChannel?.isText()) {
        logChannel.send(`📌 **${interaction.user.tag}** قام بإنهاء إجازته.\n🎭 **تمت إعادة الرتب الأصلية:** ${validRoles.map(r => `<@&${r}>`).join(', ') || 'لا توجد رتب مستعادة'}\n🕒 الوقت: <t:${Math.floor(Date.now() / 1000)}:F>`);
    }
} catch (error) {
    console.error("❌ خطأ أثناء إنهاء الإجازة:", error);
    await interaction.update({ content: `❌ حدث خطأ أثناء إنهاء الإجازة. الرجاء المحاولة مرة أخرى لاحقًا.`, components: [] });
}
}

if (interaction.customId === 'cancel_end_leave') {const logChannelId = config.botlogs; // معرف روم اللوج

try {
    await interaction.update({ content: `🚫 تم إلغاء طلب إنهاء الإجازة.`, components: [] });

    // تسجيل المحاولة في اللوج
    const guild = client.guilds.cache.get(config.serverid);
    const logChannel = guild?.channels.cache.get(logChannelId);

    if (logChannel?.isText()) {
        logChannel.send(`❌ **${interaction.user.tag}** قام بإلغاء طلب إنهاء الإجازة.\n🕒 الوقت: <t:${Math.floor(Date.now() / 1000)}:F>`);
    }
} catch (error) {
    console.error("❌ خطأ أثناء إلغاء طلب الإجازة:", error);
}
}


  if (interaction.customId === 'request_leave') {const logChannelId = config.botlogs; // معرف روم اللوج

 const rolesaloow = [ 
  config.topRole,        // @・إشراف العائلة
  config.management,        // @・Mangment
  config.leadManagement,    // @・Lead Mangment
  config.familyManager,     // @・Family Manager
  config.support,           // @・Support
  config.goldFamily,        // @・Gold Family
  config.silverFamily,      // @・Silver Family
  config.bronzeFamily,      // @・Bronze Family
  config.member2,           // @・Member 2
  config.member1,           // @・Member 1
  config.vandal,           // @vandal
  config.Farmer,           // @・Farmer
  "1367145421885018244",
             "1367145423638233098",
  "1367145414180081785",
  "1367145424665841798",
  "1367145449768751136",
  "1367145451492479078",
  "1367180421892149328",
             config.familyrole,           // @・Farmer

            ];
// التحقق من امتلاك العضو لأحد الأدوار المسموحة
if (!interaction.member.roles.cache.some(role => rolesaloow.includes(role.id))) {
    await interaction.reply({ content: `🚫 لا تمتلك الصلاحية لطلب إجازة.`, ephemeral: true });

    // تسجيل المحاولة في اللوج
    const guild = client.guilds.cache.get(config.serverid);
    const logChannel = guild?.channels.cache.get(logChannelId);
    if (logChannel?.isText()) {
        logChannel.send(`❌ **${interaction.user.tag}** حاول طلب إجازة دون امتلاك الصلاحية.\n🕒 الوقت: <t:${Math.floor(Date.now() / 1000)}:F>`);
    }

    return;
}

const existingLeave = await Leave.findOne({ userId: interaction.user.id, status: "مقبولة" });

if (existingLeave) {
    return interaction.reply({ 
        content: `⚠ لديك بالفعل إجازة مقبولة حتى **${new Date(existingLeave.endDate).toLocaleDateString('ar-EG')}**!`, 
        ephemeral: true 
    });
}

const modal = new Modal()
    .setCustomId('leave_request_form')
    .setTitle('طلب إجازة');

const leaveTypeInput = new TextInputComponent()
    .setCustomId('leave_type')
    .setLabel("نوع الإجازة")
    .setStyle('SHORT')
    .setPlaceholder('سنوية, مرضية, طارئة, أخرى')
    .setRequired(true);

const startDateInput = new TextInputComponent()
    .setCustomId('start_date')
    .setLabel("تاريخ بدء الإجازة (YYYY-MM-DD)")
    .setStyle('SHORT')
    .setRequired(true);

const endDateInput = new TextInputComponent()
    .setCustomId('end_date')
    .setLabel("تاريخ نهاية الإجازة (YYYY-MM-DD)")
    .setStyle('SHORT')
    .setRequired(true);

const reasonInput = new TextInputComponent()
    .setCustomId('reason')
    .setLabel("سبب الإجازة")
    .setStyle('PARAGRAPH')
    .setRequired(false);

// إضافة الحقول إلى المودال
modal.addComponents(
    new MessageActionRow().addComponents(leaveTypeInput),
    new MessageActionRow().addComponents(startDateInput),
    new MessageActionRow().addComponents(endDateInput),
    new MessageActionRow().addComponents(reasonInput)
);

await interaction.showModal(modal);
}
  
  
  //
  
  
  
  if (customId === 'bot_name') {
    const logChannelId = config.botlogs; // معرف قناة اللوج
 const allowedUserIds = ['298011146584064000']; 
    const nameChangeCooldown = new Map();

    if (!allowedUserIds.includes(interaction.user.id)) {
        await interaction.reply({ content: '🚫 ليس لديك إذن لتغيير اسم البوت.', ephemeral: true });

        // إرسال اللوج عند محاولة غير مصرح بها
        const logChannel = client.channels.cache.get(logChannelId);
        if (logChannel) {
            logChannel.send(`❌ **${interaction.user.tag}** حاول تغيير اسم البوت بدون إذن.\n🕒 <t:${Math.floor(Date.now() / 1000)}:F>`);
        }
        return;
    }

    // التحقق من التكرار خلال الساعة
    const lastChange = nameChangeCooldown.get(interaction.user.id);
    if (lastChange && (Date.now() - lastChange) < 3600000) {
        return interaction.reply({ 
            content: '⚠ لا يمكنك تغيير اسم البوت أكثر من مرتين في الساعة.', 
            ephemeral: true 
        });
    }

    // إرسال واجهة الإدخال
    const nameEmbed = new MessageEmbed()
        .setTitle('✏️ تغيير اسم البوت')
        .setDescription('**يرجى إرسال الاسم الجديد خلال 60 ثانية:**\n- الحد الأقصى 32 حرفًا\n- لا يمكن تغيير الاسم أكثر من مرتين كل ساعة')
        .setColor('#00FF00');

    await interaction.reply({ embeds: [nameEmbed], ephemeral: true });

    // إنشاء مجمع الرسائل
    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async m => {
        await m.delete().catch(() => {});

        const newName = m.content.trim();
        if (newName.length > 32) {
            return interaction.followUp({ content: '❌ لا يمكن أن يتجاوز الاسم 32 حرفًا!', ephemeral: true });
        }

        // إرسال واجهة التأكيد
        const confirmEmbed = new MessageEmbed()
            .setTitle('⚠️ تأكيد تغيير الاسم')
            .setDescription(`هل أنت متأكد من تغيير الاسم إلى:\n**${newName}**؟`)
            .setColor('#FFA500');

        const confirmButtons = new MessageActionRow().addComponents(
            new MessageButton().setCustomId(`confirm_name_change:${newName}`).setLabel('✅ تأكيد').setStyle('SUCCESS'),
            new MessageButton().setCustomId('cancel_name_change').setLabel('❌ إلغاء').setStyle('DANGER')
        );

        await interaction.followUp({
            content: '**تم استلام الاسم الجديد، يرجى التأكيد:**',
            embeds: [confirmEmbed],
            components: [confirmButtons],
            ephemeral: true
        });

        // تسجيل التغيير في الكول داون
        nameChangeCooldown.set(interaction.user.id, Date.now());

        // إرسال لوج للإدخال
        const logChannel = client.channels.cache.get(logChannelId);
        if (logChannel) {
            logChannel.send(`📩 **${interaction.user.tag}** قام بإدخال اسم جديد: **${newName}**\n🕒 <t:${Math.floor(Date.now() / 1000)}:F>`);
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            interaction.followUp({ content: '⌛ انتهى الوقت دون إدخال اسم!', ephemeral: true });

            // إرسال لوج لانتهاء المهلة
            const logChannel = client.channels.cache.get(logChannelId);
            if (logChannel) {
                logChannel.send(`⏳ **${interaction.user.tag}** لم يقم بإدخال اسم جديد في الوقت المحدد.\n🕒 <t:${Math.floor(Date.now() / 1000)}:F>`);
            }
        }
    });

    }

// معالجة أحداث الأزرار
if (customId.startsWith('confirm_name_change')) {
  const newName = interaction.customId.split(':')[1];
    const logChannelId = config.botlogs; // معرف قناة اللوج

    try {
        await client.user.setUsername(newName);

        await interaction.update({
            content: `✅ تم تغيير الاسم بنجاح إلى: **${newName}**`,
            components: [],
            embeds: [],
            ephemeral: true
        });

        // إرسال اللوج إلى القناة المحددة
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const successEmbed = new MessageEmbed()
                .setTitle('🔄 تم تغيير اسم البوت')
                .setDescription(`👤 بواسطة: ${interaction.user}\n🆕 الاسم الجديد: **${newName}**`)
                .setColor('#00FF00')
                .setTimestamp();

            await logChannel.send({ embeds: [successEmbed] });
        }

    } catch (error) {
        console.error(error);

        await interaction.update({
            content: '❌ فشل التغيير! قد تكون هناك قيود زمنية من ديسكورد.',
            components: [],
            embeds: [],
            ephemeral: true
        });

        // إرسال لوج الخطأ
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const errorEmbed = new MessageEmbed()
                .setTitle('⚠️ فشل تغيير اسم البوت')
                .setDescription(`👤 بواسطة: ${interaction.user}\n🆕 الاسم المطلوب: **${newName}**\n❌ **الخطأ:** ${error.message}`)
                .setColor('#FF0000')
                .setTimestamp();

            await logChannel.send({ embeds: [errorEmbed] });
        }
    }
}

if (customId === 'cancel_name_change') { const logChannelId = config.botlogs; // معرف قناة اللوج

    await interaction.update({
        content: '❌ تم إلغاء عملية تغيير الاسم.',
        components: [],
        embeds: [],
        ephemeral: true
    });

    // إرسال اللوج إلى القناة المحددة
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        const cancelEmbed = new MessageEmbed()
            .setTitle('❌ تم إلغاء تغيير الاسم')
            .setDescription(`👤 بواسطة: ${interaction.user}`)
            .setColor('#FFA500')
            .setTimestamp();

        await logChannel.send({ embeds: [cancelEmbed] });
    }
}

  
      // ============ About Command ============

if (interaction.customId === 'add_status') {
 
 const allowedUserIds = ['298011146584064000']; 
  const logChannelId = config.botlogs; // معرف قناة اللوج
 if (!allowedUserIds.includes(interaction.user.id)) {
        return;
    }

    const promptEmbed = new MessageEmbed()
        .setTitle("📝 إضافة حالة جديدة")
        .setDescription("أرسل اسم الحالة الجديدة خلال 60 ثانية:")
        .setColor("#00FF00");

    await interaction.reply({ embeds: [promptEmbed], ephemeral: true });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async m => {
        await m.delete().catch(() => {});

        const newStatusName = m.content.trim();

        const typeEmbed = new MessageEmbed()
            .setTitle("📝 اختيار نوع الحالة")
            .setDescription(`اختر نوع الحالة لـ: **${newStatusName}**`)
            .setColor("#00FF00");

        const typeButtons = new MessageActionRow().addComponents(
            new MessageButton().setCustomId(`select_status_type:${newStatusName}:PLAYING`).setLabel("PLAYING").setStyle("PRIMARY"),
            new MessageButton().setCustomId(`select_status_type:${newStatusName}:WATCHING`).setLabel("WATCHING").setStyle("PRIMARY"),
            new MessageButton().setCustomId(`select_status_type:${newStatusName}:LISTENING`).setLabel("LISTENING").setStyle("PRIMARY"),
            new MessageButton().setCustomId(`select_status_type:${newStatusName}:COMPETING`).setLabel("COMPETING").setStyle("PRIMARY")
        );

        await interaction.editReply({ embeds: [typeEmbed], components: [typeButtons] });

        // إرسال اللوج إلى قناة اللوج
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new MessageEmbed()
                .setTitle("📌 حالة جديدة مضافة")
                .setDescription(`👤 بواسطة: ${interaction.user}\n✏️ الحالة: **${newStatusName}**`)
                .setColor("#00FF00")
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            interaction.followUp({
                content: '⌛ انتهى الوقت دون إدخال اسم الحالة!',
                ephemeral: true
            });

            // إرسال اللوج عند انتهاء الوقت بدون إدخال
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const timeoutEmbed = new MessageEmbed()
                    .setTitle("⌛ لم يتم إدخال حالة")
                    .setDescription(`👤 بواسطة: ${interaction.user}`)
                    .setColor("#FF0000")
                    .setTimestamp();

                logChannel.send({ embeds: [timeoutEmbed] });
            }
        }
    });
}

if (interaction.customId.startsWith('select_status_type:')) {const logChannelId = config.botlogs; // معرف قناة اللوج
 await interaction.deferUpdate().catch(() => null);

    const [_, newStatusName, type] = interaction.customId.split(':');

    const confirmEmbed = new MessageEmbed()
        .setTitle("⚠️ تأكيد إضافة الحالة")
        .setDescription(`هل أنت متأكد من إضافة الحالة:\n**${newStatusName}** بنوع **${type}**؟`)
        .setColor("#FFA500");

    const confirmButtons = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`confirm_add_status:${newStatusName}:${type}`).setLabel("✅ تأكيد").setStyle("SUCCESS"),
        new MessageButton().setCustomId("cancel_add_status").setLabel("❌ إلغاء").setStyle("DANGER")
    );

    await interaction.editReply({ embeds: [confirmEmbed], components: [confirmButtons] });

    // إرسال اللوج إلى قناة اللوج عند بدء عملية التأكيد
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        const logEmbed = new MessageEmbed()
            .setTitle("📌 طلب تأكيد إضافة حالة")
            .setDescription(`👤 بواسطة: ${interaction.user}\n✏️ الحالة: **${newStatusName}**\n🎮 النوع: **${type}**`)
            .setColor("#FFA500")
            .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
    }
                                                            }

if (interaction.customId.startsWith('confirm_add_status:')) {
  const logChannelId = config.botlogs; // معرف قناة اللوج

        await interaction.deferUpdate().catch(() => null);
        const [_, newStatusName, type] = interaction.customId.split(':');

        try {
            const botData = await BotSettings.findOne({ botId: client.user.id }) || await BotSettings.create({ botId: client.user.id, statuses: [] });

            botData.statuses.push({ name: newStatusName, type: type });
            await botData.save();

            await interaction.editReply({ 
                content: `✅ تمت إضافة الحالة **${newStatusName}** بنوع **${type}** بنجاح!`, 
                components: [], 
                embeds: [] 
            });

            // إرسال اللوج عند نجاح الإضافة
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new MessageEmbed()
                    .setTitle("✅ تمت إضافة حالة جديدة")
                    .setDescription(`👤 بواسطة: ${interaction.user}\n✏️ الحالة: **${newStatusName}**\n🎮 النوع: **${type}**`)
                    .setColor("#00FF00")
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply({ 
                content: '❌ فشل إضافة الحالة! تأكد من اتصال قاعدة البيانات.', 
                components: [], 
                embeds: [] 
            });

            // إرسال اللوج عند حدوث خطأ
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const errorEmbed = new MessageEmbed()
                    .setTitle("⚠️ خطأ في إضافة الحالة")
                    .setDescription(`👤 بواسطة: ${interaction.user}\n❌ خطأ: **${error.message}**`)
                    .setColor("#FF0000")
                    .setTimestamp();

                await logChannel.send({ embeds: [errorEmbed] });
            }
        }
    }

    if (interaction.customId === 'cancel_add_status') {
      const logChannelId = config.botlogs; // معرف قناة اللوج

        await interaction.deferUpdate().catch(() => null);
        await interaction.editReply({ 
            content: "❌ تم إلغاء عملية إضافة الحالة.", 
            components: [], 
            embeds: [] 
        });

        // إرسال اللوج عند الإلغاء
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new MessageEmbed()
                .setTitle("❌ تم إلغاء إضافة الحالة")
                .setDescription(`👤 بواسطة: ${interaction.user}`)
                .setColor("#FF0000")
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        }
    }
// زر عرض الحالات
if (interaction.customId === 'botstatusme') {const logChannelId = config.botlogs; // معرف قناة اللوج
 const allowedUserIds = ['298011146584064000']; 
                                             
    if (!allowedUserIds.includes(interaction.user.id)) {
        return;
    }

    const botData = await BotSettings.findOne({ botId: client.user.id }) || await BotSettings.create({ botId: client.user.id, statuses: [] });

    const statusList = botData.statuses.length 
        ? botData.statuses.map(s => `- **${s.name}** \`(${s.type})\``).join("\n") 
        : "🚫 لا توجد حالات مخصصة.";

    const statusEmbed = new MessageEmbed()
        .setTitle("📜 قائمة حالات البوت")
        .setColor("#00FF00")
        .setDescription(statusList);

    await interaction.reply({ embeds: [statusEmbed], ephemeral: true });

    // إرسال اللوج عند عرض القائمة
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (logChannel) {
        const logEmbed = new MessageEmbed()
            .setTitle("📢 تم عرض قائمة الحالات")
            .setDescription(`👤 بواسطة: ${interaction.user}\n📋 عدد الحالات: **${botData.statuses.length}**`)
            .setColor("#007BFF")
            .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
    }
                                            } 

// زر تعديل الحالة (Status)
  if (interaction.customId === 'delete_status') {
const logChannelId = config.botlogs; // معرف قناة اللوج
 const allowedUserIds = ['298011146584064000']; 
    if (!allowedUserIds.includes(interaction.user.id)) {
        return;
    }

    try {
        let botData = await BotSettings.findOne({ botId: client.user.id });

        if (!botData || !botData.statuses.length) {
            return interaction.reply({ content: '❌ لا توجد حالات متاحة لحذفها.', ephemeral: true });
        }

        let statuses = botData.statuses;
        let page = 0;
        let maxPerPage = 5;
        let totalPages = Math.ceil(statuses.length / maxPerPage);

        function generateEmbed(page) {
            let start = page * maxPerPage;
            let end = start + maxPerPage;
            let statusList = statuses.slice(start, end)
                .map((s, i) => `**${start + i + 1}.** ${s.name} - \`${s.type}\``)
                .join('\n');

            return new MessageEmbed()
                .setTitle('🗑 حذف حالة من حالات البوت')
                .setDescription(statusList || 'لا توجد حالات.')
                .setColor('#E74C3C')
                .setFooter(`صفحة ${page + 1} من ${totalPages}`);
        }

        function generateButtons(page) {
            let start = page * maxPerPage;
            let end = Math.min(start + maxPerPage, statuses.length);

            let buttons = statuses.slice(start, end).map((_, i) =>
                new MessageButton()
                    .setCustomId(`delete_status_${start + i}`)
                    .setLabel(`🗑 حذف ${start + i + 1}`)
                    .setStyle('DANGER')
            );

            let navButtons = [
                new MessageButton()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ السابق')
                    .setStyle('SECONDARY')
                    .setDisabled(page === 0),
                new MessageButton()
                    .setCustomId('next_page')
                    .setLabel('➡️ التالي')
                    .setStyle('SECONDARY')
                    .setDisabled(page === totalPages - 1)
            ];

            return [new MessageActionRow().addComponents(buttons), new MessageActionRow().addComponents(navButtons)];
        }

        let embedMessage = await interaction.reply({
            embeds: [generateEmbed(page)],
            components: generateButtons(page),
            ephemeral: true, // الرسالة خاصة فقط للشخص اللي ضغط الزر
            fetchReply: true
        });

        const collector = embedMessage.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                return buttonInteraction.reply({ content: '❌ لا يمكنك التحكم في هذا!', ephemeral: true });
            }

            let logChannel = interaction.guild.channels.cache.get(logChannelId);

            if (buttonInteraction.customId === 'prev_page') {
                page--;
                if (logChannel) {
                    logChannel.send(`🔄 **${interaction.user.tag}** انتقل إلى الصفحة السابقة (${page + 1}/${totalPages}).`);
                }
            } else if (buttonInteraction.customId === 'next_page') {
                page++;
                if (logChannel) {
                    logChannel.send(`🔄 **${interaction.user.tag}** انتقل إلى الصفحة التالية (${page + 1}/${totalPages}).`);
                }
            } else if (buttonInteraction.customId.startsWith('delete_status_')) {
                let index = parseInt(buttonInteraction.customId.split('_')[2]);
                let deletedStatus = statuses[index];

                statuses.splice(index, 1);
                await BotSettings.updateOne({ botId: client.user.id }, { statuses });

                if (logChannel) {
                    const logEmbed = new MessageEmbed()
                        .setTitle("🗑 تم حذف حالة")
                        .setDescription(`📌 **${deletedStatus.name}** - \`${deletedStatus.type}\`\n👤 **بواسطة:** ${interaction.user}`)
                        .setColor("#FF0000")
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] });
                }

                if (statuses.length === 0) {
                    return buttonInteraction.update({ content: '✅ تم حذف جميع الحالات!', embeds: [], components: [], ephemeral: true });
                }

                totalPages = Math.ceil(statuses.length / maxPerPage);
                page = Math.min(page, totalPages - 1);
            }

            await buttonInteraction.update({
                embeds: [generateEmbed(page)],
                components: generateButtons(page),
                ephemeral: true
            });
        });
    } catch (err) {
        console.error(err);
        interaction.reply({ content: '❌ حدث خطأ أثناء حذف الحالة.', ephemeral: true });
    }
}

      if (interaction.customId === 'on_vacation') {
         await interaction.deferReply({ ephemeral: true });
        
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
    // جلب الأعضاء الذين لديهم إجازة حالية
    const today = new Date();
    let members = await Leave.find({
      startDate: { $lte: today }, // الإجازة بدأت بالفعل
      endDate: { $gte: today },   // الإجازة لم تنته بعد
      status: 'مقبولة' // الإجازة مقبولة فقط
    });

    // التأكد مرة أخرى بعد ثانية واحدة لتجنب الأخطاء المحتملة
    if (!members.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      members = await Leave.find({
        startDate: { $lte: today },
        endDate: { $gte: today },
        status: 'مقبولة'
      });
    }

    // إذا لم يكن هناك أعضاء في إجازة
    if (!members.length) {
      return interaction.editReply({ content: '✅ لا يوجد أعضاء في إجازة حاليًا!', ephemeral: true });
    }

    let currentPage = 0;
    const pageSize = 10;
    const totalPages = Math.ceil(members.length / pageSize);

    const generateEmbed = (page) => {
      const start = page * pageSize;
      const end = start + pageSize;
      const pageMembers = members.slice(start, end);

      const embed = new MessageEmbed()
        .setTitle('🌴 قائمة الأعضاء في إجازة')
        .setColor('#3498DB')
        .setDescription(
          pageMembers
            .map((member, index) =>
              `**${start + index + 1}.** <@${member.userId}> 
              🏷️ **النوع:** ${member.leaveType || 'غير محدد'}
              📅 **من:** ${member.startDate.toDateString()} 
              📅 **إلى:** ${member.endDate.toDateString()}
              📝 **السبب:** ${member.reason}`
            )
            .join('\n\n') || '🚫 لا يوجد أعضاء في هذه الصفحة.'
        )
        .setFooter(`صفحة ${page + 1} من ${totalPages}`);

      return embed;
    };

    const generateButtons = (page) => {
      return new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('prev_page_on_vacation')
          .setLabel('⬅️ السابق')
          .setStyle('PRIMARY')
          .setDisabled(page === 0),
        new MessageButton()
          .setCustomId('next_page_on_vacation')
          .setLabel('➡️ التالي')
          .setStyle('PRIMARY')
          .setDisabled(page === totalPages - 1)
      );
    };

    const msg = await interaction.editReply({
      embeds: [generateEmbed(currentPage)],
      components: [generateButtons(currentPage)], ephemeral: true
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (btn) => {
      if (!['prev_page_on_vacation', 'next_page_on_vacation'].includes(btn.customId)) return;
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: '❌ لا يمكنك استخدام هذه الأزرار!', ephemeral: true });
      }

      btn.customId === 'next_page_on_vacation' ? currentPage++ : currentPage--;

      await btn.update({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)], ephemeral: true
      });

      collector.resetTimer();
    });

    collector.on('end', async () => {
      await msg.edit({ components: [] }).catch(() => {});
    });
        
      }
  
  
  
  
    if (interaction.customId === 'all_reports') {
        await interaction.deferReply({ ephemeral: true });

  const roleId = config.familyrole; // معرف الرتبة المطلوبة لتصفية الأعضاء

  // جلب جميع الأعضاء في السيرفر الذين لديهم الرتبة المطلوبة
  const membersWithRole = await interaction.guild.members.fetch()
    .then(members => members.filter(member => member.roles.cache.has(roleId)));

  if (membersWithRole.size === 0) {
    return interaction.editReply({ content: '❌ لا يوجد أعضاء بهذه الرتبة.', ephemeral: true });
  }

  // جلب جميع المستخدمين المسجلين في Application_user وتصفية من لديهم الرتبة
  const allUsers = await Application_user.find({});
  const filteredUsers = allUsers.filter(user => membersWithRole.has(user.userId)); // التصفية حسب الرتبة

  if (filteredUsers.length === 0) {
    return interaction.editReply({ content: '🚫 لا يوجد أعضاء مطابقون في قاعدة البيانات.', ephemeral: true });
  }

  const usersData = filteredUsers.map(user => ({
    username: user.User_name,
    userId: user.userId,
    acceptedReports: user.acceptedReports,
    totalReports: user.acceptedReports + user.pendingReports + user.rejectedReports
  }));

  usersData.sort((a, b) => b.totalReports - a.totalReports); // ترتيب حسب عدد التقارير الكلي

      let currentPage = 0;
      const pageSize = 10;
      const totalPages = Math.ceil(usersData.length / pageSize);

      function generateEmbed(page) {
        const start = page * pageSize;
        const end = start + pageSize;
        const pageUsers = usersData.slice(start, end);

        const embed = new MessageEmbed()
          .setColor(config.COLOR)
          .setTitle('📄 تقارير الأعضاء المؤهلين')
          .setDescription(
            pageUsers.length > 0
              ? pageUsers.map((user, index) => 
                `**${start + index + 1}.** <@${user.userId}> - **${user.acceptedReports}** مقبولة | **${user.totalReports}** إجمالي`
              ).join('\n')
              : '🚫 لا يوجد أعضاء مطابقون للفلترة'
          )
          .setFooter({ text: `صفحة ${page + 1} من ${totalPages}` });

        return embed;
      }

      function generateButtons(page) {
        return new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId('prev_page')
            .setLabel('⬅️ السابق')
            .setStyle('PRIMARY')
            .setDisabled(page === 0),
          new MessageButton()
            .setCustomId('next_page')
            .setLabel('➡️ التالي')
            .setStyle('PRIMARY')
            .setDisabled(page === totalPages - 1),
          new MessageButton()
            .setCustomId('close_pagination')
            .setLabel('🗑️ إغلاق')
            .setStyle('DANGER')
        );
      }

      const msg = await interaction.editReply({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)]
      });

      const filter = (i) => i.user.id === interaction.user.id;
      const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async (i) => {
        if (i.customId === 'prev_page') {
          currentPage = Math.max(currentPage - 1, 0);
        } else if (i.customId === 'next_page') {
          currentPage = Math.min(currentPage + 1, totalPages - 1);
        } else if (i.customId === 'close_pagination') {
          await i.update({ embeds: [generateEmbed(currentPage)], components: [] });
          collector.stop();
          return;
        }

        await i.update({ embeds: [generateEmbed(currentPage)], components: [generateButtons(currentPage)] });
        collector.resetTimer();
      });

      collector.on('end', () => {
        msg.edit({ embeds: [generateEmbed(currentPage)], components: [] }).catch(() => {});
      });
    }
  
  
   if (interaction.customId === 'not_paid_insurance') {
    await interaction.deferReply({ ephemeral: true });

    const rolesToRemove = [config.support]; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000']; 
     const requiredRole = config.familyrole; // الرتبة التي يجب أن يمتلكها العضو

    if (
        !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
        !allowedUserIds.includes(interaction.user.id)
    ) {
        return interaction.reply({
            content: '❌ ليس لديك الصلاحية لاستخدام هذا الأمر.',
            ephemeral: true
        });
    }

    let members = await PaymentSystem.find({ insurancePaymentStatus: { $ne: "paid" } });

    if (!members.length) {
        return interaction.editReply({ 
            content: '✅ جميع الأعضاء دفعوا التأمين، لا يوجد أحد متأخر!', 
            ephemeral: true 
        });
    }

    // جلب أعضاء السيرفر وتصفية الذين لديهم الرتبة المطلوبة فقط
    const guildMembers = await interaction.guild.members.fetch();
    members = members.filter(member => {
        const guildMember = guildMembers.get(member.userId);
        return guildMember && guildMember.roles.cache.has(requiredRole);
    });

    if (!members.length) {
        return interaction.editReply({ 
            content: '✅ لا يوجد أعضاء متأخرون عن الدفع ولديهم الرتبة المحددة!', 
            ephemeral: true 
        });
    }

    let currentPage = 0;
    const pageSize = 10;
    const totalPages = Math.ceil(members.length / pageSize);

    const generateEmbed = (page) => {
        const start = page * pageSize;
        const end = start + pageSize;
        const pageMembers = members.slice(start, end);

        const embed = new MessageEmbed()
            .setTitle('❌ قائمة الأعضاء الذين لم يدفعوا التأمين')
            .setColor('#FF0000')
            .setDescription(
                pageMembers
                    .map((member, index) => `**${start + index + 1}.** <@${member.userId}> <:sheroo:1212469660860022905>`)
                    .join('\n') || '🚫 لا يوجد أعضاء في هذه الصفحة.'
            )
            .setFooter(`صفحة ${page + 1} من ${totalPages}`);

        return embed;
    };

    const generateButtons = (page) => {
        const row = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('prev_page_not_paid')
                .setLabel('⬅️ السابق')
                .setStyle('DANGER')
                .setDisabled(page === 0),
            new MessageButton()
                .setCustomId('next_page_not_paid')
                .setLabel('➡️ التالي')
                .setStyle('DANGER')
                .setDisabled(page === totalPages - 1)
        );
        return row;
    };

    const msg = await interaction.editReply({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)], 
        ephemeral: true
    });

    const collector = msg.createMessageComponentCollector({
        time: 60000 // حذف الأزرار بعد 60 ثانية من عدم التفاعل
    });

    collector.on('collect', async (btn) => {
        if (!['prev_page_not_paid', 'next_page_not_paid'].includes(btn.customId)) return;
        if (btn.user.id !== interaction.user.id) {
            return btn.reply({ content: '❌ لا يمكنك استخدام هذه الأزرار!', ephemeral: true });
        }

        btn.customId === 'next_page_not_paid' ? currentPage++ : currentPage--;

        await btn.update({
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)], 
            ephemeral: true
        });

        collector.resetTimer(); // إعادة ضبط المؤقت عند التفاعل
    });

    collector.on('end', async () => {
        await msg.edit({ components: [] }).catch(() => {});
    });
}

    

if (interaction.customId === 'paid_insurance') {
    await interaction.deferReply({ ephemeral: true });
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
const arabFamilyRoles = [  
  config.topRole,        // @・إشراف العائلة
  config.management,        // @・Mangment
  config.leadManagement,    // @・Lead Mangment
  config.familyManager,     // @・Family Manager
  config.support,           // @・Support
  config.goldFamily,        // @・Gold Family
  config.silverFamily,      // @・Silver Family
  config.bronzeFamily,      // @・Bronze Family
  config.member2,           // @・Member 2
  config.member1,           // @・Member 1
  config.vandal,           // @vandal
  config.Farmer,           // @・Farmer
    config.familyrole, 

];
    // جلب الأعضاء اللي دفعوا التأمين
    let members = await PaymentSystem.find({ insurancePaymentStatus: 'paid' });

    // جلب الأعضاء من السيرفر
    let guildMembers = await interaction.guild.members.fetch();

    // تصفية الأعضاء بحيث يكونوا في السيرفر ويمتلكون إحدى الرتب المحددة
    let filteredMembers = members.filter(member => {
        let guildMember = guildMembers.get(member.userId);
        return guildMember && guildMember.roles.cache.hasAny(...arabFamilyRoles);
    });

    // التحقق من حالة الإجازة لكل عضو
    for (let member of filteredMembers) {
        let guildMember = guildMembers.get(member.userId);
        let isOnLeave = guildMember.roles.cache.has(config.vacation) // لديه رتبة الإجازة
            || await Leave.exists({ userId: member.userId, status: 'مقبولة' }); // مسجل في قاعدة بيانات الإجازات

        member.isOnLeave = isOnLeave;
    }

    // لو ما في أعضاء بعد الفلترة
    if (!filteredMembers.length) {
        return interaction.editReply({ content: '✅ كل الأعضاء المدفوعين ليس لديهم الرتب المطلوبة!', ephemeral: true });
    }

    // إعداد الصفحات
    let currentPage = 0;
    const pageSize = 10;
    const totalPages = Math.ceil(filteredMembers.length / pageSize);

    const generateEmbed = (page) => {
        const start = page * pageSize;
        const end = start + pageSize;
        const pageMembers = filteredMembers.slice(start, end);

        const embed = new MessageEmbed()
            .setTitle('✅ قائمة الأعضاء الذين دفعوا التأمين')
            .setColor('#00FF00')
            .setDescription(
                pageMembers
                    .map((member, index) => {
                        let leaveText = member.isOnLeave ? ' 🏖️ (إجازة)' : '';
                        return `**${start + index + 1}.** <@${member.userId}>${leaveText}`;
                    })
                    .join('\n') || '🚫 لا يوجد أعضاء في هذه الصفحة.'
            )
            .setFooter(`صفحة ${page + 1} من ${totalPages}`);

        return embed;
    };

    const generateButtons = (page) => {
        return new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('prev_page_paid')
                .setLabel('⬅️ السابق')
                .setStyle('PRIMARY')
                .setDisabled(page === 0),
            new MessageButton()
                .setCustomId('next_page_paid')
                .setLabel('➡️ التالي')
                .setStyle('PRIMARY')
                .setDisabled(page === totalPages - 1)
        );
    };

    const msg = await interaction.editReply({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)],
        ephemeral: true
    });

    const collector = msg.createMessageComponentCollector({
        time: 60000 // حذف الأزرار بعد 60 ثانية من عدم التفاعل
    });

    collector.on('collect', async (btn) => {
        if (!['prev_page_paid', 'next_page_paid'].includes(btn.customId)) return;
        if (btn.user.id !== interaction.user.id) {
            return btn.reply({ content: '❌ لا يمكنك استخدام هذه الأزرار!', ephemeral: true });
        }

        btn.customId === 'next_page_paid' ? currentPage++ : currentPage--;

        await btn.update({
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)],
            ephemeral: true
        });

        collector.resetTimer();
    });

    collector.on('end', async () => {
        await msg.edit({ components: [] }).catch(() => {});
    });
}
  
  
if (interaction.customId === 'edit_status') {
  
const logChannelId = config.botlogs;
 const allowedUserIds = ['298011146584064000']; 
    if (!allowedUserIds.includes(interaction.user.id)) {
        return;
    }

    try {
        let botData = await BotSettings.findOne({ botId: client.user.id });
        if (!botData || !botData.statuses.length) {
            return interaction.reply({ content: '❌ لا توجد حالات متاحة.', ephemeral: true });
        }

        let statuses = botData.statuses;
        let page = 0;
        let maxPerPage = 5;
        let totalPages = Math.ceil(statuses.length / maxPerPage);

        function generateEmbed(page) {
            let start = page * maxPerPage;
            let end = start + maxPerPage;
            let statusList = statuses.slice(start, end)
                .map((s, i) => `**${start + i + 1}.** ${s.name} - \`${s.type}\``)
                .join('\n');

            return new MessageEmbed()
                .setTitle('⚙️ إدارة حالات البوت')
                .setDescription(statusList || 'لا توجد حالات.')
                .setColor('#3498DB')
                .setFooter(`صفحة ${page + 1} من ${totalPages}`);
        }

        function generateButtons(page) {
            let start = page * maxPerPage;
            let end = Math.min(start + maxPerPage, statuses.length);

            let buttons = statuses.slice(start, end).map((_, i) =>
                new MessageButton()
                    .setCustomId(`edit_status_${start + i}`)
                    .setLabel(`✏ تعديل ${start + i + 1}`)
                    .setStyle('PRIMARY')
            );

            let navButtons = [
                new MessageButton().setCustomId('prev_page').setLabel('⬅️ السابق').setStyle('SECONDARY').setDisabled(page === 0),
                new MessageButton().setCustomId('next_page').setLabel('➡️ التالي').setStyle('SECONDARY').setDisabled(page === totalPages - 1)
            ];

            return [new MessageActionRow().addComponents(buttons), new MessageActionRow().addComponents(navButtons)];
        }

        let embedMessage = await interaction.reply({
            embeds: [generateEmbed(page)],
            components: generateButtons(page),
            ephemeral: true,
            fetchReply: true
        });

        const collector = embedMessage.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                return buttonInteraction.reply({ content: '❌ لا يمكنك التحكم في هذا!', ephemeral: true });
            }

            let logChannel = interaction.guild.channels.cache.get(logChannelId);

            if (buttonInteraction.customId === 'prev_page') {
                page--;
            } else if (buttonInteraction.customId === 'next_page') {
                page++;
            } else if (buttonInteraction.customId.startsWith('edit_status_')) {
                let index = parseInt(buttonInteraction.customId.split('_')[2]);
                let selectedStatus = statuses[index];
                
                const typeEmbed = new MessageEmbed()
                    .setTitle('📝 تعديل الحالة')
                    .setDescription(`**اختر نوع الحالة الجديد لـ:** ${selectedStatus.name}`)
                    .setColor('#00FF00');

                const typeButtons = new MessageActionRow().addComponents(
                    new MessageButton().setCustomId(`status_type:PLAYING_${index}`).setLabel('PLAYING').setStyle('PRIMARY'),
                    new MessageButton().setCustomId(`status_type:WATCHING_${index}`).setLabel('WATCHING').setStyle('PRIMARY'),
                    new MessageButton().setCustomId(`status_type:LISTENING_${index}`).setLabel('LISTENING').setStyle('PRIMARY'),
                    new MessageButton().setCustomId(`status_type:COMPETING_${index}`).setLabel('COMPETING').setStyle('PRIMARY')
                );

                return buttonInteraction.update({ embeds: [typeEmbed], components: [typeButtons], ephemeral: true });
            } else if (buttonInteraction.customId.startsWith('status_type:')) {
                let [_, type, index] = buttonInteraction.customId.split('_');
                index = parseInt(index);
                statuses[index].type = type;
                await BotSettings.updateOne({ botId: client.user.id }, { statuses });

                if (logChannel) {
                    const logEmbed = new MessageEmbed()
                        .setTitle('🔄 تم تعديل حالة')
                        .setDescription(`📌 **${statuses[index].name}** - تم تغييره إلى \`${type}\`
👤 **بواسطة:** ${interaction.user}`)
                        .setColor('#FFA500')
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] });
                }

                return buttonInteraction.update({ content: '✅ تم تحديث الحالة بنجاح!', embeds: [], components: [], ephemeral: true });
            }

            await buttonInteraction.update({
                embeds: [generateEmbed(page)],
                components: generateButtons(page),
                ephemeral: true
            });
        });
    } catch (err) {
        console.error(err);
        interaction.reply({ content: '❌ حدث خطأ أثناء معالجة الطلب.', ephemeral: true });
    }
} 
     if (interaction.customId === "remove_family") {
  
      await interaction.deferReply({ ephemeral: true });



         const rolesToRemove = [config.AllianceManager]; // الرتب المسموح لها
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
    const families = await Family.find();
    if (families.length === 0) return interaction.editReply({ content: "❌ لا توجد عائلات متاحة للحذف.", components: [], embeds: [] });

    let page = 0;
    const maxPerPage = 5;
    const totalPages = Math.ceil(families.length / maxPerPage);

    const generateEmbed = (page) => {
        const start = page * maxPerPage;
        const end = start + maxPerPage;
        const currentFamilies = families.slice(start, end);

        const embed = new MessageEmbed()
            .setTitle("🗑️ حذف العائلة")
            .setColor("RED")
            .setFooter(`صفحة ${page + 1} من ${totalPages}`)
            .setDescription("اضغط على اسم العائلة لحذفها نهائيًا.");

        currentFamilies.forEach((family, index) => {
            embed.addField(
                `🏡 ${index + 1 + start}. ${family.familyName}`,
                `👑 **المالك:** <@${family.ownerId}>`
            );
        });

        return embed;
    };

    const generateButtons = (page) => {
        const start = page * maxPerPage;
        const end = start + maxPerPage;
        const currentFamilies = families.slice(start, end);

        const row = new MessageActionRow();
        currentFamilies.forEach((family, index) => {
            row.addComponents(
                new MessageButton()
                    .setCustomId(`delete_${family._id}`)
                    .setLabel(`${index + 1 + start} - ${family.familyName}`)
                    .setStyle("DANGER")
            );
        });

        return [
            row,
            new MessageActionRow().addComponents(
                new MessageButton().setCustomId("prev_page").setLabel("⬅️ السابق").setStyle("PRIMARY").setDisabled(page === 0),
                new MessageButton().setCustomId("next_page").setLabel("➡️ التالي").setStyle("PRIMARY").setDisabled(page === totalPages - 1)
            )
        ];
    };

    const reply = await interaction.editReply({
        embeds: [generateEmbed(page)],
        components: generateButtons(page)
    });

    const filter = (btn) => btn.user.id === interaction.user.id;
    const collector = reply.createMessageComponentCollector({ filter, time: 30000 });

    collector.on("collect", async (btn) => {
        await btn.deferUpdate().catch(() => null);

        if (btn.customId === "prev_page" && page > 0) page--;
        if (btn.customId === "next_page" && page < totalPages - 1) page++;

        if (btn.customId.startsWith("delete_")) {
            const familyId = btn.customId.replace("delete_", "");
            const family = await Family.findById(familyId);
            if (!family) return interaction.reply({ content: "❌ العائلة غير موجودة!", ephemeral: true });

            const guild = interaction.guild;
            const logChannel = guild.channels.cache.get(config.botlogs); // روم اللوج

            try {
                const rolesToDelete = new Set([
                    family.familyRoleId,
                    family.adminRoleId,
                    family.memberRoleId,
                    ...(family.adminRolesIds || []),
                    ...(family.memberRolesIds || [])
                ].filter(Boolean));

                const channelsToDelete = new Set([
                    family.familyChannelId,
              //      family.voiceChannelId,
                //    family.chatChannelId,
                    family.adminChannelId,
                    ...(family.channelsIds || [])
                ].filter(Boolean));

                let deletedRoles = [];
                let deletedChannels = [];

                if (rolesToDelete.size > 0) {
                    await Promise.all(
                        [...rolesToDelete].map(async (roleId) => {
                            const role = await guild.roles.fetch(roleId).catch(() => null);
                            if (role) {
                                await role.delete();
                                deletedRoles.push(`<@&${role.id}>`);
                            }
                        })
                    );
                }

                if (channelsToDelete.size > 0) {
                    await Promise.all(
                        [...channelsToDelete].map(async (channelId) => {
                            const channel = await guild.channels.fetch(channelId).catch(() => null);
                            if (channel) {
                                await channel.delete();
                                deletedChannels.push(`<#${channel.id}>`);
                            }
                        })
                    );
                }
const familyRoleIdToRemove = config.TeamFamily;



await Promise.all(
    [...family.members, ...family.admins].map(async (memberId) => {
        const member = await guild.members.fetch(memberId).catch(() => null);
        if (member) {
            if (member.roles.cache.has(familyRoleIdToRemove)) {
                await member.roles.remove(familyRoleIdToRemove).catch(() => null);
            }
                await member.setNickname(null).catch(() => null); 
            
        }
    })
);

                await Family.findByIdAndDelete(familyId);
                families.splice(families.findIndex(f => f._id.toString() === familyId), 1);

                if (logChannel) {
                    const logEmbed = new MessageEmbed()
                        .setTitle("📛 تم حذف عائلة")
                        .setColor("RED")
                        .addField("📌 اسم العائلة:", `**${family.familyName}**`, true)
                        .addField("👑 المالك:", `<@${family.ownerId}>`, true)
                        .addField("🗑️ المحذوفات:", `• **${deletedRoles.length}** رتبة\n• **${deletedChannels.length}** قناة`, false)
                        .addField("🛠️ المحذوف بواسطة:", `<@${interaction.user.id}>`, false)
                        .setTimestamp();

                    logChannel.send({ embeds: [logEmbed] });
                }

                if (families.length === 0) 
                    return interaction.editReply({ content: "❌ لا توجد عائلات متاحة للحذف.", components: [], embeds: [] });

                page = Math.min(page, totalPages - 1);

            } catch (error) {
                console.error("❌ حدث خطأ أثناء حذف العائلة:", error);
                if (logChannel) {
                    logChannel.send(`❌ **خطأ أثناء حذف العائلة:** \n\`\`\`${error}\`\`\``);
                }
            }
        }

        await interaction.editReply({
            embeds: [generateEmbed(page)],
            components: generateButtons(page)
        });

        collector.resetTimer();
    });

    collector.on("end", async () => {

        await interaction.editReply({ components: [] });
    });
}

  
 if (interaction.customId === "list_families") {
   
    await interaction.deferReply({ ephemeral: true });

         const rolesToRemove = [config.AllianceManager]; // الرتب المسموح لها
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
  
    const families = await Family.find();
    if (families.length === 0) return interaction.editReply("❌ لا توجد عائلات مسجلة حتى الآن.");

    let page = 0;
    const logChannel = interaction.guild.channels.cache.get(config.botlogs);

    if (logChannel) {
        logChannel.send(`📜 **تم فتح قائمة العائلات بواسطة** <@${interaction.user.id}>.`);
    }

    const generateEmbed = (page, showMembers = false) => {
        const family = families[page];
        const embed = new MessageEmbed()
            .setTitle(`🏡 ${family.familyName}`)
            .setColor("BLUE")
            .setFooter(`عائلة ${page + 1} من ${families.length}`);

        if (!showMembers) {
            embed.setDescription(
                    `👑 **المالك:** <@${family.ownerId}>\n🎭 **رتبة العائلة:** <@&${family.familyRoleId}>\n🔑 **كلمة مرور الأعضاء:** ||${family.memberPassword}||\n🔑 **كلمة مرور الإدمن:** ||${family.adminPassword}||\n📢 **روم الأدارة:** ${family.adminChannelId ? `<#${family.adminChannelId}>` : "لا يوجد"}`

              //  `👑 **المالك:** <@${family.ownerId}>\n🎭 **رتبة العائلة:** <@&${family.familyRoleId}>\n🔑 **كلمة مرور الأعضاء:** ||${family.memberPassword}||\n🔑 **كلمة مرور الإدمن:** ||${family.adminPassword}||\n📢 **روم العائلة:** ${family.familyChannelId ? `<#${family.familyChannelId}>` : "لا يوجد"}\n🔊 **الروم الصوتي:** ${family.voiceChannelId ? `<#${family.voiceChannelId}>` : "لا يوجد"}\n💬 **روم الدردشة:** ${family.chatChannelId ? `<#${family.chatChannelId}>` : "لا يوجد"}`
            );
        } else {
            let membersList = `👑 **المالك:** <@${family.ownerId}>\n`;
            const admins = family.admins?.filter(id => id !== family.ownerId).slice(0, 10) ?? [];
            const members = family.members
                ?.filter(id => id !== family.ownerId && !admins.includes(id))
                .slice(0, 10 - admins.length) ?? [];

            if (admins.length > 0) {
                membersList += `🛡️ **الأدمنية:**\n${admins.map(id => `- <@${id}> (أدمن)`).join("\n")}\n`;
            }
            if (members.length > 0) {
                membersList += `👥 **الأعضاء:**\n${members.map(id => `- <@${id}>`).join("\n")}`;
            }

            embed.setDescription(membersList || "❌ لا يوجد أعضاء.");
        }

        return embed;
    };

    const row = (showMembers) => new MessageActionRow().addComponents(
        new MessageButton().setCustomId("prev_page").setLabel("⬅️ السابق").setStyle("PRIMARY").setDisabled(page === 0),
        new MessageButton().setCustomId("toggle_members").setLabel(showMembers ? "🔙 العودة" : "👥 عرض الأعضاء").setStyle("SECONDARY"),
        new MessageButton().setCustomId("next_page").setLabel("➡️ التالي").setStyle("PRIMARY").setDisabled(page === families.length - 1)
    );

    const reply = await interaction.editReply({ embeds: [generateEmbed(page)], components: [row(false)] });

    const filter = (btn) => btn.user.id === interaction.user.id;
    const collector = reply.createMessageComponentCollector({ filter, time: 60000 });

    let showMembers = false;

    collector.on("collect", async (btn) => {
        await btn.deferUpdate().catch(() => null);

        if (btn.customId === "prev_page" && page > 0) {
            page--;
            showMembers = false;
            if (logChannel) logChannel.send(`⏪ **${interaction.user.username}** انتقل للصفحة السابقة (${page + 1}).`);
        }
        if (btn.customId === "next_page" && page < families.length - 1) {
            page++;
            showMembers = false;
            if (logChannel) logChannel.send(`⏩ **${interaction.user.username}** انتقل للصفحة التالية (${page + 1}).`);
        }
        if (btn.customId === "toggle_members") {
            showMembers = !showMembers;
            if (logChannel) logChannel.send(`👥 **${interaction.user.username}** ${showMembers ? "عرض" : "أخفى"} الأعضاء في العائلة (${families[page].familyName}).`);
        }

        await interaction.editReply({
            embeds: [generateEmbed(page, showMembers)],
            components: [row(showMembers)]
        });

        collector.resetTimer();
    });

    collector.on("end", async () => {

        await interaction.editReply({ components: [] });
        if (logChannel) logChannel.send(`⏳ **انتهى التفاعل مع قائمة العائلات** لـ <@${interaction.user.id}>.`);
    });
}

if (interaction.customId === "add_family") {
  
    await interaction.deferReply({ ephemeral: true });


// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};


  
   
         const rolesToRemove = [config.AllianceManager]; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000']; 
                if (
                    !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
                    !allowedUserIds.includes(interaction.user.id)
                ) {
                          await sendLog(interaction.guild, '❌ محاولة استخدام غير مصرح بها', `المستخدم <@${interaction.user.id}> حاول استخدام الأمر بدون صلاحية.`, 'RED');
                    return interaction.reply({
                        content: '❌ ليس لديك الصلاحية لاستخدام هذا الأمر.',
                        ephemeral: true
                    });
                }
  

    const userId = interaction.user.id;
    let familyData = {};

    const askQuestion = async (question) => {
        await interaction.editReply({ content: question });
        return new Promise((resolve) => {
            const filter = (response) => response.author.id === userId;
            interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] })
                .then(collected => {
                    const userMessage = collected.first();
                    const answer = userMessage.content;
                    userMessage.delete().catch(console.error);
                    resolve(answer);
                })
                .catch(() => resolve(null));
        });
    };

    const generatePassword = () => Math.random().toString(36).substring(2, 10);

    familyData.familyName = await askQuestion('📝 قم بكتابة اسم العيلة:');
    if (!familyData.familyName) {
        await sendLog(interaction.guild, '❌ إلغاء العملية', `المستخدم <@${interaction.user.id}> ألغى العملية بسبب عدم إدخال اسم العائلة.`, 'RED');
        return interaction.editReply('❌ لم يتم إدخال الاسم، تم الإلغاء.');
    }

    const existingFamily = await Family.findOne({ familyName: familyData.familyName });
    if (existingFamily) {
        await sendLog(interaction.guild, '❌ محاولة إنشاء عائلة موجودة', `المستخدم <@${interaction.user.id}> حاول إنشاء عائلة باسم "${familyData.familyName}" ولكنها موجودة بالفعل.`, 'RED');
        return interaction.editReply('❌ العائلة موجودة بالفعل، اختر اسمًا آخر.');
    }

    let ownerInput = await askQuestion('👑 قم بكتابة أو منشن آي دي مالك العيلة:');
    if (!ownerInput) {
        await sendLog(interaction.guild, '❌ إلغاء العملية', `المستخدم <@${interaction.user.id}> ألغى العملية بسبب عدم تحديد مالك العائلة.`, 'RED');
        return interaction.editReply('❌ لم يتم تحديد المالك، تم الإلغاء.');
    }

    familyData.ownerId = ownerInput.replace(/[<@!>]/g, '');

    const reviewEmbed = new MessageEmbed()
        .setTitle('📋 مراجعة بيانات العائلة')
        .setDescription(`**اسم العيلة:** ${familyData.familyName}\n**مالك العيلة:** <@${familyData.ownerId}>`)
        .setColor('BLUE');

    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId('confirm_family').setLabel('✅ تأكيد الإنشاء').setStyle('SUCCESS'),
        new MessageButton().setCustomId('cancel_family').setLabel('❌ إلغاء').setStyle('DANGER')
    );

    const reviewMessage = await interaction.editReply({ embeds: [reviewEmbed], components: [row], fetchReply: true });

    const collector = reviewMessage.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async (btn) => {
        if (btn.user.id !== userId) {
            await sendLog(interaction.guild, '❌ محاولة تحكم غير مصرح بها', `المستخدم <@${btn.user.id}> حاول التحكم في زر ليس له صلاحية به.`, 'RED');
            return btn.reply({ content: '❌ لا يمكنك التحكم في هذا الإجراء!', ephemeral: true });
        }

        if (btn.customId === 'confirm_family') {
            collector.stop();
            await btn.deferUpdate().catch(() => null);

            const recheckFamily = await Family.findOne({ familyName: familyData.familyName });
            if (recheckFamily) {
                await sendLog(interaction.guild, '❌ محاولة إنشاء عائلة موجودة', `المستخدم <@${interaction.user.id}> حاول إنشاء عائلة باسم "${familyData.familyName}" ولكنها موجودة بالفعل أثناء التحقق.`, 'RED');
                return btn.editReply('❌ العائلة تم تسجيلها بالفعل أثناء التحقق، اختر اسمًا آخر.');
            }

            const memberPassword = generatePassword();
            const adminPassword = generatePassword();

            const guild = interaction.guild;
            const categoryId = config.Alliance_CategoryId;

            const adminRole = await guild.roles.create({ name: `${familyData.familyName} - Admin`, color: 'RANDOM', reason: `Admin role for ${familyData.familyName}` });
            const familyRole = await guild.roles.create({ name: familyData.familyName, color: 'RANDOM', reason: `Role for family ${familyData.familyName}` });

            const ownerMember = guild.members.cache.get(familyData.ownerId) || await guild.members.fetch(familyData.ownerId).catch(() => null);

            if (!ownerMember) {
                await sendLog(interaction.guild, '❌ خطأ في العثور على المالك', `المستخدم <@${familyData.ownerId}> غير موجود في السيرفر.`, 'RED');
                console.log("❌ المالك غير موجود في السيرفر!");
            }

            await guild.members.cache.get(ownerMember?.id)?.roles.add(adminRole);
              await guild.members.cache.get(ownerMember?.id)?.roles.add(familyRole);


            const roleteam = await guild.roles.fetch(config.TeamFamily).catch(() => null);
            if (roleteam) {
                await guild.members.cache.get(ownerMember?.id)?.roles.add(roleteam);
            }

         /*   const chatChannel = await guild.channels.create(`💬│${familyData.familyName}-شات`, {
                type: 'GUILD_TEXT',
                parent: categoryId,
                permissionOverwrites: [
                    { id: guild.id, deny: ['VIEW_CHANNEL'] },
                    { id: familyRole.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
                    { id: '1349146754624524359', allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
                    { id: adminRole.id, allow: ['MANAGE_MESSAGES', 'MANAGE_CHANNELS', 'SEND_MESSAGES', 'VIEW_CHANNEL'] },
                    { id: ownerMember?.id, allow: ['MANAGE_MESSAGES', 'MANAGE_CHANNELS', 'SEND_MESSAGES', 'VIEW_CHANNEL'] }
                ]
            });

            const voiceChannel = await guild.channels.create(`🔊│${familyData.familyName}-صوت`, {
                type: 'GUILD_VOICE',
                parent: categoryId,
                permissionOverwrites: [
                    { id: guild.id, deny: ['VIEW_CHANNEL'] },
                    { id: familyRole.id, allow: ['VIEW_CHANNEL', 'CONNECT', 'SPEAK'] },
                    { id: '1349146754624524359', allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
                    { id: adminRole.id, allow: ['MANAGE_CHANNELS', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS'] },
                    { id: ownerMember?.id, allow: ['MANAGE_CHANNELS', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS'] }
                ]
            });*/

            const adminChannel = await guild.channels.create(`🛠️│${familyData.familyName}-إدارة`, {
                type: 'GUILD_TEXT',
                parent: categoryId,
                permissionOverwrites: [
                    { id: guild.id, deny: ['VIEW_CHANNEL'] },
                    { id: adminRole.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'MANAGE_CHANNELS'] },
                    { id: ownerMember?.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'MANAGE_CHANNELS'] }
                ]
            });


            const adminEmbed = new MessageEmbed()
                .setTitle(`🏠 إدارة عائلة ${familyData.familyName}`)
                .setDescription(`يمكنك إدارة عائلتك عبر الأزرار التالية:`)
                .setColor('BLUE');

            const adminRow = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId(`add_member_${familyData.familyName}`)
                    .setLabel('➕ إضافة عضو')
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId(`remove_member_${familyData.familyName}`)
                    .setLabel('❌ إزالة عضو')
                    .setStyle('DANGER'),
                new MessageButton()
                    .setCustomId(`show_members_${familyData.familyName}`)
                    .setLabel('👥 عرض الأعضاء')
                    .setStyle('SECONDARY'),
                new MessageButton()
                    .setCustomId(`show_passwords_${familyData.familyName}`)
                    .setLabel('🔑 باسوردات')
                    .setStyle('SUCCESS')
            );

            await adminChannel.send({ content: `<@${familyData.ownerId}>`, embeds: [adminEmbed], components: [adminRow] });

         //   await chatChannel.send(`🏡 هذا هو شات عائلة **${familyData.familyName}**! ${familyRole}`);

            await btn.editReply({ content: `✅ تم إنشاء العائلة **${familyData.familyName}**!\n🔑 كلمة مرور الأعضاء: ||${memberPassword}||\n🔑 كلمة مرور الإدمن: ||${adminPassword}||`, embeds: [], components: [] });

          //   familyData.chatChannelId = "";
           // familyData.voiceChannelId = "";
            familyData.adminChannelId = adminChannel.id;
            familyData.familyRoleId = familyRole.id;
            familyData.adminRoleId = adminRole.id;
            familyData.memberPassword = memberPassword;
            familyData.adminPassword = adminPassword;
            familyData.members = [];
            familyData.admins = [ownerMember?.id];

            await Family.create(familyData);
            await sendLog(interaction.guild, '✅ عائلة جديدة تم إنشاؤها', `تم إنشاء عائلة جديدة باسم **${familyData.familyName}** بواسطة <@${interaction.user.id}>\n**المالك:** <@${familyData.ownerId}>\n**كلمة مرور الأعضاء:** ||${memberPassword}||\n**كلمة مرور الإدمن:** ||${adminPassword}||`, 'GREEN');
        } else {
            collector.stop();
            await btn.reply({ content: '❌ تم إلغاء العملية.', ephemeral: true });
            await sendLog(interaction.guild, '❌ إلغاء العملية', `المستخدم <@${interaction.user.id}> ألغى عملية إنشاء العائلة.`, 'RED');
        }
    });
}
  
  
  
  
  
  
  if (interaction.customId === 'apply_seller') {
    
    
      const userId = interaction.user.id;

    // التحقق مما إذا كان المستخدم بائعًا مسجلًا
    const seller = await Seller.findOne({ userId });
if (seller) {
    // تحويل تاريخ الانضمام إلى تنسيق ديسكورد
    const joinDate = `<t:${Math.floor(new Date(seller.createdAt).getTime() / 1000)}:D>`;

    const embed = new MessageEmbed()
        .setColor('#00cc66') // لون مختلف للبائعين
        .setTitle('📌 معلومات البائع')
        .setDescription(`🎉 **أنت بالفعل بائع في المتجر!**\n\n📅 **تاريخ انضمامك:** ${joinDate}`)

    return await interaction.reply({ embeds: [embed], ephemeral: true });
}

   const embed = new MessageEmbed()
    .setColor('#0099ff') // لون جذاب للـ Embed
    .setTitle('📜 شروط التقديم كبائع')
    .setDescription('⚠️ **يرجى قراءة الشروط بعناية قبل التقديم:**\n\n')
    .addFields(
        { name: '✅ 1. الالتزام بالقوانين', value: 'يجب احترام جميع قوانين البوت والسيرفر.', inline: false },
        { name: '🎯 2. المصداقية', value: 'يجب تقديم معلومات صحيحة حول المنتجات دون خداع.', inline: false },
        { name: '🤝 3. احترام الأعضاء', value: 'يمنع السب، الإساءة أو التسبب في المشاكل.', inline: false },
        { name: '🚫 4. منع الاحتيال', value: 'يمنع التلاعب في الأسعار أو محاولة الاحتيال على اللاعبين.', inline: false },
        { name: '💳 5. الدفعات', value: 'يجب الالتزام بطريقة الدفع وعدم محاولة التهرب.', inline: false },
        { name: '🏪 6. البيع داخل المتجر فقط', value: 'يمنع البيع خارج نطاق المتجر أو الترويج لمتاجر خارجية.', inline: false },
        { name: '🔒 7. عدم مشاركة البيانات الشخصية', value: 'يمنع نشر بيانات تسجيل الدخول أو المعلومات الشخصية.', inline: false },
        { name: '⚠️ 🚨 ملاحظة', value: '**أي مخالفة قد تؤدي إلى حظر دائم من المتجر.**', inline: false }
    )
    .setFooter('📌 عند الموافقة، سيتم مراجعة طلبك من قبل الإدارة.');

const row = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('agree_seller')
            .setLabel('✅ موافق')
            .setStyle('SUCCESS'),
    
    );

await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  
  
   if (interaction.customId === 'agree_seller') {
    const modal = new Modal()
      .setCustomId('agree_seller_plus_form')
      .setTitle('نموذج التقديم كبائع');

    const whatSell = new TextInputComponent()
      .setCustomId('what_sell')
      .setLabel('ما الذي تبيعه؟')
      .setStyle('SHORT');

    const whySell = new TextInputComponent()
      .setCustomId('why_sell')
      .setLabel('لماذا تريد أن تصبح بائعًا؟')
      .setStyle('PARAGRAPH');

    const firstActionRow = new MessageActionRow().addComponents(whatSell);
    const secondActionRow = new MessageActionRow().addComponents(whySell);

    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal);
  }
  
   
  async function registerSeller(memberId) {
    try {
        const updatedSeller = await Seller.findOneAndUpdate(
            { userId: memberId }, // البحث عن المستخدم
            { 
                $setOnInsert: { // القيم تُحدد فقط عند الإدراج الجديد
                    salesCount: 0,
                    warningsCount: 0,
                    reportsCount: 0,
                    productsOffered: 0,
                    availableProducts: 0,
                    totalSellerProducts: 0, // تمت إضافتها هنا
                    averageRating: 0,
                    isVerified: true, // تم التحقق منه
                    notes: [],
                    offers: [],
                    warnings: [],
                    ratings: [],
                    transactions: []
                }
            },
            { upsert: true, new: true } // إنشاء جديد إذا لم يكن موجودًا
        );

        return updatedSeller; // إرجاع الكائن بعد التحديث

    } catch (error) {
    }
}

  
  if (interaction.customId === 'accept_seller') {
    
    const rolesToRemove = [config.rolesellerManager]; // الرتب المسموح لها
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
    
const userId = interaction.message.embeds[0].fields.find(field => field.name === '🆔 مقدم الطلب').value.replace(/[<@!>]/g, '');
    const member = interaction.guild.members.cache.get(userId);

   
await registerSeller(member.id);

    const role = interaction.guild.roles.cache.get(config.seller);
    await member.roles.add(role);

    await interaction.message.edit({ components: [] });
    await interaction.reply(`تم قبول البائع ${member.user} من قبل ${interaction.user}`);

    const embed = new MessageEmbed()
      .setTitle('تم قبولك كبائع')
      .setDescription('تهانينا! تم قبولك كبائع في السيرفر.');

    await member.send({ embeds: [embed] });
  }

if (interaction.customId === 'reject_seller') {
     
    const rolesToRemove = [config.rolesellerManager]; // الرتب المسموح لها
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
    
  
const userId = interaction.message.embeds[0].fields.find(field => field.name === '🆔 مقدم الطلب').value.replace(/[<@!>]/g, '');
    const member = interaction.guild.members.cache.get(userId);

    if (!member) return interaction.reply({ content: '❌ لم يتم العثور على العضو.', ephemeral: true });

    // التحقق مما إذا كان اللاعب مرفوضًا مسبقًا
    const existingSeller = await Seller.findOne({ userId: userId });

    if (existingSeller && existingSeller.isVerified === false) {
        return interaction.reply({ content: '⚠️ تم رفض هذا البائع مسبقًا.', ephemeral: true });
    }

   

    await interaction.message.edit({ components: [] });
    await interaction.reply(`🚨 **تم رفض ${member.user} كبائع من قبل ${interaction.user}**`);

    // إرسال رسالة خاصة للبائع
    const embed = new MessageEmbed()
        .setTitle('❌ تم رفض طلبك')
        .setDescription('نأسف لإبلاغك بأن طلبك كبائع قد تم رفضه.');

    await member.send({ embeds: [embed] }).catch(err => console.log(`❌ لا يمكن إرسال رسالة خاصة: ${err}`));

    // إرسال إشعار في نفس الروم
}
    if (interaction.customId === "view_seller_info") {
          const seller = await Seller.findOne({ userId: interaction.user.id });

    if (!seller) {
      return interaction.reply({
        content: "⚠️ **أنت غير مسجل كبائع في النظام!**",
        ephemeral: true
      });
    }
      const ratingsArray = seller.ratings;  // التقييمات المخزنة
const totalRatings = ratingsArray.length;

let ratingStars = "🌟 لم يتم التقييم بعد";  // القيمة الافتراضية إذا لم يتم وجود تقييمات

if (totalRatings > 0) {
    // جمع التقييمات وتحويلها إلى أعداد صحيحة
    const totalSum = ratingsArray.reduce((acc, rating) => acc + rating.rating, 0);  // استخدم rating.rating مباشرةً لأنه عدد صحيح
    
    // حساب التقييم المتوسط
    const averageRating = totalSum / totalRatings;

    // حساب النسبة المئوية

    // بناء النجوم بناءً على التقييم المتوسط
    const filledStars = "🌟".repeat(Math.round(averageRating));  // استخدام 🌟 فقط
    // دمج النجوم والنسبة المئوية
    ratingStars = `\`${filledStars}\` || || (**${averageRating.toFixed(1)}**)`;
}


const maxOffersToShow = 10; // الحد الأقصى للعروض المعروضة في الـ Embed
const offersList = seller.offers.length 
    ? seller.offers.slice(0, maxOffersToShow).map((o, i) => `\`${i + 1}.\` 📢 **${o.title}** - خصم: \`${o.discount}%\` 🔥`).join("\n") 
    : "🚫 لا يوجد عروض متاحة حاليًا.";

// إنشاء Embed أساسي لبيانات البائع
const sellerEmbed = new MessageEmbed()
    .setColor("#0099ff")
    .addFields(
  
      
              { name: "✅ **تم التحقق؟**", value: seller.isVerified ? "🟢 نعم" : "🔴 لا", inline: true },
        { name: "📦 **المنتجات المتاحة**", value: `\`${seller.availableProducts}\` 🏷`, inline: true },
        { name: "🛍 **إجمالي المنتجات**", value: `\`${seller.totalSellerProducts}\` 📦`, inline: true },
        { name: "📈 **عدد المبيعات**", value: `\`${seller.salesCount}\` 📊`, inline: true },
        { name: "🚨 **عدد البلاغات**", value: `\`${seller.reportsCount}\` ⚠️`, inline: true },
        { name: "⚠️ **عدد التحذيرات**", value: `\`${seller.warnings.length}\` ⚠️`, inline: true },
        { name: "📝 **عدد الملاحظات**", value: `\`${seller.notes.length}\` 🗒`, inline: true },
        { name: "⭐ **التقييم العام**", value: ratingStars, inline: true },
              { name: "📅 **تاريخ الانضمام كبائع**", value: `<t:${Math.floor((seller.createdAt) / 1000)}:F>`, inline: true },
          { name: `🎯 **أول ${maxOffersToShow} عروض متاحة**`, value: offersList, inline: false }

    );

  

  // زر عرض جميع العروض إذا كان هناك أكثر من 10 عروض
  const buttons = new MessageActionRow();
  if (seller.offers.length > maxOffersToShow) {
    buttons.addComponents(
      new MessageButton()
        .setCustomId("view_all_offers")
        .setLabel(`📜 عرض جميع العروض (${seller.offers.length})`)
        .setStyle("PRIMARY")
    );
  }

      
  await interaction.reply({ embeds: [sellerEmbed], components: seller.offers.length > maxOffersToShow ? [buttons] : [], ephemeral: true });

    }

  
  
if (interaction.customId === "view_all_offers") {
       const seller = await Seller.findOne({ userId: interaction.user.id });
    await interaction.deferUpdate({ ephemeral: true });

    if (!seller) {
      return interaction.editReply({
        content: "⚠️ **أنت غير مسجل كبائع في النظام!**",
        ephemeral: true,embeds: [], components:[]
      });
    }
    if (!seller.offers.length) {
        return interaction.editReply({ content: "🚫 لا يوجد عروض متاحة حاليًا.",embeds: [], components:[], ephemeral: true });
    }

    const chunkSize = 10;
    const offerChunks = [];
    for (let i = 0; i < seller.offers.length; i += chunkSize) {
        const chunk = seller.offers.slice(i, i + chunkSize)
            .map((o, index) => `\`${i + index + 1}.\` 📢 **${o.title}** - خصم: \`${o.discount}%\` 🔥`)
            .join("\n");
        offerChunks.push(chunk);
    }

    let currentIndex = 0;

    // إنشاء رسالة مدمجة لعرض العروض
    const getOffersEmbed = (index) => new MessageEmbed()
        .setColor("#ff9900")
        .setTitle("📜 جميع العروض المتاحة")
        .setDescription(offerChunks[index])
        .setFooter(`🔹 صفحة ${index + 1} من ${offerChunks.length} | إجمالي العروض: ${seller.offers.length}`, interaction.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    // إنشاء الأزرار
    const prevButton = new MessageButton()
        .setCustomId("prev_offers")
        .setLabel("⬅️ السابق")
        .setStyle("SECONDARY")
        .setDisabled(true); // معطّل بالبداية

    const nextButton = new MessageButton()
        .setCustomId("next_offers")
        .setLabel("➡️ التالي")
        .setStyle("SECONDARY")
        .setDisabled(offerChunks.length === 1); // تعطيله لو صفحة واحدة فقط

    const closeButton = new MessageButton()
        .setCustomId("close_offers")
        .setLabel("🔚 إغلاق")
        .setStyle("DANGER");

    const row = new MessageActionRow().addComponents(prevButton, nextButton, closeButton);

    // إرسال الرسالة الأولية
    const message = await interaction.editReply({ embeds: [getOffersEmbed(currentIndex)], components: [row], ephemeral: true });

    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            return buttonInteraction.editReply({ content: "❌ لا يمكنك التحكم في هذه القائمة!", ephemeral: true, embeds: [], components:[] });
        }

        switch (buttonInteraction.customId) {
            case "prev_offers":
                if (currentIndex > 0) currentIndex--;
                break;
            case "next_offers":
                if (currentIndex < offerChunks.length - 1) currentIndex++;
                break;
            case "close_offers":
                await interaction.deleteReply();
                return;
        }

        // تحديث حالة الأزرار
        prevButton.setDisabled(currentIndex === 0);
        nextButton.setDisabled(currentIndex === offerChunks.length - 1);

        await buttonInteraction.update({ embeds: [getOffersEmbed(currentIndex)], components: [row] });
    });

    collector.on("end", async () => {
        prevButton.setDisabled(true);
        nextButton.setDisabled(true);
        closeButton.setDisabled(true);
        await interaction.editReply({ components: [row] });
    });
}
  
  
  if (interaction.customId === "remove_product") {
    // جلب جميع منتجات البائع
    const sellerProducts = await Store.findOne({ "products.sellerId": interaction.user.id });

    if (!sellerProducts || sellerProducts.products.length === 0) {
        return interaction.reply({
            content: "🚫 **ليس لديك أي منتجات لعرضها حاليًا.**",
            ephemeral: true
        });
    }

    const sellerItems = sellerProducts.products.filter(p => p.sellerId === interaction.user.id);
    const maxProductsToShow = 10;
    const productsList = sellerItems.length
        ? sellerItems.slice(0, maxProductsToShow)
            .map((p, i) => `\`${i + 1}.\` 🏷 **${p.name}** - 💰 السعر: \`${p.price}\` - 🏷 الكمية: \`${p.stock}\``)
            .join("\n")
        : "🚫 لا يوجد منتجات متاحة.";

    const productsEmbed = new MessageEmbed()
        .setColor("#ff9900")
        .setTitle("🛒 **منتجاتك المتاحة**")
        .addFields(
            { name: `📦 **أول ${maxProductsToShow} منتجات**`, value: productsList }
        );

    // أزرار مسح المنتج
    const removeButtons = sellerItems.slice(0, maxProductsToShow).map((product, i) => {
        return new MessageButton()
            .setCustomId(`remove_product_${product._id}`)  // استخدام id المنتج
            .setLabel(`🗑️ مسح المنتج رقم ${i + 1}`)
            .setStyle("DANGER");
    });

    // إنشاء الصف مع الأزرار
    const row = new MessageActionRow().addComponents(...removeButtons);

    // إرسال الرد مع الإيمبد والأزرار
    await interaction.reply({ embeds: [productsEmbed], components: [row], ephemeral: true });
}

if (interaction.customId.startsWith("remove_product_")) {
    // جلب id المنتج من customId
    const productId = interaction.customId.split("_")[2];

    // مسح المنتج من قاعدة البيانات
    await Store.updateOne(
        { "products._id": productId },
        { $pull: { products: { _id: productId } } }
    );

    // تحديث الرسالة بعد المسح
    await interaction.update({
        content: `✅ **تم مسح المنتج بنجاح!**`,
        components: [], // تعطيل الأزرار بعد المسح
            embeds: [] // تعطيل الأزرار بعد المسح

    });
}

if (interaction.customId === "view_products") {
    const sellerProducts = await Store.findOne({ "products.sellerId": interaction.user.id });

    if (!sellerProducts || sellerProducts.products.length === 0) {
        return interaction.reply({
            content: "🚫 **ليس لديك أي منتجات معروضة للبيع حاليًا.**",
            ephemeral: true
        });
    }

    const sellerItems = sellerProducts.products.filter(p => p.sellerId === interaction.user.id);
    
    const maxProductsToShow = 10;
    const productsList = sellerItems.length 
        ? sellerItems.slice(0, maxProductsToShow)
            .map((p, i) => `\`${i + 1}.\` 🏷 **${p.name}** - 💰 السعر: \`${p.price}\` - 🏷 الكمية: \`${p.stock}\``)
            .join("\n")
        : "🚫 لا يوجد منتجات متاحة.";

    const productsEmbed = new MessageEmbed()
        .setColor("#ff9900")
        .setTitle("🛒 **منتجاتك المتاحة**")
        .addFields(
            { name: `📦 **أول ${maxProductsToShow} منتجات**`, value: productsList }
        );

    const buttons = sellerItems.length > maxProductsToShow
        ? [new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId("view_all_products")
                .setLabel(`📜 عرض جميع المنتجات (${sellerItems.length})`)
                .setStyle("PRIMARY")
        )]
        : [];

    await interaction.reply({ embeds: [productsEmbed], components: buttons, ephemeral: true });
}

  
  
  if (interaction.customId === "view_all_products") {
    const seller = await Store.findOne({ "products.sellerId": interaction.user.id });

    await interaction.deferUpdate({ ephemeral: true });

    if (!seller) {
        return interaction.editReply({
            content: "⚠️ **أنت غير مسجل كبائع في النظام!**",
            ephemeral: true, embeds: [], components: []
        });
    }

    const sellerProducts = seller.products.filter(p => p.sellerId === interaction.user.id);
    
    if (!sellerProducts.length) {
        return interaction.editReply({ content: "🚫 لا يوجد منتجات معروضة حاليًا.", embeds: [], components: [], ephemeral: true });
    }

    const chunkSize = 10;
    const productChunks = [];
    for (let i = 0; i < sellerProducts.length; i += chunkSize) {
        const chunk = sellerProducts.slice(i, i + chunkSize)
            .map((p, index) => `\`${i + index + 1}.\` 🏷 **${p.name}** - 💰 السعر: \`${p.price}\` - 🏷 الكمية: \`${p.stock}\``)
            .join("\n");
        productChunks.push(chunk);
    }

    let currentIndex = 0;

    const getProductsEmbed = (index) => new MessageEmbed()
        .setColor("#ff9900")
        .setTitle("🛒 جميع المنتجات المعروضة")
        .setDescription(productChunks[index])
        .setFooter(`🔹 صفحة ${index + 1} من ${productChunks.length} | إجمالي المنتجات: ${sellerProducts.length}`, interaction.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    const prevButton = new MessageButton()
        .setCustomId("prev_products")
        .setLabel("⬅️ السابق")
        .setStyle("SECONDARY")
        .setDisabled(true);

    const nextButton = new MessageButton()
        .setCustomId("next_products")
        .setLabel("➡️ التالي")
        .setStyle("SECONDARY")
        .setDisabled(productChunks.length === 1);

    const closeButton = new MessageButton()
        .setCustomId("close_products")
        .setLabel("🔚 إغلاق")
        .setStyle("DANGER");

    const row = new MessageActionRow().addComponents(prevButton, nextButton, closeButton);

    const message = await interaction.editReply({ embeds: [getProductsEmbed(currentIndex)], components: [row], ephemeral: true });

    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
            return buttonInteraction.editReply({ content: "❌ لا يمكنك التحكم في هذه القائمة!", ephemeral: true, embeds: [], components: [] });
        }

        switch (buttonInteraction.customId) {
            case "prev_products":
                if (currentIndex > 0) currentIndex--;
                break;
            case "next_products":
                if (currentIndex < productChunks.length - 1) currentIndex++;
                break;
            case "close_products":
                await interaction.deleteReply();
                return;
        }

        prevButton.setDisabled(currentIndex === 0);
        nextButton.setDisabled(currentIndex === productChunks.length - 1);

        await buttonInteraction.update({ embeds: [getProductsEmbed(currentIndex)], components: [row] });
    });

    collector.on("end", async () => {
        prevButton.setDisabled(true);
        nextButton.setDisabled(true);
        closeButton.setDisabled(true);
        await interaction.editReply({ components: [row] });
    });
}

  
  
  
  
  
if (interaction.customId === "custom_order") {
const orderModal = new Modal()
    .setCustomId("custom_order_modal")
    .setTitle("📦 طلبية مخصصة")
    .addComponents(
        new MessageActionRow().addComponents(
            new TextInputComponent()
                .setCustomId("order_quantity")
                .setLabel("📦 الكمية المطلوبة")
                .setStyle("SHORT")
                .setRequired(true)
                .setPlaceholder("مثال: 350")
                .setMinLength(1)  // الحد الأدنى لعدد الأرقام (1)
                .setMaxLength(4)  // الحد الأقصى لعدد الأرقام (1000) (مثلاً)
        ),
        new MessageActionRow().addComponents(
            new TextInputComponent()
                .setCustomId("order_price")
                .setLabel("💰 أقل سعر ممكن تدفعه")
                .setStyle("SHORT")
                .setRequired(true)
                .setPlaceholder("مثال: 1200")
                .setMinLength(1)  // الحد الأدنى لعدد الأرقام (1)
                .setMaxLength(7)  // الحد الأقصى لعدد الأرقام (1000000)
        ),
        new MessageActionRow().addComponents(
            new TextInputComponent()
                .setCustomId("order_description")
                .setLabel("📝 وصف الطلبية")
                .setStyle("PARAGRAPH")
                .setRequired(true)
                .setPlaceholder("مثال: أحتاج 350 حبة نفط صالح للبيع...")
                .setMinLength(10)  // الحد الأدنى لعدد الأحرف (مثلاً 10 أحرف)
                .setMaxLength(100) // الحد الأقصى لعدد الأحرف (مثلاً 300 حرف)
        )
    );


  await interaction.showModal(orderModal);
}
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  if (interaction.customId === "add_new_product") {
    
       const seller = await Seller.findOne({ userId: interaction.user.id });
    if (!seller) {
        return interaction.reply({
            content: "⚠️ **هذا البائع غير مسجل كبائع في النظام!**",
            ephemeral: true
        });
    }
    
    
    if (seller.warningsCount >= 3) {
    let embedMessage = new MessageEmbed()
        .setColor('#FFA500') // لون تحذيري مختلف عن البلاغات
        .setTitle('⚠️ لا يمكنك إضافة منتجات جديدة')
        .setDescription(`عذرًا، لا يمكنك إضافة منتجات جديدة لأن لديك \`${seller.warningsCount}\` إنذارات.`);

    // تحديد الرسالة بناءً على عدد الإنذارات
    switch (seller.warningsCount) {
        case 3:
            embedMessage.addField('🔔 تنبيه مهم', 'لقد وصلت إلى الحد الأقصى المسموح به من الإنذارات.');
            break;
        case 4:
            embedMessage.addField('⚠️ تحذير!', 'تم تقييد حسابك مؤقتًا بسبب كثرة الإنذارات.');
            break;
        case 5:
            embedMessage.addField('🚫 إيقاف مؤقت', 'تم تعليق حسابك مؤقتًا حتى يتم مراجعة حالتك.');
            break;
        default:
            embedMessage.addField('❌ مشكلة غير معروفة', 'يرجى التواصل مع الدعم الفني لحل المشكلة.');
            break;
    }

    embedMessage.addField('📞 الدعم الفني', 'إذا كنت تعتقد أن هناك خطأ، يرجى التواصل مع الدعم.');

    return interaction.reply({
        embeds: [embedMessage],
        ephemeral: true
    });
}

    
if (seller.reportsCount >= 5) {
    let embedMessage = new MessageEmbed()
        .setColor('#FF5733') // لون تحذيري
        .setTitle('🚫 لا يمكنك إضافة منتجات جديدة')
        .setDescription(`عذرًا، لا يمكنك إضافة منتجات جديدة لأن لديك \`${seller.reportsCount}\` بلاغات.`);

    // تحديد الرسالة بناءً على عدد البلاغات
    switch (seller.reportsCount) {
        case 5:
            embedMessage.addField('🔍 تحت المراجعة', 'حسابك في مرحلة التحقيق بسبب البلاغات.');
            break;
        case 6:
            embedMessage.addField('⚠️ تحذير!', 'تم تقييد حسابك بسبب البلاغات المتكررة.');
            break;
        case 7:
            embedMessage.addField('🚨 إيقاف مؤقت', 'تم تعليق حسابك مؤقتًا حتى انتهاء التحقيق.');
            break;
        default:
            embedMessage.addField('❌ مشكلة غير معروفة', 'يرجى التواصل مع الدعم لحل المشكلة.');
            break;
    }

    embedMessage.addField('📞 الدعم الفني', 'إذا كنت تعتقد أن هناك خطأ، يرجى التواصل مع الدعم.');

    return interaction.reply({
        embeds: [embedMessage],
        ephemeral: true
    });
}
    
    const productModal = new Modal()
        .setCustomId("product_modal") 
        .setTitle("🛒 إضافة منتج جديد")
        .addComponents(
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("product_name")
                    .setLabel("📌 اسم المنتج")
                    .setStyle("SHORT")
                    .setRequired(true)
                    .setPlaceholder("مثال: سلاح شتقن")  // مثال لاسم المنتج
            ),
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("product_quantity")
                    .setLabel("📦 الكمية")
                    .setStyle("SHORT")
                    .setRequired(true)
                    .setPlaceholder("مثال: 5")  // مثال للكمية
            ),
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("product_price")
                    .setLabel("💰 السعر")
                    .setStyle("SHORT")
                    .setRequired(true)
                    .setPlaceholder("مثال: 350000")  // مثال للسعر
            ),
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("product_description")
                    .setLabel("📝 الوصف")
                    .setStyle("PARAGRAPH")
                    .setRequired(false)
                    .setPlaceholder("مثال: سلاح قوي يستخدم في المعارك")  // مثال للوصف
            )
        );

    await interaction.showModal(productModal);
}
  
  if (interaction.customId === "x_produc_add_product_image_yes") {
    await interaction.deferUpdate();
    const imageRoom = config.imgslogs; // روم استقبال الصور

   await interaction.editReply({ 
        content: "📸 **من فضلك قم بإرسال صورة المنتج هنا!**", 
        embeds: [], 
        components: [], 
        ephemeral: true 
    });
 
    const filter = (m) => m.author.id === interaction.user.id && m.attachments.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

    collector.on('collect', async (message) => {

         const imageAttachment = message.attachments.first();
        const targetChannel = interaction.guild.channels.cache.get(config.imgslogs); // روم الصور

        if (!targetChannel) {
            return interaction.followUp({ content: '❌ **حدث خطأ! لم يتم العثور على الروم المحدد للصور.**', ephemeral: true });
        }

            // إرسال الصورة إلى الروم المحدد
            const sentImage = await targetChannel.send({ files: [new MessageAttachment(imageAttachment.url)] });
     productData[interaction.user.id].image = sentImage.attachments.first().url;
            await message.delete();

          
          
    
    // استقبال خيار الدفع
    const paymentEmbed = new MessageEmbed()
        .setColor("#0099ff")
        .setTitle("💰 طريقة الدفع")
        .setDescription("اختر طريقة الدفع لهذا المنتج.")
        .setImage(productData[interaction.user.id].image); // إضافة الصورة إلى الـ Embed
    

    const paymentButtons = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId("payment_legal")
            .setLabel("✅ شرعي")
            .setStyle("SUCCESS"),
        new MessageButton()
            .setCustomId("payment_illegal")
            .setLabel("❌ غير شرعي")
            .setStyle("DANGER"),
        new MessageButton()
            .setCustomId("payment_both")
            .setLabel("⚖️ كلاهما")
            .setStyle("PRIMARY")
    );

    await interaction.editReply({ 
        content: null, 
        embeds: [paymentEmbed], 
        components: [paymentButtons], 
        ephemeral: true 
    });
 });
    
collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
    interaction.editReply({ 
        content: "⏳ **انتهى الوقت! لم تقم بإرسال صورة.**", 
        embeds: [], 
        components: [], 
        ephemeral: true 
    });
      return;
    }
 });

}
if (interaction.customId === "add_product_image_no") {
    await interaction.deferUpdate();


    // استقبال خيار الدفع مباشرة بدون انتظار الصورة
    const paymentEmbed = new MessageEmbed()
        .setColor("#0099ff")
        .setTitle("💰 طريقة الدفع")
        .setDescription("اختر طريقة الدفع لهذا المنتج.");

    const paymentButtons = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId("payment_legal")
            .setLabel("✅ شرعي")
            .setStyle("SUCCESS"),
        new MessageButton()
            .setCustomId("payment_illegal")
            .setLabel("❌ غير شرعي")
            .setStyle("DANGER"),
        new MessageButton()
            .setCustomId("payment_both")
            .setLabel("⚖️ كلاهما")
            .setStyle("PRIMARY")
    );

    await interaction.editReply({ 
        content: null, 
        embeds: [paymentEmbed], 
        components: [paymentButtons], 
        ephemeral: true 
    });
}
// الخطوة 1: اختيار طريقة الدفع
if (interaction.customId.startsWith("payment_")) {
    await interaction.deferUpdate();

    const paymentMethod = interaction.customId.split("_")[1];
    productData[interaction.user.id].preferredPaymentMethod = paymentMethod;

    // إنشاء الإيمبد مع شرح للمستخدم
   // الصف الأول من الأزرار (الأنواع الأولية)
// الصف الأول من الأزرار (الأنواع الأولية)
const row1 = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId("type_djaj")
        .setLabel("🐔 دجاج")
        .setStyle("SECONDARY"),
    new MessageButton()
        .setCustomId("type_fish")
        .setLabel("🐟 سمك")
        .setStyle("SECONDARY"),
    new MessageButton()
        .setCustomId("type_vegetables")
        .setLabel("🥦 خضروات")
        .setStyle("SECONDARY")
);

// الصف الثاني من الأزرار (الأنواع التالية)
const row2 = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId("type_kshb") // بدل wood
        .setLabel("🪵 خشب")
        .setStyle("SECONDARY"),
    new MessageButton()
        .setCustomId("type_oil")
        .setLabel("🛢️ نفط")
        .setStyle("SECONDARY"),
    new MessageButton()
        .setCustomId("type_fabric")
        .setLabel("🧵 قماش")
        .setStyle("SECONDARY") 
);

// الصف الثالث من الأزرار (الأنواع النهائية)
const row3 = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId("type_metals")
        .setLabel("⛓️ معادن")
        .setStyle("SECONDARY"),
    new MessageButton()
        .setCustomId("type_mmn3")
        .setLabel("🚫 ممنوعات")
        .setStyle("SECONDARY"),
    new MessageButton()
        .setCustomId("type_slh")
        .setLabel("🔫 أسلحة")
        .setStyle("SECONDARY")
);

// الصف الرابع (الأنواع الأخرى)
const row4 = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId("type_other")
        .setLabel("📁 أخرى")
        .setStyle("SECONDARY")
);


// إنشاء الإيمبد مع شرح للمستخدم
const productEmbed = new MessageEmbed()
    .setColor("#00cc44")
    .setTitle("🧾 **اختيار نوع المنتج**")
    .setDescription("من فضلك اختر نوع المنتج الذي ترغب في شرائه من الأزرار بالأسفل:")
    .addField("💡 **ملاحظة**", "إذا كنت لا تجد النوع المطلوب، اختر 'أخرى'.", false)

// إرسال الإيمبد مع الأزرار
await interaction.editReply({
    embeds: [productEmbed],
    components: [row1, row2, row3, row4],
    content: null // حذف المحتوى النصي لأن الإيمبد موجود الآن
});

}


// الخطوة 2: اختيار نوع المنتج
if (interaction.customId.startsWith("type_")) {
    await interaction.deferUpdate();

    const typeCode = interaction.customId.split("_")[1];
    const typeMap = {
        kshb: { label: "خشب", emoji: "🪵" },
        mmn3: { label: "ممنوعات", emoji: "🚫" },
        djaj: { label: "دجاج", emoji: "🐔" },
        slh: { label: "أسلحة", emoji: "🔫" },
        other: { label: "أخرى", emoji: "📁" },
        fish: { label: "سمك", emoji: "🐟" },
        vegetables: { label: "خضروات", emoji: "🥦" },
        oil: { label: "نفط", emoji: "🛢️" },
        fabric: { label: "قماش", emoji: "🧵" },
        metals: { label: "معادن", emoji: "⛓️" }
    };

    const selectedType = typeMap[typeCode] || { label: "غير معروف", emoji: "❓" };
    productData[interaction.user.id].category = selectedType.label;

    const product = productData[interaction.user.id];

    const productConfirmEmbed = new MessageEmbed()
        .setColor("#00cc44")
        .setTitle("✅ تأكيد المنتج")
        .setDescription("هذه هي بيانات منتجك، هل ترغب في إرسالها؟")
        .addFields(
            { name: "📌 **الاسم**", value: product.name, inline: true },
            { name: "📦 **الكمية**", value: `${product.stock}`, inline: true },
            { name: "💰 **السعر**", value: `${product.price} 💵`, inline: true },
            { name: "📝 **الوصف**", value: product.description || "لا يوجد وصف.", inline: true },
            { name: "📂 **التصنيف**", value: `${selectedType.emoji} ${product.category}`, inline: true },
            { 
                name: "💰 **طريقة الدفع**", 
                value: product.preferredPaymentMethod === "legal" 
                    ? "✅ شرعي" 
                    : product.preferredPaymentMethod === "illegal" 
                        ? "❌ غير شرعي" 
                        : "⚖️ شرعي وغير شرعي", 
                inline: true 
            }
        )
        .setImage(product.image);

    const confirmButtons = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId("confirm_product")
            .setLabel("✅ تأكيد وإرسال")
            .setStyle("SUCCESS"),
        new MessageButton()
            .setCustomId("cancel_product")
            .setLabel("❌ إلغاء")
            .setStyle("DANGER")
    );

    await interaction.editReply({
        embeds: [productConfirmEmbed],
        components: [confirmButtons],
        content: null
    });
}

  
  
if (interaction.customId === "confirm_product") {
      await interaction.deferUpdate();

productConfirmEmbed = new MessageEmbed()
    .setDescription(
        `📝 **الوصف:**\n${productData[interaction.user.id].description || "لا يوجد وصف."}\nتم إضافة هذا المنتج من قبل البائع: <@${productData[interaction.user.id].sellerId}>`
    )
    .addFields(
        { name: "📌 **الاسم**", value: productData[interaction.user.id].name, inline: false },
        { name: "📦 **الكمية**", value: `${productData[interaction.user.id].stock}`, inline: false },
        { name: "💰 **السعر**", value: `${productData[interaction.user.id].price} 💵`, inline: false },
        { name: "📂 **التصنيف**", value: productData[interaction.user.id].category, inline: false },
        { 
            name: "💰 **طريقة الدفع**", 
            value: 
                productData[interaction.user.id].preferredPaymentMethod === "legal" 
                    ? "✅ شرعي" 
                    : productData[interaction.user.id].preferredPaymentMethod === "illegal" 
                        ? "❌ غير شرعي" 
                        : "⚖️ شرعي وغير شرعي", 
            inline: true 
        }
    )
      .setImage(productData[interaction.user.id].image);



    const finalRoom = interaction.guild.channels.cache.get(config.shop_products);
const actionRow1 = new MessageActionRow().addComponents(
 new MessageButton()
        .setCustomId(`buy_product_${interaction.user.id}`)
        .setLabel("🛒 شراء")
        .setStyle("SUCCESS"),
  
  new MessageButton()
        .setCustomId(`report_seller_${interaction.user.id}`)
        .setLabel("⚠️ بلاغ على البائع")
        .setStyle("DANGER"),

    // زر عرض معلومات البائع
    new MessageButton()
        .setCustomId(`view_seller_info_${interaction.user.id}`)
        .setLabel("🛍️ عرض معلومات البائع")
        .setStyle("PRIMARY")
);

const actionRow2 = new MessageActionRow().addComponents(
    // زر تعديل الكمية
    new MessageButton()
        .setCustomId(`edit_stock_${interaction.user.id}`)
        .setLabel("✏️ تعديل الكمية")
        .setStyle("PRIMARY"),

    // زر تعديل السعر
    new MessageButton()
        .setCustomId(`edit_price_${interaction.user.id}`)
        .setLabel("💲 تعديل السعر")
        .setStyle("SECONDARY")
);


// إرسال الرسالة مع الأزرار
const sentMessage = await finalRoom.send({ 
  content: "<@&1367145479728664688>",
    embeds: [productConfirmEmbed], 
    components: [actionRow1, actionRow2] 
});
            productData[interaction.user.id].messageId = sentMessage.id;

   await Store.findOneAndUpdate(
        { serverId: interaction.guild.id },
        { $push: { products: productData[interaction.user.id] } },
        { upsert: true }
    );
const store = await Store.findOne({ "products.sellerId": interaction.user.id });


if (store) {
const result = await Store.aggregate([
  { $match: { "products.sellerId": interaction.user.id } },
  { $unwind: "$products" },
  { $match: { "products.sellerId": interaction.user.id } },
  { $count: "total" }
]);

const count = result[0]?.total || 0;
  
  
  // تحديث بيانات البائع
  const updatedSeller = await Seller.findOneAndUpdate(
    { userId: interaction.user.id }, // تحديد المستخدم
    {
      $inc: { 
        totalSellerProducts: 1, // زيادة عدد المنتجات المتاحة بمقدار واحد (إذا كنت تريد زيادة بمقدار واحد فقط)
      },
      $set: { 
        availableProducts: count // إضافة إجمالي المنتجات المعروضة
      }
    },
    { new: true } // إرجاع الوثيقة بعد التحديث
  );

   
  // الرد بالنجاح
  await interaction.editReply({ content: "✅ **تمت إضافة المنتج بنجاح!**", embeds: [], components: [] });

  // مسح بيانات المنتج بعد الإضافة
  delete productData[interaction.user.id];
} else {
  await interaction.editReply({ content: "❌ **لم يتم العثور على متجر للبائع!**", embeds: [], components: [] });
}
}


// إلغاء العملية
if (interaction.customId === "cancel_product") {
        await interaction.deferUpdate();

    delete productData[interaction.user.id]; // حذف البيانات

    await interaction.editReply({ 
        content: "❌ **تم إلغاء إضافة المنتج.**", 
        embeds: [], 
        components: [] 
    });
}

  
  
if (interaction.customId.startsWith("report_seller_")) {
   
        const sellerId = interaction.customId.split("_")[2]; // استخراج ID البائع
    const productMessageId = interaction.message.id; // استخراج ID الرسالة

    // التحقق من وجود المنتج
    const productged = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": productMessageId,
        "products.sellerId": sellerId
    });

    if (!productged) {
       interaction.reply({ content: "❌ ** لا يتوفر بيانات لهذا المنتج.**", ephemeral: true });
          return interaction.message.delete();

    }

    // التحقق من البائع
    const seller = await Seller.findOne({ userId: sellerId });
    if (!seller) {
        return interaction.reply({
            content: "⚠️ **هذا البائع غير مسجل كبائع في النظام!**",
            ephemeral: true
        });
    }



  
    const modal = new Modal()
        .setCustomId(`report_modal_${sellerId}_${productMessageId}`)
        .setTitle('🚨 نموذج البلاغ ضد البائع')
        .addComponents(
            new MessageActionRow().addComponents(
                new TextInputComponent()
                .setCustomId('report_text')
                .setLabel('📝 اكتب البلاغ الخاص بك')
                .setStyle('PARAGRAPH') // يمكن أن تكون "SHORT" أو "PARAGRAPH"
                    .setPlaceholder("مثال: 100")
                  .setMinLength(10)
                .setMaxLength(1000)
                    .setRequired(true)
            )
        );
  
    // عرض النموذج للمستخدم
    await interaction.showModal(modal);
    
}
  
  if (interaction.customId.startsWith("view_seller_info_")) {
    const sellerId = interaction.customId.split("_")[3]; // استخراج ID البائع
    const productMessageId = interaction.message.id; // استخراج ID الرسالة
    const productged = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": productMessageId,
        "products.sellerId": sellerId
    });
    if (!productged) {
 interaction.reply({ content: "❌ ** لا يتوفر بيانات لهذا المنتج.**", ephemeral: true });
          return interaction.message.delete();
    }

    
    
          const seller = await Seller.findOne({ userId: sellerId });

    if (!seller) {
      return interaction.reply({
        content: "⚠️ **هذا البائع غير مسجل كبائع في النظام!**",
        ephemeral: true
      });
    }
    const ratingsArray = seller.ratings;  // التقييمات المخزنة
const totalRatings = ratingsArray.length;

let ratingStars = "🌟 لم يتم التقييم بعد";  // القيمة الافتراضية إذا لم يتم وجود تقييمات

if (totalRatings > 0) {
    // جمع التقييمات وتحويلها إلى أعداد صحيحة
    const totalSum = ratingsArray.reduce((acc, rating) => acc + rating.rating, 0);  // استخدم rating.rating مباشرةً لأنه عدد صحيح
    
    // حساب التقييم المتوسط
    const averageRating = totalSum / totalRatings;

    // حساب النسبة المئوية

    // بناء النجوم بناءً على التقييم المتوسط
    const filledStars = "🌟".repeat(Math.round(averageRating));  // استخدام 🌟 فقط
    // دمج النجوم والنسبة المئوية
    ratingStars = `\`${filledStars}\` || || (**${averageRating.toFixed(1)}**)`;
}

  const maxOffersToShow = 10; // الحد الأقصى للعروض المعروضة في الـ Embed
  const offersList = seller.offers.length 
    ? seller.offers.slice(0, maxOffersToShow).map((o, i) => `\`${i + 1}.\` 📢 **${o.title}** - خصم: \`${o.discount}%\` 🔥`).join("\n") 
    : "🚫 لا يوجد عروض متاحة حاليًا.";

  // إنشاء Embed أساسي لبيانات البائع
  const sellerEmbed = new MessageEmbed()
    .setColor("#0099ff")
      .addFields(
            { name: "✅ **تم التحقق؟**", value: seller.isVerified ? "🟢 نعم" : "🔴 لا", inline: true },
            { name: "📦 **المنتجات المتاحة**", value: `\`${seller.availableProducts}\` 🏷`, inline: true },
            { name: "🛍 **إجمالي المنتجات**", value: `\`${seller.totalSellerProducts}\` 📦`, inline: true },
            { name: "📈 **عدد المبيعات**", value: `\`${seller.salesCount}\` 📊`, inline: true },
            { name: "🚨 **عدد البلاغات**", value: `\`${seller.reportsCount}\` ⚠️`, inline: true },
            { name: "⭐ **التقييم العام**", value: ratingStars, inline: true },
        );


      
  await interaction.reply({ embeds: [sellerEmbed], ephemeral: true });

    
  
   
}
  
  if (interaction.customId.startsWith("edit_price_")) {
    const sellerId = interaction.customId.split("_")[2]; // استخراج ID البائع
    const productMessageId = interaction.message.id; // استخراج ID الرسالة
    const productged = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": productMessageId,
        "products.sellerId": sellerId
    });


    if (!productged) {
        return await interaction.reply({ content: "❌ **أنت لست البائع لهذا المنتج.**", ephemeral: true });
    }

    const product = productged.products.find(p => p.messageId === productMessageId);
if (product && product.sellerId !== interaction.user.id) {
    return await interaction.reply({ content: "❌ **أنت لست البائع لهذا المنتج.**", ephemeral: true });
}
    // إنشاء نموذج (Modal) للبائع لتعديل السعر
    const modal = new Modal()
        .setCustomId(`updatepricemodal_${interaction.user.id}`) // ID للنموذج
        .setTitle("🔄 تعديل سعر للمنتج")
        .addComponents(
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("new_price") // ID الحقل
                    .setLabel("أدخل السعر الجديد")
                    .setStyle("SHORT")
                    .setPlaceholder("مثال: 10000")
                    .setRequired(true)
            )
        );

    // إرسال النموذج للبائع
    await interaction.showModal(modal);
}
  
    if (interaction.customId.startsWith("buy_product_")) {
        const sellerId = interaction.customId.split("_")[2]; // استخراج ID البائع
    const productMessageId = interaction.message.id; // استخراج ID الرسالة
    const productData = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": productMessageId,
        "products.sellerId": sellerId
    });

  
     if (!productData) {
interaction.reply({
        content: "❌ المنتج دا أصبح غير متوفر الآن، حاول مرة تانية لاحقًا.",
        ephemeral: true  // الرسالة هتكون مرئية فقط للمستخدم اللي أرسل التفاعل
    });
       
      const result = await Store.aggregate([
  { $match: { "products.sellerId": sellerId } },
  { $unwind: "$products" },
  { $match: { "products.sellerId": sellerId } },
  { $count: "total" }
]);

const count = result[0]?.total || 0;


      await Seller.findOneAndUpdate(
    { userId: sellerId }, // تحديد المستخدم
    {
        $set: { 
            availableProducts: count // إضافة إجمالي المنتجات المعروضة
        }
    },
    { new: true } // إرجاع الوثيقة بعد التحديث
);
  
       
    return interaction.message.delete();
}

const embed = new MessageEmbed()
    .setColor('#ff5733') // لون جذاب للـ Embed
    .setTitle('📜 شروط الشراء')
     .setDescription('⚠️ **يرجى قراءة الشروط بعناية قبل إتمام عملية الشراء:**\n\n')
    .addFields(
        { name: '✅ 1. تأكيد المنتج', value: 'يجب التأكد من صحة المنتج قبل إتمام عملية الشراء.', inline: false },
        { name: '🎯 2. السعر والمواصفات', value: 'يرجى التأكد من أن السعر والمواصفات متوافقة مع رغبتك قبل الدفع.', inline: false },
        { name: '🤝 3. التعامل باحترام', value: 'يجب أن يتم الشراء والتعامل مع البائعين باحترام وعدم التسبب في أي مشاكل.', inline: false },
        { name: '🚫 4. منع الاحتيال', value: 'يمنع تمامًا أي محاولة للتلاعب أو الاحتيال أثناء عملية الشراء.', inline: false },
        { name: '💳 5. طريقة الدفع', value: 'يجب الالتزام بطريقة الدفع المتاحة في المتجر وعدم التلاعب بها.', inline: false },
        { name: '🔒 6. حماية بياناتك الشخصية', value: 'يجب الحفاظ على سرية معلوماتك الشخصية وعدم مشاركتها مع أي شخص آخر.', inline: false },
        { name: '⚠️ 🚨 ملاحظة', value: '**أي مخالفة لهذه الشروط قد تؤدي إلى إلغاء عملية الشراء أو حظر الحساب.**', inline: false }
    )

const row = new MessageActionRow()
    .addComponents(
        new MessageButton()
        .setCustomId(`supbuy_product_${sellerId}_${productMessageId}`)
            .setLabel('✅ موافق')
            .setStyle('SUCCESS'),
       
    );

await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
  
  if (interaction.customId.startsWith("supbuy_product_")) {
    const customIdParts = interaction.customId.split("_");
    const sellerId = customIdParts[2];
    const productMessageId = customIdParts[3];
    const productData = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": productMessageId,
        "products.sellerId": sellerId
    });

  
     if (!productData) {
interaction.reply({
        content: "❌ المنتج دا أصبح غير متوفر الآن، حاول مرة تانية لاحقًا.",
        ephemeral: true  // الرسالة هتكون مرئية فقط للمستخدم اللي أرسل التفاعل
    });
       
          const result = await Store.aggregate([
  { $match: { "products.sellerId": sellerId } },
  { $unwind: "$products" },
  { $match: { "products.sellerId": sellerId } },
  { $count: "total" }
]);

const count = result[0]?.total || 0;

      await Seller.findOneAndUpdate(
    { userId: sellerId }, // تحديد المستخدم
    {
        $set: { 
            availableProducts: count // إضافة إجمالي المنتجات المعروضة
        }
    },
    { new: true } // إرجاع الوثيقة بعد التحديث
);
  
       
    return interaction.message.delete();
}


    const product = productData.products.find(p => p.messageId === productMessageId);

    // التحقق من الكمية المتاحة
    if (product.stock <= 0) {
        // مسح الرسالة الخاصة بالمنتج إذا كانت الكمية صفر أو أقل
        const productMessage = await interaction.channel.messages.fetch(productMessageId);

        // إرسال رسالة للبائع بأن المنتج قد تم حذفه لأن الكمية نفدت
      const seller = await interaction.guild.members.fetch(sellerId);
    await seller.send({
        content: `❌ **تم حذف سلة المنتج الخاص بك لأن الكمية نفدت.**\n**المنتج:** ${product.name}\n**الوصف:** ${product.description || "لا يوجد وصف"}\n**السعر:** ${product.price} 💵`
    });

        // حذف المنتج من قاعدة البيانات
        await Store.updateOne(
            { serverId: interaction.guild.id, "products.messageId": productMessageId },
            { $pull: { products: { messageId: productMessageId } } }
        );

        // تحديث بيانات البائع
       const result = await Store.aggregate([
  { $match: { "products.sellerId": sellerId } },
  { $unwind: "$products" },
  { $match: { "products.sellerId": sellerId } },
  { $count: "total" }
]);

const count = result[0]?.total || 0;


        return await interaction.reply({
            content: "❌ **تم حذف المنتج لأن الكمية نفدت. تم مسح سلة المنتج.**",
            ephemeral: true
        });
    }

    
          const seller = await Seller.findOne({ userId: sellerId });

    if (!seller) {
      return interaction.reply({
        content: "⚠️ **هذا البائع غير مسجل كبائع في النظام!**",
        ephemeral: true
      });
    }
    
 
if (seller.reportsCount >= 5) {
    let embedMessage = new MessageEmbed()
        .setColor('#FF5733')  // اللون الأحمر الداكن
        .setTitle('❌ لا يمكنك شراء من هذا البائع')
        .setDescription(`نظرًا لأن البائع لديه \`${seller.reportsCount}\` بلاغات، لا يمكنك إتمام عملية الشراء منه.`);

    // رسائل مخصصة بناءً على عدد البلاغات
    if (seller.reportsCount === 5) {
        embedMessage.addField('🔍 مرحلة التحقيق', 'البائع في مرحلة التحقيق حاليًا. قد يستغرق التحقيق بعض الوقت.');
    } else if (seller.reportsCount === 6) {
        embedMessage.addField('⚠️ تحذير!', 'البائع يواجه العديد من البلاغات ويتم التحقيق معه بشكل جاد.');
    } else if (seller.reportsCount === 7) {
        embedMessage.addField('🚨 تحقيق مستمر!', 'البائع موقوف مؤقتًا بسبب العدد المرتفع من البلاغات.');
    }

    // إضافة نص تفاعلي للمستخدم
    embedMessage.addField('📜 عرض المعلومات', 'إذا كنت ترغب في معرفة المزيد عن حالته، يمكنك الضغط على **عرض معلومات البائع**.');

    return interaction.reply({
        embeds: [embedMessage],
        ephemeral: true
    });
}
    
    // إنشاء نموذج (Modal) لكتابة الكمية
    const modal = new Modal()
        .setCustomId(`buyquantitymodal_${sellerId}_${productMessageId}`) // ID للنموذج
        .setTitle("🛒 طلب شراء للمنتج")
        .addComponents(
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("quantity_to_buy") // ID الحقل
                    .setLabel("أدخل الكمية التي تريد شرائها")
                    .setStyle("SHORT")
                    .setPlaceholder("مثال: 2")
                    .setRequired(true)
            )
        );

    // إرسال النموذج للمستخدم
    await interaction.showModal(modal);
}
  
  
  
  if (interaction.customId.startsWith("confirm_buy_")) {
    // استخراج sellerId من customId
    const sellerId = interaction.customId.split("_")[2]; 

    const productMessageId = interaction.customId.split("_")[3]; // استخراج ID الرسالة
    const productged = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": productMessageId,
        "products.sellerId": sellerId
    });

    if (!productged) {
        return await interaction.reply({ content: "❌ **أنت لست البائع لهذا المنتج.**", ephemeral: true });
    }

    const product = productged.products.find(p => p.messageId === productMessageId);
    const quantityToBuy = parseInt(interaction.customId.split("_")[4]);
    const totalPrice = product.price * quantityToBuy;

    // تحقق من أن الكمية المطلوبة متاحة
    if (isNaN(quantityToBuy) || quantityToBuy <= 0 || quantityToBuy > product.stock) {
        return await interaction.reply({ content: "❌ **الكمية المطلوبة غير متوفرة أو غير صالحة.**", ephemeral: true });
    }
const sellerMember = await interaction.guild.members.fetch(sellerId).catch(() => null);

   
const catalogChannelId = config.Shop_CategoryId;
const ticketChannel = await interaction.guild.channels.create(`تذكرة-شراء-${product.name}`, {
    type: 'GUILD_TEXT',
    topic: interaction.user.id,
    parent: catalogChannelId,
    permissionOverwrites: [
        // Deny @everyone from viewing the channel
        { id: interaction.guild.roles.everyone, deny: ['VIEW_CHANNEL'] },
        // Allow the ticket creator
        { id: interaction.user.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
        // Allow the seller (assuming sellerId is a valid user ID)
        { id: sellerMember.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] }
    ]
});
    


    const ticketEmbed = new MessageEmbed()
        .setColor("#00cc44")
        .setTitle("📦 تفاصيل عملية الشراء")
        .setDescription(`تم شراء **${quantityToBuy}** من المنتج **${product.name}** من قبل <@${interaction.user.id}>`)
        .addFields(
            { name: "💰 **السعر الإجمالي**", value: `${totalPrice} 💵`, inline: true },
            { name: "📦 **الكمية المطلوبة**", value: `${quantityToBuy}`, inline: true },
            { name: "💰 **سعر الوحدة**", value: `${product.price} 💵`, inline: true }
        );

    // إرسال تفاصيل الشراء في التذكرة

    // إضافة زر "تم تسليم"
  const deliveryButton = new MessageButton()
    .setCustomId(`confirm_delivery_${sellerId}_${productMessageId}_${quantityToBuy}`)
    .setLabel("تم تسليم")
    .setStyle("SUCCESS");

const cancelButton = new MessageButton()
    .setCustomId(`cancel_transaction_${sellerId}_${productMessageId}`)
    .setLabel("إلغاء العملية")
    .setStyle("DANGER");
    

    await ticketChannel.send({ content: `مرحباً <@${interaction.user.id}>! تم تأكيد شراء **${quantityToBuy}** من المنتج **${product.name}** من قبل <@${sellerId}>.`,embeds: [ticketEmbed] , components: [new MessageActionRow().addComponents(deliveryButton, cancelButton)] });
    await interaction.deferUpdate();

    // رد على المستخدم
     interaction.editReply({ content: `✅ **تم تأكيد شراء ${quantityToBuy} من المنتج: ${product.name}.**\n ${ticketChannel}`, embeds: [], components: [], ephemeral: true });
}

if (interaction.customId === "cancel_buy") {
    await interaction.deferUpdate();
     interaction.editReply({ content: "❌ **تم إلغاء عملية الشراء.**", embeds: [], components: [] });
} 
  
  
  if (interaction.customId.startsWith("edit_stock_")) {
    const sellerId = interaction.customId.split("_")[2]; // استخراج ID البائع
    const productMessageId = interaction.message.id; // استخراج ID الرسالة
    const productged = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": productMessageId,
        "products.sellerId": sellerId
    });

  
    if (!productged) {
        return await interaction.reply({ content: "❌ **أنت لست البائع لهذا المنتج.**", ephemeral: true });
    }

    const product = productged.products.find(p => p.messageId === productMessageId);
if (product && product.sellerId !== interaction.user.id) {
    return await interaction.reply({ content: "❌ **أنت لست البائع لهذا المنتج.**", ephemeral: true });
}
    // إنشاء نموذج (Modal) للبائع لتعديل الكمية
    const modal = new Modal()
        .setCustomId("update_stock_modal") // ID للنموذج
        .setTitle("🔄 تعديل الكمية للمنتج")
        .addComponents(
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("new_quantity") // ID الحقل
                    .setLabel("أدخل الكمية الجديدة")
                    .setStyle("SHORT")
                    .setPlaceholder("مثال: 100")
                    .setRequired(true)
            )
        );

    // إرسال النموذج للبائع
    await interaction.showModal(modal);
}

  
if (interaction.customId.startsWith("confirm_delivery_")) {
    // استخراج sellerId و productMessageId من customId
    const customIdParts = interaction.customId.split("_");
    const sellerId = customIdParts[2];
    const productMessageId = customIdParts[3];
    const quantityToBuy = parseInt(customIdParts[4]);
    // البحث عن المنتج في قاعدة البيانات
    const productged = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": productMessageId,
        "products.sellerId": sellerId
    });
   
    // التحقق من أن المستخدم هو البائع
    if (interaction.user.id !== sellerId) {
        return await interaction.reply({ content: "❌ **أنت لست البائع لهذا المنتج.**", ephemeral: true });
    }
    if (!productged) {
        
             const result = await Store.aggregate([
  { $match: { "products.sellerId": sellerId } },
  { $unwind: "$products" },
  { $match: { "products.sellerId": sellerId } },
  { $count: "total" }
]);

const count = result[0]?.total || 0;

      await Seller.findOneAndUpdate(
    { userId: sellerId }, // تحديد المستخدم
    {
     
        $inc: { 
      salesCount: 1 // زيادة عدد التقارير بمقدار واحد
    },
      
        $set: { 
            availableProducts: count // إضافة إجمالي المنتجات المعروضة
        }
    },
    { new: true } // إرجاع الوثيقة بعد التحديث
);
  
  
const topic = interaction.channel.topic;

// التحقق من وجود معرف المستخدم في التوبيك
const buyerId = topic ? topic.match(/\d+/) : null;  // استخراج الرقم (المعرف) من التوبيك
    // إرسال الفاتورة للمشتري
 const logChannel = await interaction.client.channels.fetch(config.log_feedback_shop);
      const invoiceEmbed = new MessageEmbed()
    .setColor("#5865F2") // لون دسكورد الأزرق
    .setTitle("🧾 **حالة عملية الشراء**")
        .setDescription(`
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
**تمت عملية الشراء بنجاح ✅**
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
`)
  .addFields(
        {
            name: "**ملاحظة:**",
            value: "فشل الحصول على معلومات الفاتورة التفصيلية",
            inline: true
        },
        {
            name: "**📅 تاريخ الشراء**",
            value: `> <t:${Math.floor(Date.now()/1000)}:F>`,
            inline: true
        }
    );
const ratingRow = new MessageActionRow().addComponents(
    // 🔴 تقييم 1 - سيء جداً
    new MessageButton()
        .setCustomId(`rate_1_${sellerId}_${buyerId[0]}`)
        .setLabel('⭐ 1 🔴')
        .setStyle('DANGER')
        .setEmoji('😡'),

    // 🟠 تقييم 2 - سيء
    new MessageButton()
        .setCustomId(`rate_2_${sellerId}_${buyerId[0]}`)
        .setLabel('⭐ 2 🟠')
        .setStyle('DANGER')
        .setEmoji('😠'),

    // 🟡 تقييم 3 - مقبول
    new MessageButton()
        .setCustomId(`rate_3_${sellerId}_${buyerId[0]}`)
        .setLabel('⭐ 3 🟡')
        .setStyle('SECONDARY')
        .setEmoji('😐'),

    // 🟢 تقييم 4 - جيد
    new MessageButton()
        .setCustomId(`rate_4_${sellerId}_${buyerId[0]}`)
        .setLabel('⭐ 4 🟢')
        .setStyle('SUCCESS')
        .setEmoji('😊'),

    // 🔵 تقييم 5 - ممتاز
    new MessageButton()
        .setCustomId(`rate_5_${sellerId}_${buyerId[0]}`)
        .setLabel('⭐ 5 🔵')
        .setStyle('SUCCESS')
        .setEmoji('😍')
);

// إرسال الفاتورة مع الأزرار
await logChannel.send({    content:`<@${buyerId[0]}>, <@${sellerId}>`,embeds: [invoiceEmbed], components: [ratingRow] }).catch(() => null);

  
    // إخفاء القناة عن الجميع وإزالة جميع الأذونات
     await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: false }); // إخفاء القناة عن الجميع

    // إزالة الأذونات فقط للأشخاص الذين لديهم أذونات في خصائص القناة
    const permissionOverwrites = interaction.channel.permissionOverwrites.cache;

    permissionOverwrites.forEach((overwrite) => {
        // إذا كان الشخص ليس البائع أو المشتري، يمكننا إخفاء القناة عنه
            interaction.channel.permissionOverwrites.edit(overwrite.id, { VIEW_CHANNEL: null, SEND_MESSAGES: null }); // إزالة الأذونات
        
    });
   
    // تعطيل الأزرار الحالية
    const message = await interaction.message.fetch();
    const components = message.components.map((row) => {
        return {
            type: row.type,
            components: row.components.map((button) => ({
                ...button,
                disabled: true, // تعطيل الأزرار الحالية
            })),
        };
    });

    // إعداد الزر الجديد "قفل"
    const lockButton = new MessageButton()
        .setCustomId('lock_channel')
        .setLabel('قفل القناة')
        .setStyle('DANGER'); // يمكنك تغيير اللون أو الشكل إذا أردت

    // إنشاء الصف الذي يحتوي على الزر الجديد
    const row = new MessageActionRow().addComponents(lockButton);

    // تحديث الرسالة مع تعطيل الأزرار الحالية وإضافة الزر الجديد
    await interaction.update({
        content: `✅ **تم تأكيد تسليم المنتج، وتم إرسال الفاتورة للمشتري.**`,
        components: [row], // إضافة الزر الجديد
    });
  await interaction.channel.setName(`تم-البيع ✅`).catch(() => null);
      return
    }
   


    const product = productged.products.find(p => p.messageId === productMessageId);
    
// التحقق من أن الكمية المطلوبة أقل من المخزون المتاح
if (quantityToBuy > product.stock) {
    return await interaction.reply({ content: `❌ **الكمية المطلوبة أكبر من المخزون المتاح. المخزون المتاح هو ${product.stock}.**`, ephemeral: true });
}
  
  let updateOperations = [];

const newQuantity = product.stock - quantityToBuy;

updateOperations.push({
    updateOne: {
        filter: { "products.messageId": productMessageId },
        update: { $set: { "products.$.stock": newQuantity } },
        upsert: false // لا حاجة لإدخال منتج جديد في حال عدم وجوده
    }
});
  // تنفيذ التحديثات دفعة واحدة
if (updateOperations.length > 0) {
    await Store.bulkWrite(updateOperations);
}

  
             const result = await Store.aggregate([
  { $match: { "products.sellerId": sellerId } },
  { $unwind: "$products" },
  { $match: { "products.sellerId": sellerId } },
  { $count: "total" }
]);

const count = result[0]?.total || 0;

      await Seller.findOneAndUpdate(
    { userId: sellerId }, // تحديد المستخدم
    {
     
        $inc: { 
      salesCount: 1 // زيادة عدد التقارير بمقدار واحد
    },
      
        $set: { 
            availableProducts: count // إضافة إجمالي المنتجات المعروضة
        }
    },
    { new: true } // إرجاع الوثيقة بعد التحديث
);
  
  
    // إنشاء embed جديد يعرض التفاصيل مع الكمية الجديدة
    const productEmbed = new MessageEmbed()
        .setColor("#00cc44")
        .setDescription(
            `📝 **الوصف:**\n${product.description || "لا يوجد وصف."}\nتم إضافة هذا المنتج من قبل البائع: <@${product.sellerId}>`
        )
        .addFields(
            { name: "📌 **الاسم**", value: product.name, inline: false },
            { name: "📦 **الكمية**", value: `${newQuantity}`, inline: false },
            { name: "💰 **السعر**", value: `${product.price} 💵`, inline: false },
            { name: "📂 **التصنيف**", value: product.category, inline: false },
            { 
                name: "💰 **طريقة الدفع**", 
                value: product.preferredPaymentMethod === "legal" 
                    ? "✅ شرعي" 
                    : product.preferredPaymentMethod === "illegal" 
                        ? "❌ غير شرعي" 
                        : "⚖️ شرعي وغير شرعي", 
                inline: false 
            }
        )
        .setImage(product.image);
    const finalRoom = interaction.guild.channels.cache.get(config.shop_products);

    // تعديل الرسالة في القناة لتحديث الكمية
    await finalRoom.messages.fetch(productMessageId).then((message) => {
        message.edit({ embeds: [productEmbed] });
    });
const topic = interaction.channel.topic;

// التحقق من وجود معرف المستخدم في التوبيك
const buyerId = topic ? topic.match(/\d+/) : null;  // استخراج الرقم (المعرف) من التوبيك
    // إرسال الفاتورة للمشتري
const logChannel = await interaction.client.channels.fetch(config.log_feedback_shop);
    const invoiceEmbed = new MessageEmbed()
    .setColor("#5865F2") // لون دسكورد الأزرق
    .setTitle("🧾 **فاتورة الشراء**")
    .setDescription(`
    ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
    **تمت عملية الشراء بنجاح** ✅
    ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
    `)
    .addFields(
        { name: "**🛒 المنتج**", value: `> ${product.name}`, inline: true },
        { name: "**📦 الكمية**", value: `> ${quantityToBuy}`, inline: true },
        { name: "**📂 التصنيف**", value: `> ${product.category}`, inline: true },
        { name: "**💳 طريقة الدفع**", 
          value: `> ${product.preferredPaymentMethod === "legal" ? "شرعي ✅" : 
                  product.preferredPaymentMethod === "illegal" ? "غير شرعي ❌" : 
                  "شرعي/غير شرعي ⚖️"}`, 
          inline: true },
        { name: "**📅 تاريخ الشراء**", value: `> <t:${Math.floor(Date.now()/1000)}:F>`, inline: false }
    );


const ratingRow = new MessageActionRow().addComponents(
    // 🔴 تقييم 1 - سيء جداً
    new MessageButton()
        .setCustomId(`rate_1_${sellerId}_${buyerId[0]}`)
        .setLabel('⭐ 1 🔴')
        .setStyle('DANGER')
        .setEmoji('😡'),

    // 🟠 تقييم 2 - سيء
    new MessageButton()
        .setCustomId(`rate_2_${sellerId}_${buyerId[0]}`)
        .setLabel('⭐ 2 🟠')
        .setStyle('DANGER')
        .setEmoji('😠'),

    // 🟡 تقييم 3 - مقبول
    new MessageButton()
        .setCustomId(`rate_3_${sellerId}_${buyerId[0]}`)
        .setLabel('⭐ 3 🟡')
        .setStyle('SECONDARY')
        .setEmoji('😐'),

    // 🟢 تقييم 4 - جيد
    new MessageButton()
        .setCustomId(`rate_4_${sellerId}_${buyerId[0]}`)
        .setLabel('⭐ 4 🟢')
        .setStyle('SUCCESS')
        .setEmoji('😊'),

    // 🔵 تقييم 5 - ممتاز
    new MessageButton()
        .setCustomId(`rate_5_${sellerId}_${buyerId[0]}`)
        .setLabel('⭐ 5 🔵')
        .setStyle('SUCCESS')
        .setEmoji('😍')
);

// إرسال الفاتورة مع الأزرار
await logChannel.send({    content:`<@${buyerId[0]}>, <@${sellerId}>`,embeds: [invoiceEmbed], components: [ratingRow] }).catch(() => null);

  
    // إخفاء القناة عن الجميع وإزالة جميع الأذونات
     await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: false }); // إخفاء القناة عن الجميع

    // إزالة الأذونات فقط للأشخاص الذين لديهم أذونات في خصائص القناة
    const permissionOverwrites = interaction.channel.permissionOverwrites.cache;

    permissionOverwrites.forEach((overwrite) => {
        // إذا كان الشخص ليس البائع أو المشتري، يمكننا إخفاء القناة عنه
            interaction.channel.permissionOverwrites.edit(overwrite.id, { VIEW_CHANNEL: null, SEND_MESSAGES: null }); // إزالة الأذونات
        
    });
   
    // تعطيل الأزرار الحالية
    const message = await interaction.message.fetch();
    const components = message.components.map((row) => {
        return {
            type: row.type,
            components: row.components.map((button) => ({
                ...button,
                disabled: true, // تعطيل الأزرار الحالية
            })),
        };
    });

    // إعداد الزر الجديد "قفل"
    const lockButton = new MessageButton()
        .setCustomId('lock_channel')
        .setLabel('قفل القناة')
        .setStyle('DANGER'); // يمكنك تغيير اللون أو الشكل إذا أردت

    // إنشاء الصف الذي يحتوي على الزر الجديد
    const row = new MessageActionRow().addComponents(lockButton);

    // تحديث الرسالة مع تعطيل الأزرار الحالية وإضافة الزر الجديد
     interaction.update({
        content: `✅ **تم تأكيد تسليم المنتج، وتم إرسال الفاتورة للمشتري.**`,
        components: [row], // إضافة الزر الجديد
    }).catch(() => null);
  await interaction.channel.setName(`تم-البيع ✅`).catch(() => null);
    

}
  
  async function handleRating(interaction, rating) {
    const customIdParts = interaction.customId.split("_");
    const sellerId = customIdParts[2]; // sellerId
    const userId = customIdParts[3]; // sellerId
 if (interaction.user.id !== userId) {
        return await interaction.reply({ content: "❌ **أنت لست صاحب هذة الفاتورة.**", ephemeral: true });
    }
    // البحث عن البائع في قاعدة البيانات
    const seller = await Seller.findOne({ userId: sellerId });
    if (!seller) {
        return interaction.reply({
            content: "⚠️ **هذا البائع غير مسجل كبائع في النظام!**",
            ephemeral: true,
        });
      
        try {
          /*
    const message = interaction.message;
    const components = message.components.map((row) => {
        return {
            type: row.type,
            components: row.components.map((button) => ({
                ...button,
                disabled: true, // تعطيل الأزرار
            })),
        };
    });*/

        const sellerUser = await client.users.fetch(sellerId);
    

const member = await interaction.guild.members.fetch(sellerUser.id).catch(() => null);
const nameToShow = member?.displayName || sellerUser.username;


    await interaction.update({
       content: null,
        components:[new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId("rating_done")

          .setLabel(`⭐ ${rating}/5 | ${nameToShow}`)
            .setStyle("SUCCESS")
            .setDisabled(true)
    )],
    });

} catch (error) {
  
}
      
    }

    // حفظ التقييم مباشرة في قاعدة البيانات دون جلب البائع
    await Seller.updateOne(
        { userId: sellerId },
        {
            $push: {
                ratings: {
                    userId: interaction.user.id,
                    rating: rating,
                    comment: null, // يمكنك إضافة تعليق هنا إذا كنت ترغب
                    createdAt: new Date(),
                },
            },
        }
    );
   try {
  /*  const message = interaction.message;
    const components = message.components.map((row) => {
        return {
            type: row.type,
            components: row.components.map((button) => ({
                ...button,
                disabled: true, // تعطيل الأزرار
            })),
        };
    });
*/
       const sellerUser = await client.users.fetch(sellerId);
    



    await interaction.update({
       content: null,
        components:[new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId("rating_done")
.setLabel(`⭐ ${rating}/5 | ${interaction.member.nickname || interaction.user.username}`)
            .setStyle("SUCCESS")
            .setDisabled(true)
    )],
    });
     
} catch (error) {
    console.error("فشل تعديل الرسالة:", error);
    await interaction.followUp({
        content: "تعذر التقديم الرسالة. قد تكون قديمة.",
        ephemeral: true
    });
}

    await interaction.followUp({
        content: `شكراً لك على تقييمك بـ ${rating} ⭐! ${`<@${sellerId}>` ? `تم تقييم بائع <@${sellerId}>` : ''}`,
        ephemeral: true,
    });
    const sellerNotification = new MessageEmbed()
    .setColor("#FFD700") // لون ذهبي مناسب للتقييم
    .setTitle("📊 تم تلقي تقييم جديد!")
    .setDescription(`لقد حصلت على تقييم جديد من ${interaction.user}`)
    .addFields(
        { name: "⭐ التقييم", value: `${rating}/5 نجوم`, inline: true },
        { name: "📅 التاريخ", value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
    )
    
      // البحث عن البائع وإرسال الإشعار له
    const seller3 = await interaction.client.users.fetch(sellerId);
    await seller3.send({
        embeds: [sellerNotification],
    }).catch(() => null);
    
    
    
}
  
  
  
  
  
  
if (interaction.customId.startsWith("filter_type_")) {
    const selectedType = interaction.customId.split("_")[2];

    // تحديد الإيموجي المناسب بناءً على نوع المنتج
    const emojiMap = {
        "خشب": "🪵",
        "دجاج": "🐔",
        "سمك": "🐟",
        "خضروات": "🥦",
        "نفط": "🛢️",
        "قماش": "🧵",
        "معادن": "⛓️",
        "ممنوعات": "🚫",
        "أسلحة": "🔫",
        "أخرى": "📁"
    };

    const emoji = emojiMap[selectedType] || "📋"; // إذا لم يكن النوع موجودًا، استخدم الإيموجي الافتراضي

    const stores = await Store.find({}).lean();
    const allProducts = stores.flatMap(s => s.products);
    const filteredProducts = allProducts.filter(p => p.category.includes(selectedType));

    const PAGE_SIZE = 5; // عدد المنتجات في كل صفحة
    const TIMEOUT = 60000; // مدة التفاعل قبل إغلاق الأزرار (60 ثانية)

    try {
          if (filteredProducts.length === 0) {
            // الرد برسالة Embed في حالة عدم وجود منتجات
            const embed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle(`${emoji} لا توجد منتجات من النوع: ${selectedType}`)
                .setDescription(`❌ لم يتم العثور على منتجات من النوع **${selectedType}** في المتجر.`)

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        }
        await interaction.deferReply({ ephemeral: true });

        // ترتيب المنتجات حسب تاريخ الإضافة من الأقدم إلى الأحدث
        filteredProducts.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt)); // ترتيب حسب تاريخ الإضافة (من الأقدم إلى الأحدث)

        let page = 0;

        // دالة لإنشاء Embed لكل صفحة
        const generateEmbed = async (pageIndex) => {
            const start = pageIndex * PAGE_SIZE;
            const end = start + PAGE_SIZE;
            const currentPageProducts = filteredProducts.slice(start, end);  // تحديد المنتجات في الصفحة الحالية

            const embed = new MessageEmbed()
                .setColor('#FFD700')
                .setTitle(`${emoji} 📋 قائمة المنتجات: ${selectedType}`)
                .setFooter(`صفحة ${pageIndex + 1} من ${Math.ceil(filteredProducts.length / PAGE_SIZE)}`);

            // إضافة المنتجات في الصفحة الحالية
            currentPageProducts.forEach((product) => {
                embed.addField(
                    `✨ **${product.name}**`,
                    `💸 **السعر**: \`${product.price}\`\n🧑‍💻 **البائع**: <@${product.sellerId}>\n🔗 **[اذهب للمنتج](https://discord.com/channels/${config.serverid}/${config.shop_products}/${product.messageId})**\n━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                    false
                );
            });

            return embed;
        };

        // إنشاء الأزرار
        const generateButtons = (pageIndex) => {
            return new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ السابق')
                    .setStyle('PRIMARY')
                    .setDisabled(pageIndex === 0),
                new MessageButton()
                    .setCustomId('next_page')
                    .setLabel('➡️ التالي')
                    .setStyle('PRIMARY')
                    .setDisabled((pageIndex + 1) * PAGE_SIZE >= filteredProducts.length)
            );
        };

        const embedMessage = await interaction.editReply({
            embeds: [await generateEmbed(page)],
            components: [generateButtons(page)],
            ephemeral: true
        });

        // إنشاء مستمع للأزرار
        const collector = embedMessage.createMessageComponentCollector({ time: TIMEOUT });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== interaction.user.id) {
                return btnInteraction.reply({ content: '❌ لا يمكنك التحكم في هذا!', ephemeral: true });
            }

            if (btnInteraction.customId === 'next_page') {
                page++;
            } else if (btnInteraction.customId === 'prev_page') {
                page--;
            }

            await btnInteraction.update({
                embeds: [await generateEmbed(page)],
                components: [generateButtons(page)]
            });
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] });
        });

    } catch (error) {
        console.error(error);
        return interaction.editReply({ content: '❌ حدث خطأ أثناء جلب البيانات.', ephemeral: true });
    }
}

if (interaction.customId === "show_products") {
    const PAGE_SIZE = 5; // عدد المنتجات في كل صفحة
    const TIMEOUT = 60000; // مدة التفاعل قبل إغلاق الأزرار (60 ثانية)
    await interaction.deferReply({ ephemeral: true });

    try {
        // جلب جميع المنتجات من كافة السيرفرات
        const stores = await Store.find({}).lean();

        if (stores.length === 0) {
            return interaction.editReply({ content: '❌ لا توجد منتجات في قاعدة البيانات.', ephemeral: true });
        }

        // دمج جميع المنتجات من السيرفرات المختلفة
        const products = stores.flatMap(store => store.products);

        if (products.length === 0) {
            return interaction.editReply({ content: '❌ لا توجد منتجات معروضة.', ephemeral: true });
        }

        // ترتيب المنتجات حسب تاريخ الإضافة من الأقدم إلى الأحدث
        products.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt)); // ترتيب حسب تاريخ الإضافة (من الأقدم إلى الأحدث)

        let page = 0;

        // دالة لإنشاء Embed لكل صفحة
     const generateEmbed = async (pageIndex) => {
    const start = pageIndex * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const currentPageProducts = products.slice(start, end);  // تحديد المنتجات في الصفحة الحالية

    const embed = new MessageEmbed()
        .setColor('#FFD700')
        .setTitle('📋 قائمة المنتجات')
        .setFooter(`صفحة ${pageIndex + 1} من ${Math.ceil(products.length / PAGE_SIZE)}`);

    // إضافة المنتجات في الصفحة الحالية
   currentPageProducts.forEach((product) => {
    embed.addField(
        `✨ **${product.name}**`,
        `💸 **السعر**: \`${product.price}\`\n🧑‍💻 **البائع**: <@${product.sellerId}>\n🔗 **[اذهب للمنتج](https://discord.com/channels/${config.serverid}/${config.shop_products}/${product.messageId})**\n━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        false
    );
});

    return embed;
};


        // إنشاء الأزرار
        const generateButtons = (pageIndex) => {
            return new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ السابق')
                    .setStyle('PRIMARY')
                    .setDisabled(pageIndex === 0),
                new MessageButton()
                    .setCustomId('next_page')
                    .setLabel('➡️ التالي')
                    .setStyle('PRIMARY')
                    .setDisabled((pageIndex + 1) * PAGE_SIZE >= products.length)
            );
        };

        const embedMessage = await interaction.editReply({
            embeds: [await generateEmbed(page)],
            components: [generateButtons(page)],
            ephemeral: true
        });

        // إنشاء مستمع للأزرار
        const collector = embedMessage.createMessageComponentCollector({ time: TIMEOUT });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== interaction.user.id) {
                return btnInteraction.reply({ content: '❌ لا يمكنك التحكم في هذا!', ephemeral: true });
            }

            if (btnInteraction.customId === 'next_page') {
                page++;
            } else if (btnInteraction.customId === 'prev_page') {
                page--;
            }

            await btnInteraction.update({
                embeds: [await generateEmbed(page)],
                components: [generateButtons(page)]
            });
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] });
        });

    } catch (error) {
        console.error(error);
        return interaction.editReply({ content: '❌ حدث خطأ أثناء جلب البيانات.', ephemeral: true });
    }
}

  
if (interaction.customId === "view_all_sellers") {
  
    const rolesToRemove = [config.rolesellerManager]; // الرتب المسموح لها
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
  
    const roleId = config.seller; // معرف الرتبة المطلوبة
    const PAGE_SIZE = 1; // عدد الأشخاص في كل صفحة
    const TIMEOUT = 60000; // مدة التفاعل قبل إغلاق الأزرار (60 ثانية)

    await interaction.deferReply({ ephemeral: true });

    try {
        // جلب الأعضاء الذين لديهم الرتبة
        const membersWithRole = await interaction.guild.members.fetch().then(members =>
            members.filter(member => member.roles.cache.has(roleId))
        );

        if (membersWithRole.size === 0) {
            return interaction.editReply({ content: '❌ لا يوجد أعضاء بهذه الرتبة.', ephemeral: true });
        }

        // جلب بيانات الأعضاء من MongoDB
        const userIds = [...membersWithRole.keys()];
        const sortedUsers = await Seller.find({ userId: { $in: userIds } }).sort({ createdAt: 1 }).lean();

        const sortedMembers = sortedUsers
            .map(user => membersWithRole.get(user.userId))
            .filter(member => member);

        if (sortedMembers.length === 0) {
            return interaction.editReply({ content: '❌ لا يوجد بيانات متطابقة في قاعدة البيانات.', ephemeral: true });
        }

        let page = 0;

    // دالة لإنشاء Embed لكل صفحة
const generateEmbed = async (pageIndex) => {
    const start = pageIndex * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const currentPageMembers = sortedMembers.slice(start, end);

    // جلب بيانات البائعين من قاعدة البيانات دفعة واحدة
    const sellers = await Promise.all(
        currentPageMembers.map(member => Seller.findOne({ userId: member.user.id }).lean())
    );

    const embed = new MessageEmbed()
            .setColor('#FFD700')
    .setTitle('📋 قائمة البائعين')
    .setFooter(`صفحة ${pageIndex + 1} من ${Math.ceil(sortedMembers.length / PAGE_SIZE)}`);

   

currentPageMembers.forEach((member, index) => {
    const seller = sellers[index];
    if (!seller) {
        return;
    }

    const ratingsArray = seller.ratings || [];
    const totalRatings = ratingsArray.length;
    let ratingStars = "🌟 لم يتم التقييم بعد";
    if (totalRatings > 0) {
        const totalSum = ratingsArray.reduce((acc, rating) => acc + rating.rating, 0);
        const averageRating = totalSum / totalRatings;
        const filledStars = "🌟".repeat(Math.round(averageRating));
        ratingStars = `\`${filledStars}\` || || (**${averageRating.toFixed(1)}**)`;
    }
        embed .setDescription(`# > 🔹#${start + index + 1} | ${currentPageMembers.map(member => `<@${member.user.id}>`).join('\n')}`)

    embed.addFields(
        { name: '✅ تم التحقق؟', value: seller.isVerified ? '🟢 نعم' : '🔴 لا', inline: true },
        { name: '📦 المنتجات المتاحة', value: `\`${seller.availableProducts}\` 🏷`, inline: true },
        { name: '🛍 إجمالي المنتجات', value: `\`${seller.totalSellerProducts}\` 📦`, inline: true },
        { name: '📈 عدد المبيعات', value: `\`${seller.salesCount}\` 📊`, inline: true },
        { name: '🚨 عدد البلاغات', value: `\`${seller.reportsCount}\` ⚠️`, inline: true },
        { name: '⚠️ عدد التحذيرات', value: `\`${seller.warningsCount}\` ⚠️`, inline: true },
        { name: '📝 عدد الملاحظات', value: `\`${seller.notes.length}\` 🗒`, inline: true },
        { name: '⭐ التقييم العام', value: ratingStars, inline: true },
        { name: '📅 تاريخ الانضمام', value: `<t:${Math.floor(seller.createdAt / 1000)}:F>`, inline: true }
    );
});

return embed;
};

        // إنشاء الأزرار
        const generateButtons = (pageIndex) => {
            return new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ السابق')
                    .setStyle('PRIMARY')
                    .setDisabled(pageIndex === 0),
                new MessageButton()
                    .setCustomId('next_page')
                    .setLabel('➡️ التالي')
                    .setStyle('PRIMARY')
                    .setDisabled((pageIndex + 1) * PAGE_SIZE >= sortedMembers.length)
            );
        };

        const embedMessage = await interaction.editReply({
            embeds: [await generateEmbed(page)],
            components: [generateButtons(page)],
            ephemeral: true
        });

        // إنشاء مستمع للأزرار
        const collector = embedMessage.createMessageComponentCollector({ time: TIMEOUT });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== interaction.user.id) {
                return btnInteraction.reply({ content: '❌ لا يمكنك التحكم في هذا!', ephemeral: true });
            }

            if (btnInteraction.customId === 'next_page') {
                page++;
            } else if (btnInteraction.customId === 'prev_page') {
                page--;
            }

            await btnInteraction.update({
                embeds: [await generateEmbed(page)],
                components: [generateButtons(page)]
            });
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] });
        });

    } catch (error) {
        console.error(error);
        return interaction.editReply({ content: '❌ حدث خطأ أثناء جلب البيانات.', ephemeral: true });
    }
}


  
    

if (interaction.customId.startsWith("rate_")) {
    const customIdParts = interaction.customId.split("_");
    const rating = parseInt(customIdParts[1]); // التقييم (من 1 إلى 5)

    await handleRating(interaction, rating);
}
  
  
  if (interaction.customId.startsWith("cancel_transaction_")) {
   // استخراج sellerId و productMessageId من customId
    const customIdParts = interaction.customId.split("_");
    const sellerId = customIdParts[2]; 
    const productMessageId = customIdParts[3]; 
  
  const productged = await Store.findOne({
        serverId: interaction.guild.id,
        "products.messageId": productMessageId,
        "products.sellerId": sellerId
    });
const isSeller = interaction.user.id === sellerId || interaction.user.id === "298011146584064000";

if (!isSeller) {
    return await interaction.reply({ content: "❌ **أنت لست البائع لهذا المنتج.**", ephemeral: true });
}


    if (!productged) { 
    // إخفاء القناة عن الجميع وإزالة جميع الأذونات
     await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: false }); // إخفاء القناة عن الجميع

    // إزالة الأذونات فقط للأشخاص الذين لديهم أذونات في خصائص القناة
    const permissionOverwrites = interaction.channel.permissionOverwrites.cache;

    permissionOverwrites.forEach((overwrite) => {
        // إذا كان الشخص ليس البائع أو المشتري، يمكننا إخفاء القناة عنه
            interaction.channel.permissionOverwrites.edit(overwrite.id, { VIEW_CHANNEL: null, SEND_MESSAGES: null }); // إزالة الأذونات
        
    });

    
    
    const message = await interaction.message.fetch();
    const components = message.components.map((row) => {
        return {
            type: row.type,
            components: row.components.map((button) => ({
                ...button,
                disabled: true, // تعطيل الأزرار الحالية
            })),
        };
    });

    // إعداد الزر الجديد "قفل"
    const lockButton = new MessageButton()
        .setCustomId('lock_channel')
        .setLabel('قفل القناة')
        .setStyle('DANGER'); // يمكنك تغيير اللون أو الشكل إذا أردت

    // إنشاء الصف الذي يحتوي على الزر الجديد
    const row = new MessageActionRow().addComponents(lockButton);

    // تحديث الرسالة مع تعطيل الأزرار الحالية وإضافة الزر الجديد
    await interaction.update({
        content: "❌ **تم إلغاء العملية. تم إخفاء القناة عن الجميع.**", 
        components: [row], // إضافة الزر الجديد
    });
    await interaction.channel.setName(`تم-إلغاء-العملية ❌`).catch(() => null);
    } else {
      
    const product = productged.products.find(p => p.messageId === productMessageId);
  
    
    // إخفاء القناة عن الجميع وإزالة جميع الأذونات
     await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: false }); // إخفاء القناة عن الجميع

    // إزالة الأذونات فقط للأشخاص الذين لديهم أذونات في خصائص القناة
    const permissionOverwrites = interaction.channel.permissionOverwrites.cache;

    permissionOverwrites.forEach((overwrite) => {
        // إذا كان الشخص ليس البائع أو المشتري، يمكننا إخفاء القناة عنه
            interaction.channel.permissionOverwrites.edit(overwrite.id, { VIEW_CHANNEL: null, SEND_MESSAGES: null }); // إزالة الأذونات
        
    });

    
    
    const message = await interaction.message.fetch();
    const components = message.components.map((row) => {
        return {
            type: row.type,
            components: row.components.map((button) => ({
                ...button,
                disabled: true, // تعطيل الأزرار الحالية
            })),
        };
    });

    // إعداد الزر الجديد "قفل"
    const lockButton = new MessageButton()
        .setCustomId('lock_channel')
        .setLabel('قفل القناة')
        .setStyle('DANGER'); // يمكنك تغيير اللون أو الشكل إذا أردت

    // إنشاء الصف الذي يحتوي على الزر الجديد
    const row = new MessageActionRow().addComponents(lockButton);

    // تحديث الرسالة مع تعطيل الأزرار الحالية وإضافة الزر الجديد
    await interaction.update({
        content: "❌ **تم إلغاء العملية. تم إخفاء القناة عن الجميع.**", 
        components: [row], // إضافة الزر الجديد
    });
    await interaction.channel.setName(`تم-إلغاء-العملية ❌`).catch(() => null);

    }


}

if (interaction.customId === "lock_channel") {
interaction.channel.delete()
}
if (interaction.customId === "add_new_offer") {
    await interaction.reply({
        content: "🚧 **هذه الميزة ستكون متاحة قريبًا!**",
        ephemeral: true
    });
}

  
  
  
if (interaction.customId === "join_alliance") {
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
    // التحقق مما إذا كان المستخدم بالفعل داخل عائلة كعضو أو كمالك
    const userFamily = await Family.findOne({ 
        $or: [{ members: interaction.user.id }, { ownerId: interaction.user.id }] 
    });

    if (userFamily) {
        if (userFamily.ownerId === interaction.user.id) {
            await sendLog(interaction.guild, '❌ محاولة انضمام مالك عائلة', `المستخدم <@${interaction.user.id}> حاول الانضمام إلى عائلة أخرى وهو مالك عائلة **${userFamily.familyName}**.`, 'RED');
            return interaction.reply({ 
                content: `❌ لا يمكنك الانضمام لأنك مالك عائلة موجودة في النظام، واسم العائلة هو: **${userFamily.familyName}**`, 
                ephemeral: true 
            });
        } else {
            await sendLog(interaction.guild, '❌ محاولة انضمام عضو موجود', `المستخدم <@${interaction.user.id}> حاول الانضمام إلى عائلة أخرى وهو بالفعل عضو في عائلة **${userFamily.familyName}**.`, 'RED');
            return interaction.reply({ 
                content: "❌ لقد انضممت بالفعل إلى عائلة!", 
                ephemeral: true 
            });
        }
    } 

  const arabFamilyRoles = [  
  config.topRole,        // @・إشراف العائلة
  config.management,        // @・Mangment
  config.leadManagement,    // @・Lead Mangment
  config.familyManager,     // @・Family Manager
  config.support,           // @・Support
  config.goldFamily,        // @・Gold Family
  config.silverFamily,      // @・Silver Family
  config.bronzeFamily,      // @・Bronze Family
  config.member2,           // @・Member 2
  config.member1,           // @・Member 1
  config.vandal,           // @vandal
  config.Farmer,           // @・Farmer
    config.familyrole, 

];
    // التحقق مما إذا كان المستخدم يمتلك إحدى الرتب المحظورة
    const memberRoles = interaction.member.roles.cache.map(role => role.id);
    if (arabFamilyRoles.some(role => memberRoles.includes(role))) {
        await sendLog(interaction.guild, '❌ محاولة انضمام محظورة', `المستخدم <@${interaction.user.id}> حاول الانضمام إلى عائلة أخرى وهو عضو في عائلة \`Escobar\`.`, 'RED');
        return interaction.reply({
            content: "❌ **أنت بالفعل عضو في عائلة \`Escobar\` ولا يمكنك الانضمام إلى عائلات أخرى متحالفة.**",
            ephemeral: true
        });
    }
    
    // إنشاء نموذج إدخال كلمة المرور
    const modal = new Modal()
        .setCustomId("family_password_modal")
        .setTitle("🔑 إدخال كلمة مرور العائلة")
        .addComponents(
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId("family_password")
                    .setLabel("✍️ أدخل كلمة مرور العائلة")
                    .setStyle("SHORT")
                    .setRequired(true)
            )
        );

    await interaction.showModal(modal);

    await sendLog(interaction.guild, '🔑 طلب انضمام إلى عائلة', `المستخدم <@${interaction.user.id}> قام بطلب الانضمام إلى عائلة عن طريق إدخال كلمة المرور.`, 'BLUE');
}
  
  

if (interaction.customId.startsWith("open_registration_modal_")) {
  
 
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
    const password = interaction.customId.split("_").pop();
    const family = await Family.findOne({ 
        $or: [{ memberPassword: password }, { adminPassword: password }]
    });

    if (!family) {
        await sendLog(interaction.guild, '❌ خطأ في فتح نموذج التسجيل', `المستخدم <@${interaction.user.id}> حاول فتح نموذج تسجيل بكلمة مرور غير صحيحة: **${password}**.`, 'RED');
        return interaction.reply({ 
            content: "❌ حدث خطأ، يرجى المحاولة مرة أخرى.", 
            ephemeral: true 
        });
    }

    // إنشاء المودال الثاني
    const modal = new Modal()
        .setCustomId(`family_registration_modal_${password}`)
        .setTitle(`التسجيل في عائلة ${family.familyName}`);

    modal.addComponents(
        new MessageActionRow().addComponents(
            new TextInputComponent()
                .setCustomId("family_password")
                .setLabel("🔑 كلمة المرور (لا يمكن تعديلها)")
                .setStyle("SHORT")
                .setPlaceholder(`هذا الباسورد يجب ان يكون مكتوب من فضلك اكتبه ${password}`)
                .setValue(password) // تعيين كلمة المرور تلقائيًا
                .setRequired(true) // يمنع المستخدم من التعديل
        ),
        new MessageActionRow().addComponents(
            new TextInputComponent()
                .setCustomId("User_name_game")
                .setLabel("🔹 ما اسم شخصيتك")
                .setStyle("SHORT")
                .setPlaceholder("اكتب اسم شخصيتك هنا")
                .setRequired(true)
        ),
        new MessageActionRow().addComponents(
            new TextInputComponent()
                .setCustomId("User_id")
                .setLabel("👑 اي دي حسابك")
                .setStyle("SHORT")
                .setPlaceholder("اكتب اي دي داخل اللعبة")
                .setRequired(true)
        )
    );

    await interaction.showModal(modal);

    await sendLog(interaction.guild, '📝 فتح نموذج التسجيل', `تم فتح نموذج التسجيل للعائلة **${family.familyName}** بواسطة <@${interaction.user.id}>\n**كلمة المرور المستخدمة:** ||${password}||`, 'GREEN');
}
  


if (interaction.customId.startsWith("show_members_")) {
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
    await interaction.deferReply({ ephemeral: true });

    const familyName = interaction.customId.replace("show_members_", "");
    const family = await Family.findOne({ familyName: familyName });

    if (!family) {
        await sendLog(interaction.guild, '❌ محاولة عرض أعضاء عائلة غير موجودة', `المستخدم <@${interaction.user.id}> حاول عرض أعضاء عائلة غير موجودة: **${familyName}**.`, 'RED');
        return interaction.editReply("❌ لا توجد عائلة بهذا الاسم.");
    }

    const member = interaction.member;
  
   if (
    member.id !== family.ownerId && 
    !member.roles.cache.has(family.familyRoleId) && 
    !member.roles.cache.has(config.AllianceManager) && // السماح لحاملي الرتبة
    !family.admins.includes(member.id)
) {
        await sendLog(interaction.guild, '❌ محاولة عرض أعضاء بدون صلاحية', `المستخدم <@${interaction.user.id}> حاول عرض أعضاء عائلة **${familyName}** بدون صلاحية.`, 'RED');

    return interaction.followUp({ content: '🚫 لا تملك الصلاحية لإضافة أعضاء!', ephemeral: true });
}
  
  

    let memberIds = [...new Set([family.ownerId, ...family.admins, ...family.members])];
    if (!memberIds || memberIds.length === 0) {
        await sendLog(interaction.guild, '❌ عرض أعضاء عائلة فارغة', `المستخدم <@${interaction.user.id}> حاول عرض أعضاء عائلة **${familyName}** ولكنها فارغة.`, 'RED');
        return interaction.editReply("❌ لا يوجد أعضاء في هذه العائلة.");
    }

    let members = await Promise.all(
        memberIds.map(async id => {
            let member = await interaction.guild.members.fetch(id).catch(() => null);
            if (!member) return null;

            let roleTag = "";
            if (member.id === family.ownerId) roleTag = " 🏆 (مالك العائلة)";
            else if (family.admins.includes(member.id)) roleTag = " 🔧 (أدمن)";

            return { id: member.id, mention: `<@${member.id}>${roleTag}`, order: member.id === family.ownerId ? 0 : family.admins.includes(member.id) ? 1 : 2 };
        })
    );

    members = members.filter(member => member !== null).sort((a, b) => a.order - b.order);
    if (members.length === 0) {
        await sendLog(interaction.guild, '❌ عرض أعضاء عائلة فارغة', `المستخدم <@${interaction.user.id}> حاول عرض أعضاء عائلة **${familyName}** ولكنها فارغة.`, 'RED');
        return interaction.editReply("❌ لا يوجد أعضاء في هذه العائلة.");
    }

    let page = 0;
    const maxPerPage = 5;

    const generateEmbed = (page) => {
        const totalPages = Math.ceil(members.length / maxPerPage);
        const start = page * maxPerPage;
        const end = start + maxPerPage;
        const currentMembers = members.slice(start, end);

        const embed = new MessageEmbed()
            .setTitle(`👥 أعضاء عائلة: ${familyName}`)
            .setColor("BLUE")
            .setFooter(`صفحة ${page + 1} من ${totalPages}`)
            .setDescription(currentMembers.map((member, index) => `**${index + 1 + start} - ${member.mention}**`).join("\n") || "❌ لا يوجد أعضاء.");

        return embed;
    };

    const generateButtons = (page) => {
        const totalPages = Math.ceil(members.length / maxPerPage);

        return [
            new MessageActionRow().addComponents(
                new MessageButton().setCustomId("prev_page").setLabel("⬅️ السابق").setStyle("PRIMARY").setDisabled(page === 0),
                new MessageButton().setCustomId("next_page").setLabel("➡️ التالي").setStyle("PRIMARY").setDisabled(page >= totalPages - 1 || members.length === 0)
            )
        ];
    };

    const reply = await interaction.followUp({
        embeds: [generateEmbed(page)],
        components: generateButtons(page),
        fetchReply: true
    });

    const filter = (btn) => btn.user.id === interaction.user.id;
    const collector = reply.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async (btn) => {
        await btn.deferUpdate().catch(() => null);

        if (btn.customId === "prev_page" && page > 0) page--;
        if (btn.customId === "next_page" && page < Math.ceil(members.length / maxPerPage) - 1) page++;

        await interaction.editReply({
            embeds: [generateEmbed(page)],
            components: generateButtons(page)
        });

        collector.resetTimer();
    });

    collector.on("end", async () => {

        await interaction.editReply({
            components: []
        });
    });

    await sendLog(interaction.guild, '👥 عرض أعضاء عائلة', `المستخدم <@${interaction.user.id}> قام بعرض أعضاء عائلة **${familyName}**.`, 'GREEN');
}
  
  
  
  
if (interaction.customId.startsWith("show_passwords_")) {
  
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

    await interaction.deferReply({ ephemeral: true });

    const familyName = interaction.customId.replace("show_passwords_", "");
    const family = await Family.findOne({ familyName: familyName });

    if (!family) {
        await sendLog(interaction.guild, '❌ محاولة عرض كلمات مرور عائلة غير موجودة', `المستخدم <@${interaction.user.id}> حاول عرض كلمات مرور عائلة غير موجودة: **${familyName}**.`, 'RED');
        return interaction.editReply("❌ لا توجد عائلة بهذا الاسم.");
    }

    const member = interaction.member;
  
   if (
    member.id !== family.ownerId && 
    !member.roles.cache.has(family.familyRoleId) && 
    !member.roles.cache.has(config.AllianceManager) && // السماح لحاملي الرتبة
    !family.admins.includes(member.id)
) {
        await sendLog(interaction.guild, '❌ محاولة عرض كلمات مرور بدون صلاحية', `المستخدم <@${interaction.user.id}> حاول عرض كلمات مرور عائلة **${familyName}** بدون صلاحية.`, 'RED');

    return interaction.followUp({ content: '🚫 لا تملك الصلاحية لإضافة أعضاء!', ephemeral: true });
}
  
  

    // جلب كلمات المرور من قاعدة البيانات
    const adminPassword = family.adminPassword || "غير متوفرة 🔒";
    const memberPassword = family.memberPassword || "غير متوفرة 🔒";

    // إنشاء Embed لعرض البيانات
    const embed = new MessageEmbed()
        .setTitle(`🔑 كلمات مرور عائلة: ${familyName}`)
        .setColor("GOLD")
        .setDescription("تم إنشاء هذه الكلمات لحماية العائلة، استخدمها بحذر.")
        .addFields(
            { name: "👑 كلمة مرور الأدمن:", value: `||${adminPassword}||`, inline: false },
            { name: "👥 كلمة مرور الأعضاء:", value: `||${memberPassword}||`, inline: false }
        )
        .setFooter("⚠️ لا تشارك هذه المعلومات مع الآخرين إلا إذا كنت تثق بهم.");

    // إنشاء أزرار النسخ
    const row = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId("copy_admin_password")
            .setLabel("📋 نسخ كلمة مرور الأدمن")
            .setStyle("DANGER"),

        new MessageButton()
            .setCustomId("copy_member_password")
            .setLabel("📋 نسخ كلمة مرور الأعضاء")
            .setStyle("SUCCESS")
    );

    const reply = await interaction.followUp({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });

    // فلتر التفاعل عشان المستخدم بس هو اللي يقدر يستخدم الأزرار
    const filter = (btn) => btn.user.id === interaction.user.id;
    const collector = reply.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async (btn) => {
        if (btn.customId === "copy_admin_password") {
            if (!family.admins.includes(btn.user.id) && btn.user.id !== family.ownerId) {
                await sendLog(interaction.guild, '❌ محاولة نسخ كلمة مرور الأدمن بدون صلاحية', `المستخدم <@${btn.user.id}> حاول نسخ كلمة مرور الأدمن لعائلة **${familyName}** بدون صلاحية.`, 'RED');
                return btn.reply({ content: "❌ لا يمكنك نسخ كلمة مرور الأدمن، لأنك لست أدمن.", ephemeral: true });
            }

            await sendLog(interaction.guild, '📋 نسخ كلمة مرور الأدمن', `المستخدم <@${btn.user.id}> قام بنسخ كلمة مرور الأدمن لعائلة **${familyName}**.`, 'GREEN');
            return btn.reply({ 
                content: `✅ قم بنسخ كلمة مرور الأدمن:\n > \`\`\`${adminPassword}\`\`\``, 
                ephemeral: true 
            });
        }

        if (btn.customId === "copy_member_password") {
            await sendLog(interaction.guild, '📋 نسخ كلمة مرور الأعضاء', `المستخدم <@${btn.user.id}> قام بنسخ كلمة مرور الأعضاء لعائلة **${familyName}**.`, 'GREEN');
            return btn.reply({ 
                content: `✅ قم بنسخ كلمة مرور الأعضاء:\n > \`\`\`${memberPassword}\`\`\``, 
                ephemeral: true 
            });
        }
    });

    collector.on("end", async () => {

        await interaction.editReply({ components: [] });
    });

    await sendLog(interaction.guild, '🔑 عرض كلمات مرور العائلة', `المستخدم <@${interaction.user.id}> قام بعرض كلمات مرور عائلة **${familyName}**.`, 'BLUE');
}
  
  
  
  
  
  
  
  
  
  
  
  
  
if (interaction.customId.startsWith('contact_car_owner_')) {
    // التحقق من الرتبة
    if (!interaction.member.roles.cache.has(config.carManager)) {
        return interaction.reply({ content: '❌ لا تملك صلاحية استخدام هذا الزر.', ephemeral: true });
    }
    const carOwner = await interaction.guild.members.fetch(interaction.customId.split("_")[3]).catch(() => null);

    if (!carOwner) {
        return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
    }

    const modal = new Modal()
        .setCustomId(`contact_owner_modal_${interaction.customId.split("_")[3]}_${interaction.customId.split("_")[4]}`)
        .setTitle('📩 إرسال رسالة لمسجل السيارة');

    const messageInput = new TextInputComponent()
        .setCustomId('contact_message')
        .setLabel('📝 اكتب رسالتك هنا:')
        .setStyle('PARAGRAPH')
        .setRequired(true);

    const row = new MessageActionRow().addComponents(messageInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
if (interaction.customId.startsWith("add_member_")) {
  
  // دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

    await interaction.deferReply({ ephemeral: true });

    const familyName = interaction.customId.replace("add_member_", ""); // استخراج اسم العيلة

    // 🔹 البحث عن العيلة
    const family = await Family.findOne({ familyName });
    if (!family) {
        await sendLog(interaction.guild, '❌ محاولة إضافة عضو إلى عائلة غير موجودة', `المستخدم <@${interaction.user.id}> حاول إضافة عضو إلى عائلة غير موجودة: **${familyName}**.`, 'RED');
        return interaction.reply({ content: '❌ العائلة غير موجودة في قاعدة البيانات!', ephemeral: true });
    }

    // 🔹 التحقق من الصلاحيات
    const member = interaction.member;
   if (
    member.id !== family.ownerId && 
    !member.roles.cache.has(family.familyRoleId) && 
    !member.roles.cache.has(config.AllianceManager) && // السماح لحاملي الرتبة
    !family.admins.includes(member.id)
) {
    await sendLog(
        interaction.guild, 
        '❌ محاولة إضافة عضو بدون صلاحية', 
        `المستخدم <@${interaction.user.id}> حاول إضافة عضو إلى عائلة **${familyName}** بدون صلاحية.`, 
        'RED'
    );
    return interaction.followUp({ content: '🚫 لا تملك الصلاحية لإضافة أعضاء!', ephemeral: true });
}


    // 🔹 طلب منشن أو ID العضو
    await interaction.followUp({ content: '📌 منشن العضو أو أكتب الـ ID الخاص به:', ephemeral: true });

    const filter = (msg) => msg.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 }).catch(() => null);
    
    if (!collected || collected.size === 0) {
        await sendLog(interaction.guild, '❌ انتهاء الوقت دون إدخال عضو', `المستخدم <@${interaction.user.id}> لم يدخل أي عضو خلال الوقت المحدد لإضافة عضو إلى عائلة **${familyName}**.`, 'RED');
        return interaction.editReply({ content: '⏳ انتهى الوقت دون إدخال عضو.', ephemeral: true });
    }

    const userMessage = collected.first();
    await userMessage.delete().catch(() => {}); // 🗑️ حذف رسالة المستخدم

    const userId = userMessage.mentions.users.first()?.id || userMessage.content.trim();
    const user = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!user) {
        await sendLog(interaction.guild, '❌ خطأ في العثور على المستخدم', `المستخدم <@${interaction.user.id}> حاول إضافة عضو غير موجود إلى عائلة **${familyName}**.`, 'RED');
        return interaction.editReply({ content: '❌ لم يتم العثور على المستخدم!', ephemeral: true });
    }

    if (family.members.includes(user.id) || family.admins.includes(user.id)) {
        await sendLog(interaction.guild, '❌ محاولة إضافة عضو موجود بالفعل', `المستخدم <@${interaction.user.id}> حاول إضافة <@${user.id}> إلى عائلة **${familyName}** ولكن العضو موجود بالفعل.`, 'RED');
        return interaction.editReply({ content: `⚠ <@${user.id}> موجود بالفعل في **${familyName}**!`, ephemeral: true });
    }

    // 🔹 سؤال المستخدم: إضافة كـ عضو أم كـ إدارة؟
    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`add_as_member_${familyName}_${user.id}`).setLabel('👤 كعضو').setStyle('PRIMARY'),
        new MessageButton().setCustomId(`add_as_admin_${familyName}_${user.id}`).setLabel('⚡ كإدارة').setStyle('DANGER'),
        new MessageButton().setCustomId(`cancel_add`).setLabel('❌ إلغاء').setStyle('SECONDARY')
    );

    await interaction.editReply({ content: `⚠ **كيف تريد إضافة <@${user.id}> إلى ${familyName}؟**`, components: [row], ephemeral: true });

    await sendLog(interaction.guild, '📝 طلب إضافة عضو', `المستخدم <@${interaction.user.id}> قام بطلب إضافة <@${user.id}> إلى عائلة **${familyName}**.`, 'BLUE');
}
  
  
  
  

// ⬇️⬇️⬇️ التعامل مع زر اختيار العضو أو الإدارة ⬇️⬇️⬇️
if (interaction.customId.startsWith("add_as_")) {
  
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
 const parts = interaction.customId.split('_');

// إضافة جزء `action` (مثلاً "add_as")
const action = parts[0] + '_' + parts[1];  // "add_as"

// إضافة الجزء المتعلق بالدور (مثلاً "member" أو "admin")
const role = parts[2];  // "member" أو "admin"

// إضافة اسم العائلة
const familyName = parts.slice(3, parts.length - 1).join('_');  // يمكن أن يحتوي على أكثر من كلمة إذا كان الاسم مكون من كلمات عدة

// إضافة معرف المستخدم
const userId = parts[parts.length - 1];  // المعرف هو آخر جزء بعد `_`معرف المستخدم
    const family = await Family.findOne({ familyName });
    if (!family) {
        await sendLog(interaction.guild, '❌ محاولة إضافة عضو إلى عائلة غير موجودة', `المستخدم <@${interaction.user.id}> حاول إضافة عضو إلى عائلة غير موجودة: **${familyName}**.`, 'RED');
        return interaction.reply({ content: '❌ العائلة غير موجودة!', ephemeral: true });
    }

    const user = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!user) {
        await sendLog(interaction.guild, '❌ خطأ في العثور على المستخدم', `المستخدم <@${interaction.user.id}> حاول إضافة عضو غير موجود إلى عائلة **${familyName}**.`, 'RED');
        return interaction.reply({ content: '❌ لم يتم العثور على المستخدم!', ephemeral: true });
    }

    if (role === "member") {
        family.members.push(user.id);
        await user.roles.add(family.familyRoleId).catch(() => {}); // إعطائه رتبة العضو
        const roleteam = await interaction.guild.roles.fetch(config.TeamFamily).catch(() => null);
        if (roleteam) {
            await user.roles.add(roleteam);
        }
        await family.save();

        await sendLog(interaction.guild, '✅ إضافة عضو جديد', `تمت إضافة <@${user.id}> كعضو إلى عائلة **${familyName}** بواسطة <@${interaction.user.id}>.`, 'GREEN');
        return interaction.update({ content: `✅ <@${user.id}> تمت إضافته كعضو في **${familyName}**!`, components: [] });
    } 
    
    if (role === "admin") {
        family.admins.push(user.id);
        await user.roles.add(family.adminRoleId).catch(() => {}); // إعطائه رتبة الإدارة
              await user.roles.add(family.familyRoleId).catch(() => {}); // إعطائه رتبة الإدارة

      const roleteam = await interaction.guild.roles.fetch(config.TeamFamily).catch(() => null);
        if (roleteam) {
            await user.roles.add(roleteam);
        }
        await family.save();

        await sendLog(interaction.guild, '✅ إضافة إدارة جديدة', `تمت إضافة <@${user.id}> كإدارة إلى عائلة **${familyName}** بواسطة <@${interaction.user.id}>.`, 'GREEN');
        return interaction.update({ content: `✅ <@${user.id}> تمت إضافته كإدارة في **${familyName}**!`, components: [] });
    }
}

if (interaction.customId === "cancel_add") {
  
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
    await sendLog(interaction.guild, '❌ إلغاء العملية', `المستخدم <@${interaction.user.id}> ألغى عملية إضافة عضو إلى عائلة.`, 'RED');
    return interaction.update({ content: '❌ **تم إلغاء العملية.**', components: [] });
}

// 🛑 التعامل مع زر التأكيد
if (interaction.customId.startsWith("confirm_add_")) {
  
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
    // تقسيم الـ ID بطريقة تمنع تدمير الاسم بسبب `_`
    const match = interaction.customId.match(/^confirm_add_(.+?)_(\d+)$/);
    if (!match) {
        await sendLog(interaction.guild, '❌ خطأ في استخراج البيانات', `فشل استخراج اسم العيلة والـ ID من الزر: **${interaction.customId}**.`, 'RED');
        return console.log("❌ فشل استخراج اسم العيلة والـ ID!");
    }

    const familyName = decodeURIComponent(match[1]); // اسم العيلة بعد فك التشفير
    const userId = match[2]; // ID المستخدم

    // 🔍 البحث عن العيلة في قاعدة البيانات
    const family = await Family.findOne({ familyName: { $regex: new RegExp(`^${familyName}$`, "i") } });
    if (!family) {
        await sendLog(interaction.guild, '❌ محاولة إضافة عضو إلى عائلة غير موجودة', `المستخدم <@${interaction.user.id}> حاول إضافة عضو إلى عائلة غير موجودة: **${familyName}**.`, 'RED');
        return interaction.reply({ content: '❌ العائلة غير موجودة في قاعدة البيانات!', ephemeral: true });
    }

    const user = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!user) {
        await sendLog(interaction.guild, '❌ خطأ في العثور على المستخدم', `المستخدم <@${interaction.user.id}> حاول إضافة عضو غير موجود إلى عائلة **${familyName}**.`, 'RED');
        return interaction.reply({ content: '❌ لم يتم العثور على العضو!', ephemeral: true });
    }

    // 🔹 إضافة العضو للعائلة وإعطاؤه الرتبة
    family.members.push(user.id);
    await family.save();
    await user.roles.add(family.familyRoleId).catch(() => null);

    await sendLog(interaction.guild, '✅ إضافة عضو جديد', `تمت إضافة <@${user.id}> إلى عائلة **${familyName}** بواسطة <@${interaction.user.id}>.`, 'GREEN');
    await interaction.update({ content: `✅ تم إضافة <@${user.id}> إلى **${familyName}**!`, components: [] });
}

// 🛑 التعامل مع زر الإلغاء
if (interaction.customId === "cancel_add") {
  
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
    await sendLog(interaction.guild, '❌ إلغاء العملية', `المستخدم <@${interaction.user.id}> ألغى عملية إضافة عضو إلى عائلة.`, 'RED');
    await interaction.update({ content: '❌ تم إلغاء العملية.', components: [] });
}
  if (interaction.customId.startsWith("remove_member_"))  {
await interaction.deferReply({ ephemeral: true });

const familyName = interaction.customId.replace("remove_member_", "");
const userId = interaction.user.id;

// ===== أدوات مساعدة ذكية =====

const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs;
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel) return console.error('❌ قناة اللوج غير موجودة!');
    const embed = new MessageEmbed().setTitle(title).setDescription(description).setColor(color).setTimestamp();
    return logChannel.send({ embeds: [embed] }).catch(console.error);
};

const isAuthorized = (member, family) => (
    member.id === family.ownerId ||
    member.roles.cache.has(family.familyRoleId) ||
    member.roles.cache.has(config.AllianceManager) ||
    family.admins.includes(member.id)
);const createMemberMenu = (members, familyName, ownerId) => {
    // فرز الأعضاء لجعل المالك أولاً
    const sortedMembers = [...members].sort((a, b) => {
        if (a.id === ownerId) return -1;
        if (b.id === ownerId) return 1;
        return 0;
    });

    const options = sortedMembers
        .filter(member => member.id !== ownerId)  // استبعاد المالك من القائمة
        .map(member => {
            return {
                label: member.displayName.slice(0, 25),
                description: member.isAdmin ? 'مسؤول في العائلة' : 'عضو',
                value: member.id,
                emoji: member.isAdmin ? '👑' : '👤',
                disabled: false // المالك تم استبعاده، باقي الأعضاء متاحين
            };
        });

    const selectMenu = new MessageSelectMenu()
        .setCustomId(`remove_member_select_${familyName}`)
        .setPlaceholder('اختر عضوًا لإزالته')
        .addOptions(options);

    return new MessageActionRow().addComponents(selectMenu);
};


 
// ===== تنفيذ العملية =====

const family = await Family.findOne({ familyName });
if (!family) {
    await sendLog(interaction.guild, '❌ عائلة غير موجودة', `المستخدم <@${userId}> حاول حذف عضو من عائلة غير موجودة: **${familyName}**.`, 'RED');
    return interaction.editReply('❌ لا توجد عائلة بهذا الاسم.');
}

if (!isAuthorized(interaction.member, family)) {
    await sendLog(interaction.guild, '❌ محاولة غير مصرح بها', `المستخدم <@${userId}> حاول حذف عضو من **${familyName}** بدون صلاحية.`, 'RED');
    return interaction.editReply({ content: '🚫 ليس لديك صلاحية.', ephemeral: true });
}

const allIds = [...new Set([...(family.members || []), ...(family.admins || [])])];
let validMembers = []; // يجب أن تكون let لأننا سنعيد تعيينها

for (const id of allIds) {
    try {
        const member = await interaction.guild.members.fetch(id);
        if (member.roles.cache.has(family.familyRoleId) || member.roles.cache.has(family.adminRoleId)) {
            validMembers.push({
                id: member.id,
                displayName: member.displayName,
                isAdmin: family.admins.includes(member.id)
            });
        }
    } catch (error) { 
    }
}

// تصفية المالك بعد جمع كل الأعضاء
validMembers = validMembers.filter(member => member.id !== family.ownerId);


if (validMembers.length === 0) {
    await sendLog(interaction.guild, '❌ عائلة فارغة', `المستخدم <@${userId}> حاول حذف عضو من عائلة **${familyName}** ولكنها فارغة.`, 'RED');
    return interaction.editReply('❌ لا يوجد أعضاء لحذفهم.');
}

// ===== عرض القائمة =====

await interaction.editReply({
    content: `**${familyName}** - إزالة عضو`,
components: [createMemberMenu(validMembers, familyName, family.ownerId)],
  ephemeral: true
});

// ===== التعامل مع التفاعل =====

const collector = interaction.channel.createMessageComponentCollector({
    filter: i => i.user.id === userId,
    time: 60000
});

collector.on('collect', async i => {
    if (i.customId === 'family_management_back') {
        collector.stop();
        return i.update({ content: '✅ عدت للقائمة الرئيسية.', components: [] });
    }

    if (i.customId.startsWith('remove_member_select_')) {
        await i.deferUpdate();
        const selectedId = i.values[0];
        const selected = validMembers.find(m => m.id === selectedId);

        if (!selected) return i.followUp({ content: '❌ العضو غير موجود.', ephemeral: true });

        const confirmEmbed = new MessageEmbed()
            .setTitle('⚠️ تأكيد الإزالة')
            .setDescription(`هل أنت متأكد من إزالة ${selected.displayName}؟`)
            .setColor('YELLOW');

        const buttons = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId(`confirm_remove_${familyName}_${selectedId}`)
                .setLabel('تأكيد')
                .setStyle('DANGER')
                .setEmoji('❌'),
            new MessageButton()
                .setCustomId('cancel_remove')
                .setLabel('إلغاء')
                .setStyle('SECONDARY')
                .setEmoji('↩️')
        );

        return i.editReply({ content: `**${familyName}** - تأكيد الحذف`, embeds: [confirmEmbed], components: [buttons] });
    }

    if (i.customId.startsWith('confirm_remove_')) {
        await i.deferUpdate();
  const parts = i.customId.split('_');
    const familyName = parts.slice(2, parts.length - 1).join('_'); // نعيد جمع العائلة بدون مشاكل
    const memberId = parts[parts.length - 1]; // العضو هو الجزء الأخير

        try {
            const member = await interaction.guild.members.fetch(memberId);
            const family = await Family.findOne({ familyName });
            if (!family) throw new Error('عائلة غير موجودة');

            // إزالة من القاعدة والرتب
            family.members = family.members.filter(id => id !== memberId);
            family.admins = family.admins.filter(id => id !== memberId);
            await family.save();

            const rolesToRemove = [family.familyRoleId, family.adminRoleId, config.TeamFamily];
            for (const roleId of rolesToRemove) {
                if (member.roles.cache.has(roleId)) await member.roles.remove(roleId);
            }

            await member.setNickname(null).catch(() => {});
            await sendLog(interaction.guild, '✅ عضو تم حذفه', `تم حذف <@${memberId}> من **${familyName}** بواسطة <@${userId}>.`, 'GREEN');

            return i.editReply({ content: `✅ تم حذف ${member.displayName} بنجاح.`, embeds: [], components: [] });
        } catch (err) {
            console.error(err);
            await sendLog(interaction.guild, '❌ خطأ أثناء الحذف', `حدث خطأ عند حذف <@${memberId}> من **${familyName}**.`, 'RED');
            return i.followUp({ content: '❌ حدث خطأ أثناء حذف العضو.', ephemeral: true });
        }
    }

    if (i.customId === 'cancel_remove') {
        await i.deferUpdate();
        return i.editReply({
            content: `**${familyName}** - إزالة عضو`,
components: [createMemberMenu(validMembers, familyName, family.ownerId)],
          embeds: []
        });
    }
});

collector.on('end', async () => {
    try {
        await interaction.editReply({ components: [] });
    } catch (err) {
        console.error('❌ خطأ في إغلاق الـ Components:', err);
    }
});

}
if (interaction.customId === "toggle_status") {
  
 
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

 const allowedUserIds = ['298011146584064000']; 
    if (!allowedUserIds.includes(interaction.user.id)) {
        await sendLog(interaction.guild, '❌ محاولة غير مصرح بها', `المستخدم <@${interaction.user.id}> حاول تغيير حالة البوت بدون صلاحية.`, 'RED');
        return;
    }

    let botData = await BotSettings.findOne({ botId: client.user.id });

    if (!botData) {
        await sendLog(interaction.guild, '❌ خطأ في العثور على بيانات البوت', `المستخدم <@${interaction.user.id}> حاول تغيير حالة البوت ولكن البيانات غير موجودة.`, 'RED');
        return interaction.reply({ content: "❌ لم يتم العثور على بيانات البوت!", ephemeral: true });
    }

    // **تحديث حالة التشغيل وإيقاف الحالات**
    botData.statusEnabled = !botData.statusEnabled;

    if (!botData.statusEnabled) {
        await client.user.setActivity(null); // **إيقاف أي حالة حالية**
        console.log("🛑 تم إيقاف نظام الحالات وحذف جميع الحالات.");
    }

    await botData.save();

    // **إعادة تحديث رسالة التحكم**
    const embed2 = new MessageEmbed()
        .setTitle('📜 إدارة الحالات')
        .setDescription(`\`➕ إضافة حالة\` - إضافة حالة جديدة للبوت.\n\`📜 قائمة الحالات\` - عرض جميع الحالات الحالية.\n\`🗑 حذف حالة\` - إزالة حالة معينة من القائمة.\n${botData.statusEnabled ? '\`⏸ إيقاف الحالات\` - تعطيل عرض الحالات.' : '\`▶️ تشغيل الحالات\` - تفعيل عرض الحالات.'}`)
        .setColor('#5865F2');

    const row2 = new MessageActionRow().addComponents(
        new MessageButton().setCustomId('add_status').setLabel('➕ إضافة حالة').setStyle('SUCCESS'),
        new MessageButton().setCustomId('botstatusme').setLabel('📜 قائمة الحالات').setStyle('PRIMARY'),
        new MessageButton().setCustomId('delete_status').setLabel('🗑 حذف حالة').setStyle('DANGER'),
        new MessageButton().setCustomId('toggle_status').setLabel(botData.statusEnabled ? '⏸ إيقاف الحالات' : '▶️ تشغيل الحالات').setStyle(botData.statusEnabled ? 'DANGER' : 'SUCCESS')
    );

    const controlMessage = await interaction.channel.messages.fetch(botData.controlMessageId);
    await controlMessage.edit({ embeds: [embed2], components: [row2] });

    await sendLog(interaction.guild, '✅ تغيير حالة البوت', `تم ${botData.statusEnabled ? "تشغيل" : "إيقاف"} نظام الحالات بواسطة <@${interaction.user.id}>.`, botData.statusEnabled ? 'GREEN' : 'RED');
    await interaction.reply({ content: `✅ ${botData.statusEnabled ? "تم تشغيل" : "تم إيقاف"} نظام الحالات بنجاح!`, ephemeral: true });
}
    
else 
  
if (interaction.customId.startsWith('status_type:')) {
  // دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

    // استخراج النوع المحدد
    const type = interaction.customId.split(':')[1];
    const nameEmbed = new MessageEmbed()
        .setTitle('📝 إدخال اسم الحالة')
        .setDescription(`**أرسل اسم الحالة الجديدة لنوع **${type}** خلال 60 ثانية:**`)
        .setColor('#00FF00');
    await interaction.update({ embeds: [nameEmbed], ephemeral: true });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async m => {
        await m.delete().catch(() => {});
        const newStatusName = m.content.trim();
        const confirmEmbed = new MessageEmbed()
            .setTitle('⚠️ تأكيد تعديل الحالة')
            .setDescription(`هل أنت متأكد من تغيير الحالة إلى:\n**${newStatusName}** بنوع **${type}**؟`)
            .setColor('#FFA500');

        const confirmButtons = new MessageActionRow().addComponents(
            new MessageButton().setCustomId(`status_change:${newStatusName}:${type}`).setLabel('✅ تأكيد').setStyle('SUCCESS'),
            new MessageButton().setCustomId('status_change').setLabel('❌ إلغاء').setStyle('DANGER')
        );

        await interaction.update({ embeds: [confirmEmbed], components: [confirmButtons], ephemeral: true });
    });

    collector.on('end', async () => {
        await sendLog(interaction.guild, '📝 طلب تغيير حالة البوت', `المستخدم <@${interaction.user.id}> قام بطلب تغيير حالة البوت إلى نوع **${type}**.`, 'BLUE');
    });
} 
else if (interaction.customId.startsWith('status_change:')) {
  // دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

    const parts = interaction.customId.split(':');
    const newStatusName = parts[1];
    const type = parts[2];

    try {
        await BotSettings.findOneAndUpdate(
            { botId: client.user.id },
            { statuses: [{ name: newStatusName, type: type }] },
            { upsert: true, new: true }
        );

        await client.user.setPresence({
            activities: [{ name: newStatusName, type: type }]
        });

        await interaction.update({ content: `✅ تم تحديث الحالة بنجاح!`, components: [], embeds: [], ephemeral: true });
        await sendLog(interaction.guild, '✅ تغيير حالة البوت', `تم تغيير حالة البوت إلى **${newStatusName}** بنوع **${type}** بواسطة <@${interaction.user.id}>.`, 'GREEN');
    } catch (error) {
        console.error(error);
        await interaction.update({ content: '❌ فشل تحديث الحالة! تأكد من اتصال قاعدة البيانات.', components: [], embeds: [], ephemeral: true });
        await sendLog(interaction.guild, '❌ خطأ في تحديث حالة البوت', `المستخدم <@${interaction.user.id}> حاول تغيير حالة البوت ولكن حدث خطأ: ${error.message}`, 'RED');
    }
} 
else if (interaction.customId === 'status_change') {
  // دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

    await interaction.update({ content: "❌ تم إلغاء تعديل الحالة.", components: [], embeds: [], ephemeral: true });
    await sendLog(interaction.guild, '❌ إلغاء تغيير حالة البوت', `المستخدم <@${interaction.user.id}> ألغى عملية تغيير حالة البوت.`, 'RED');
}

if (interaction.customId === 'crime_selection' || interaction.customId === 'farm_selection') {
  // دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

   try {
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member) throw new Error('العضو غير موجود!');

    const isCrime = interaction.customId === 'crime_selection';
    const crimeRole = config.Crime; // ID رتبة إجرام
    const farmRole = config.Farm; // ID رتبة مزرعة

    const selectedType = isCrime ? '🔪 إجرام + 🌾 مزرعة' : '🌾 مزرعة فقط';


    // توزيع الرتب حسب الاختيار
    if (isCrime) {
        // لو إجرام ياخد الاتنين
        await member.roles.add([crimeRole]);
                await member.roles.remove(config.VACRoleid);

    } else {
        // لو مزرعة ياخد مزرعة بس
      //  await member.roles.add(farmRole);
          await member.roles.remove(config.VACRoleid);

    }

    // تعديل الرسالة
    await interaction.update({ 
        content: `✅ تم اختيار تخصصك: ${selectedType}`, 
        components: [] 
    });

    await sendLog(interaction.guild, '✅ اختيار تخصص', `المستخدم <@${interaction.user.id}> اختار تخصص **${selectedType}**.`, 'GREEN');

} catch (error) {
    console.error('حدث خطأ:', error);
    await interaction.followUp({
        content: '❌ حدث خطأ أثناء المعالجة! الرجاء المحاولة لاحقًا.',
        ephemeral: true
    });
    await sendLog(interaction.guild, '❌ خطأ في اختيار التخصص', `المستخدم <@${interaction.user.id}> واجه خطأ أثناء اختيار التخصص: ${error.message}`, 'RED');
}

}
  
 if (interaction.customId === 'register_car') {
    const modal = new Modal()
        .setCustomId('car_registration_form')
        .setTitle('🚘 تسجيل سيارة جديدة')
        .addComponents(
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId('car_name')
                    .setLabel('🚗 اسم السيارة')
                    .setStyle('SHORT')
                    .setRequired(true)
            ),
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId('car_id')
                    .setLabel('🔢 رقم السيارة')
                    .setStyle('SHORT')
                    .setRequired(true)
            ),
            new MessageActionRow().addComponents(
                new TextInputComponent()
                    .setCustomId('register_status')
                    .setLabel('📌 حالة التسجيل (دخول / إخراج)')
                    .setStyle('SHORT')
                    .setRequired(true)
            )
        );

    await interaction.showModal(modal);
}
  
  

if (interaction.customId === 'add_blacklist') {
  
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
  
  
  
   const rolesToRemove = [config.support]; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000'];  
  if (
                    !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
                    !allowedUserIds.includes(interaction.user.id)
                ) {
                   await sendLog(
        interaction.guild,
        '❌ محاولة غير مصرح بها',
        `🚫 **محاولة غير مصرح بها**\n\nالمستخدم <@${interaction.user.id}> حاول **إضافة مستخدم إلى البلاك ليست** بدون امتلاك الصلاحيات الكافية.\n⏰ **الوقت:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        'RED'
    );
                    return interaction.reply({
                        content: '❌ ليس لديك الصلاحية لاستخدام هذا الأمر.',
                        ephemeral: true
                    });
                }
  
  
   
  
    await interaction.deferReply({ ephemeral: true });
    await interaction.followUp({ content: '🔍 منشن العضو أو اكتب الـ ID:' });

    const filter = response => response.author.id === interaction.user.id;
    const collectedUser = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 }).catch(() => {});

    if (!collectedUser || collectedUser.size === 0) {
await sendLog(
    interaction.guild,
    '❌ انتهى الوقت',
    `⏳ **انتهى الوقت دون إدخال المستخدم!**\n\n👤 **تم الطلب بواسطة:** <@${interaction.user.id}>\n⏰ **الوقت:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    'RED'
);
        return interaction.editReply({ content: '❌ انتهى الوقت دون إدخال المستخدم.' });
    }

    const userMessage = collectedUser.first();
    const userInput = userMessage.content;
const userId = userInput.replace(/[<@!>]/g, '');
          let user;

    try {
    // التحقق مما إذا كان التفاعل داخل سيرفر
    if (interaction.guild) {
        user = await interaction.guild.members.fetch(userId).catch(() => null);
    }

    // لو المستخدم مش موجود في السيرفر أو التفاعل في DM، نحاول جلبه من الـ API
    if (!user) {
        user = await interaction.client.users.fetch(userId);
    }
    } catch (error) {
await sendLog(
    interaction.guild,
    '❌ خطأ في البحث',
    `🔍 **لم يتم العثور على المستخدم!**\n\n👤 **تم البحث بواسطة:** <@${interaction.user.id}>\n⏰ **الوقت:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    'RED'
);
        return interaction.editReply({ content: '❌ لم يتم العثور على المستخدم.' });
    }

    await userMessage.delete().catch(() => {});

    const exists = await Blacklist.findOne({ userId: user.id });
    if (exists) {
await sendLog(
    interaction.guild,
    '❌ مستخدم محظور بالفعل',
    `⚠️ **محاولة حظر مكررة**\n\nالمستخدم <@${user.id}> **محظور بالفعل**!\n👤 **تمت المحاولة بواسطة:** <@${interaction.user.id}>\n⏰ **الوقت:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    'RED'
);
        return interaction.editReply({ content: `❌ المستخدم <@${user.id}> محظور بالفعل.` });
    }

    const reasonRow = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('reason_yes')
            .setLabel('📌 نعم، يوجد سبب')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('reason_no')
            .setLabel('🚫 لا، بدون سبب')
            .setStyle('SECONDARY')
    );

    const reasonMessage = await interaction.editReply({
        content: '❓ هل تريد إضافة سبب للحظر؟',
        components: [reasonRow]
    });

    const buttonFilter = i => i.user.id === interaction.user.id;
    const reasonCollector = reasonMessage.createMessageComponentCollector({ filter: buttonFilter, time: 15000 });

    reasonCollector.on('collect', async i => {
        if (i.customId === 'reason_yes') {
            await i.update({ content: '✍️ من فضلك، اكتب السبب الآن:', components: [] });

            const collectedReason = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 }).catch(() => {});
            let reason = 'لم يتم تحديد سبب';

            if (collectedReason && collectedReason.size > 0) {
                const reasonMessage = collectedReason.first();
                reason = reasonMessage.content;
                await reasonMessage.delete().catch(() => {});
            }

            confirmBan(interaction, user, reason);
        } else if (i.customId === 'reason_no') {
            await i.update({ content: '✅ سيتم الحظر بدون سبب.', components: [] });
            confirmBan(interaction, user, 'لم يتم تحديد سبب');
        }
    });

    reasonCollector.on('end', async collected => {
        if (collected.size === 0) {
            await reasonMessage.edit({ content: '⌛ انتهى الوقت، لم يتم تنفيذ أي إجراء.', components: [] });
        }
    });
}

async function confirmBan(interaction, user, reason) {
    const row = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('confirm_ban')
            .setLabel('✅ نعم')
            .setStyle('DANGER'),
        new MessageButton()
            .setCustomId('cancel_ban')
            .setLabel('❌ لا')
            .setStyle('SECONDARY')
    );

    const confirmMessage = await interaction.editReply({
        content: `⚠️ هل أنت متأكد من حظر <@${user.id}>؟\n📝 **السبب:** ${reason}`,
        components: [row]
    });

    const buttonFilter = i => i.user.id === interaction.user.id;
    const buttonCollector = confirmMessage.createMessageComponentCollector({ filter: buttonFilter, time: 15000 });

    buttonCollector.on('collect', async i => {
      
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
        if (i.customId === 'confirm_ban') {
            await Blacklist.create({ userId: user.id, reason: reason, addedBy: interaction.user.id });
await sendLog(
    interaction.guild,
    '✅ تم الحظر',
    `🚫 **حظر مستخدم**\n\nالمستخدم <@${user.id}> تم **حظره** بواسطة <@${interaction.user.id}>.\n📝 **السبب:** ${reason}\n⏰ **الوقت:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    'GREEN'
);
            await i.update({ content: `✅ تم حظر <@${user.id}>.\n📝 **السبب:** ${reason}`, components: [] });
        } else if (i.customId === 'cancel_ban') {
await sendLog(
    interaction.guild,
    '❌ تم إلغاء الحظر',
    `🚫 **إلغاء الحظر**\n\nالمستخدم <@${user.id}> تم **إلغاء الحظر عنه** بواسطة <@${interaction.user.id}>.\n⏰ **الوقت:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    'RED'
);
            await i.update({ content: `❌ تم إلغاء الحظر لـ <@${user.id}>.`, components: [] });
        }
    });

    buttonCollector.on('end', async collected => {
        if (collected.size === 0) {
            await confirmMessage.edit({ content: '⌛ انتهى الوقت، لم يتم تنفيذ أي إجراء.', components: [] });
        }
    });
}

if (interaction.customId === 'remove_blacklist') {
  
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
  
  
  
   const rolesToRemove = [config.support]; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000']; 
                if (
                    !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
                    !allowedUserIds.includes(interaction.user.id)
                ) {
           await sendLog(
        interaction.guild,
        '❌ محاولة غير مصرح بها',
        `🚫 **محاولة غير مصرح بها**\n\nالمستخدم <@${interaction.user.id}> حاول **إزالة عضو من البلاك ليست** بدون امتلاك الصلاحيات الكافية.\n⏰ **الوقت:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        'RED'
    );
                    return interaction.reply({
                        content: '❌ ليس لديك الصلاحية لاستخدام هذا الأمر.',
                        ephemeral: true
                    });
                }
  
  
  
    await interaction.deferReply({ ephemeral: true });
    await interaction.followUp({ content: '🔍 منشن العضو أو اكتب الـ ID:' });

    const filter = response => response.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 }).catch(() => {});

    if (!collected || collected.size === 0) {
await sendLog(
    interaction.guild,
    '❌ انتهى الوقت',
    `انتهى الوقت دون إدخال المستخدم.\n\n🔹 **تم تنفيذ الأمر بواسطة:** <@${interaction.user.id}>`,
    'RED'
);
        return interaction.editReply({ content: '❌ انتهى الوقت دون إدخال المستخدم.' });
    }

    const userMessage = collected.first();
    const userInput = userMessage.content;
    let user;

    try {
        user = await interaction.guild.members.fetch(userInput.replace(/[<@!>]/g, ''));
    } catch (error) {
await sendLog(
    interaction.guild,
    '❌ خطأ في البحث',
    `لم يتم العثور على المستخدم المطلوب.\n\n🔹 **تم تنفيذ الأمر بواسطة:** <@${interaction.user.id}>`,
    'RED'
);
        return interaction.editReply({ content: '❌ لم يتم العثور على المستخدم.' });
    }

    await userMessage.delete().catch(() => {});

    const exists = await Blacklist.findOne({ userId: user.id });
    if (!exists) {
await sendLog(
    interaction.guild,
    '❌ المستخدم غير موجود في القائمة السوداء',
    `المستخدم <@${user.id}> غير مدرج في البلاك ليست، لذا لا يمكن إزالته.\n\n🔹 **تم تنفيذ الأمر بواسطة:** <@${interaction.user.id}>`,
    'RED'
);
        return interaction.editReply({ content: `❌ المستخدم <@${user.id}> غير موجود في البلاك ليست.` });
    }

    const row = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('confirm_unban')
            .setLabel('✅ نعم')
            .setStyle('SUCCESS'),
        new MessageButton()
            .setCustomId('cancel_unban')
            .setLabel('❌ لا')
            .setStyle('SECONDARY')
    );

    const confirmMessage = await interaction.editReply({
        content: `⚠️ هل أنت متأكد من إزالة <@${user.id}> من البلاك ليست؟`,
        components: [row]
    });

    const buttonFilter = i => i.user.id === interaction.user.id;
    const buttonCollector = confirmMessage.createMessageComponentCollector({ filter: buttonFilter, time: 15000 });

    buttonCollector.on('collect', async i => {
        if (i.customId === 'confirm_unban') {
            await Blacklist.findOneAndDelete({ userId: user.id });
await sendLog(
    interaction.guild,
    '✅ تم الإزالة',
    `تم إزالة <@${user.id}> من البلاك ليست بواسطة <@${interaction.user.id}>.`,
    'GREEN'
);
            await i.update({ content: `✅ تم إزالة <@${user.id}> من البلاك ليست.`, components: [] });
        } else if (i.customId === 'cancel_unban') {
await sendLog(
    interaction.guild,
    '❌ تم الإلغاء',
    `تم إلغاء إزالة الحظر عن <@${user.id}> بواسطة <@${interaction.user.id}>.`,
    'RED'
);
            await i.update({ content: `❌ تم إلغاء إزالة الحظر عن <@${user.id}>.`, components: [] });
        }
    });

    buttonCollector.on('end', async collected => {
        if (collected.size === 0) {
            await confirmMessage.update({ content: '⌛ انتهى الوقت، لم يتم تنفيذ أي إجراء.', components: [], ephemeral: true });
        }
    });
}

if (interaction.customId === 'list_blacklist') {
  
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

  
  
  
  


    await interaction.deferReply({ ephemeral: true });

   const rolesToRemove = [config.support]; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000']; 
                if (
                    !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
                    !allowedUserIds.includes(interaction.user.id)
                ) {
       await sendLog(
        interaction.guild,
        '❌ محاولة غير مصرح بها',
        `المستخدم <@${interaction.user.id}> حاول عرض جميع أعضاء البلاك ليست بدون صلاحية.`,
        'RED'
    );
                    return interaction.editReply({
                        content: '❌ ليس لديك الصلاحية لاستخدام هذا الأمر.',
                        ephemeral: true
                    });
                }
  
    const blacklist = await Blacklist.find();
  console.log(blacklist)
    if (!blacklist.length) {
await sendLog(
    interaction.guild,
    '✅ لا يوجد مستخدمون',
    `لم يتم العثور على مستخدمين في البلاك ليست. (تم التحقق بواسطة <@${interaction.user.id}>)`,
    'GREEN'
);
        return interaction.editReply({content: '✅ **لا يوجد مستخدمون في البلاك ليست.**', ephemeral: true});
    }

    const itemsPerPage = 5;
    let currentPage = 0;
    const totalPages = Math.max(1, Math.ceil(blacklist.length / itemsPerPage));

    function getPage(page) {
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        return blacklist.slice(start, end);
    }

    function generateEmbed(page) {
        const pageData = getPage(page);
        return new MessageEmbed()
            .setColor('#ff0000')
            .setTitle(`🚫 قائمة البلاك ليست (${page + 1}/${totalPages})`)
         .setDescription(
    pageData.map((entry, index) =>
        `🔹 **${index + 1 + page * itemsPerPage}.** <@${entry.userId}>\n` +
        `📝 **السبب:** ${entry.reason}\n` +
        `👮‍♂️ **تم الحظر بواسطة:** <@${entry.addedBy}>\n` +
        `⏳ **التاريخ:** <t:${Math.floor(new Date(entry.addedAt).getTime() / 1000)}:F>`
    ).join('\n\n') || '🚫 **لا يوجد مستخدمون في هذه الصفحة.**'
)

            .setFooter(`صفحة ${page + 1} من ${totalPages}`)
            .setTimestamp();
    }

    function generateRow(page) {
        return new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('prev')
                .setLabel('⬅️ السابق')
                .setStyle('PRIMARY')
                .setDisabled(page === 0),
            new MessageButton()
                .setCustomId('next')
                .setLabel('➡️ التالي')
                .setStyle('PRIMARY')
                .setDisabled(page >= totalPages - 1)
        );
    }

    const messageEmbed = await interaction.editReply({
        embeds: [generateEmbed(currentPage)],
        components: [generateRow(currentPage)],
        ephemeral: true
    });

    const collector = messageEmbed.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
        if (!i.isButton()) return;
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: '❌ لا يمكنك استخدام هذه الأزرار.', ephemeral: true });
        }

        if (i.customId === 'prev' && currentPage > 0) {
            currentPage--;
        } else if (i.customId === 'next' && currentPage < totalPages - 1) {
            currentPage++;
        }

        await i.update({
            embeds: [generateEmbed(currentPage)],
            components: [generateRow(currentPage)],
            ephemeral: true
        });
    });

    collector.on('end', async () => {
        await interaction.editReply({ components: [], ephemeral: true });
    });
}

if (interaction.customId === 'clear_blacklist') {
  
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
  
  
   const rolesToRemove = ['41']; // الرتب المسموح لها
 const allowedUserIds = ['298011146584064000']; 
                if (
                    !interaction.member.roles.cache.some(role => rolesToRemove.includes(role.id)) &&
                    !allowedUserIds.includes(interaction.user.id)
                ) {
     await sendLog(
    interaction.guild,
    '❌ محاولة غير مصرح بها',
    `المستخدم <@${interaction.user.id}> حاول تنفيذ أمر غير مصرح به.`,
    'RED'
);
                    return interaction.reply({
                        content: '❌ ليس لديك الصلاحية لاستخدام هذا الأمر.',
                        ephemeral: true
                    });
                }
  
  
    const count = await Blacklist.countDocuments();
    
    if (count === 0) {
await sendLog(
    interaction.guild,
    '🚫 القائمة السوداء فارغة',
    `🚫 **تنبيه!**\nالقائمة السوداء فارغة بالفعل!\n📌 **التحقق بواسطة:** <@${interaction.user.id}>`,
    'RED'
);

      return interaction.reply({ content: '🚫 القائمة السوداء فارغة بالفعل!', ephemeral: true });
    }

    const confirmEmbed = new MessageEmbed()
        .setTitle('⚠️ تأكيد مسح القائمة السوداء')
        .setDescription(`❗ سيتم مسح **${count}** عضو(أعضاء) من البلاك ليست.\nهل أنت متأكد؟`)
        .setColor('#FF0000');

    const confirmRow = new MessageActionRow().addComponents(
        new MessageButton().setCustomId('confirm_clear_blacklist').setLabel('✅ تأكيد').setStyle('SUCCESS'),
        new MessageButton().setCustomId('cancel_clear_blacklist').setLabel('❌ إلغاء').setStyle('DANGER')
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], ephemeral: true });
}

if (interaction.customId === 'confirm_clear_blacklist') {
  
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
  
   const allowedUserIds = ['298011146584064000']; 

// التحقق من الصلاحيات
const hasPermission = allowedUserIds.includes(interaction.user.id);

if (!hasPermission) {
await sendLog(
    interaction.guild,
    '❌ محاولة غير مصرح بها',
    `🚨 **تنبيه أمني!**\n🔴 **المستخدم:** <@${interaction.user.id}>\n⚠️ **حاول إعادة تشغيل البوت بدون صلاحية!**`,
    'RED'
);
    return;
}
  
    await Blacklist.deleteMany({}); // حذف جميع الأعضاء من البلاك ليست
await sendLog(
    interaction.guild,
    '✅ تم المسح',
    `🗑️ **تم مسح جميع أعضاء البلاك ليست بنجاح!**\n📌 **الإجراء نفذه:** <@${interaction.user.id}>`,
    'GREEN'
);

    await interaction.update({
        content: '✅ تم مسح جميع أعضاء البلاك ليست بنجاح!',
        embeds: [],
        components: [],
        ephemeral: true
    });
}

if (interaction.customId === 'cancel_clear_blacklist') {


const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
   const allowedUserIds = ['298011146584064000']; 


// التحقق من الصلاحيات
const hasPermission = allowedUserIds.includes(interaction.user.id);

if (!hasPermission) {
await sendLog(
    interaction.guild,
    '❌ محاولة غير مصرح بها',
    `🚨 المستخدم <@${interaction.user.id}> حاول **إعادة تشغيل البوت** بدون صلاحيات كافية!`,
    'RED'
);
    return;
}
await sendLog(
    interaction.guild,
    '❌ تم الإلغاء',
    `تم إلغاء عملية مسح البلاك ليست بواسطة <@${interaction.user.id}>.`,
    'RED'
);
    await interaction.update({
        content: '❌ تم إلغاء العملية.',
        embeds: [],
        components: [],
        ephemeral: true
    });
}
  
  
if (interaction.customId === 'submit_payment_report') {
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
    const rolesaloow = [
  config.topRole,        // @・إشراف العائلة
  config.management,        // @・Mangment
  config.leadManagement,    // @・Lead Mangment
  config.familyManager,     // @・Family Manager
  config.support,           // @・Support
  config.goldFamily,        // @・Gold Family
  config.silverFamily,      // @・Silver Family
  config.bronzeFamily,      // @・Bronze Family
  config.member2,           // @・Member 2
  config.member1,           // @・Member 1
  config.vandal,           // @vandal
  config.Farmer,           // @・Farmer
                 config.familyrole,           // @・Farmer

    ];

    // التحقق من امتلاك العضو لأحد الأدوار المسموحة
    if (!interaction.member.roles.cache.some(role => rolesaloow.includes(role.id))) {
        await sendLog(interaction.guild, '❌ محاولة غير مصرح بها', `المستخدم <@${interaction.user.id}> حاول رفع تقرير دفع بدون صلاحية.`, 'RED');
        return;
    }

    const userId = interaction.user.id;

    const userPayment = await PaymentSystem.findOne({ userId: interaction.user.id });

    // التحقق من حالة الدفع
    if (userPayment && userPayment.insurancePaymentStatus === 'paid') {
        await sendLog(interaction.guild, '❌ محاولة رفع تقرير دفع مكرر', `المستخدم <@${interaction.user.id}> حاول رفع تقرير دفع مكرر.`, 'RED');
        return interaction.reply({ content: '❌ لا يمكنك رفع تقرير مرة أخرى لأنك بالفعل قمت بدفع التأمين.', ephemeral: true });
    }

    // التحقق من الكول داون
 if (cooldowns.has(userId)) {
    const remainingTime = (cooldowns.get(userId) + 120000) - Date.now();
    if (remainingTime > 0) {
        const cooldownEnd = Math.floor((Date.now() + remainingTime) / 1000); // ⏳ تحويل إلى Timestamp

        await sendLog(
            interaction.guild, 
            '❌ محاولة رفع تقرير أثناء الكول داون', 
            `🚨 **المستخدم:** <@${interaction.user.id}>\n⏳ حاول رفع تقرير ولكنه لا يزال في فترة الانتظار!`, 
            'RED'
        );
        
        return interaction.reply({
            content: `❗ **يرجى الانتظار حتى** <t:${cooldownEnd}:R> **قبل استخدام الأمر مرة أخرى!**`,
            ephemeral: true
        });
    }
}


    // تعيين الكول داون
    cooldowns.set(userId, Date.now());
    setTimeout(() => cooldowns.delete(userId), 120000);

    const reportChannelId = config.imgslogs;
    const finalChannelId = config.pay_mod;
    let currentStep = 0;
    let mainMessage;
    const collectedData = {};
    let activeCollectors = [];

    try {
        // إنشاء Embed للخطوات
        function createEmbed(step) {
            const embeds = {
                1: new MessageEmbed()
                    .setTitle('📝 كتابة الوصف')
                    .addField('الخطوة الحالية', 'أرسل وصف التقرير كنص عادي')
                    .setFooter({ text: 'اكتب "إلغاء" لوقف العملية' })
                    .setColor('#FEE75C'),

                2: new MessageEmbed()
                    .setTitle('🖼️ إرفاق الصورة')
                    .addField('الخطوة الحالية', 'أرسل صورة التقرير كمرفق')
                    .setFooter({ text: 'الصيغ المسموحة: PNG, JPG, JPEG' })
                    .setColor('#57F287'),

                3: new MessageEmbed()
                    .setTitle('✅ مراجعة نهائية')
                    .addFields(
                        { name: 'الوصف', value: collectedData.description?.slice(0, 1024) || '❌ غير محدد', inline: true },
                    )
                    .setImage(collectedData.reportImage)
                    .setColor('#EB459E')
            };
            return embeds[step];
        }

        // تحديث الرسالة الرئيسية
        async function updateMainMessage(embed, components = []) {
            try {
                if (mainMessage && !mainMessage.deleted) {
                    return await mainMessage.edit({ content: `<@${interaction.user.id}>`, embeds: [embed], components });
                } else {
                    mainMessage = await interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components });
                    return mainMessage;
                }
            } catch (error) {
                console.error('فشل في تحديث الرسالة:', error);
            }
        }

        // إرسال رسالة مؤقتة
        async function sendTemporaryMessage(content, timeout = 5000) {
            try {
                const msg = await interaction.channel.send(content);
                setTimeout(() => msg.delete().catch(() => {}), timeout);
            } catch (error) {
                console.error('فشل إرسال الرسالة المؤقتة:', error);
            }
        }

        // تنظيف الكوليكتورات
        function cleanupCollectors() {
            activeCollectors.forEach(collector => {
                if (!collector.ended) collector.stop();
            });
            activeCollectors = [];
        }

        // بدء عملية التقرير
        async function startReportProcess() {
            cleanupCollectors();
            startDescriptionStep();
        }

        // بدء خطوة الوصف
        async function startDescriptionStep() {
            currentStep = 1;
            await updateMainMessage(createEmbed(1));

            const filter = m => m.author.id === userId && !m.interaction;
            const collector = interaction.channel.createMessageCollector({ 
                filter, 
                time: 300000, // 15 دقيقة
                max: 1, // جمع رسالة واحدة فقط
                dispose: true // حذف الرسالة من الذاكرة بعد الجمع
            });

            activeCollectors.push(collector);

            collector.on('collect', handleDescriptionInput);
  collector.on('end', async (collected) => {
    if (!collected.size) {
        if (mainMessage) {
            try {
                await mainMessage.delete().catch(() => {}); // حذف الرسالة بأمان بدون أخطاء
            } catch (error) {
            }
        }
    }
    activeCollectors = activeCollectors.filter(c => c !== collector);
});
          
          
         
          
        }

        // معالجة إدخال الوصف
        async function handleDescriptionInput(m) {
            if (m.content.toLowerCase().trim() === 'إلغاء') {
                return handleCancellation(m);
            }

            collectedData.description = m.content;
            await m.delete().catch(() => {}); // حذف رسالة المستخدم
            startImageStep(); // الانتقال إلى الخطوة التالية
        }

        // بدء خطوة الصورة
        async function startImageStep() {
            currentStep = 2;
            await updateMainMessage(createEmbed(2));

            const filter = m => m.author.id === userId && m.attachments.size > 0;
            const collector = interaction.channel.createMessageCollector({ 
                filter, 
                time: 300000,
                max: 1,
                dispose: true
            });

            activeCollectors.push(collector);

            collector.on('collect', handleImageUpload);
collector.on('end', async (collected) => {
    if (!collected.size) {
        if (mainMessage) {
            try {
                await mainMessage.delete().catch(() => {}); // حذف الرسالة بأمان بدون أخطاء
            } catch (error) {
            }
        }
    }
    activeCollectors = activeCollectors.filter(c => c !== collector);
});
        }

        // معالجة تحميل الصورة
        async function handleImageUpload(m) {
            const attachment = m.attachments.first();

            if (!attachment.contentType?.startsWith('image/')) {
                await sendTemporaryMessage('❌ يرجى إرسال صورة حقيقية!');
                return startImageStep();
            }

            try {
                const uploaded = await interaction.guild.channels.cache.get(reportChannelId)
                    .send({ files: [attachment.url] });

                collectedData.reportImage = uploaded.attachments.first().url;
                await m.delete().catch(() => {}); // حذف رسالة المستخدم
                showConfirmation();
            } catch (error) {
                console.error('فشل تحميل الصورة:', error);
                startImageStep();
            }
        }

        // عرض تأكيد الإرسال
        async function showConfirmation() {
            currentStep = 3;
            const buttons = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('confirm')
                    .setLabel('✅ تأكيد الإرسال')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId('edit')
                    .setLabel('✏️ تعديل البيانات')
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('cancel')
                    .setLabel('🚫 إلغاء العملية')
                    .setStyle('DANGER')
            );

            await updateMainMessage(createEmbed(3), [buttons]);
            setupConfirmationCollector();
        }

        // إعداد كوليكتور التأكيد
        function setupConfirmationCollector() {
            const filter = i => i.user.id === userId && ['confirm', 'edit', 'cancel'].includes(i.customId);
            const collector = mainMessage.createMessageComponentCollector({ 
                filter, 
                time: 300000,
                componentType: 'BUTTON'
            });

            activeCollectors.push(collector);

            collector.on('collect', handleConfirmation);
            collector.on('end', () => activeCollectors = activeCollectors.filter(c => c !== collector));
        }

        // معالجة التأكيد
        async function handleConfirmation(i) {
            if (i.customId === 'confirm') return handleFinalSubmission(i);
            if (i.customId === 'cancel') return handleCancellation(i);

            await i.deferUpdate().catch(() => null);
            showEditOptions();
        }

        // عرض خيارات التعديل
        async function showEditOptions() {
            const buttons = new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId('edit_desc')
                    .setLabel('📝 تعديل الوصف')
                    .setStyle('PRIMARY'),
                new MessageButton()
                    .setCustomId('edit_image')
                    .setLabel('🖼️ تعديل الصورة')
                    .setStyle('PRIMARY')
            );

            await updateMainMessage(
                new MessageEmbed()
                    .setTitle('📌 اختر الجزء المراد تعديله')
                    .setColor('#FFD700')
                    .setDescription('يمكنك تعديل أي جزء من بيانات التقرير:'),
                [buttons]
            );

            setupEditCollector();
        }

        // إعداد كوليكتور التعديل
        function setupEditCollector() {
            const filter = i => i.user.id === userId && i.customId.startsWith('edit_');
            const collector = mainMessage.createMessageComponentCollector({ 
                filter, 
                time: 300000,
                componentType: 'BUTTON'
            });

            activeCollectors.push(collector);

            collector.on('collect', handleEditSelection);
            collector.on('end', () => activeCollectors = activeCollectors.filter(c => c !== collector));
        }

        // معالجة اختيار التعديل
        async function handleEditSelection(i) {
            await i.deferUpdate().catch(() => null);

            switch(i.customId) {
                case 'edit_desc': 
                    currentStep = 1;
                    await startDescriptionStep();
                    break;

                case 'edit_image': 
                    await startImageStep();
                    break;
            }
        }

        // معالجة الإرسال النهائي
        async function handleFinalSubmission(interaction) {
            try {
                const reportEmbed = new MessageEmbed()
                    .setTitle(`📄 تقرير دفع 500 ألف`)
                    .addFields(
                        { name: '👤 المرسل', value: `<@${userId}>`, inline: true },
                        { name: '📝 الوصف', value: collectedData.description.slice(0, 1024) || 'لا يوجد وصف', inline: true }
                    )
                    .setImage(collectedData.reportImage)
                    .setFooter({ text: 'تقرير دفع 500 ألف' })
                    .setColor('#5865F2');

                const actionRow = new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId('py_accept_report')
                        .setLabel('✅ قبول')
                        .setStyle('SUCCESS'),
                    new MessageButton()
                        .setCustomId('py_reject_report')
                        .setLabel('❌ رفض')
                        .setStyle('DANGER'),
                    new MessageButton()
                        .setCustomId('py_reject_with_reason')
                        .setLabel('📝 رفض بسبب')
                        .setStyle('SECONDARY')
                );

                const reportMessage = await interaction.guild.channels.cache.get(finalChannelId).send({
                    content: `<@&1367145433876402177> 📢 تقرير جديد يحتاج مراجعة!`,
                    embeds: [reportEmbed],
                    components: [actionRow]
                });

                await interaction.update({
                    content: '✅ تم إرسال التقرير بنجاح إلى فريق المراجعة!',
                    embeds: [],
                    components: []
                });

                await sendLog(interaction.guild, '✅ تقرير دفع جديد', `تم إرسال تقرير دفع جديد بواسطة <@${interaction.user.id}>.`, 'GREEN');

                // حذف الرسالة بعد 5 ثواني
                setTimeout(() => {
                    interaction.deleteReply().catch(() => {});
                }, 5000);

            } catch (error) {
                console.error('فشل الإرسال النهائي:', error);
                await sendLog(interaction.guild, '❌ خطأ في إرسال التقرير', `المستخدم <@${interaction.user.id}> واجه خطأ أثناء إرسال التقرير: ${error.message}`, 'RED');
            } finally {
                cleanupCollectors();
            }
        }

        // معالجة الإلغاء
        async function handleCancellation(source) {
            cleanupCollectors();

            try {
                if (source instanceof MessageComponentInteraction) {
                    await source.message.delete().catch(() => {});
                } else {
                    await source.delete().catch(() => {});
                    if (mainMessage && !mainMessage.deleted) {
                        await mainMessage.delete().catch(() => {});
                    }
                }
                await sendLog(interaction.guild, '❌ إلغاء عملية التقرير', `المستخدم <@${interaction.user.id}> ألغى عملية إرسال التقرير.`, 'RED');
            } catch (error) {
                console.error('فشل في معالجة الإلغاء:', error);
            } 
        }

        await interaction.deferUpdate().catch(() => null); // يخفي الخطأ بدون إرسال رد
        startReportProcess();

    } catch (error) {
        console.error('حدث خطأ جسيم:', error);
        await sendLog(interaction.guild, '❌ خطأ جسيم في عملية التقرير', `المستخدم <@${interaction.user.id}> واجه خطأ جسيم أثناء عملية التقرير: ${error.message}`, 'RED');
    }
}
   
  

if (interaction.customId === 'create_ACT') {
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
  
  const isBlacklisted = await Blacklist.findOne({ userId: interaction.user.id });

if (isBlacklisted) {
    const embed = new MessageEmbed()
        .setColor('#FF0000') // لون أحمر للدلالة على المنع
        .setTitle('🚫 لا يمكنك تفعيل حسابك!')
        .setDescription(`لا يمكنك تفعيل حسابك نظرًا لأنك في **قائمة البلاك ليست**.\n\n📝 **السبب:** ${isBlacklisted.reason}\n👤 **تمت إضافتك بواسطة:** <@${isBlacklisted.addedBy}>\n📅 **وقت الإضافة:** <t:${Math.floor(new Date(isBlacklisted.addedAt).getTime() / 1000)}:F>`)
        .setFooter({ text: 'يرجى التواصل مع الإدارة إذا كنت تعتقد أن هناك خطأ.', iconURL: interaction.client.user.displayAvatarURL() });

    return interaction.reply({ content: null, embeds: [embed], components: [], ephemeral: true });
}

  

    const existingApplication = await Application.findOne({ userId: interaction.user.id });

    if (existingApplication) {
        await sendLog(interaction.guild, '❌ محاولة إنشاء طلب تفعيل حساب مكرر', `المستخدم <@${interaction.user.id}> حاول إنشاء طلب تفعيل حساب مكرر.`, 'RED');
        return interaction.reply({ 
            content: '✅ حسابك مفعل بالفعل! لا تحتاج إلى تقديم مرة أخرى.', 
            ephemeral: true 
        });
    }

    const modal = new Modal()
        .setCustomId('User_application_modal')
        .setTitle('📜 تفعيل حسابك');

    modal.addComponents(
        new MessageActionRow().addComponents(
            new TextInputComponent()
                .setCustomId('User_name')
                .setLabel('🔹 ما اسم حسابك')
                .setStyle('SHORT')
                .setPlaceholder('اكتب اسم حسابك هنا')
                .setRequired(true)
        ),
        new MessageActionRow().addComponents(
            new TextInputComponent()
                .setCustomId('User_name_game')
                .setLabel('🔹 ما اسم شخصيتك')
                .setStyle('SHORT')
                .setPlaceholder('اكتب اسم شخصيتك هنا')
                .setRequired(true)
        ),
        new MessageActionRow().addComponents(
            new TextInputComponent()
                .setCustomId('User_id')
                .setLabel('👑 اي دي حسابك')
                .setStyle('SHORT')
                .setPlaceholder('اكتب اي دي داخل اللعبة')
                .setRequired(true)
        )
    );

    // عرض النموذج
    await interaction.showModal(modal);
    await sendLog(interaction.guild, '📝 طلب تفعيل حساب جديد', `المستخدم <@${interaction.user.id}> قام بطلب تفعيل حساب جديد.`, 'BLUE');
}
   


  //
  

// ============ Restart Command ============
if (customId === 'restart_bot') {
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
 const allowedUserIds = ['298011146584064000']; 
    if (!allowedUserIds.includes(interaction.user.id)) {
        await sendLog(interaction.guild, '❌ محاولة غير مصرح بها', `المستخدم <@${interaction.user.id}> حاول إعادة تشغيل البوت بدون صلاحية.`, 'RED');
        return;
    }

    // واجهة التأكيد
    const confirmEmbed = new MessageEmbed()
        .setTitle('🔄 إعادة تشغيل البوت')
        .setDescription('**هل أنت متأكد من إعادة التشغيل؟**\n- قد يستغرق الأمر 10-20 ثانية')
        .setColor('#FFA500');

    const confirmButtons = new MessageActionRow().addComponents(
        new MessageButton().setCustomId('confirm_restart').setLabel('✅ نعم').setStyle('SUCCESS'),
        new MessageButton().setCustomId('cancel_restart').setLabel('❌ لا').setStyle('DANGER')
    );

    await interaction.reply({ 
        embeds: [confirmEmbed], 
        components: [confirmButtons], 
        ephemeral: true 
    });

    await sendLog(interaction.guild, '📝 طلب إعادة تشغيل البوت', `المستخدم <@${interaction.user.id}> قام بطلب إعادة تشغيل البوت.`, 'BLUE');
}

if (customId === 'confirm_restart') {
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
    // منع إعادة التشغيل المزدوجة
    if (client.isRestarting) {
        await sendLog(interaction.guild, '❌ محاولة إعادة تشغيل مزدوجة', `المستخدم <@${interaction.user.id}> حاول إعادة تشغيل البوت أثناء عملية إعادة تشغيل أخرى.`, 'RED');
        return interaction.update({
            content: '⚠️ البوت قيد الإعادة بالفعل!',
            components: [],
            ephemeral: true
        });
    }

    await sendLog(interaction.guild, '✅ بدء إعادة تشغيل البوت', `المستخدم <@${interaction.user.id}> بدأ عملية إعادة تشغيل البوت.`, 'GREEN');
    await restartSequence(interaction, client);
}

if (customId === 'cancel_restart') {
  
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};
    await sendLog(interaction.guild, '❌ إلغاء إعادة تشغيل البوت', `المستخدم <@${interaction.user.id}> ألغى عملية إعادة تشغيل البوت.`, 'RED');
    await interaction.update({
        content: '❌ تم إلغاء عملية الإعادة.',
        components: [],
        embeds: [],
        ephemeral: true
    });
}
    
 if (interaction.customId === 'submit_report') {
     const rolesaloow = [
       config.topRole,        // @・إشراف العائلة
  config.management,        // @・Mangment
  config.leadManagement,    // @・Lead Mangment
  config.familyManager,     // @・Family Manager
  config.support,           // @・Support
  config.goldFamily,        // @・Gold Family
  config.silverFamily,      // @・Silver Family
  config.bronzeFamily,      // @・Bronze Family
  config.member2,           // @・Member 2
  config.member1,           // @・Member 1
  config.vandal,           // @vandal
  config.Farmer,           // @・Farmer
          config.familyrole,              ];

        // التحقق من امتلاك العضو لأحد الأدوار المسموحة
        if (!interaction.member.roles.cache.some(role => rolesaloow.includes(role.id))) {
            return;
        }
    
   
    const existingLeave = await Leave.findOne({ userId: interaction.user.id, status: "مقبولة" });

if (existingLeave) {
    return interaction.reply({ 
        content: `🚫 لا يمكنك رفع التقارير الآن لأنك في إجازة.`,
        ephemeral: true 
    });
}


    
    
      const userId = interaction.user.id;

        // التحقق من الكول داون
 if (cooldowns.has(userId)) {
    const cooldownEnd = cooldowns.get(userId) + 120000;
    const remainingTime = cooldownEnd - Date.now();

    if (remainingTime > 0) {
        const timeStamp = `<t:${Math.floor(cooldownEnd / 1000)}:R>`; // ⏳ وقت متبقي بطريقة حديثة

        return interaction.reply({
            content: `⏳ **يرجى الانتظار حتى ${timeStamp} قبل استخدام الأمر مرة أخرى.**`,
            ephemeral: true
        });
    }
}

        // تعيين الكول داون
        cooldowns.set(userId, Date.now());
        setTimeout(() => cooldowns.delete(userId), 120000);

   

        const reportChannelId = config.imgslogs;
        const finalChannelId = config.reports_mod;
        let currentStep = 0;
        let mainMessage;
        const collectedData = {};
        let activeCollectors = [];

        try {
         

            function createEmbed(step) {
                const embeds = {
                    1: new MessageEmbed()
                        .setTitle('📋 بدء رفع التقرير')
                        .setDescription('⏳ لديك 15 دقيقة لإكمال العملية')
                        .addField('الخطوة الحالية', 'اختر نوع التقرير من الأزرار أدناه')
                        .setColor(config.embedColor || '#5865F2'),

                    2: new MessageEmbed()
                        .setTitle('📝 كتابة الوصف')
                        .addField('الخطوة الحالية', 'أرسل وصف التقرير كنص عادي')
                        .setFooter({ text: 'اكتب "إلغاء" لوقف العملية' })
                        .setColor('#FEE75C'),

                    3: new MessageEmbed()
                        .setTitle('👥 هل هناك مشاركين في التقرير؟')
                        .addField('الخطوة الحالية', 'اختر نعم أو لا من الأزرار أدناه')
                        .setColor('#57F287'),

                    4: new MessageEmbed()
                        .setTitle('🖼️ إرفاق الصورة')
                        .addField('الخطوة الحالية', 'أرسل صورة التقرير كمرفق')
                        .setFooter({ text: 'الصيغ المسموحة: PNG, JPG, JPEG' })
                        .setColor('#57F287'),

                    5: new MessageEmbed()
                        .setTitle('✅ مراجعة نهائية')
                        .addFields(
                            { name: 'النوع', value: collectedData.reportType || '❌ غير محدد', inline: true },
                            { name: 'الوصف', value: collectedData.description?.slice(0, 1024) || '❌ غير محدد', inline: true },
                            { name: 'المشاركون', value: collectedData.participants?.map(id => `<@${id}>`).join(', ') || '❌ لا يوجد', inline: true }
                        )
                        .setFooter({ text: collectedData.reportType === 'مزرعة' ? 'Farm' : collectedData.reportType === 'إجرام' ? 'Crime' : 'Daily' })
                        .setImage(collectedData.reportImage)
                        .setColor('#EB459E')
                };
                return embeds[step];
            }

            async function updateMainMessage(embed, components = []) {
                try {
                    if (mainMessage && !mainMessage.deleted) {
                        return await mainMessage.edit({  content: `<@${interaction.user.id}>`, embeds: [embed], components });
                    } else {
                        mainMessage = await interaction.channel.send({     content: `<@${interaction.user.id}>`, 
embeds: [embed], components });
                        return mainMessage;
                    }
                } catch (error) {
                    console.error('فشل في تحديث الرسالة:', error);
                }
            }

            async function sendTemporaryMessage(content, timeout = 5000) {
                try {
                    const msg = await interaction.channel.send(content);
                    setTimeout(() => msg.delete().catch(() => {}), timeout);
                } catch (error) {

                }
            }

            function cleanupCollectors() {
                activeCollectors.forEach(collector => {
                    if (!collector.ended) collector.stop();
                });
                activeCollectors = [];
            }

            async function startReportProcess() {
                cleanupCollectors();
                currentStep = 1;


let buttons = new MessageActionRow();

// // التحقق من الأدوار
// const hasFarmRole = interaction.member.roles.cache.has(config.Farmer); // رتبة مزرعة
// const hasCrimeRole = interaction.member.roles.cache.has(config.vandal); // رتبة إجرام (غيّر الـ ID حسب الرتبة الفعلية)

// // إذا كان لديه رتبة "مزرعة"، أضف زر "مزرعة"
// if (hasFarmRole) {
//     buttons.addComponents(
//         new MessageButton()
//             .setCustomId('farm')
//             .setLabel('مزرعة')
//             .setStyle('SECONDARY')
//     );
// }

// // إذا كان لديه رتبة "إجرام"، أضف زر "إجرام"
// if (hasCrimeRole) {
//     buttons.addComponents(
//         new MessageButton()
//             .setCustomId('crime')
//             .setLabel('إجرام')
//             .setStyle('SECONDARY')
//     );
// }

// زر "يومي" يظهر دائمًا
buttons.addComponents(
        new MessageButton()
             .setCustomId('crime')
             .setLabel('إجرام')
             .setStyle('SECONDARY'),
    new MessageButton()
        .setCustomId('daily')
        .setLabel('يومي')
        .setStyle('SECONDARY')
);

// زر "إلغاء" يظهر دائمًا
buttons.addComponents(
    new MessageButton()
        .setCustomId('cancel')
        .setLabel('إلغاء')
        .setStyle('DANGER')
);
 

                await updateMainMessage(createEmbed(1), [buttons]);
                setupTypeCollector();
            }

            function setupTypeCollector() {
                const filter = i => i.user.id === userId && ['daily','farm', 'crime', 'cancel'].includes(i.customId);
                const collector = mainMessage.createMessageComponentCollector({ 
                    filter, 
                    time: 300000,
                    componentType: 'BUTTON'
                });

                activeCollectors.push(collector);

                collector.on('collect', handleTypeSelection);
                collector.on('end', () => activeCollectors = activeCollectors.filter(c => c !== collector));
            }

            async function handleTypeSelection(i) {
                if (i.customId === 'cancel') return handleCancellation(i);

                const reportTypes = {
                    daily: 'يومي',
                    crime: 'إجرام',
                    farm: 'مزرعة'

                };

                collectedData.reportType = reportTypes[i.customId];
                await i.deferUpdate().catch(() => null);
              
                startDescriptionStep();
            }

            async function startDescriptionStep() {
                currentStep = 2;
                await updateMainMessage(createEmbed(2));

                const filter = m => m.author.id === userId && !m.interaction;
                const collector = interaction.channel.createMessageCollector({ 
                    filter, 
                    time: 300000,
                    max: 1,
                    dispose: true
                });

                activeCollectors.push(collector);

              
              
                collector.on('collect', handleDescriptionInput);
collector.on('end', async (collected) => {
    if (!collected.size) {
        if (mainMessage) {
            try {
                await mainMessage.delete().catch(() => {}); // حذف الرسالة بأمان بدون أخطاء
            } catch (error) {
            }
        }
    }
    activeCollectors = activeCollectors.filter(c => c !== collector);
});
            }

       async function handleDescriptionInput(m) {
    const userInput = m.content.toLowerCase().trim();

    if (userInput === 'إلغاء') return handleCancellation(m);

    collectedData.description = m.content;

    // حذف الرسالة بعد الإدخال لتقليل التشويش
    await m.delete().catch(() => {});

    // تحديد الخطوة التالية بناءً على نوع التقرير
    if (["مزرعة", "يومي"].includes(collectedData.reportType)) {
        startImageStep();
    } else {
        startParticipantsStep();
    }
}


            async function startParticipantsStep() {
                currentStep = 3;
                const buttons = new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId('yes')
                        .setLabel('نعم')
                        .setStyle('SUCCESS'),
                    new MessageButton()
                        .setCustomId('no')
                        .setLabel('لا')
                        .setStyle('DANGER')
                );

                await updateMainMessage(createEmbed(3), [buttons]);
                setupParticipantsCollector();
            }

            function setupParticipantsCollector() {
                const filter = i => i.user.id === userId && ['yes', 'no'].includes(i.customId);
                const collector = mainMessage.createMessageComponentCollector({ 
                    filter, 
                    time: 300000,
                    componentType: 'BUTTON'
                });

                activeCollectors.push(collector);

                collector.on('collect', handleParticipantsSelection);
                collector.on('end', () => activeCollectors = activeCollectors.filter(c => c !== collector));
            }

            async function handleParticipantsSelection(i) {
                await i.deferUpdate().catch(() => null);

                if (i.customId === 'yes') {
                    await updateMainMessage(new MessageEmbed()
                        .setTitle('👥 منشن المشاركين')
                        .setDescription('يرجى منشن الأعضاء المشاركين في التقرير')
                        .setColor('#57F287')
                    );

                    const filter = m => m.author.id === userId && m.mentions.users.size > 0;
                    const collector = interaction.channel.createMessageCollector({ 
                        filter, 
                        time: 300000,
                        max: 1,
                        dispose: true
                    });

                    activeCollectors.push(collector);

                    collector.on('collect', handleParticipantsMention);
    collector.on('end', async (collected) => {
    if (!collected.size) {
        if (mainMessage) {
            try {
                await mainMessage.delete().catch(() => {}); // حذف الرسالة بأمان بدون أخطاء
            } catch (error) {
            }
        }
    }
    activeCollectors = activeCollectors.filter(c => c !== collector);
});
                } else {
                    collectedData.participants = [];
                    startImageStep();
                }
            }

       async function handleParticipantsMention(m) {
    collectedData.participants = m.mentions.users
        .filter(user => user.id !== m.author.id) // استبعاد المستخدم اللي منشن نفسه
        .map(user => user.id);
        
    await m.delete().catch(() => {});
    startImageStep();
}


            async function startImageStep() {
                currentStep = 4;
                await updateMainMessage(createEmbed(4));

                const filter = m => m.author.id === userId && m.attachments.size > 0;
                const collector = interaction.channel.createMessageCollector({ 
                    filter, 
                    time: 300000,
                    max: 1,
                    dispose: true
                });

                activeCollectors.push(collector);

                collector.on('collect', handleImageUpload);
collector.on('end', async (collected) => {
    if (!collected.size) {
        if (mainMessage) {
            try {
                await mainMessage.delete().catch(() => {}); // حذف الرسالة بأمان بدون أخطاء
            } catch (error) {
            }
        }
    }
    activeCollectors = activeCollectors.filter(c => c !== collector);
});
            }

            async function handleImageUpload(m) {
                const attachment = m.attachments.first();

                if (!attachment.contentType?.startsWith('image/')) {
                    await sendTemporaryMessage('❌ يرجى إرسال صورة حقيقية!');
                    return startImageStep();
                }

                try {
                    const uploaded = await interaction.guild.channels.cache.get(reportChannelId)
                        .send({ files: [attachment.url] });

                    collectedData.reportImage = uploaded.attachments.first().url;
                    await m.delete().catch(() => {});
                    showConfirmation();
                } catch (error) {
                    console.error('فشل تحميل الصورة:', error);
                    startImageStep();
                }
            }

            async function showConfirmation() {
                currentStep = 5;
                const buttons = new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId('confirm')
                        .setLabel('✅ تأكيد الإرسال')
                        .setStyle('SUCCESS'),
                    new MessageButton()
                        .setCustomId('edit')
                        .setLabel('✏️ تعديل البيانات')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('cancel')
                        .setLabel('🚫 إلغاء العملية')
                        .setStyle('DANGER')
                );

                await updateMainMessage(createEmbed(5), [buttons]);
                setupConfirmationCollector();
            }

            function setupConfirmationCollector() {
                const filter = i => i.user.id === userId && ['confirm', 'edit', 'cancel'].includes(i.customId);
                const collector = mainMessage.createMessageComponentCollector({ 
                    filter, 
                    time: 300000,
                    componentType: 'BUTTON'
                });

                activeCollectors.push(collector);

                collector.on('collect', handleConfirmation);
                collector.on('end', () => activeCollectors = activeCollectors.filter(c => c !== collector));
            }

            async function handleConfirmation(i) {
                if (i.customId === 'confirm') return handleFinalSubmission(i);
                if (i.customId === 'cancel') return handleCancellation(i);

                await i.deferUpdate().catch(() => null);
                showEditOptions();
            }

            async function showEditOptions() {
                const buttons = new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId('edit_type')
                        .setLabel('🔄 تعديل النوع')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('edit_desc')
                        .setLabel('📝 تعديل الوصف')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('edit_participants')
                        .setLabel('👥 تعديل المشاركين')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('edit_image')
                        .setLabel('🖼️ تعديل الصورة')
                        .setStyle('PRIMARY')
                );

                await updateMainMessage(
                    new MessageEmbed()
                        .setTitle('📌 اختر الجزء المراد تعديله')
                        .setColor('#FFD700')
                        .setDescription('يمكنك تعديل أي جزء من بيانات التقرير:'),
                    [buttons]
                );

                setupEditCollector();
            }

            function setupEditCollector() {
                const filter = i => i.user.id === userId && i.customId.startsWith('edit_');
                const collector = mainMessage.createMessageComponentCollector({ 
                    filter, 
                    time: 300000,
                    componentType: 'BUTTON'
                });

                activeCollectors.push(collector);

                collector.on('collect', handleEditSelection);
                collector.on('end', () => activeCollectors = activeCollectors.filter(c => c !== collector));
            }

            async function handleEditSelection(i) {
                await i.deferUpdate().catch(() => null);

                switch(i.customId) {

                    case 'edit_type': 
                        currentStep = 1;
                        await startReportProcess();
                        break;
                    case 'edit_desc': 
                        await startDescriptionStep();
                        break;
                    case 'edit_participants': 
                        await startParticipantsStep();
                        break;
                    case 'edit_image': 
                        await startImageStep();
                        break;
                }
            }

            async function handleFinalSubmission(interaction) {
                try {
               const reportEmbed = new MessageEmbed()
    .setTitle(`📄 تقرير: ${collectedData.reportType}`)
    .setColor(config.embedColor || '#5865F2')
    .setFooter({ 
        text: collectedData.reportType === 'مزرعة' ? 'Farm' : 
              collectedData.reportType === 'إجرام' ? 'Crime' : 'Daily' 
    })
               
    .setImage(collectedData.reportImage);

// إضافة الحقول الأساسية
reportEmbed.addFields(
    { name: '👤 المرسل', value: `<@${userId}>`, inline: true },
    { name: '📝 الوصف', value: collectedData.description?.slice(0, 1024) || 'لا يوجد وصف', inline: true }
);

// إضافة حقل المشاركين فقط إذا لم يكن التقرير "مزرعة" أو "يومي"
if (collectedData.reportType !== 'مزرعة' && collectedData.reportType !== 'يومي') {
    reportEmbed.addFields({
        name: '👥 المشاركون', 
        value: collectedData.participants?.map(id => `<@${id}>`).join(', ') || 'لا يوجد', 
        inline: true
    });
}
                 const actionRow = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId('accept_report')
        .setLabel('✅ قبول التقرير')
        .setStyle('SUCCESS'),
    new MessageButton()
        .setCustomId('reject_report')
        .setLabel('❌ رفض التقرير')
        .setStyle('DANGER'),
    new MessageButton()
        .setCustomId('reject_with_reason')
        .setLabel('📝 رفض مع سبب')
        .setStyle('SECONDARY')
);

const reportChannel = interaction.guild.channels.cache.get(finalChannelId);
if (!reportChannel) return interaction.reply({ content: '❌ لم يتم العثور على القناة!', ephemeral: true });

const reportMessage = await reportChannel.send({ 
    content: `🔔 <@&${config.reportsManager}> | **تقرير جديد يحتاج للمراجعة!**\n\n⚠️ **الرجاء الاطلاع على التفاصيل واتخاذ الإجراء المناسب.**`,
    embeds: [reportEmbed],
    components: [actionRow]
});

// تحديث الرسالة بعد الإرسال لإزالة الأزرار من واجهة المستخدم
if (interaction.replied || interaction.deferred) {
    await interaction.followUp({
        content: '✅ **تم إرسال التقرير بنجاح إلى فريق المراجعة!**',
        embeds: [],
        components: []
    });
} else {
    await interaction.update({
        content: '✅ **تم إرسال التقرير بنجاح إلى فريق المراجعة!**',
        embeds: [],
        components: []
    });
}

// حذف الرسالة بعد 5 ثواني
setTimeout(() => {
    interaction.deleteReply().catch(() => {});
}, 5000);


                    // تحديث بيانات المرسل
                    await Application_user.findOneAndUpdate(
                        { userId: interaction.user.id },
                        { 
                            $inc: { pendingReports: 1 }, 
                            $setOnInsert: { acceptedReports: 0, dailyReports: 0, rejectedReports: 0 }
                        },
                        { upsert: true, new: true }
                    );

                    // تحديث بيانات المشاركين
                    if (collectedData.participants && collectedData.participants.length > 0) {
                        const bulkOperations = collectedData.participants.map(userId => ({
                            updateOne: {
                                filter: { userId },
                                update: { 
                                    $inc: { pendingReports: 1 },
                                    $setOnInsert: { acceptedReports: 0, dailyReports: 0, rejectedReports: 0 }
                                },
                                upsert: true
                            }
                        }));

                        await Application_user.bulkWrite(bulkOperations);
                    }

                } catch (error) {
                    console.error('فشل الإرسال النهائي:', error);
                } finally {
                    cleanupCollectors();
                }
            }

            async function handleCancellation(source) {
                cleanupCollectors();

             try {
    if (source instanceof MessageComponentInteraction) {
        await source.message.delete().catch(() => {}); // حذف الرسالة بدل التعديل عليها
    } else {
        await source.delete().catch(() => {});
        if (mainMessage && !mainMessage.deleted) {
            await mainMessage.delete().catch(() => {}); // حذف الرسالة الأساسية بدل تعديلها
        }
    }
} catch (error) {
    console.error('فشل في معالجة الإلغاء:', error);
}

            }
    await interaction.deferUpdate().catch(() => null); // يخفي الخطأ بدون إرسال رد
 
            startReportProcess();

        } catch (error) {
            console.error('حدث خطأ جسيم:', error);
        }
       } else if (interaction.customId === 'view_notes') {

         
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

const rolesaloow = [
      config.topRole,        // @・إشراف العائلة
  config.management,        // @・Mangment
  config.leadManagement,    // @・Lead Mangment
  config.familyManager,     // @・Family Manager
  config.support,           // @・Support
  config.goldFamily,        // @・Gold Family
  config.silverFamily,      // @・Silver Family
  config.bronzeFamily,      // @・Bronze Family
  config.member2,           // @・Member 2
  config.member1,           // @・Member 1
  config.vandal,           // @vandal
  config.Farmer,           // @・Farmer
config.familyrole,];

// التحقق من امتلاك العضو لأحد الأدوار المسموحة
if (!interaction.member.roles.cache.some(role => rolesaloow.includes(role.id))) {
    await sendLog(interaction.guild, '❌ محاولة غير مصرح بها', `المستخدم <@${interaction.user.id}> حاول عرض الملاحظات بدون صلاحية.`, 'RED');
    return;
}

const userId = interaction.user.id;
const userNotes = await UserNotes.findOne({ userId });

if (!userNotes || userNotes.notes.length === 0) {
    await sendLog(interaction.guild, '❌ محاولة عرض ملاحظات فارغة', `المستخدم <@${interaction.user.id}> حاول عرض ملاحظات ولكن لا يوجد ملاحظات.`, 'RED');
    return interaction.reply({ 
        content: '❌ **ليس لديك أي ملاحظات حاليًا.**',
        ephemeral: true 
    });
}

let page = 0;
const notesPerPage = 3;
const totalPages = Math.ceil(userNotes.notes.length / notesPerPage);

const generateEmbed = () => {
    const start = page * notesPerPage;
    const end = start + notesPerPage;
    const notes = userNotes.notes.slice(start, end);

    const embed = new MessageEmbed()
        .setTitle(`📌 ملاحظاتك`)
        .setDescription(
            notes.map((note, index) => 
                `📜 **ملاحظة ${start + index + 1}:**\n\n` +
                `**المحتوى:** ${note.content}\n\n` +
                `👤 **أضيفت بواسطة:** <@${note.addedBy}>\n` +
                `🕒 **التاريخ:** <t:${Math.floor(new Date(note.addedAt).getTime() / 1000)}:F>`
            ).join('\n\n━━━━━━━━━━━━━━\n\n')
        )
        .setFooter({ text: `صفحة ${page + 1} من ${totalPages}` })
        .setTimestamp();

    return embed;
};

// إنشاء أزرار التحكم في التصفح
const generateButtons = () => {
    return new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId(`prev_${userId}`)
            .setLabel('⬅️ السابق')
            .setStyle('PRIMARY')
            .setDisabled(page === 0),

        new MessageButton()
            .setCustomId(`next_${userId}`)
            .setLabel('➡️ التالي')
            .setStyle('PRIMARY')
            .setDisabled(page + 1 >= totalPages)
    );
};

const msg = await interaction.reply({ 
    embeds: [generateEmbed()], 
    components: [generateButtons()], 
    ephemeral: true, 
    fetchReply: true 
});

await sendLog(interaction.guild, '📝 عرض الملاحظات', `المستخدم <@${interaction.user.id}> قام بعرض ملاحظاته.`, 'BLUE');

// تفعيل التفاعل مع الأزرار لمدة 30 ثانية
const collector = msg.createMessageComponentCollector({ time: 30000 });

collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
        await sendLog(interaction.guild, '❌ محاولة استخدام غير مصرح بها', `المستخدم <@${i.user.id}> حاول استخدام أزرار عرض الملاحظات بدون صلاحية.`, 'RED');
        return i.reply({ content: '❌ **ليس لديك إذن لاستخدام هذه الأزرار.**', ephemeral: true });
    }

    if (i.customId === `prev_${userId}` && page > 0) page--;
    if (i.customId === `next_${userId}` && page + 1 < totalPages) page++;

    await i.update({ embeds: [generateEmbed()], components: [generateButtons()] });
});

// حذف الأزرار بعد انتهاء الوقت
collector.on('end', () => {
    msg.edit({ components: [] }).catch(() => {});
});
         
             } else if (interaction.customId === 'view_my_notes') {
                  const seller = await Seller.findOne({ userId: interaction.user.id });

    if (!seller) {
      return interaction.reply({
        content: "⚠️ **أنت غير مسجل كبائع في النظام!**",
        ephemeral: true
      });
    }
             
  
               const userId = interaction.user.id;

if (!seller || seller.notes.length === 0) {
    return interaction.reply({ 
        content: '❌ **ليس لديك أي ملاحظات حاليًا.**',
        ephemeral: true 
    });
}

let page = 0;
const notesPerPage = 3;
const totalPages = Math.ceil(seller.notes.length / notesPerPage);

const generateEmbed = () => {
    const start = page * notesPerPage;
    const end = start + notesPerPage;
    const notes = seller.notes.slice(start, end);

    const embed = new MessageEmbed()
        .setTitle(`📌 ملاحظاتك`)
        .setDescription(
            notes.map((note, index) => 
                `📜 **ملاحظة ${start + index + 1}:**\n\n` +
                `**المحتوى:** ${note.content}\n\n` +
                `👤 **أضيفت بواسطة:** <@${note.addedBy}>\n` +
                `🕒 **التاريخ:** <t:${Math.floor(new Date(note.addedAt).getTime() / 1000)}:F>`
            ).join('\n\n━━━━━━━━━━━━━━\n\n')
        )
        .setFooter({ text: `صفحة ${page + 1} من ${totalPages}` })
        .setTimestamp();

    return embed;
};

// إنشاء أزرار التحكم في التصفح
const generateButtons = () => {
    return new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId(`prev_${userId}`)
            .setLabel('⬅️ السابق')
            .setStyle('PRIMARY')
            .setDisabled(page === 0),

        new MessageButton()
            .setCustomId(`next_${userId}`)
            .setLabel('➡️ التالي')
            .setStyle('PRIMARY')
            .setDisabled(page + 1 >= totalPages)
    );
};

const msg = await interaction.reply({ 
    embeds: [generateEmbed()], 
    components: [generateButtons()], 
    ephemeral: true, 
    fetchReply: true 
});


// تفعيل التفاعل مع الأزرار لمدة 30 ثانية
const collector = msg.createMessageComponentCollector({ time: 30000 });

collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ **ليس لديك إذن لاستخدام هذه الأزرار.**', ephemeral: true });
    }

    if (i.customId === `prev_${userId}` && page > 0) page--;
    if (i.customId === `next_${userId}` && page + 1 < totalPages) page++;

    await i.update({ embeds: [generateEmbed()], components: [generateButtons()] });
});

// حذف الأزرار بعد انتهاء الوقت
collector.on('end', () => {
    msg.edit({ components: [] }).catch(() => {});
});
         
         
             } else if (interaction.customId === 'view_my_notes') {
                  const seller = await Seller.findOne({ userId: interaction.user.id });

    if (!seller) {
      return interaction.reply({
        content: "⚠️ **أنت غير مسجل كبائع في النظام!**",
        ephemeral: true
      });
    }
             
  
         
         
    } else if (interaction.customId === 'view_reports') {
      
      
// دالة لإرسال اللوج إلى القناة المحددة
const sendLog = async (guild, title, description, color = 'BLUE') => {
    const logChannelId = config.botlogs; // ID قناة اللوج
    const logChannel = guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null);

    if (!logChannel) {
        console.error('❌ قناة اللوج غير موجودة!');
        return;
    }

    const logEmbed = new MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
};

    const rolesaloow = [
     config.topRole,        // @・إشراف العائلة
  config.management,        // @・Mangment
  config.leadManagement,    // @・Lead Mangment
  config.familyManager,     // @・Family Manager
  config.support,           // @・Support
  config.goldFamily,        // @・Gold Family
  config.silverFamily,      // @・Silver Family
  config.bronzeFamily,      // @・Bronze Family
  config.member2,           // @・Member 2
  config.member1,           // @・Member 1
  config.vandal,           // @vandal
  config.Farmer,           // @・Farmer
   config.familyrole, ];

    // التحقق من امتلاك العضو لأحد الأدوار المسموحة
    if (!interaction.member.roles.cache.some(role => rolesaloow.includes(role.id))) {
        await sendLog(interaction.guild, '❌ محاولة عرض الملاحظات بدون صلاحية', `المستخدم: ${interaction.user.tag} حاول عرض الملاحظات بدون صلاحية.`, 'RED');
        return interaction.reply({ 
            content: `🚫 ليس لديك الصلاحية لعرض الملاحظات.`,
            ephemeral: true 
        });
    }

    const existingLeave = await Leave.findOne({ userId: interaction.user.id, status: "مقبولة" });

    if (existingLeave) {
        await sendLog(interaction.guild, '❌ محاولة عرض الملاحظات أثناء الإجازة', `المستخدم: ${interaction.user.tag} حاول عرض الملاحظات أثناء وجوده في إجازة.`, 'RED');
        return interaction.reply({ 
            content: `🚫 لا يمكنك عرض التقارير الآن لأنك في إجازة.`,
            ephemeral: true 
        });
    }

    const userId = interaction.user.id;
    const userData = await Application_user.findOne({ userId }) || {};
    const totalReports = Object.values(userData).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);

    const successRate = (userData.acceptedReports / totalReports) * 100 || 0;
    const rejectionRate = (userData.rejectedReports / totalReports) * 100 || 0;

    const embed = new MessageEmbed()
        .setColor('#2F3136')
        .setAuthor({ 
            name: `${interaction.user.username} - لوحة الإحصائيات الذكية`, 
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .addFields(
            { 
                name: '📊 الإحصائيات الرئيسية', 
                value: [
                    `**✅ مقبولة:** \`${userData.acceptedReports?.toLocaleString() || 0}\``,
                    `**🔄 معلقة:** \`${userData.pendingReports?.toLocaleString() || 0}\``,
                    `**📅 يومية:** \`${userData.dailyReports?.toLocaleString() || 0}\``,
                    `**⛔ مرفوضة:** \`${userData.rejectedReports?.toLocaleString() || 0}\``,
                    `**🚔 إجرامية:** \`${userData.crimeReports?.toLocaleString() || 0}\``,
                    `**🌾 زراعية:** \`${userData.agricultureReports?.toLocaleString() || 0}\``
                ].join('\n'), 
                inline: false 
            },
            {
                name: '📈 التحليلات المتقدمة',
                value: [
                    `**🏆 النجاح:** ${createProgressBar(successRate)}`,
                    `**📉 الرفض:** ${createProgressBar(rejectionRate)}`
                ].join('\n'),
                inline: false
            },
            {
                name: '📊 تقييم الأداء',
                value: getSuccessLevel(successRate),
                inline: false
            }
        );

    const row = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('reload_reports')
            .setLabel('🔄 تحديث')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('detailed_report')
            .setLabel('📑 تحليل متقدم')
            .setStyle('SECONDARY')
    );

    const reply = await interaction.reply({ 
        embeds: [embed], 
        components: [row], 
        ephemeral: true 
    });

    await sendLog(interaction.guild, '✅ عرض الملاحظات بنجاح', `المستخدم: ${interaction.user.tag} قام بعرض الملاحظات بنجاح.`, 'GREEN');

    // جلب الرسالة بعد إرسال الرد
    const message = await interaction.fetchReply(); 

    const collector = message.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (btnInteraction) => {
        if (btnInteraction.user.id !== userId) {
            await sendLog(interaction.guild, '❌ محاولة استخدام الأزرار بدون صلاحية', `المستخدم: ${btnInteraction.user.tag} حاول استخدام الأزرار بدون صلاحية.`, 'RED');
            return btnInteraction.reply({ 
                content: `🚫 ليس لديك الصلاحية لاستخدام هذه الأزرار.`,
                ephemeral: true 
            });
        }

        await btnInteraction.deferUpdate().catch(() => null);

        if (btnInteraction.customId === 'reload_reports') {
            const userData = await Application_user.findOne({ userId }) || {};
            const totalReports = Object.values(userData).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);

            const successRate = (userData.acceptedReports / totalReports) * 100 || 0;
            const rejectionRate = (userData.rejectedReports / totalReports) * 100 || 0;

            const embed = new MessageEmbed()
                .setColor('#2F3136')
                .setAuthor({ 
                    name: `${interaction.user.username} - لوحة الإحصائيات الذكية`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                })
                .addFields(
                    { 
                        name: '📊 الإحصائيات الرئيسية', 
                        value: [
                            `**✅ مقبولة:** \`${userData.acceptedReports?.toLocaleString() || 0}\``,
                            `**🔄 معلقة:** \`${userData.pendingReports?.toLocaleString() || 0}\``,
                            `**📅 يومية:** \`${userData.dailyReports?.toLocaleString() || 0}\``,
                            `**⛔ مرفوضة:** \`${userData.rejectedReports?.toLocaleString() || 0}\``,
                            `**🚔 إجرامية:** \`${userData.crimeReports?.toLocaleString() || 0}\``,
                            `**🌾 زراعية:** \`${userData.agricultureReports?.toLocaleString() || 0}\``
                        ].join('\n'), 
                        inline: false 
                    },
                    {
                        name: '📈 التحليلات المتقدمة',
                        value: [
                            `**🏆 النجاح:** ${createProgressBar(successRate)}`,
                            `**📉 الرفض:** ${createProgressBar(rejectionRate)}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '📊 تقييم الأداء',
                        value: getSuccessLevel(successRate),
                        inline: false
                    }
                );

            await btnInteraction.editReply({ 
                embeds: [embed], 
                components: [row],
                ephemeral: true 
            });

            await sendLog(interaction.guild, '🔄 تحديث الإحصائيات', `المستخدم: ${btnInteraction.user.tag} قام بتحديث الإحصائيات.`, 'BLUE');
        } else if (btnInteraction.customId === 'detailed_report') {
            const userData = await Application_user.findOne({ userId }) || {};
            const acceptedReports = userData.acceptedReports || 0;
            const rejectedReports = userData.rejectedReports || 0;
            const pendingReports = userData.pendingReports || 0;
            const dailyReports = userData.dailyReports || 0;
            const crimeReports = userData.crimeReports || 0;
            const agricultureReports = userData.agricultureReports || 0;
            const totalReports = acceptedReports + rejectedReports + pendingReports || 1;
            const successRate = calculatePercentage(acceptedReports, totalReports);
            const rejectionRate = calculatePercentage(rejectedReports, totalReports);

            const chartConfig = {
                type: 'bar',
                data: {
                    labels: ['مقبولة', 'مرفوضة', 'معلقة', 'يومية', 'جرائم', 'زراعية'],
                    datasets: [{
                        label: 'عدد التقارير',
                        data: [acceptedReports, rejectedReports, pendingReports, dailyReports, crimeReports, agricultureReports],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.8)', // أخضر فاتح
                            'rgba(255, 99, 132, 0.8)',  // أحمر
                            'rgba(255, 206, 86, 0.8)',   // أصفر
                            'rgba(54, 162, 235, 0.8)',   // أزرق
                            'rgba(153, 102, 255, 0.8)',  // بنفسجي
                            'rgba(255, 159, 64, 0.8)'    // برتقالي
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                        borderWidth: 1,
                        borderRadius: 8,
                        hoverBackgroundColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    animation: {
                        duration: 1200,
                        easing: 'easeOutCubic'
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: {
                                    size: 14,
                                    family: 'Arial',
                                    weight: 'bold'
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)',
                                borderDash: [5, 5]
                            },
                            ticks: {
                                font: {
                                    size: 14,
                                    family: 'Arial'
                                }
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'إحصائيات التقارير',
                            font: {
                                size: 20,
                                family: 'Arial',
                                weight: 'bold'
                            },
                            padding: { top: 10, bottom: 20 }
                        },
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                font: { size: 14, family: 'Arial' }
                            }
                        }
                    }
                }
            };

            const quickChartResponse = await fetch('https://quickchart.io/chart/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chart: chartConfig,
                    backgroundColor: '#ffffff',
                    width: 500,
                    height: 300,
                    format: 'png'
                })
            });

            const quickChartData = await quickChartResponse.json();
            const chartUrl = quickChartData.url;

            const detailedEmbed = new MessageEmbed()
                .setColor('#2F3136')
                .setTitle('📊 تحليل متقدم للتقارير')
                .addFields(
                    { name: '📌 إجمالي التقارير', value: `\`${totalReports.toLocaleString()}\` تقرير`, inline: true },
                    { name: '✅ المقبولة', value: `\`${acceptedReports.toLocaleString()}\``, inline: true },
                    { name: '⛔ المرفوضة', value: `\`${rejectedReports.toLocaleString()}\``, inline: true },
                    { name: '🔄 المعلقة', value: `\`${pendingReports.toLocaleString()}\``, inline: true },
                    { name: '📆 اليومية', value: `\`${dailyReports.toLocaleString()}\``, inline: true },
                    { name: '🚔 الجرائم', value: `\`${crimeReports.toLocaleString()}\``, inline: true },
                    { name: '🌾 الزراعية', value: `\`${agricultureReports.toLocaleString()}\``, inline: true },
                    { name: '🏆 نسبة النجاح', value: createProgressBar(successRate), inline: false },
                    { name: '📉 نسبة الرفض', value: createProgressBar(rejectionRate), inline: false }
                )
                .setImage(chartUrl);

            await btnInteraction.editReply({ embeds: [detailedEmbed], ephemeral: true , components: [] });

            await sendLog(interaction.guild, '📊 تحليل متقدم للتقارير', `المستخدم: ${btnInteraction.user.tag} قام بعرض تحليل متقدم للتقارير.`, 'BLUE');
        }
    });

    collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(console.error);
    });
};
    
  
  
} 

async function handleSelectMenu(interaction) {
 
if (interaction.customId === "select_order_category") {
      const { MessageEmbed } = require('discord.js');

    const selected = interaction.values[0];
    const typeMap = {
        kshb: { label: "خشب", emoji: "🪵" },
        mmn3: { label: "ممنوعات", emoji: "🚫" },
        djaj: { label: "دجاج", emoji: "🐔" },
        slh: { label: "أسلحة", emoji: "🔫" },
        other: { label: "أخرى", emoji: "📁" },
        fish: { label: "سمك", emoji: "🐟" },
        vegetables: { label: "خضروات", emoji: "🥦" },
        oil: { label: "نفط", emoji: "🛢️" },
        fabric: { label: "قماش", emoji: "🧵" },
        metals: { label: "معادن", emoji: "⛓️" }
    };

    const order = global.orders?.[interaction.user.id];
    if (!order) return;

    order.category = selected;
const confirmEmbed = new MessageEmbed()
    .setColor("#00C896")
    .setTitle("✅ تأكيد الطلبية")
    .setDescription(`📝 **الوصف:**\n${order.description || "لا يوجد وصف"}`)
    .addFields(
        { name: "📦 النوع", value: `${typeMap[selected].emoji} ${typeMap[selected].label}`, inline: true },
        { name: "🔢 الكمية", value: order.quantity.toString(), inline: true },
        { name: "💰 السعر المقترح", value: order.price.toString(), inline: true }
    );

const confirmButtons = new MessageActionRow().addComponents(
    new MessageButton()
        .setCustomId("confirm_custom_order")
        .setLabel("✅ تأكيد وإرسال")
        .setStyle("SUCCESS")
);

await interaction.update({
    embeds: [confirmEmbed],
    components: [confirmButtons]
});

}

  
if (interaction.customId.startsWith('material_select_')) {
    const { MessageEmbed } = require('discord.js');
    const parts = interaction.customId.split('_');

   
      if(parts[6] === "farm") {
        
    // تحليل البيانات من الـ customId
    const currentLevel = parseInt(parts[2]);
    const currentXP = parseInt(parts[3]);
    const targetXP = parseInt(parts[4]);
        
// التحقق من أن القيم أرقام
if (isNaN(currentLevel) || isNaN(currentXP) || isNaN(targetXP)) {
    return interaction.reply({ content: 'الرجاء إدخال أرقام صحيحة في جميع الحقول.', ephemeral: true });
}
        if (currentLevel <= 0 || currentXP < 0 || targetXP <= 0) {
    return interaction.reply({ 
        content: '❌ الرجاء إدخال أرقام أكبر من صفر في جميع الحقول.', 
        ephemeral: true 
    });
}
     
     
          // معدلات محاصيل المزرعة مع إيموجيات
  const farmRates = {
    carrot: { 
        withoutDouble: 6, 
        emoji: '🥕', 
        name: 'الجزر' 
    },
    apple: { 
        withoutDouble: 4, 
        emoji: '🍎', 
        name: 'التفاح' 
    },
    wheat: { 
        withoutDouble: 3, 
        emoji: '🌾', 
        name: 'القمح' 
    },
    orange: { 
        withoutDouble: 5, 
        emoji: '🍊', 
        name: 'البرتقال' 
    }
};
    
    const crop = interaction.values[0];
    const rate = farmRates[crop];

   
    const withoutDouble = Math.ceil(targetXP / rate.withoutDouble);
// إنشاء الرسالة الرئيسية (Embed) للمزرعة
const resultEmbed = new MessageEmbed()
    .setColor('#4CAF50')  // لون أخضر مميز
    .setTitle(`${rate.emoji} │ حساب ${rate.name} للمزرعة`)
    .setDescription(`📈 **حساب الكميات المطلوبة للرفع**`)
    .addFields(
        { name: '🏡 │ المستوى الحالي', value: `\`${currentLevel}\``, inline: true },
        { name: '⬆ │ المستوى التالي', value: `\`${currentLevel + 1}\``, inline: true },
        { name: '📊 │ XP الحالي', value: `\`${currentXP}\``, inline: true },
        { name: '🎯 │ XP المطلوب', value: `\`${targetXP}\``, inline: true },
        { name: '🌾 │ الكمية المطلوبة', value: `${rate.emoji} \`${withoutDouble}\` وحدة`, inline: true }
    )

await interaction.update({
    content: null,
    embeds: [resultEmbed],
    components: [],
});

// سجل الإجراءات (Log Channel) للمزرعة
const logChannel = await interaction.client.channels.fetch(config.xp_logs);
if (logChannel) {
    const logEmbed = new MessageEmbed()
        .setColor('#FFA500')  // لون برتقالي للتنبيه
        .setTitle(`${rate.emoji} │ سجل عملية حساب ${rate.name} للمزرعة`)

        .setDescription(`**المستخدم:** ${interaction.user}`)
        .addFields(
            { name: '📶 │ المستوى', value: `${currentLevel} → ${currentLevel + 1}`, inline: true },
            { name: '🌾 │ الكمية المطلوبة', value: `${rate.emoji} \`${withoutDouble}\` وحدة`, inline: true },
            { name: '📅 │ التاريخ', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
        )

    await logChannel.send({ embeds: [logEmbed] });
}
        
      } else {
    const currentLevel = parseInt(parts[2]);
    const currentXP = parseInt(parts[3]);
    const targetXP = parseInt(parts[4]);
    const xpNeeded = targetXP - currentXP;
 
// التحقق من أن القيم أرقام
if (isNaN(currentLevel) || isNaN(currentXP) || isNaN(targetXP)) {
    return interaction.reply({ content: 'الرجاء إدخال أرقام صحيحة في جميع الحقول.', ephemeral: true });
}// التحقق من أن الأرقام أكبر من صفر
if (currentLevel <= 0 || currentXP < 0 || targetXP <= 0) {
    return interaction.reply({ 
        content: '❌ الرجاء إدخال أرقام أكبر من صفر في جميع الحقول.', 
        ephemeral: true 
    });
}// معدلات المواد مع إيموجيات
const materialRates = {
    che: { 
        withDouble: 10, 
        withoutDouble: 5, 
        emoji: '🍗', 
        name: 'الدجاج' 
    },
    fish: { 
        withDouble: 14,
        withoutDouble: 7, 
        emoji: '🐟', 
        name: 'السمك' 
    },
    vegetables: { 
        withDouble: 12,
        withoutDouble: 6, 
        emoji: '🥦', 
        name: 'الخضروات' 
    },
    wood: { 
        withDouble: 12, 
        withoutDouble: 6, 
        emoji: '🪵', 
        name: 'الخشب' 
    },
    oil: { 
        withDouble: 40, 
        withoutDouble: 20, 
        emoji: '🛢️', 
        name: 'النفط' 
    },
    fabric: { 
        withDouble: 24, // (12×2)
        withoutDouble: 12, 
        emoji: '🧵', 
        name: 'القماش' 
    },
    gold: {
        withDouble: 26, // (13×2)
        withoutDouble: 13,
        emoji: '🪙',
        name: 'الذهب'
    },
    iron: {
        withDouble: 10, // (5×2)
        withoutDouble: 5,
        emoji: '⛓️',
        name: 'الحديد'
    }
};

    
    const material = interaction.values[0];
    const rate = materialRates[material];

    // الحسابات
    const withDouble = Math.ceil(xpNeeded / rate.withDouble);
    const withoutDouble = Math.ceil(xpNeeded / rate.withoutDouble);

    // إنشاء الرسالة الرئيسية (Embed)
    const resultEmbed = new MessageEmbed()
        .setColor('#4CAF50')  // لون أخضر مميز
        .setTitle(`${rate.emoji} │ حساب XP لـ ${rate.name}`)
        .setDescription(`📊 **نتائج الحساب الدقيق** �`)
        .addFields(
            { name: '📊 │ المستويات', value: `**${currentLevel}** ➔ **${currentLevel + 1}**`, inline: true },
            { name: '🧮 │ XP الحالي', value: `\`${currentXP}\``, inline: true },
            { name: '🎯 │ XP المطلوب', value: `\`${targetXP}\``, inline: true },
            { name: '⏳ │ XP المتبقي', value: `\`${xpNeeded}\``, inline: true },
            { name: '🌱 │ بدون دبل XP', value: `\`${withoutDouble}\` وحدة`, inline: true },
            { name: '✨ │ مع دبل XP', value: `\`${withDouble}\` وحدة`, inline: true }
        )
     
    await interaction.update({
        content: null,
        embeds: [resultEmbed],
        components: [],
    });

    // سجل الإجراءات (Log Channel)
    const logChannel = await interaction.client.channels.fetch(config.xp_logs);
    if (logChannel) {
        const logEmbed = new MessageEmbed()
            .setColor('#FFA500')  // لون برتقالي للتنبيه
            .setTitle(`📝 │ سجل عملية حساب XP`)
            .setDescription(`**تم تنفيذ العملية بواسطة:** ${interaction.user}`)
            .addFields(
                { name: '📦 │ نوع المادة', value: `${rate.emoji} ${rate.name}`, inline: true },
                { name: '📌 │ المستوى', value: `من ${currentLevel} إلى ${currentLevel + 1}`, inline: true },
                { name: '🧮 │ XP المتبقي', value: `\`${xpNeeded}\``, inline: true },
                { name: '📉 │ بدون دبل', value: `\`${withoutDouble}\` وحدة`, inline: true },
                { name: '📈 │ مع دبل', value: `\`${withDouble}\` وحدة`, inline: true },
                { name: '⏰ │ التاريخ', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
            )
        

        await logChannel.send({ embeds: [logEmbed] });
    }
      }
  
}

  
  if (interaction.customId === 'ticket_type') {
    const type = interaction.values[0];
    const user = interaction.user;
    
    if (!interaction.guild.me.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
      return interaction.reply('❌ Bot needs permission to manage channels!');
    }

   const existingTicket = await Ticket.findOne({ userId: user.id, status: 'open' });

if (existingTicket) {
  const ticketChannel = interaction.guild.channels.cache.get(existingTicket.channelId);

  if (!ticketChannel) {
    // إذا لم تكن القناة موجودة، يتم تحديث حالة التذكرة إلى "closed"
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

    // 🆕 جلب معرف الفئة المناسبة لنوع التذكرة
    const categoryId = config.ticketCategories[type];
    if (!categoryId) {
      return interaction.reply('❌ No category assigned for this ticket type!');
    }
    if (type === 'family') {
        const userId = interaction.user.id;

 const isBlacklisted = await Blacklist.findOne({ userId });


  if (isBlacklisted) {
    
const embed = new MessageEmbed()
    .setColor('#FF0000') // لون أحمر للدلالة على المنع
    .setTitle('🚫 لا يمكنك التقديم!')
    .setDescription(`أنت في **قائمة البلاك ليست** ولا يمكنك التقديم على العائلة.\n\n📝 **السبب:** ${isBlacklisted.reason}`)
    .setFooter({ text: 'يرجى التواصل مع الإدارة إذا كنت تعتقد أن هناك خطأ.', iconURL: interaction.client.user.displayAvatarURL() });
    return interaction.update({content: null, embeds: [embed], components: [], ephemeral: true });
    
  }
      
    const { family } = require('../utils/family');
    await family(interaction, user, type, categoryId, config);

    } else if (type === 'alliance') {

      const modal = new Modal()
    .setCustomId('alliance_application_modal')
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
    .setPlaceholder('اكتب اسم المالك داخل اللعبة')
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

    } else if (type === 'report') {
const modal = new Modal()
    .setCustomId('ticket_report_modal')
    .setTitle('تفاصيل البلاغ');

// 🔹 السؤال الأول: اسم الحساب داخل اللعبة
const usernameInput = new TextInputComponent()
    .setCustomId('report_username')
    .setLabel('ما اسم حسابك بداخل اللعبة؟')
    .setStyle('SHORT')
    .setPlaceholder('اكتب اسمك داخل اللعبة')
    .setRequired(true);

// 🔹 السؤال الثاني: نوع البلاغ
const reportTypeInput = new TextInputComponent()
    .setCustomId('report_type')
    .setLabel('ما نوع البلاغ؟')
    .setStyle('SHORT')
    .setPlaceholder('مثال: غش، إساءة،...')
    .setRequired(true);

// 🔹 السؤال الثالث: وصف البلاغ
const descriptionInput = new TextInputComponent()
    .setCustomId('report_description')
    .setLabel('اكتب وصفًا كاملًا للبلاغ')
    .setStyle('PARAGRAPH')
    .setPlaceholder('اكتب جميع التفاصيل المهمة حول البلاغ')
    .setRequired(true);

// 🔹 إضافة الأسئلة إلى النموذج
modal.addComponents(
    new MessageActionRow().addComponents(usernameInput),
    new MessageActionRow().addComponents(reportTypeInput),
    new MessageActionRow().addComponents(descriptionInput)
);

            await interaction.showModal(modal);
          
      
       } else if (type === 'strem') {

    } else {
      return interaction.reply({ content: '❌ Unknown ticket type!', ephemeral: true });
    }

  } 
    
  





  
  if (interaction.customId === 'ticket_type') {
    const type = interaction.values[0];
    const user = interaction.user;
    
    if (!interaction.guild.me.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
      return interaction.reply('❌ Bot needs permission to manage channels!');
    }

   const existingTicket = await Ticket.findOne({ userId: user.id, status: 'open' });

if (existingTicket) {
  const ticketChannel = interaction.guild.channels.cache.get(existingTicket.channelId);

  if (!ticketChannel) {
    // إذا لم تكن القناة موجودة، يتم تحديث حالة التذكرة إلى "closed"
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

    // 🆕 جلب معرف الفئة المناسبة لنوع التذكرة
    const categoryId = config.ticketCategories[type];
    if (!categoryId) {
      return interaction.reply('❌ No category assigned for this ticket type!');
    }
    if (type === 'family') {
        const userId = interaction.user.id;

 const isBlacklisted = await Blacklist.findOne({ userId });


  if (isBlacklisted) {
    
const embed = new MessageEmbed()
    .setColor('#FF0000') // لون أحمر للدلالة على المنع
    .setTitle('🚫 لا يمكنك التقديم!')
    .setDescription(`أنت في **قائمة البلاك ليست** ولا يمكنك التقديم على العائلة.\n\n📝 **السبب:** ${isBlacklisted.reason}`)
    .setFooter({ text: 'يرجى التواصل مع الإدارة إذا كنت تعتقد أن هناك خطأ.', iconURL: interaction.client.user.displayAvatarURL() });
    return interaction.update({content: null, embeds: [embed], components: [], ephemeral: true });
    
  }
      
    const { family } = require('../utils/family');
    await family(interaction, user, type, categoryId, config);

    } else if (type === 'alliance') {

      const modal = new Modal()
    .setCustomId('alliance_application_modal')
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
    .setPlaceholder('اكتب اسم المالك داخل اللعبة')
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

    } else if (type === 'report') {
const modal = new Modal()
    .setCustomId('ticket_report_modal')
    .setTitle('تفاصيل البلاغ');

// 🔹 السؤال الأول: اسم الحساب داخل اللعبة
const usernameInput = new TextInputComponent()
    .setCustomId('report_username')
    .setLabel('ما اسم حسابك بداخل اللعبة؟')
    .setStyle('SHORT')
    .setPlaceholder('اكتب اسمك داخل اللعبة')
    .setRequired(true);

// 🔹 السؤال الثاني: نوع البلاغ
const reportTypeInput = new TextInputComponent()
    .setCustomId('report_type')
    .setLabel('ما نوع البلاغ؟')
    .setStyle('SHORT')
    .setPlaceholder('مثال: غش، إساءة،...')
    .setRequired(true);

// 🔹 السؤال الثالث: وصف البلاغ
const descriptionInput = new TextInputComponent()
    .setCustomId('report_description')
    .setLabel('اكتب وصفًا كاملًا للبلاغ')
    .setStyle('PARAGRAPH')
    .setPlaceholder('اكتب جميع التفاصيل المهمة حول البلاغ')
    .setRequired(true);

// 🔹 إضافة الأسئلة إلى النموذج
modal.addComponents(
    new MessageActionRow().addComponents(usernameInput),
    new MessageActionRow().addComponents(reportTypeInput),
    new MessageActionRow().addComponents(descriptionInput)
);

            await interaction.showModal(modal);
          
      
       } else if (type === 'strem') {

    } else {
      return interaction.reply({ content: '❌ Unknown ticket type!', ephemeral: true });
    }

  } 
    
  
}




function getEmoji(type) {
  const emojis = {
    family: { name: '👪' },
    alliance: { name: '🤝' },
    report: { name: '🚩' }
  };
  return emojis[type] || null;
}
async function closeTicket(channel, interaction, reason) {

    setTimeout(async () => {
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

        const messages = await channel.messages.fetch();
        ticket.messages = messages
            .filter(msg => !msg.author.bot)
            .map(msg => ({
                content: msg.content,
                author: msg.author.tag,
                timestamp: msg.createdAt
            }));

        await ticket.save();

        // ✅ إرسال نسخة التذكرة للمستخدم
      const topic = interaction.channel.topic;
const userId = topic?.match(/\d{17,}/)?.[0]; // استخراج ID من التوبيك

if (!userId) {
    return interaction.reply({
        content: '❌ لم يتم العثور على ID المستخدم في التوبيك!',
        ephemeral: true
    });
}

await sendTicketTranscript(userId, interaction.channel, interaction.user.id, reason || 'No reason provided.', interaction);

      
      

        // ✅ حذف القناة بعد الرد بفترة قصيرة
        await channel.delete();
    }, 5000);
}




// ✅ Function to send the ticket transcript to the user
async function sendTicketTranscript(user, channel, closedBy, reason, interaction) {
const member = await interaction.guild.members.fetch(user);

    if (!interaction) {
        console.error("❌ Error: interaction is not defined!");
        return;
      
    }    try {
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
       const transcriptChannel = interaction.client.channels.cache.get('1345885896825901157'); // القناة المستهدفة

if (!transcriptChannel) {
    console.error("❌ Channel not found!");
    return;
}

// ✅ إرسال الملف إلى القناة
const sentMessage = await transcriptChannel.send({ files: [attachment] });

// ✅ الحصول على رابط الملف
const fileURL = sentMessage.attachments.first()?.url;

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

// ✅ إرسال رسالة للمستخدم
const embed = new MessageEmbed()
    .setTitle('📌 **Your Ticket Has Been Closed**')
    .setColor('#ff3333')
    .setDescription(
        `Hey <@${member.user.id}>, your ticket has been closed.\n\n` +
        `🔹 **Reason:**\n> ${reason || 'No reason provided.'}\n\n` +
        `🔹 **Closed by:** <@${closedBy}>\n\n` +
        `📅 **Closed on:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
        `🔔 If you have any other issues, feel free to open a new ticket!`
    )
    .setFooter({ text: 'Thanks for reaching out! Stay safe. 🚀' })
    .setTimestamp();
     member.user.send({ embeds: [embed], components: [row] });

      
    } catch (error) {

        console.error(`❌ Couldn't send the ticket transcript to ${member.user.tag}:`, error);

        // 🔴 Notify in the ticket channel if user has DMs closed
        if (error.code === 50007) { 

        }
    }
}




// 📁 utils/helpers.js
function getLabel(type) {
  const labels = {
    family: 'تقديم للعائلة',
    alliance: 'تقديم تحالف',
    report: 'بلاغ ضد عضو'
  };
  return labels[type] || type;
}


const fs = require('fs');
const path = require('path');

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
async function restartSequence(interaction, client) {
await setRestartingState(client, true);  // عند بدء إعادة التشغيل
    let progress = 0;

    // تأخير الرد لمنع مشاكل "This interaction has already been replied to"
    await interaction.deferReply({ ephemeral: true });

    // إرسال الرسالة الأولى
    await interaction.editReply({ content: '🔄 **جاري إعادة التشغيل... 0%**' });

    while (progress < 100) {
        progress += Math.floor(Math.random() * 12) + 5; // تقدم عشوائي أكثر واقعية
        if (progress > 100) progress = 100;

        let loadingMessage = `🔄 **Restarting... ${progress}%**\n`;
        if (progress < 30) loadingMessage += '🛑 Disconnecting commands...';
        else if (progress < 50) loadingMessage += '📡 Disconnecting database...';
        else if (progress < 70) loadingMessage += '⚙️ Cleaning up memory...';
        else if (progress < 90) loadingMessage += '🔄 Preparing reboot sequence...';
        else loadingMessage += '✅ Finalizing restart...';

        // تعديل نفس الرسالة
        await interaction.editReply({ content: loadingMessage });

        // تأخير عشوائي بين 1 و 3.5 ثواني
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2500) + 1000));
    }

    // الرسالة النهائية
    await interaction.editReply({ content: '✅ **Restart complete! Bot is coming back online...**' });


    // تنفيذ عمليات ما بعد إعادة التشغيل
    writeUptime({ uptime: 1 });
    logRestart();
    process.exit();
}


// دالة مساعدة لإنشاء شريط التقدم
function createProgressBar(percentage, length = 10) {
    percentage = Math.max(0, Math.min(percentage, 100));
    const filledLength = Math.round((percentage / 100) * length);
    const emptyLength = length - filledLength;
    const color = percentage >= 75 ? '🟩' : percentage >= 50 ? '🟨' : percentage >= 25 ? '🟧' : '🟥';
    return `**[${color.repeat(filledLength)}${'⬜'.repeat(emptyLength)}]** ${percentage.toFixed(1)}%`;
}

// دالة مساعدة لتحديد مستوى النجاح
function getSuccessLevel(percentage) {
    if (percentage >= 75) return '🏆 **ممتاز**';
    if (percentage >= 50) return '🔹 **جيد**';
    if (percentage >= 25) return '⚠️ **متوسط**';
    return '❌ **ضعيف**';
}

// دالة مساعدة لحساب النسب المئوية
function calculatePercentage(part, total) {
    if (total === 0) return 0;
    return ((part / total) * 100).toFixed(2);
}


