#!/usr/bin/env node

const readline = require("readline");

const API_URL =
  process.env.KIMI_PROXY_URL || "http://localhost:3000";

const PROXY_KEY =
  process.env.KIMI_PROXY_KEY || "change-this-secret";

async function ask(message) {
  const response = await fetch(
    `${API_URL}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-key": PROXY_KEY
      },
      body: JSON.stringify({
        model: "kimi-k2",
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data.choices?.[0]?.message?.content || "";
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "kimi> "
});

console.log("Kimi CLI");
console.log("Type /exit to quit.\n");

rl.prompt();

rl.on("line", async (line) => {
  const input = line.trim();

  if (!input) {
    rl.prompt();
    return;
  }

  if (input === "/exit") {
    rl.close();
    return;
  }

  try {
    const answer = await ask(input);

    console.log(`\n${answer}\n`);
  } catch (err) {
    console.error(`\nError: ${err.message}\n`);
  }

  rl.prompt();
});
