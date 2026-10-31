// Optimasi System Instruction khusus Celeste AI
// const SYSTEM_INSTRUCTION = `
// Kamu adalah Celeste AI, seorang asisten belajar personal dan mentor edukasi virtual yang sangat berpengalaman, berwawasan luas, santai, dan bersahabat.

// Identitas & Persona Celeste AI:
// - Nama: Celeste AI.
// - Peran: Teman diskusimu yang siap membantu memahami konsep pelajaran, logika coding (HTML, CSS, JS, Backend, dll.), ilmu pengetahuan, hingga metode belajar efektif.
// - Kepribadian: Sabar, suportif, komunikatif, dan cerdas. Kamu menyampaikan penjelasan seperti seorang senior/mentor yang asyik diajak berdiskusi.

// Aturan Utama Penyampaian:
// 1. Bahasa: Gunakan Bahasa Indonesia yang natural, hangat, ramah, dan manusiawi.
// 2. Penjelasan Edukatif & Intuitif:
//    - Jelaskan konsep rumit dengan analogi dunia nyata yang sederhana dan mudah dipahami.
//    - Hindari bahasa akademis yang terlalu kaku atau berbelit-belit.
//    - Hindari penggunaan emoji atau dekorasi berlebihan yang mengganggu keterbacaan.
// 3. Format Markdown Clean:
//    - Gunakan cetak tebal (bold) dan daftar poin (bullet points) seperlunya untuk memudahkan pembaca menelaah poin penting.
//    - Untuk contoh kode, selalu sertakan code block yang rapi beserta penjelasan singkat per bagian pentingnya.
// 4. Mode Kuis / Latihan Soal (Reaktif):
//    - JANGAN memberikan kuis/soal secara spontan kecuali pengguna yang memintanya secara eksplisit.
//    - Jika pengguna meminta latihan soal, berikan 1-2 soal terlebih dahulu, lalu tunggu jawaban pengguna sebelum memberikan kunci pembahasan.
// `;
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-3.1-flash-lite";

// System Instruction super efisien & ringkas (menghemat puluhan token di tiap request)
const SYSTEM_INSTRUCTION = `Nama: Celeste AI, mentor belajar santai & bersahabat.
Bahasa: Indonesia natural.
Gaya: Jelaskan konsep/materi secara intuitif, ringkas, & jelas memakai analogi sederhana. Gunakan format markdown bersih (bold, bullet, codeblock).
Aturan: JANGAN berikan kuis/soal kecuali diminta eksplisit. Jika diminta, berikan 1 soal dulu.`;

export default async function handlerChat(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metode HTTP tidak diizinkan." });
  }

  const { conversation, conservation } = req.body || {};
  const rawChatList = conversation || conservation;

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "API Key belum dikonfigurasi." });
    }

    if (!Array.isArray(rawChatList) || rawChatList.length === 0) {
      return res.status(400).json({ error: "Riwayat percakapan tidak valid." });
    }

    // 1. Ambil maksimal 6 pesan terakhir (3 pasang obrolan)
    // Cukup untuk konteks aktif tanpa membuang token pesan lama
    const slicedChats = rawChatList.slice(-6);

    // 2. Transformasi array percakapan
    const contents = slicedChats.map(({ role, text, image }, index) => {
      const parts = [];
      const isLatestMessage = index === slicedChats.length - 1;

      // Pangkas spasi berlebih pada teks
      if (text && text.trim()) {
        parts.push({ text: text.trim() });
      }

      // Kirim gambar HANYA jika berada di pesan paling baru
      if (isLatestMessage && image?.data && image?.mimeType) {
        parts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        });
      }

      return {
        role: role === "bot" ? "model" : role,
        parts,
      };
    }).filter(msg => msg.parts.length > 0); // Buang pesan kosong

    // 3. Panggil API Gemini
    // Catatan: Google Search Grounding SENGAJA tidak dipasang di level global
    // karena memakan konsumsi token & quota per call yang sangat tinggi.
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

    const isRateLimit = 
      e?.status === 429 || 
      e?.message?.includes("429") || 
      e?.message?.includes("RESOURCE_EXHAUSTED") ||
      e?.message?.includes("quota");

    if (isRateLimit) {
      return res.status(429).json({
        error: "Batas kuota gratisan tercapai. Silakan tunggu 1-2 menit sebelum mengirim pesan lagi."
      });
    }

    if (e?.message?.includes("entity too large") || e?.code === "PAYLOAD_TOO_LARGE") {
      return res.status(413).json({
        error: "Ukuran file terlalu besar."
      });
    }

    return res.status(500).json({
      error: "Terjadi kendala teknis pada server. Silakan coba lagi."
    });
  }
}