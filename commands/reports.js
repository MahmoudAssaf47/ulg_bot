const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const Application_user = require('../models/Application.js');
const config = require('../config');

function createProgressBar(percentage, length = 10) {
    percentage = Math.max(0, Math.min(percentage, 100));
    const filledLength = Math.round((percentage / 100) * length);
    const emptyLength = length - filledLength;
    const color = percentage >= 75 ? '🟩' : percentage >= 50 ? '🟨' : percentage >= 25 ? '🟧' : '🟥';
    return `**[${color.repeat(filledLength)}${'⬜'.repeat(emptyLength)}]** ${percentage.toFixed(1)}%`;
}

function getSuccessLevel(percentage) {
    if (percentage >= 75) return '🏆 **ممتاز**';
    if (percentage >= 50) return '🔹 **جيد**';
    if (percentage >= 25) return '⚠️ **متوسط**';
    return '❌ **ضعيف**';
}

module.exports = {
    name: 'reasdsadasdasdasports',
    description: 'عرض إحصائيات تقاريرك بتصميم مبتكر وذكي',
    async execute(message) {
      
        const allowedChannelId = '1345889457777148047'; // 🛑 استبدل هذا بالـ ID الخاص بالروم المسموح به

        if (message.channel.id !== allowedChannelId) {
            return; 
        }
      
      
                 const rolesToRemove = ['1341094527615762464', '1341094526248554566', '1341094524897984702','1341094507294359603','1341094528622264461','1341094529721438240'];


        // التحقق من امتلاك العضو لأحد الأدوار المسموحة
        if (!message.member.roles.cache.some(role => rolesToRemove.includes(role.id))) {
            return;
        }
      
        const userId = message.author.id;
        
        try {
            const userData = await Application_user.findOne({ userId }) || {};
            const totalReports = Object.values(userData).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
            const successRate = (userData.acceptedReports / totalReports) * 100 || 0;
            const rejectionRate = (userData.rejectedReports / totalReports) * 100 || 0;
const currentDate = new Date();
const daysPassed = currentDate.getDate(); // عدد الأيام اللي عدّت من الشهر الحالي
const progress = (userData.dailyReports / daysPassed) * 100 || 0;


            const embed = new MessageEmbed()
                .setColor('#2F3136')
                .setAuthor({ 
                    name: `${message.author.username} - لوحة الإحصائيات الذكية`, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .addFields(
                    { 
                        name: '📊 الإحصائيات الرئيسية', 
                        value: [
                            `**✅ مقبولة:** \`${userData.acceptedReports?.toLocaleString() || 0}\``,
                            `**🔄 معلقة:** \`${userData.pendingReports?.toLocaleString() || 0}\``,
                            `**📅 يومية:** \`${userData.dailyReports?.toLocaleString() || 0}\``,
                            `**⛔ مرفوضة:** \`${userData.rejectedReports?.toLocaleString() || 0}\``
                        ].join('\n'), 
                        inline: false 
                    },
                    {
                        name: '📈 التحليلات المتقدمة',
                        value: [
                            `**🏆 النجاح:** ${createProgressBar(successRate)}`,
                            `**📉 الرفض:** ${createProgressBar(rejectionRate)}`,
`**⏱️ الإنتاجية:** ${createProgressBar(progress)}`
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

            const reply = await message.reply({ 
                embeds: [embed], 
                components: [row],
                ephemeral: true 
            });

            const collector = reply.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async (btnInteraction) => {
                if (btnInteraction.user.id !== userId) return;
                
                await btnInteraction.deferUpdate();
                
                if (btnInteraction.customId === 'reload_reports') {

                
                   const userData = await Application_user.findOne({ userId }) || {};
            const totalReports = Object.values(userData).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
            const successRate = (userData.acceptedReports / totalReports) * 100 || 0;
            const rejectionRate = (userData.rejectedReports / totalReports) * 100 || 0;

            const embed = new MessageEmbed()
                .setColor('#2F3136')
                .setAuthor({ 
                    name: `${message.author.username} - لوحة الإحصائيات الذكية`, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .addFields(
                    { 
                        name: '📊 الإحصائيات الرئيسية', 
                        value: [
                            `**✅ مقبولة:** \`${userData.acceptedReports?.toLocaleString() || 0}\``,
                            `**🔄 معلقة:** \`${userData.pendingReports?.toLocaleString() || 0}\``,
                            `**📅 يومية:** \`${userData.dailyReports?.toLocaleString() || 0}\``,
                            `**⛔ مرفوضة:** \`${userData.rejectedReports?.toLocaleString() || 0}\``
                        ].join('\n'), 
                        inline: false 
                    },
                    {
                        name: '📈 التحليلات المتقدمة',
                        value: [
                            `**🏆 النجاح:** ${createProgressBar(successRate)}`,
                            `**📉 الرفض:** ${createProgressBar(rejectionRate)}`,
                            `**⏱️ الإنتاجية:** ${createProgressBar((userData.dailyReports / 30) * 100 || 0)}`
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

             await reply.edit({ 
                embeds: [embed], 
                components: [row],
                ephemeral: true 
            });
                
                
                } else if (btnInteraction.customId === 'detailed_report') {
const fetch = require('node-fetch'); // استدعاء المكتبة

// دالة مساعدة لحساب النسب المئوية
const calculatePercentage = (part, total) => {
    if (total === 0) return 0;
    return ((part / total) * 100).toFixed(2);
};

// جلب بيانات المستخدم من قاعدة البيانات
const userData = await Application_user.findOne({ userId }) || {};

// التأكد من وجود بيانات التقارير
const acceptedReports = userData.acceptedReports || 0;
const rejectedReports = userData.rejectedReports || 0;
const pendingReports = userData.pendingReports || 0;
const dailyReports = userData.dailyReports || 0;

// حساب إجمالي التقارير
const totalReports = acceptedReports + rejectedReports + pendingReports;

// حساب النسب المئوية
const successRate = calculatePercentage(acceptedReports, totalReports);
const rejectionRate = calculatePercentage(rejectedReports, totalReports);

// إعدادات الرسم البياني باستخدام QuickChart API مع تحسينات بصرية وخلفية بيضاء
const chartConfig = {
    type: 'bar',
    data: {
        labels: ['مقبولة', 'مرفوضة', 'معلقة', 'يومية'],
        datasets: [{
            label: 'عدد التقارير',
            data: [acceptedReports, rejectedReports, pendingReports, dailyReports],
            backgroundColor: [
                'rgba(75, 192, 192, 0.8)', // أخضر فاتح
                'rgba(255, 99, 132, 0.8)',  // أحمر
                'rgba(255, 206, 86, 0.8)',  // أصفر
                'rgba(54, 162, 235, 0.8)'   // أزرق
            ],
            borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(54, 162, 235, 1)'
            ],
            borderWidth: 1,
            borderRadius: 8, // حواف دائرية للبارز
            hoverBackgroundColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(54, 162, 235, 1)'
            ]
        }]
    },
    options: {
        responsive: true,
        animation: {
            duration: 1500,
            easing: 'easeInOutQuart'
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
            },
            datalabels: {
                display: true,
                color: '#000000',
                anchor: 'end',
                align: 'top',
                font: { size: 14, weight: 'bold' },
                formatter: (value) => `${value}`
            }
        }
    }
};

// استخدام نقطة النهاية POST للحصول على رابط مختصر
const quickChartResponse = await fetch('https://quickchart.io/chart/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        chart: chartConfig,
        backgroundColor: '#ffffff', // خلفية بيضاء
        width: 500,
        height: 300,
        format: 'png'
    })
});

const quickChartData = await quickChartResponse.json();
const chartUrl = quickChartData.url;

// إنشاء Embed بتفاصيل أكثر وديناميكية
const detailedEmbed = new MessageEmbed()
    .setColor('#2F3136')
    .setTitle('📊 تحليل متقدم للتقارير')
    .addFields(
        { name: 'إجمالي التقارير', value: `\`${totalReports.toLocaleString()}\` تقرير`, inline: true },
        { name: '✅ التقارير المقبولة', value: `\`${acceptedReports.toLocaleString()}\``, inline: true },
        { name: '⛔ التقارير المرفوضة', value: `\`${rejectedReports.toLocaleString()}\``, inline: true },
        { name: '🔄 التقارير المعلقة', value: `\`${pendingReports.toLocaleString()}\``, inline: true },
        { name: '📅 التقارير اليومية', value: `\`${dailyReports.toLocaleString()}\``, inline: true },
        { name: '🏆 نسبة النجاح', value: createProgressBar(successRate), inline: false },
        { name: '📉 نسبة الرفض', value: createProgressBar(rejectionRate), inline: false }
    )
    .setImage(chartUrl); // الرابط المختصر للرسم البياني

await btnInteraction.followUp({ embeds: [detailedEmbed], ephemeral: true });

}

            });
        } catch (error) {
            console.error('حدث خطأ:', error);
            message.reply({ 
                content: '❌ تعذر تحميل البيانات! الرجاء المحاولة لاحقاً.', 
                ephemeral: true 
            });
        }
    }
};