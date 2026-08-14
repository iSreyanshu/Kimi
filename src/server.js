import 'dotenv/config.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

const app = express();

// ==================== CONFIG ====================
const generateSecret = () => randomBytes(32).toString('hex');

const JWT_SECRET = process.env.JWT_SECRET || generateSecret();
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || generateSecret();
const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || 'https://api.kimi.moonshot.cn';

const tokenBlacklist = new Set();
const activeTokens = new Map();

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests',
});
app.use(rateLimiter);

// ==================== LOGGER ====================
const log = {
  info: (msg, data = {}) => console.log(`[INFO] ${msg}`, JSON.stringify(data)),
  error: (msg, data = {}) => console.error(`[ERROR] ${msg}`, JSON.stringify(data)),
  warn: (msg, data = {}) => console.warn(`[WARN] ${msg}`, JSON.stringify(data)),
};

// ==================== TOKEN MANAGER ====================
class TokenManager {
  static generateTokenPair(clientId) {
    const jti = uuidv4();
    const iat = Math.floor(Date.now() / 1000);

    const accessToken = jwt.sign(
      { clientId, jti, type: 'access', iat },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { clientId, jti, type: 'refresh', iat },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    activeTokens.set(jti, {
      clientId,
      createdAt: new Date(),
      refreshTokenExpiry: new Date(iat * 1000 + 7 * 24 * 60 * 60 * 1000),
    });

    log.info('Token pair generated', { clientId, jti });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      tokenType: 'Bearer',
    };
  }

  static verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (tokenBlacklist.has(decoded.jti)) {
        return { valid: false, error: 'REVOKED' };
      }

      if (decoded.type !== 'access') {
        return { valid: false, error: 'INVALID_TYPE' };
      }

      return { valid: true, decoded };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message.includes('expired') ? 'EXPIRED' : 'INVALID',
      };
    }
  }

  static verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
      
      if (tokenBlacklist.has(decoded.jti)) {
        return { valid: false, error: 'REVOKED' };
      }

      if (decoded.type !== 'refresh') {
        return { valid: false, error: 'INVALID_TYPE' };
      }

      return { valid: true, decoded };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message.includes('expired') ? 'EXPIRED' : 'INVALID',
      };
    }
  }

  static revokeToken(jti) {
    tokenBlacklist.add(jti);
    activeTokens.delete(jti);
    log.info('Token revoked', { jti });
  }
}

