const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Nur POST erlaubt."
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY fehlt in Vercel."
      });
    }

    const { message, history, image } = req.body || {};

    if ((!message || !message.trim()) && !image) {
      return res.status(400).json({
        error: "Keine Nachricht erhalten."
      });
    }

    const contents = [];

if (image && image.data && image.mimeType) {
  contents.push({
    role: "user",
    parts: [
      { text: message || "Analysiere dieses Bild." },
      {
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      }
    ]
  });
} else {
  contents.push({
    role: "user",
    parts: [
      { text: message }
    ]
  });
}
      {
        text: message || "Analysiere dieses Bild."
      }
    ];

    if (image && image.data && image.mimeType) {
      userParts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    }

    contents.push({
      role: "user",
      parts: userParts
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  "Du bist mgeexAI, ein hilfreicher, moderner und klarer KI-Assistent. Antworte vollständig, verständlich und strukturiert. Wenn ein Bild gesendet wird, analysiere es genau und hilfreich."
              }
            ]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 4096
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          data?.error?.status ||
          "Fehler bei Gemini."
      });
    }

    const candidate = data?.candidates?.[0];

    const reply =
      candidate?.content?.parts?.map((part) => part.text || "").join("") || "";

    if (!reply.trim()) {
      return res.status(500).json({
        error: "Gemini hat keine vollständige Antwort zurückgegeben."
      });
    }

    return res.status(200).json({
      reply: reply.trim(),
      finishReason: candidate?.finishReason || null
    });
  } catch (error) {
    console.error("API Fehler:", error);

    return res.status(500).json({
      error: "Serverfehler bei der KI-Anfrage."
    });
  }
};
