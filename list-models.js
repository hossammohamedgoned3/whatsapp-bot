const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const models = await genAI.listModels();
        console.log("النماذج المتاحة لديك:");
        models.forEach(model => console.log(model.name));
    } catch (error) {
        console.error("خطأ في جلب النماذج:", error);
    }
}

listModels();