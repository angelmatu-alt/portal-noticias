export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, cats } = req.body;
  if (!topic || !cats) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `Eres un periodista. Basándote en tu conocimiento, genera noticias recientes y realistas sobre: ${topic}.
Responde ÚNICAMENTE con JSON puro, sin markdown, sin explicaciones:
{"headlines":[{"titulo":"","fuente":"","descripcion":"","categoria":"","emoji":"","tiempo":""}],"ticker":["","","","",""]}
- Exactamente 6 noticias. categoria: una de ${cats}. emoji relevante. tiempo: "hace X horas". descripcion: 2 oraciones.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'Gemini error', status: response.status, detail: data });
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Sin JSON', raw: raw.substring(0, 300) });

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
