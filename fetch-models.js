const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // الطريقة الصحيحة للحصول على النماذج هي عبر REST API
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("النماذج المتاحة:");
        data.models.forEach(model => {
            console.log(`- ${model.name} (supportedMethods: ${model.supportedGenerationMethods.join(', ')})`);
        });
    } catch (error) {
        console.error("فشل جلب النماذج:", error);
    }
}

listModels();