#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 Kimi API Proxy - Installer       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo -e "${YELLOW}Please install Node.js 18+ from https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ is required (you have v$NODE_VERSION)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}\n"

# Installation directory
INSTALL_DIR="$HOME/.kimi-proxy"

echo -e "${BLUE}📁 Installation directory: $INSTALL_DIR${NC}"

# Create installation directory
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Clone or update repository
if [ -d ".git" ]; then
    echo -e "${YELLOW}📦 Updating Kimi Proxy...${NC}"
    git pull origin main
else
    echo -e "${YELLOW}📦 Cloning Kimi Proxy...${NC}"
    git clone --depth 1 https://github.com/iSreyanshu/Kimi.git "$INSTALL_DIR" || {
        echo -e "${RED}❌ Failed to clone repository${NC}"
        exit 1
    }
fi

# Install dependencies
echo -e "${YELLOW}📚 Installing dependencies...${NC}"
npm install --production

# Generate .env if doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}🔐 Generating .env file...${NC}"
    cp .env.example .env
    
    # Generate random JWT secrets
    JWT_SECRET=$(openssl rand -hex 32)
    JWT_REFRESH_SECRET=$(openssl rand -hex 32)
    
    # Update .env with generated secrets
    sed -i.bak "s/JWT_SECRET=/JWT_SECRET=$JWT_SECRET/g" .env
    sed -i.bak "s/JWT_REFRESH_SECRET=/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/g" .env
    rm -f .env.bak
    
    echo -e "${GREEN}✅ .env file created with auto-generated secrets${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env and add your KIMI_API_KEY${NC}\n"
    echo -e "${BLUE}Edit with: nano $INSTALL_DIR/.env${NC}\n"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Create symlink for global command
sudo ln -sf "$INSTALL_DIR/cli.sh" /usr/local/bin/kimi 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not create global command. Run: sudo ln -s $INSTALL_DIR/cli.sh /usr/local/bin/kimi${NC}"
}

# Create CLI script
cat > "$INSTALL_DIR/cli.sh" << 'EOFCLI'
#!/bin/bash

INSTALL_DIR="$HOME/.kimi-proxy"
cd "$INSTALL_DIR"

case "$1" in
  start)
    echo "🚀 Starting Kimi Proxy..."
    npm start
    ;;
  dev)
    echo "🔧 Starting Kimi Proxy (development mode)..."
    npm run dev
    ;;
  update)
    echo "📦 Updating Kimi Proxy..."
    git pull origin main
    npm install --production
    echo "✅ Update complete!"
    ;;
  uninstall)
    echo "🗑️  Uninstalling Kimi Proxy..."
    read -p "Are you sure? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      sudo rm -f /usr/local/bin/kimi
      rm -rf "$INSTALL_DIR"
      echo "✅ Uninstalled successfully!"
    fi
    ;;
  logs)
    echo "📋 Logs available at: $INSTALL_DIR"
    tail -f "$INSTALL_DIR/logs.txt" 2>/dev/null || echo "No logs yet"
    ;;
  config)
    if command -v nano &> /dev/null; then
      nano "$INSTALL_DIR/.env"
    elif command -v vim &> /dev/null; then
      vim "$INSTALL_DIR/.env"
    else
      cat "$INSTALL_DIR/.env"
    fi
    ;;
  status)
    if pgrep -f "node.*src/server.js" > /dev/null; then
      echo "✅ Kimi Proxy is running"
    else
      echo "❌ Kimi Proxy is not running"
    fi
    ;;
  *)
    echo "Kimi API Proxy v2.0.0"
    echo ""
    echo "Usage: kimi [command]"
    echo ""
    echo "Commands:"
    echo "  start       - Start the proxy server"
    echo "  dev         - Start in development mode (auto-reload)"
    echo "  update      - Update to latest version"
    echo "  uninstall   - Remove Kimi Proxy"
    echo "  config      - Edit configuration"
    echo "  logs        - View logs"
    echo "  status      - Check if running"
    echo ""
    echo "Quick start:"
    echo "  kimi config  # Add your KIMI_API_KEY"
    echo "  kimi start   # Start the server"
    echo ""
    echo "Documentation: http://localhost:3000/docs"
    ;;
esac
EOFCLI

chmod +x "$INSTALL_DIR/cli.sh"

echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Installation Complete!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "  1. Edit configuration:"
echo -e "     ${YELLOW}nano $INSTALL_DIR/.env${NC}"
echo -e "     Add your KIMI_API_KEY\n"
echo -e "  2. Start the server:"
echo -e "     ${YELLOW}kimi start${NC}\n"
echo -e "  3. View documentation:"
echo -e "     ${YELLOW}http://localhost:3000/docs${NC}\n"

echo -e "${BLUE}💡 Available Commands:${NC}"
echo -e "  ${YELLOW}kimi start${NC}      - Start the server"
echo -e "  ${YELLOW}kimi dev${NC}        - Development mode"
echo -e "  ${YELLOW}kimi config${NC}     - Edit .env"
echo -e "  ${YELLOW}kimi update${NC}     - Update to latest"
echo -e "  ${YELLOW}kimi uninstall${NC}  - Remove completely\n"

echo -e "${GREEN}🎉 Ready to go!${NC}\n"
