const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

async function analyzeImage(imagePath, prompt) {
    const imageBuffer = fs.readFileSync(imagePath);
    const result = await model.generateContent([
        prompt || "صف هذه الصورة بالتفصيل",
        { inlineData: { data: imageBuffer.toString('base64'), mimeType: "image/jpeg" } }
    ]);
    console.log(await result.response.text());
}

// ضع مسار أي صورة على جهازك
analyzeImage("C:\\Users\\USER\\Desktop\\تصميم ماري جاهز\\test.jpg", "ماذا ترى في هذه الصورة؟");