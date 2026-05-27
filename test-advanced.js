const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" }); // للصور

// اختبار الرد النصي
async function testText() {
    const result = await textModel.generateContent("ما هي أفضل ميزة في بوت واتساب؟");
    console.log("رد النص:", await result.response.text());
}

// اختبار تحليل صورة محلية
async function testImageAnalysis(imagePath) {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    const result = await visionModel.generateContent([
        "صف هذه الصورة بالتفصيل",
        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
    ]);
    console.log("وصف الصورة:", await result.response.text());
}

// اختبار الأمر !تصميم (إرسال صورة عشوائية من مجلد)
function testRandomImage() {
    const folder = "C:\\Users\\USER\\Desktop\\تصميم ماري جاهز";
    if (!fs.existsSync(folder)) return console.log("المجلد غير موجود");
    const files = fs.readdirSync(folder).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
    if (files.length === 0) return console.log("لا توجد صور في المجلد");
    const randomFile = files[Math.floor(Math.random() * files.length)];
    console.log(`سيتم إرسال الصورة: ${randomFile} (محاكاة)`);
}

(async () => {
    await testText();
    // testImageAnalysis("C:\\path\\to\\test.jpg"); // جرب مع صورة حقيقية
    testRandomImage();
})();