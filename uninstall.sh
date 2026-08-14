#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🗑️  Kimi API Proxy - Uninstaller     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

INSTALL_DIR="$HOME/.kimi-proxy"

if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠️  Kimi Proxy not found at $INSTALL_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  This will remove Kimi Proxy from your system!${NC}"
echo -e "${YELLOW}Location: $INSTALL_DIR${NC}\n"

read -p "Are you sure you want to uninstall? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

# Stop running process
if pgrep -f "node.*src/server.js" > /dev/null; then
    echo -e "${YELLOW}⏹️  Stopping running instance...${NC}"
    pkill -f "node.*src/server.js" || true
    sleep 2
fi

# Remove global command
echo -e "${YELLOW}🔗 Removing global command...${NC}"
sudo rm -f /usr/local/bin/kimi 2>/dev/null || true

# Remove installation directory
echo -e "${YELLOW}📁 Removing installation files...${NC}"
rm -rf "$INSTALL_DIR"

echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Uninstalled Successfully!        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}To reinstall, run:${NC}"
echo -e "  ${YELLOW}curl -fsSL https://raw.githubusercontent.com/iSreyanshu/Kimi/main/install.sh | bash${NC}\n"
