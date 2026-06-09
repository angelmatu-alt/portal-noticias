export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { section } = req.body;
  if (!section) return res.status(400).json({ error: 'Faltan parámetros' });

  const apiKey = process.env.NEWS_API_KEY;

  const configs = {
    hn:     { q: 'Honduras' },
    world:  { q: 'internacional OR geopolítica OR guerra OR diplomacia' },
    sports: { q: 'fútbol OR deportes OR FIFA OR NBA OR Champions' },
    ent:    { q: 'farándula OR celebridades OR cine OR música OR Netflix' },
    social: { q: 'viral OR polémica OR influencer OR redes sociales OR TikTok' }
  };

  const cfg = configs[section] || configs.world;
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(cfg.q)}&language=es&sortBy=publishedAt&pageSize=9&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'ok') {
      return res.status(500).json({ error: data.message });
    }

    const catMap = { hn:'Honduras', world:'Internacional', sports:'Deportes', ent:'Farándula', social:'Viral' };
    const emojiMap = { hn:'🇭🇳', world:'🌍', sports:'⚽', ent:'🎬', social:'🔥' };

    const headlines = (data.articles || []).slice(0, 7).map(a => {
      const diff = Math.floor((Date.now() - new Date(a.publishedAt).getTime()) / 60000);
      const tiempo = diff < 60 ? `hace ${diff} min` : `hace ${Math.floor(diff/60)}h`;

      // Limpiar descripción de HTML
      const rawDesc = a.description || a.content || '';
      const cleanDesc = rawDesc.replace(/<[^>]*>/g, '').replace(/\[.*?\]/g, '').trim();

      return {
        titulo: (a.title || 'Sin título').split(' - ')[0].split(' | ')[0],
        fuente: a.source?.name || 'Redacción',
        descripcion: cleanDesc.substring(0, 200) || 'Leer nota completa.',
        categoria: catMap[section] || 'Noticia',
        emoji: emojiMap[section] || '📰',
        tiempo,
        url: a.url || '',
        urlToImage: a.urlToImage || ''
      };
    });

    const ticker = headlines.slice(0, 5).map(h => h.titulo.substring(0, 70));
    return res.status(200).json({ headlines, ticker });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
