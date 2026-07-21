exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-beta, anthropic-dangerous-allow-browser',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  try {
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
    if (!apiKey) {
      return {
        statusCode: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { type: 'proxy_error', message: 'Missing x-api-key header' } }),
      };
    }

    // Netlify sometimes base64-encodes the body when it contains binary-like content
    let bodyStr = event.body || '';
    if (event.isBase64Encoded) {
      bodyStr = Buffer.from(bodyStr, 'base64').toString('utf-8');
    }

    if (!bodyStr) {
      return {
        statusCode: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { type: 'proxy_error', message: 'Empty request body' } }),
      };
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': event.headers['anthropic-version'] || '2023-06-01',
        'anthropic-beta': event.headers['anthropic-beta'] || 'prompt-caching-2024-07-31',
      },
      body: bodyStr,
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: { type: 'parse_error', message: text.slice(0, 500) } }; }

    return {
      statusCode: resp.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'proxy_error', message: err.message } }),
    };
  }
};
