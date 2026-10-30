import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

const app = express();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Gunakan nama model stabil/resmi Gemini API
const GEMINI_MODEL = "gemini-3.1-flash-lite";

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// System instruction yang dioptimalkan untuk kerapihan, efisiensi, dan fitur edukasi
const SYSTEM_INSTRUCTION = `
Kamu adalah asisten AI yang responsif, cerdas, dan edukatif.
Aturan utama jawabanmu:
1. Bahasa: Selalu menjawab dalam Bahasa Indonesia.
2. Format: Gunakan format Markdown yang rapi (bold, bullet points, numbered lists, dan code blocks dengan syntax highlighting jika menyajikan kode).
3. Gaya Respon: Inti jawaban disampaikan secara terstruktur, langsung ke poin utama, efisien, dan mudah dipahami tanpa basa-basi yang tidak perlu.
4. Fitur Edukasi (Ilmu Pengetahuan & Coding Dasar):
   - Jika pengguna meminta kuis, soal latihan, atau pertanyaan edukasi (baik ilmu pengetahuan umum maupun coding dasar seperti HTML, CSS, JavaScript, Logic/Algorithms), berikan pertanyaan secara interaktif dan bertahap.
   - Sajikan soal dengan format ringkas, sertai pilihan ganda atau pertanyaan singkat, lalu tunggu jawaban pengguna sebelum memberikan kunci jawaban/penjelasan.
   - Sertakan contoh potongan kode yang bersih dan terjelaskan jika membahas materi coding.
`;

app.post("/api/chat", async (req, res) => {
    const { conversation } = req.body;

    try {
        if (!Array.isArray(conversation)) {
            return res.status(400).json({ error: "Conversation must be an array!" });
        }

        // Format riwayat percakapan & normalisasi role
        const contents = conversation.map(({ role, text }) => ({
            role: role === "bot" ? "model" : role,
            parts: [{ text }],
        }));

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.7, // Diubah ke 0.7 agar respon lebih konsisten & terstruktur
                systemInstruction: SYSTEM_INSTRUCTION,
            },
        });

        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error("Gemini API Error:", e);
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on: http://localhost:${PORT}`));