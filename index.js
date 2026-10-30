import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

const app = express();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY});

const GEMINI_MODEL = "gemini-3.1-flash-lite";

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


app.post("/api/chat", async (req, res) => {
    const {conversation} = req.body;
    try {
        if(!Array.isArray(conversation)) throw new Error("Message must be array!");
        const contents = conversation.map(({role, text}) => ({
            role,
            parts: [{text}],
        }))
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                temperature: 0.9,
                systemInstruction: "Jawab hanya dengan bahasa indonesia"
            }
        })
        res.status(200).json({result: response.text});
    } catch (e) {
        res.status(500).json({error: e.message});
    }
})

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on: http://localhost:${PORT}`));