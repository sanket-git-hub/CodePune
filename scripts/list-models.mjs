import { config } from "dotenv";
config({ path: "C:/Users/Sanket/Desktop/HackPune/baton/.env.local" });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  const models = data.models?.filter(m => m.supportedGenerationMethods?.includes("generateContent")).map(m => m.name.replace("models/", ""));
  console.log("Supported generateContent models:", models);
}

listModels();
