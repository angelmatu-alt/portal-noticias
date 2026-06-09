export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, cats } = req.body;
  if (!topic || !cats) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const prompt = `Busca en internet y encuentra ${topic} (noticias del día de hoy).
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin bloques de código markdown, sin explicaciones. Solo el JSON puro.
Estructura exacta requerida:
{"headlines":[{"titulo":"","fuente":"","descripcion":"","categoria":"","emoji":"","tiempo":""}],"ticker":["","","","",""]}
Reglas estrictas:
- Exactamente 6 noticias recientes y reales de hoy
- categoria debe ser una de: ${cats}
- emoji debe ser un emoji relevante al tema de la noticia
- tiempo debe ser como "hace 2 horas" o "hace 30 min"
- descripcion debe tener 2-3 oraciones con contexto real
- ticker debe tener 5 titulares cortos (máximo 10 palabras cada uno)
- NO inventes noticias, usa solo información real y reciente`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1500
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'Error en Gemini API', detail: data });
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Sin datos JSON', raw });

    const parsed = JSON.parse(match[0]);
    if (!parsed.headlines?.length) return res.status(500).json({ error: 'Sin noticias' });

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
