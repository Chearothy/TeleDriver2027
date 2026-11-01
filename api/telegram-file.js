// Vercel Node.js Function: secure same-origin Telegram media proxy.
// Set TELEGRAM_BOT_TOKEN in Vercel Project -> Settings -> Environment Variables.
export const config = { api: { bodyParser: false }, maxDuration: 60 };

function safeFilename(value = 'file') {
  return String(value).replace(/[\\/\r\n";]/g, '_').slice(0, 180) || 'file';
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD'); return res.status(405).end('Method not allowed');
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const fileId = typeof req.query.file_id === 'string' ? req.query.file_id : '';
  if (!token) return res.status(500).end('Missing TELEGRAM_BOT_TOKEN environment variable');
  if (!fileId || fileId.length > 2048) return res.status(400).end('Missing or invalid file_id');

  try {
    const metaResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const meta = await metaResponse.json();
    if (!metaResponse.ok || !meta.ok || !meta.result?.file_path) {
      return res.status(404).end(meta.description || 'Telegram getFile failed');
    }
    const telegramUrl = `https://api.telegram.org/file/bot${token}/${meta.result.file_path}`;
    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;
    const upstream = await fetch(telegramUrl, { method: req.method, headers });
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).end(`Telegram file request failed (${upstream.status})`);
    }

    const requestedType = typeof req.query.type === 'string' ? req.query.type : '';
    const filename = safeFilename(typeof req.query.name === 'string' ? req.query.name : 'telegram-file');
    const contentType = upstream.headers.get('content-type') || requestedType || 'application/octet-stream';
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
    for (const h of ['content-length', 'content-range', 'last-modified', 'etag']) {
      const v = upstream.headers.get(h); if (v) res.setHeader(h, v);
    }
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (req.method === 'HEAD' || !upstream.body) return res.end();

    // Stream in chunks; do not buffer media into memory or return a base64 payload.
    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(Buffer.from(value))) await new Promise(resolve => res.once('drain', resolve));
      }
      res.end();
    } catch (err) {
      try { await reader.cancel(); } catch {}
      if (!res.headersSent) res.status(502);
      res.end();
    }
  } catch (error) {
    if (!res.headersSent) res.status(502);
    res.end('Media proxy error');
  }
}
