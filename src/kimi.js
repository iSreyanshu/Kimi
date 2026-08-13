const BASE_URL = process.env.KIMI_BASE_URL;
const API_KEY = process.env.KIMI_API_KEY;

async function chat(messages, options = {}) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: options.model || "kimi-k2",
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens || 2048,
      stream: false
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      `Kimi API error: ${response.status}`
    );
  }

  return data;
}

module.exports = { chat };
