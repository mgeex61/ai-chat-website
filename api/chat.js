export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode nicht erlaubt." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY fehlt in Vercel." });
  }

  const { message, history = [] } = req.body || {};

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Nachricht fehlt." });
  }

  try {
    const systemInstruction = {
      role: "user",
      parts: [
        {
          text: "Du bist ein hilfreicher, moderner KI-Assistent. Antworte klar, freundlich und auf Deutsch."
        }
      ]
    };

    const contents = [
      systemInstruction,
      ...history.map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content }]
      }))
    ];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return res.status(response.status).json({
        error: "Fehler bei Gemini."
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n").trim() ||
      "Keine Antwort erhalten.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Interner Serverfehler." });
  }
}