// whatsapp-bot.js - نسخة معدلة للنشر على السحابة (Railway, Render, إلخ)
const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mime = require('mime-types');
require('dotenv').config();

// معالجة الرفض غير المعالج
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ خطأ غير معالج:', reason);
});

// التحقق من وجود مفتاح Gemini
if (!process.env.GEMINI_API_KEY) {
    console.error('❌ مفتاح GEMINI_API_KEY غير موجود في متغيرات البيئة');
    process.exit(1);
}

// إعدادات Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

// ذاكرة المحادثة لكل مستخدم (تخزين آخر 10 تفاعلات)
const userMemory = new Map();

// قوائم داخلية للأوامر السريعة
const jokes = [
    "لماذا لا يتحدث الكمبيوتر مع الهاتف؟ لأنه ليس لديه جرس!",
    "ماذا قال الحاسوب للمبرمج؟ أنت تجعلني أعمل بجد! 🤖",
    "ما الفرق بين المبرمج والحبيب؟ الحبيب يخليك تتعب، والمبرمج يخلي الكومبيوتر يتعب 😂"
];
const facts = [
    "الفراشة تتذوق الطعام بأرجلها.",
    "قلب الروبيان في رأسه.",
    "الكنغر لا يستطيع المشي للخلف."
];

// مجلد الصور - في السحابة يمكنك استخدام متغير بيئة أو مسار نسبي
// سنستخدم مجلد "images" داخل المشروع (أنشئه إن أردت)، أو تركه فارغاً مع رسالة مناسبة
const imagesFolder = process.env.IMAGES_FOLDER || path.join(__dirname, 'images');
if (!fs.existsSync(imagesFolder)) {
    fs.mkdirSync(imagesFolder, { recursive: true });
    console.log(`📁 مجلد الصور تم إنشاؤه: ${imagesFolder} (يمكنك إضافة صورك هنا)`);
}

// تهيئة بوت واتساب - بدون executablePath (للاستخدام في السحابة)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,   // في السحابة لا توجد واجهة رسومية
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ],
        timeout: 120000,
        protocolTimeout: 180000
    }
});

// عرض رمز QR في سجلات الطرفية (بدون ملف HTML ولا exec)
client.on('qr', (qr) => {
    console.log('📱 امسح رمز QR التالي باستخدام هاتفك:');
    console.log(qr);
    // إنشاء رابط سهل للمسح عبر quickchart.io
    const qrLink = `https://quickchart.io/qr?text=${encodeURIComponent(qr)}&size=300`;
    console.log(`أو افتح هذا الرابط لعرض رمز QR: ${qrLink}`);
});

// عند الاتصال بنجاح
client.on('ready', () => {
    console.log('✅ البوت يعمل الآن! جميع الميزات مفعلة.');
});

// إعادة تشغيل البوت تلقائيًا عند خطأ auth timeout
client.on('auth_failure', (msg) => {
    console.error('❌ فشل المصادقة:', msg);
    console.log('🔄 جاري إعادة تشغيل البوت...');
    client.destroy();
    setTimeout(() => client.initialize(), 5000);
});

// دالة للحصول على سياق المحادثة
function getContext(userId, newUserMessage) {
    if (!userMemory.has(userId)) {
        userMemory.set(userId, []);
    }
    let history = userMemory.get(userId);
    history.push({ role: "user", content: newUserMessage });
    if (history.length > 10) history.shift();
    let contextText = "";
    for (let msg of history) {
        contextText += `${msg.role === "user" ? "المستخدم" : "البوت"}: ${msg.content}\n`;
    }
    userMemory.set(userId, history);
    return contextText;
}

function saveBotReply(userId, reply) {
    let history = userMemory.get(userId) || [];
    history.push({ role: "bot", content: reply });
    if (history.length > 10) history.shift();
    userMemory.set(userId, history);
}

// دالة لتحليل الصورة المرسلة (تقبل buffer مباشرة)
async function analyzeImageBuffer(imageBuffer, mimeType, userQuestion) {
    try {
        const base64 = imageBuffer.toString('base64');
        const prompt = userQuestion ? `أنظر إلى هذه الصورة وأجب على السؤال: ${userQuestion}` : "صف هذه الصورة بالتفصيل";
        const result = await visionModel.generateContent([
            prompt,
            { inlineData: { mimeType: mimeType, data: base64 } }
        ]);
        return await result.response.text();
    } catch (error) {
        console.error("خطأ في تحليل الصورة:", error);
        return "آسف، لم أتمكن من تحليل الصورة. تأكد من أنها واضحة وأعد المحاولة.";
    }
}

