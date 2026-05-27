const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const textModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

// اختبار النص
async function testText() {
    const result = await textModel.generateContent("أعطني نكتة بالعربية");
    console.log("نكتة:", (await result.response.text()));
}

// اختبار تحليل صورة (ضع مسار صورة حقيقية)
async function testImage(imagePath) {
    const imgData = fs.readFileSync(imagePath);
    const base64 = imgData.toString('base64');
    const result = await visionModel.generateContent([
        "صف هذه الصورة",
        { inlineData: { mimeType: "image/jpeg", data: base64 } }
    ]);
    console.log("وصف الصورة:", await result.response.text());
}

// اختبار مجلد الصور
function testImageFolder() {
    const folder = "C:\\Users\\USER\\Desktop\\تصميم ماري جاهز";
    if (!fs.existsSync(folder)) return console.log("المجلد غير موجود");
    const files = fs.readdirSync(folder).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    console.log(`عدد الصور في المجلد: ${files.length}`);
    if (files.length) console.log(`مثال: ${files[0]}`);
}

(async () => {
    await testText();
    // testImage("C:\\path\\to\\test.jpg");
    testImageFolder();
})();