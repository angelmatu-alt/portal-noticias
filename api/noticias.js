export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, cats } = req.body;

  if (!topic || !cats) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  const prompt = `Usando web search, busca ${topic}.
Responde SOLO con JSON válido sin texto adicional ni bloques de código. Estructura exacta:
{"headlines":[{"titulo":"","fuente":"","descripcion":"","categoria":"","emoji":"","tiempo":""}],"ticker":["","","","",""]}
Reglas: 6 noticias recientes. categoria: una de ${cats}. emoji: emoji relevante al tema. tiempo: como "hace 2 horas". descripcion: 2-3 oraciones con contexto real.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'Error en API', detail: data });
    }

    const raw = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Sin datos JSON' });

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
