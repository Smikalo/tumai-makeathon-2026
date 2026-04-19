#!/bin/bash

# --- CONFIGURATION ---
PROJECT_ROOT=$(pwd)
BACKEND_DIR="backend"
FRONTEND_DIR="makeatohn"
OLLAMA_MODEL="llama3.1"

# --- COLORS ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Campus Co-Pilot Setup...${NC}"
echo -e "${BLUE}Project Root: $PROJECT_ROOT${NC}"

# 1. Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo -e "${RED}Error: Ollama is not running on http://localhost:11434${NC}"
    echo "Please start Ollama and try again."
    exit 1
fi

# 2. Check if the model is pulled
if ! curl -s http://localhost:11434/api/tags | grep -q "$OLLAMA_MODEL"; then
    echo -e "${BLUE}Pulling Ollama model: $OLLAMA_MODEL...${NC}"
    ollama pull "$OLLAMA_MODEL"
fi

# 3. Setup Backend
echo -e "${GREEN}Setting up Python Backend...${NC}"
cd "$PROJECT_ROOT"
if [ ! -d "$BACKEND_DIR/venv" ]; then
    python3 -m venv "$BACKEND_DIR/venv"
fi
source "$BACKEND_DIR/venv/bin/activate"
pip install --upgrade pip
pip install -r "$BACKEND_DIR/requirements.txt"

# Install Playwright browsers for the current OS
echo -e "${BLUE}Installing Playwright Chromium...${NC}"
playwright install chromium

# 4. Setup Frontend
echo -e "${GREEN}Setting up React Frontend...${NC}"
cd "$PROJECT_ROOT/$FRONTEND_DIR"

# Check if vite is actually working
if [ ! -f "node_modules/.bin/vite" ] || [ ! -e "node_modules/.bin/vite" ]; then
    echo -e "${BLUE}Vite binary missing or broken. Performing clean install...${NC}"
    rm -rf node_modules package-lock.json
    npm install
fi

# 5. Run both
echo -e "${BLUE}Launching Backend and Frontend...${NC}"

# Trap SIGINT (Ctrl+C) to kill background processes
trap "kill 0" EXIT

# Start Backend from ROOT to ensure 'backend' module is found
cd "$PROJECT_ROOT"
export PYTHONPATH=$PROJECT_ROOT
source "$BACKEND_DIR/venv/bin/activate"
uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start Frontend using npx to bypass potential symlink issues
cd "$PROJECT_ROOT/$FRONTEND_DIR"
npx vite --host --port 5173
