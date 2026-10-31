import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-3.1-flash-lite";

// Optimasi System Instruction khusus Celeste AI
const SYSTEM_INSTRUCTION = `
Kamu adalah Celeste AI, seorang asisten belajar personal dan mentor edukasi virtual yang sangat berpengalaman, berwawasan luas, santai, dan bersahabat.

Identitas & Persona Celeste AI:
- Nama: Celeste AI.
- Peran: Teman diskusimu yang siap membantu memahami konsep pelajaran, logika coding (HTML, CSS, JS, Backend, dll.), ilmu pengetahuan, hingga metode belajar efektif.
- Kepribadian: Sabar, suportif, komunikatif, dan cerdas. Kamu menyampaikan penjelasan seperti seorang senior/mentor yang asyik diajak berdiskusi.

Aturan Utama Penyampaian:
1. Bahasa: Gunakan Bahasa Indonesia yang natural, hangat, ramah, dan manusiawi.
2. Penjelasan Edukatif & Intuitif:
   - Jelaskan konsep rumit dengan analogi dunia nyata yang sederhana dan mudah dipahami.
   - Hindari bahasa akademis yang terlalu kaku atau berbelit-belit.
   - Hindari penggunaan emoji atau dekorasi berlebihan yang mengganggu keterbacaan.
3. Format Markdown Clean:
   - Gunakan cetak tebal (bold) dan daftar poin (bullet points) seperlunya untuk memudahkan pembaca menelaah poin penting.
   - Untuk contoh kode, selalu sertakan code block yang rapi beserta penjelasan singkat per bagian pentingnya.
4. Mode Kuis / Latihan Soal (Reaktif):
   - JANGAN memberikan kuis/soal secara spontan kecuali pengguna yang memintanya secara eksplisit.
   - Jika pengguna meminta latihan soal, berikan 1-2 soal terlebih dahulu, lalu tunggu jawaban pengguna sebelum memberikan kunci pembahasan.
`;

export default async function handlerChat(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      error: "Metode HTTP tidak diizinkan. Gunakan metode POST." 
    });
  }

  const { conversation, conservation } = req.body || {};
  const rawChatList = conversation || conservation;

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Konfigurasi server bermasalah: GEMINI_API_KEY belum terpasang."
      });
    }

    if (!Array.isArray(rawChatList) || rawChatList.length === 0) {
      return res.status(400).json({ 
        error: "Format riwayat percakapan tidak valid atau masih kosong." 
      });
    }

    // 1. Batasi riwayat pesan hanya 12 pesan terakhir untuk menghemat token
    const slicedChats = rawChatList.slice(-12);

    // 2. Transformasi array percakapan & bersihkan data gambar pada pesan lama
    const contents = slicedChats.map(({ role, text, image }, index) => {
      const parts = [];
      const isLatestMessage = index === slicedChats.length - 1;

      // Masukkan teks pesan
      if (text) {
        parts.push({ text });
      }

      // Kirim gambar HANYA jika berada di pesan paling baru (pesan terakhir)
      if (isLatestMessage && image && image.data && image.mimeType) {
        parts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data, // Base64 murni tanpa prefix
          },
        });
      }

      return {
        role: role === "bot" ? "model" : role,
        parts,
      };
    });

    // 3. Panggil API Gemini dengan Google Search Grounding
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.6,
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
    });

    return res.status(200).json({ result: response.text });

  } catch (e) {
    console.error("Gemini API Exception Error:", e);

    // Penanganan Error Khusus untuk Limit / Quota Exceeded (429)
    const isRateLimit = 
      e?.status === 429 || 
      e?.message?.includes("429") || 
      e?.message?.includes("RESOURCE_EXHAUSTED") ||
      e?.message?.includes("quota");

    if (isRateLimit) {
      return res.status(429).json({
        error: "Batas kuota penggunaan Celeste AI telah tercapai untuk sementara waktu. Silakan tunggu 1-2 menit sebelum mengirim pesan kembali."
      });
    }

    // Penanganan Payload Terlalu Besar
    if (e?.message?.includes("entity too large") || e?.code === "PAYLOAD_TOO_LARGE") {
      return res.status(413).json({
        error: "Ukuran gambar atau pesan terlalu besar untuk diproses."
      });
    }

    // Response Error Umum
    return res.status(500).json({
      error: "Celeste AI sedang mengalami kendala teknis. Silakan coba beberapa saat lagi."
    });
  }
}