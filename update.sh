#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   📦 Kimi API Proxy - Updater         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

INSTALL_DIR="$HOME/.kimi-proxy"

if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${RED}❌ Kimi Proxy not found at $INSTALL_DIR${NC}"
    echo -e "${YELLOW}Install first: curl -fsSL https://raw.githubusercontent.com/iSreyanshu/Kimi/main/install.sh | bash${NC}"
    exit 1
fi

cd "$INSTALL_DIR"

# Check git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}📥 Fetching latest version...${NC}"
git fetch origin main

# Get current and latest version
CURRENT=$(git rev-parse HEAD | cut -c1-7)
LATEST=$(git rev-parse origin/main | cut -c1-7)

if [ "$CURRENT" == "$LATEST" ]; then
    echo -e "${GREEN}✅ Already on latest version ($CURRENT)${NC}"
    exit 0
fi

echo -e "${YELLOW}🔄 Updating from $CURRENT to $LATEST...${NC}"

# Stop running process
if pgrep -f "node.*src/server.js" > /dev/null; then
    echo -e "${YELLOW}⏹️  Stopping running instance...${NC}"
    pkill -f "node.*src/server.js" || true
    sleep 2
fi

# Update code
git pull origin main

# Update dependencies
echo -e "${YELLOW}📚 Installing dependencies...${NC}"
npm install --production

echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Update Complete!                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}To restart the server:${NC}"
echo -e "  ${YELLOW}kimi start${NC}\n"
