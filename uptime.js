const axios = require('axios');
const express = require('express');
 
const app = express();
app.use(express.json());
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { 
  console.log(`Secure API is running on port ${PORT}`); 
});
app.get('/', (req, res) => {
  res.send('Hello World');
});

const links = [
  'https://boundless-round-list.glitch.me/',
  'https://boundless-round-list.glitch.me/',
  'http://boundless-round-list.glitch.me/',
  'http://boundless-round-list.glitch.me/',
  'http://boundless-round-list.glitch.me/',
  'https://boundless-round-list.glitch.me/',
  'http://boundless-round-list.glitch.me/',
  'https://boundless-round-list.glitch.me/',
  'https://boundless-round-list.glitch.me/'
];

const checkUptime = async () => {
  try {
    // إرسال طلب GET للتحقق من حالة الرابط
    await Promise.all(links.map(async (link) => {
      const response = await axios.get(link);  // يمكن استخدام GET للتحقق فقط
    }));
  } catch (error) { 
    console.error('حدث خطأ في الاتصال بأحد الروابط:', error.message);
  }
};

// إرسال الطلبات لكل الروابط كل 15 ثانية للتحقق من الـ Uptime
setInterval(checkUptime, 15000);  // التحقق كل 15 ثانية
      const cmd = require("node-cmd"); 

function refresh() { 
cmd.run("rm -rf .git"); 
}  
setInterval(refresh, 60000); 