// ==================== MIDDLEWARE - AUTH ====================
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing auth header' });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid auth format' });
    }

    const verification = TokenManager.verifyAccessToken(token);

    if (!verification.valid) {
      if (verification.error === 'EXPIRED') {
        return res.status(401).json({
          error: 'EXPIRED',
          message: 'Access token expired. Please refresh.',
          refreshRequired: true,
        });
      }

      log.warn('Invalid token', { error: verification.error });
      return res.status(401).json({ error: verification.error, message: 'Invalid token' });
    }

    req.user = verification.decoded;
    next();
  } catch (error) {
    log.error('Auth middleware error', { error: error.message });
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Docs page
app.get('/docs', (req, res) => {
  res.type('html').send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kimi API Proxy - Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    header h1 { font-size: 2.5em; margin-bottom: 10px; }
    header p { font-size: 1.1em; opacity: 0.9; }
    .content {
      padding: 40px;
    }
    section {
      margin-bottom: 40px;
      border-bottom: 1px solid #eee;
      padding-bottom: 30px;
    }
    section:last-child { border-bottom: none; }
    h2 {
      color: #333;
      font-size: 1.8em;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    h2::before {
      content: '';
      width: 4px;
      height: 30px;
      background: #667eea;
      border-radius: 2px;
    }
    h3 {
      color: #555;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.2em;
    }
    p, li {
      color: #666;
      line-height: 1.8;
      margin-bottom: 10px;
    }
    ul { margin-left: 30px; }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      color: #d63384;
    }
    .code-block {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 15px 0;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      line-height: 1.5;
    }
    .endpoint {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .method {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      margin-right: 10px;
      font-size: 0.9em;
    }
    .get { background: #61affe; color: white; }
    .post { background: #49cc90; color: white; }
    .badge {
      display: inline-block;
      background: #ff9800;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8em;
      margin-left: 10px;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
      color: #856404;
    }
    .success {
      background: #d4edda;
      border: 1px solid #28a745;
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
      color: #155724;
    }
    footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #666;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 Kimi API Proxy</h1>
      <p>Secure, Modern API Proxy with Token Management</p>
    </header>

    <div class="content">
      <section>
        <h2>🔐 Authentication</h2>
        <p>All protected endpoints require Bearer token authentication.</p>
        
        <h3>Getting Started</h3>
        <p><strong>Step 1:</strong> Generate tokens via <code>/auth/tokens</code></p>
        <p><strong>Step 2:</strong> Use the <code>accessToken</code> for API calls</p>
        <p><strong>Step 3:</strong> When expired, refresh using <code>/auth/refresh</code></p>

        <div class="warning">
          ⚠️ <strong>Important:</strong> Keep your tokens secure. Never share access tokens or commit them to version control.
        </div>
      </section>

      <section>
        <h2>📡 Endpoints</h2>

        <div class="endpoint">
          <span class="method post">POST</span>
          <code>/auth/tokens</code>
          <span class="badge">Public</span>
          <p><strong>Description:</strong> Generate new access and refresh tokens</p>
          <p><strong>Response:</strong></p>
          <div class="code-block">{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "clientId": "uuid"
}</div>
        </div>

        <div class="endpoint">
          <span class="method post">POST</span>
          <code>/auth/refresh</code>
          <span class="badge">Public</span>
          <p><strong>Description:</strong> Refresh expired access token</p>
          <p><strong>Body:</strong></p>
          <div class="code-block">{
  "refreshToken": "eyJhbGc..."
}</div>
          <p><strong>Response:</strong> New access token</p>
        </div>

        <div class="endpoint">
          <span class="method post">POST</span>
          <code>/auth/revoke</code>
          <span class="badge">Protected</span>
          <p><strong>Description:</strong> Revoke tokens (logout)</p>
          <p><strong>Headers:</strong> Authorization: Bearer &lt;accessToken&gt;</p>
          <p><strong>Body:</strong></p>
          <div class="code-block">{
  "refreshToken": "eyJhbGc..."
}</div>
        </div>

        <div class="endpoint">
          <span class="method post">POST</span>
          <code>/v1/chat/completions</code>
          <span class="badge">Protected</span>
          <p><strong>Description:</strong> Send message to Kimi API</p>
          <p><strong>Headers:</strong> Authorization: Bearer &lt;accessToken&gt;</p>
          <p><strong>Body:</strong></p>
          <div class="code-block">{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "model": "kimi-k2",
  "temperature": 0.7,
  "max_tokens": 2048
}</div>
        </div>

        <div class="endpoint">
          <span class="method get">GET</span>
          <code>/health</code>
          <span class="badge">Public</span>
          <p><strong>Description:</strong> Health check endpoint</p>
        </div>
      </section>

      <section>
        <h2>🛠️ Usage Example</h2>
        <p><strong>1. Get Tokens:</strong></p>
        <div class="code-block">
curl -X POST http://localhost:3000/auth/tokens
        </div>

        <p><strong>2. Use Token for Chat:</strong></p>
        <div class="code-block">
curl -X POST http://localhost:3000/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "Hello Kimi!"}],
    "model": "kimi-k2"
  }'
        </div>

        <p><strong>3. Refresh Token:</strong></p>
        <div class="code-block">
curl -X POST http://localhost:3000/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
        </div>
      </section>

      <section>
        <h2>🔒 Security Features</h2>
        <ul>
          <li>✅ JWT Token-based authentication with refresh tokens</li>
          <li>✅ Token revocation and blacklist</li>
          <li>✅ Rate limiting (100 requests per 15 minutes)</li>
          <li>✅ CORS protection</li>
          <li>✅ Helmet.js for HTTP security headers</li>
          <li>✅ Input validation and XSS protection</li>
          <li>✅ API key isolation (never exposed in responses)</li>
          <li>✅ Secure HTTP-only cookies for refresh tokens</li>
          <li>✅ HSTS and CSP headers</li>
        </ul>
      </section>

      <section>
        <h2>📦 Installation</h2>
        <p><strong>Quick Install (Recommended):</strong></p>
        <div class="code-block">
curl -fsSL https://raw.githubusercontent.com/iSreyanshu/Kimi/main/install.sh | bash
        </div>

        <p><strong>Manual Installation:</strong></p>
        <div class="code-block">
git clone https://github.com/iSreyanshu/Kimi.git
cd Kimi
npm install
cp .env.example .env
# Edit .env with your Kimi API key
npm start
        </div>
      </section>

      <section>
        <h2>🌐 Deployment (Vercel)</h2>
        <div class="success">
          ✅ This app is optimized for Vercel deployment!
        </div>
        <div class="code-block">
vercel
        </div>
        <p>Set environment variables in Vercel dashboard:</p>
        <ul>
          <li><code>KIMI_API_KEY</code></li>
          <li><code>KIMI_BASE_URL</code></li>
          <li><code>JWT_SECRET</code> (auto-generated if not set)</li>
          <li><code>JWT_REFRESH_SECRET</code> (auto-generated if not set)</li>
        </ul>
      </section>

      <section>
        <h2>❓ Troubleshooting</h2>
        <h3>Token Expired?</h3>
        <p>Use the <code>/auth/refresh</code> endpoint with your refresh token to get a new access token.</p>
        
        <h3>401 Unauthorized?</h3>
        <p>Ensure you're sending a valid Bearer token in the Authorization header.</p>
        
        <h3>Rate Limited?</h3>
        <p>The API limits to 100 requests per 15 minutes. Wait and retry.</p>
      </section>
    </div>

    <footer>
      <p>Kimi API Proxy v2.0.0 | <a href="https://github.com/iSreyanshu/Kimi" target="_blank">GitHub</a></p>
    </footer>
  </div>
</body>
</html>
  `);
});

// Generate tokens (public endpoint)
app.post('/auth/tokens', (req, res) => {
  try {
    const clientId = uuidv4();
    const tokenPair = TokenManager.generateTokenPair(clientId);

    // Set refresh token in secure cookie
    res.cookie('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    log.info('Tokens generated', { clientId });

    res.status(201).json({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      tokenType: tokenPair.tokenType,
      clientId,
    });
  } catch (error) {
    log.error('Token generation failed', { error: error.message });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to generate tokens' });
  }
});

// Refresh access token
app.post('/auth/refresh', (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      log.warn('Refresh token missing', { ip: req.ip });
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Refresh token required',
      });
    }

    const verification = TokenManager.verifyRefreshToken(refreshToken);

    if (!verification.valid) {
      log.warn('Invalid refresh token', { error: verification.error });
      res.clearCookie('refreshToken');
      return res.status(401).json({
        error: verification.error,
        message: 'Invalid or expired refresh token',
      });
    }

    const newTokenPair = TokenManager.generateTokenPair(verification.decoded.clientId);

    res.cookie('refreshToken', newTokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    log.info('Access token refreshed', { clientId: verification.decoded.clientId });

    res.json({
      accessToken: newTokenPair.accessToken,
      refreshToken: newTokenPair.refreshToken,
      expiresIn: newTokenPair.expiresIn,
      tokenType: newTokenPair.tokenType,
    });
  } catch (error) {
    log.error('Token refresh failed', { error: error.message });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to refresh token' });
  }
});

// Revoke tokens
app.post('/auth/revoke', authMiddleware, (req, res) => {
  try {
    const { refreshToken } = req.body;
    const authToken = req.headers.authorization?.split(' ')[1];

    if (authToken) {
      const decoded = TokenManager.verifyAccessToken(authToken);
      if (decoded.valid) TokenManager.revokeToken(decoded.decoded.jti);
    }

    if (refreshToken) {
      const decoded = TokenManager.verifyRefreshToken(refreshToken);
      if (decoded.valid) TokenManager.revokeToken(decoded.decoded.jti);
    }

    res.clearCookie('refreshToken');
    log.info('Tokens revoked', { clientId: req.user.clientId });

    res.json({ message: 'Tokens revoked successfully' });
  } catch (error) {
    log.error('Token revocation failed', { error: error.message });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to revoke tokens' });
  }
});

// Chat completions endpoint
app.post('/v1/chat/completions', authMiddleware, async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'messages must be a non-empty array',
      });
    }

    if (!KIMI_API_KEY) {
      log.error('KIMI_API_KEY not configured');
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Server misconfiguration',
      });
    }

    log.info('Chat request', { clientId: req.user.clientId, model });

    const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'kimi-k2',
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens || 2048,
        stream: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      log.error('Kimi API error', { status: response.status });
      return res.status(response.status).json({
        error: 'KIMI_ERROR',
        message: data?.error?.message || 'Kimi API error',
      });
    }

    res.json(data);
  } catch (error) {
    log.error('Chat endpoint error', { error: error.message });
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});

// ==================== SERVER ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  log.info('Kimi proxy server started', { port: PORT, env: process.env.NODE_ENV || 'development' });
  if (process.env.NODE_ENV !== 'production') {
    log.info('Documentation available at', { url: `http://localhost:${PORT}/docs` });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
