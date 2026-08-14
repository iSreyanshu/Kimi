require("dotenv").config();

const express = require("express");
const { chat } = require("./kimi");

const app = express();

app.use(express.json({ limit: "1mb" }));

// Simple authentication for your proxy
function auth(req, res, next) {
  const secret = req.headers["x-proxy-key"];

  if (!secret || secret !== process.env.PROXY_SECRET) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  next();
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.post("/v1/chat/completions", auth, async (req, res) => {
  try {
    const {
      messages,
      model,
      temperature,
      max_tokens
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "messages must be a non-empty array"
      });
    }

    const result = await chat(messages, {
      model,
      temperature,
      max_tokens
    });

    res.json(result);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Kimi proxy running on port ${PORT}`);
});