// دالة لإرسال صورة عشوائية من مجلد الصور (يعمل في السحابة)
function sendRandomImage(chat, commandArg) {
    if (!fs.existsSync(imagesFolder)) {
        return chat.sendMessage("⚠️ مجلد الصور غير موجود.");
    }
    const files = fs.readdirSync(imagesFolder).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    if (files.length === 0) return chat.sendMessage("📂 لا توجد صور في المجلد.");

    let selectedFile;
    if (commandArg && !isNaN(commandArg)) {
        const index = parseInt(commandArg) - 1;
        if (index >= 0 && index < files.length) selectedFile = files[index];
        else return chat.sendMessage(`⚠️ الرقم غير صالح. يوجد ${files.length} صورة.`);
    } else {
        selectedFile = files[Math.floor(Math.random() * files.length)];
    }
    const imagePath = path.join(imagesFolder, selectedFile);
    chat.sendMessage({ media: fs.readFileSync(imagePath), caption: `📸 ${selectedFile}` });
}

// معالجة الرسائل الواردة
client.on('message', async message => {
    if (message.fromMe) return;
    const userId = message.from;
    const msgBody = message.body.trim();
    const chat = await message.getChat();

    // الأوامر السريعة
    if (msgBody.startsWith('!')) {
        const parts = msgBody.split(' ');
        const command = parts[0].toLowerCase();
        const arg = parts[1];

        switch (command) {
            case '!نكتة':
                return message.reply(jokes[Math.floor(Math.random() * jokes.length)]);
            case '!حقيقة':
                return message.reply(facts[Math.floor(Math.random() * facts.length)]);
            case '!وقت':
                return message.reply(`🕒 الساعة الآن: ${new Date().toLocaleTimeString('ar-EG')}`);
            case '!تاريخ':
                return message.reply(`📅 اليوم: ${new Date().toLocaleDateString('ar-EG')}`);
            case '!لعبة':
                return message.reply(`🎮 البوت اختار: ${['حجر', 'ورق', 'مقص'][Math.floor(Math.random()*3)]}. العب أنت الآن! (اكتب حجر، ورق، أو مقص)`);
            case '!تصميم':
                return sendRandomImage(chat, arg);
            case '!تذكير':
                if (!arg) return message.reply("⚠️ استخدم: !تذكير [عدد] [دقيقة/ساعة] [الرسالة]");
                const duration = parseInt(arg);
                if (isNaN(duration)) return message.reply("⚠️ الرقم غير صحيح.");
                const unit = parts[2]?.toLowerCase() || 'دقيقة';
                const reminderText = parts.slice(3).join(' ') || "تذكير دون نص";
                let ms = duration * (unit.includes('ساعة') ? 3600000 : 60000);
                setTimeout(() => message.reply(`⏰ تذكير: ${reminderText}`), ms);
                return message.reply(`✅ سيتم تذكيرك بعد ${duration} ${unit}`);
            case '!kick':
                if (!chat.isGroup) return message.reply("⚠️ هذا الأمر للمجموعات فقط.");
                const mentioned = await message.getMentions();
                if (mentioned.length === 0) return message.reply("⚠️ استخدم: !kick @الشخص");
                await chat.removeParticipants([mentioned[0].id._serialized]);
                return message.reply(`🚪 تم طرد ${mentioned[0].pushname}`);
            default:
                // أمر غير معروف - يمكن الرد أو تجاهله
                break;
        }
    }

    // معالجة الصور المرسلة (بدون أمر)
    if (message.hasMedia) {
        try {
            const media = await message.downloadMedia();
            if (media && media.mimetype.startsWith('image/')) {
                const imageBuffer = Buffer.from(media.data, 'base64');
                const analysis = await analyzeImageBuffer(imageBuffer, media.mimetype, msgBody || "ماذا ترى في هذه الصورة؟");
                await message.reply(`🖼️ تحليل الصورة:\n${analysis}`);
                saveBotReply(userId, analysis);
                return;
            }
        } catch (err) {
            console.error("خطأ في معالجة الصورة:", err);
            await message.reply("❌ حدث خطأ أثناء معالجة الصورة.");
            return;
        }
    }

    // الرد الذكي على الرسائل النصية
    try {
        const context = getContext(userId, msgBody);
        const prompt = `أنت مساعد واتساب ودود. إليك تاريخ المحادثة مع المستخدم:\n${context}\nالرد الآن على آخر رسالة: ${msgBody}\nأجب بلغة المستخدم (عربية أو إنجليزية) وباختصار ولطف.`;
        const result = await textModel.generateContent(prompt);
        const reply = result.response.text();
        await message.reply(reply);
        saveBotReply(userId, reply);
    } catch (error) {
        console.error("فشل Gemini، استخدام الرد الاحتياطي:", error);
        const fallbacks = [
            "عذراً، التقنية تتعطل أحياناً 😅 أعد المحاولة؟",
            "يبدو أن الروح العالية تشوش علي! 🤖 جرب مرة أخرى",
            "حدث خطأ مؤقت، لكني هنا لأخدمك 💪",
            "أنا أتعلم منك، ربما أجب لاحقاً بشكل أفضل 😊"
        ];
        const fallbackReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        await message.reply(fallbackReply);
        saveBotReply(userId, fallbackReply);
    }
});

// بدء البوت
client.initialize();