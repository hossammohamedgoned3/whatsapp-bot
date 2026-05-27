// استيراد المكتبات
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
console.log("🔧 بدء تشغيل البوت...");
console.log("🚀 جاري تهيئة المتصفح...");
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// تهيئة الذكاء الاصطناعي من جوجل (مجاني)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
// تهيئة بوت واتساب مع حفظ الجلسة
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    }
});

// ظهور رمز QR لربط البوت بحساب واتساب
client.on('qr', qr => {
    console.log('🔐 امسح رمز QR التالي بهاتفك:');
    qrcode.generate(qr, { small: true });
});

// عند اتصال البوت بنجاح
client.on('ready', () => {
    console.log('✅ البوت يعمل الآن! جميع الرسائل سترد تلقائياً.');
});

// استقبال الرسائل
client.on('message', async message => {
    // تجاهل الرسائل القادمة من البوت نفسه
    if (message.fromMe) return;

    // أمر بسيط لطرد عضو في المجموعة (مثال)
    if (message.body.startsWith('!kick')) {
        if (!message.hasMedia) {
            const chat = await message.getChat();
            if (chat.isGroup) {
                const mentioned = await message.getMentions();
                if (mentioned.length > 0) {
                    await chat.removeParticipants([mentioned[0].id._serialized]);
                    return message.reply(`✅ تم طرد ${mentioned[0].pushname}`);
                }
            }
        }
        return message.reply('⚠️ استخدم: !kick @الشخص');
    }

    // الرد الذكي عبر Gemini (مجاني)
    try {
        const result = await model.generateContent(message.body);
        const response = await result.response;
        const text = response.text();
        await message.reply(text.substring(0, 1000)); // أقصى 1000 حرف
    } catch (error) {
        console.error(error);
        await message.reply('❌ حدث خطأ، حاول مرة أخرى.');
    }
});

// بدء البوت
client.initialize();
console.log("📱 تم إرسال أمر التهيئة، انتظر رمز QR...");

