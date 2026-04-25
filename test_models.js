const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Attempting to generate a simple response with gemini-1.5-flash...");
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-1.5-flash!");
  } catch (err) {
    console.error("Error with gemini-1.5-flash:", err.message);
    
    try {
        const modelPro = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        console.log("Attempting with gemini-1.5-pro...");
        await modelPro.generateContent("Hello");
        console.log("Success with gemini-1.5-pro!");
    } catch (err2) {
        console.error("Error with gemini-1.5-pro:", err2.message);
    }
  }
}

listModels();
