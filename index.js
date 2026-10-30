import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import path from "path";

const app = express();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-3.1-flash-lite";

app.use(cors());
app.use(express.json());

// Tetap pertahankan ini untuk pengujian di lokal
app.use(express.static("public"));

// (Opsional) Fallback jika diakses via route root di Express lokal
app.get("/", (req, res) => {
    res.sendFile(path.resolve("public", "index.html"));
});

app.post("/api/chat", async (req, res) => {
    const { conversation } = req.body;

    try {
        if (!Array.isArray(conversation)) {
            return res.status(400).json({ error: "Conversation must be an array!" });
        }

        const contents = conversation.map(({ role, text }) => ({
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

        res.status(200).json({ result: response.text });
    } catch (e) {
        console.error("Gemini API Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Export app agar bisa dibaca oleh Vercel Serverless Function
export default app;

// Jalankan app.listen hanya saat di lingkungan lokal
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on: http://localhost:${PORT}`));
}