import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-3.1-flash-lite";

const SYSTEM_INSTRUCTION = `
Kamu adalah asisten AI dan teman belajar yang cerdas, santai, serta edukatif.

Aturan Utama Penyampaian:
1. Bahasa: Gunakan Bahasa Indonesia yang natural, ramah, dan manusiawi.
2. Gaya Penjelasan Edukatif:
   - Jelaskan konsep (ilmu pengetahuan maupun coding dasar seperti HTML, CSS, JS, dan logika) dengan gaya mengalir, intuitif, dan tidak kaku.
   - Gunakan analogi sederhana jika menjelaskan konsep yang rumit.
   - Hindari penggunaan simbol, dekorasi, atau emoji berlebihan yang membuat teks terasa ramai/berisik.
3. Format Markdown yang Clean:
   - Gunakan format bold (teks tebal), bullet point, atau numbered list secara efisien hanya untuk memperjelas poin.
   - Untuk contoh kode, selalu sertakan code block yang bersih beserta penjelasan singkat per baris atau per bagian yang penting.
4. Mode Kuis / Soal Latihan (Reaktif):
   - JANGAN memberikan soal, kuis, atau latihan secara spontan/langsung jika pengguna tidak memintanya.
   - Jika pengguna secara eksplisit meminta kuis, tes, atau latihan soal, berikan 1 atau 2 soal terlebih dahulu, lalu tunggu jawaban pengguna sebelum memberikan pembahasan.
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { conversation, conservation } = req.body || {};
  const chatList = conversation || conservation;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY belum dikonfigurasi di Environment Variables!");
    }

    if (!Array.isArray(chatList)) {
      return res.status(400).json({ error: "Conversation must be an array!" });
    }

    const contents = chatList.map(({ role, text }) => ({
      role: role === "bot" ? "model" : role,
      parts: [{ text }],
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.6,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return res.status(200).json({ result: response.text });
  } catch (e) {
    console.error("Gemini API Error:", e);
    return res.status(500).json({ error: e.message || "Internal Server Error" });
  }
}

