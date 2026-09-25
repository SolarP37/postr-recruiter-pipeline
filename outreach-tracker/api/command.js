// Grok Bot control box: forwards a free-text command to the Grok Bot webhook.
// Node serverless function, no dependencies. Env: GROKBOT_WEBHOOK_URL, GROKBOT_WEBHOOK_KEY,
// optional GROKBOT_KEY_HEADER (header name for the raw key; default X-Webhook-Key).
const MAX_LEN = 1000;

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    const text = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
    return text ? JSON.parse(text) : {};
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error('body too large');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method not allowed' });
  }

  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    return send(res, 400, { error: 'invalid JSON body' });
  }
  const command = body && typeof body.command === 'string' ? body.command.trim() : '';
  if (!command) return send(res, 400, { error: 'command is required' });
  if (command.length > MAX_LEN) return send(res, 400, { error: `command must be ${MAX_LEN} characters or fewer` });

  const url = (process.env.GROKBOT_WEBHOOK_URL || '').trim();
  const key = (process.env.GROKBOT_WEBHOOK_KEY || '').trim();
  if (!url || !key) return send(res, 503, { error: 'control box not configured' });
  const keyHeader = (process.env.GROKBOT_KEY_HEADER || '').trim() || 'X-Webhook-Key';

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  headers[keyHeader] = key;
  const payload = {
    source: 'postr-outreach-tracker',
    command,
    sent_at: new Date().toISOString(),
    user_agent: String(req.headers['user-agent'] || ''),
  };

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const upstream = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: ctrl.signal });
    clearTimeout(timer);
    const ok = upstream.status >= 200 && upstream.status < 300;
    return send(res, upstream.status, ok
      ? { ok: true, status: upstream.status }
      : { ok: false, status: upstream.status, error: `webhook returned ${upstream.status}` });
  } catch (e) {
    return send(res, 502, { ok: false, error: e && e.name === 'AbortError' ? 'webhook timed out' : 'webhook unreachable' });
  }
};
