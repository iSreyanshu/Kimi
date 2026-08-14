# 🚀 Kimi API Proxy

Modern, secure API proxy for Kimi with token management and rate limiting.

## ✨ Features

- 🔐 **JWT Token Authentication** - Access & Refresh token system
- 🔄 **Auto Token Refresh** - Seamless token rotation
- 📊 **Rate Limiting** - 100 requests per 15 minutes
- 🛡️ **Security Headers** - Helmet.js, CORS, CSP, HSTS
- 🪝 **Token Revocation** - Logout & blacklist support
- 📖 **Interactive Docs** - Built-in documentation at `/docs`
- ⚡ **Production Ready** - Vercel optimized
- 🔑 **API Key Isolation** - Never exposed in responses

## 📦 Quick Install

### One-Line Installation (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/iSreyanshu/Kimi/main/install.sh | bash
```

### Manual Installation
```bash
git clone https://github.com/iSreyanshu/Kimi.git
cd Kimi
npm install
cp .env.example .env
# Edit .env with your Kimi API key
npm start
```

## 🔐 Configuration

1. **Get your Kimi API Key** from https://kimi.moonshot.cn
2. **Edit `.env` file:**
   ```bash
   nano ~/.kimi-proxy/.env
   ```
3. **Add your API key:**
   ```env
   KIMI_API_KEY=your_official_kimi_api_key_here
   ```

The `JWT_SECRET` and `JWT_REFRESH_SECRET` are **auto-generated** during installation.

## 🛠️ CLI Commands

```bash
kimi start       # Start the server
kimi dev         # Development mode with auto-reload
kimi config      # Edit configuration
kimi update      # Update to latest version
kimi uninstall   # Remove Kimi Proxy
kimi logs        # View logs
kimi status      # Check if running
```

## 📡 API Endpoints

### Authentication

**Generate Tokens** (Public)
```bash
curl -X POST http://localhost:3000/auth/tokens
```
Response:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "clientId": "uuid"
}
```

**Refresh Token** (Public)
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGc..."}'
```

**Revoke Tokens** (Protected)
```bash
curl -X POST http://localhost:3000/auth/revoke \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGc..."}'
```

### Chat

**Send Message** (Protected)
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello Kimi!"}],
    "model": "kimi-k2",
    "temperature": 0.7,
    "max_tokens": 2048
  }'
```

### Health

```bash
curl http://localhost:3000/health
```

## 📚 Documentation

Full API documentation is available at:
```
http://localhost:3000/docs
```

## 🌐 Deployment (Vercel)

1. **Push to GitHub**
2. **Import to Vercel**:
   ```bash
   vercel
   ```
3. **Set Environment Variables** in Vercel Dashboard:
   - `KIMI_API_KEY` - Your Kimi API key
   - `KIMI_BASE_URL` - https://api.kimi.moonshot.cn
   - `JWT_SECRET` - Auto-generated if not set
   - `JWT_REFRESH_SECRET` - Auto-generated if not set

## 🔒 Security

✅ **Token-based Authentication** - JWT with expiration  
✅ **Refresh Token Rotation** - Automatic token refresh  
✅ **Token Revocation** - Logout support  
✅ **Rate Limiting** - Prevent abuse  
✅ **CORS Protection** - Configurable origins  
✅ **Security Headers** - Helmet.js hardening  
✅ **Input Validation** - XSS protection  
✅ **API Key Isolation** - Hidden from clients  
✅ **Secure Cookies** - HTTP-only, Secure flags  
✅ **HSTS** - Force HTTPS in production  

## 🐛 Troubleshooting

**Token Expired?**
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your_refresh_token"}'
```

**401 Unauthorized?**
- Ensure valid Bearer token in Authorization header
- Check token hasn't been revoked
- Refresh token if expired

**Rate Limited?**
- Wait 15 minutes or reconfigure `RATE_LIMIT_WINDOW`
- Limit is 100 requests per 15 minutes by default

## 📝 Environment Variables

```env
# Required
KIMI_API_KEY=your_api_key

# Optional (auto-generated)
JWT_SECRET=
JWT_REFRESH_SECRET=

# Server
PORT=3000
NODE_ENV=production

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Logging
LOG_LEVEL=info
```

## 📦 System Requirements

- **Node.js** 18+
- **npm** 9+
- **Git** (for installation)

## 📄 License

MIT

## 🤝 Contributing

Issues and PRs are welcome!

## 📞 Support

- GitHub Issues: https://github.com/iSreyanshu/Kimi/issues
- Documentation: http://localhost:3000/docs

---

**Made with ❤️ by iSreyanshu**
