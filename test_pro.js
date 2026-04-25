const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testPro() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("Attempting with gemini-pro...");
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-pro!");
  } catch (err) {
    console.error("Error with gemini-pro:", err.message);
  }
}

testPro();
