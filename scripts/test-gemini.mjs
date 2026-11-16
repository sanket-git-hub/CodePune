import { config } from "dotenv";
config({ path: "C:/Users/Sanket/Desktop/HackPune/baton/.env.local" });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Explain what is a software handover in 1 sentence in JSON: {\"answer\":\"...\"}" }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  console.log(`Model ${model} status:`, res.status);
  const data = await res.json();
  console.log(`Model ${model} output:`, data.candidates?.[0]?.content?.parts?.[0]?.text);
}

testGemini();
