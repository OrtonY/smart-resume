#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
BACKEND_STATIC_DIR="$BACKEND_DIR/src/main/resources/static"
BACKEND_JAR="$BACKEND_DIR/target/backend-1.1.1.jar"

REQUIRED_NODE_MAJOR=20
REQUIRED_JAVA_MAJOR=21
PLAYWRIGHT_CHROMIUM_REVISION=1223
PLAYWRIGHT_CHROMIUM_HEADLESS_SHELL_REVISION=1223

playwright_browsers_path() {
  if [ -n "${PLAYWRIGHT_BROWSERS_PATH:-}" ] && [ "${PLAYWRIGHT_BROWSERS_PATH}" != "0" ]; then
    echo "$PLAYWRIGHT_BROWSERS_PATH"
    return
  fi
  if [ "${PLAYWRIGHT_BROWSERS_PATH:-}" = "0" ]; then
    echo "$PROJECT_ROOT/node_modules/playwright-core/.local-browsers"
    return
  fi

  case "$(uname -s)" in
    Darwin*) echo "$HOME/Library/Caches/ms-playwright" ;;
    MINGW*|MSYS*|CYGWIN*) echo "${LOCALAPPDATA:-$HOME/AppData/Local}/ms-playwright" ;;
    *) echo "${XDG_CACHE_HOME:-$HOME/.cache}/ms-playwright" ;;
  esac
}

playwright_chromium_installed() {
  local browsers_path
  browsers_path="$(playwright_browsers_path)"
  [ -f "$browsers_path/chromium-$PLAYWRIGHT_CHROMIUM_REVISION/INSTALLATION_COMPLETE" ] &&
    [ -f "$browsers_path/chromium_headless_shell-$PLAYWRIGHT_CHROMIUM_HEADLESS_SHELL_REVISION/INSTALLATION_COMPLETE" ]
}

install_playwright_chromium() {
  if ! ./mvnw exec:java -e -q -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install chromium" 2>/dev/null; then
    echo "    [WARN] Could not auto-install Chromium."
    echo "           Run manually: cd backend && ./mvnw exec:java -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args='install chromium'"
  fi
}

# --- Check Node.js version ---
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js is not installed. Required: v${REQUIRED_NODE_MAJOR}+"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/^v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "[ERROR] Node.js version is v${NODE_VERSION}, but v${REQUIRED_NODE_MAJOR}+ is required."
  echo "        Please switch to Node ${REQUIRED_NODE_MAJOR}+ (e.g. nvm use ${REQUIRED_NODE_MAJOR}) and re-run."
  exit 1
fi

# --- Check Java version ---
if ! command -v java &>/dev/null; then
  echo "[ERROR] Java is not installed. Required: JDK ${REQUIRED_JAVA_MAJOR}+"
  exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -1 | sed -E 's/.*"([0-9]+).*/\1/')

if [ "$JAVA_VERSION" -lt "$REQUIRED_JAVA_MAJOR" ]; then
  echo "[ERROR] Java version is ${JAVA_VERSION}, but ${REQUIRED_JAVA_MAJOR}+ is required."
  echo "        Please install or switch to JDK ${REQUIRED_JAVA_MAJOR}+ and re-run."
  exit 1
fi

echo "[OK] Node.js v${NODE_VERSION} (>= ${REQUIRED_NODE_MAJOR})"
echo "[OK] Java ${JAVA_VERSION} (>= ${REQUIRED_JAVA_MAJOR})"
echo ""

echo "==> Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install --silent

echo "==> Building frontend..."
npm run build

echo "==> Syncing frontend dist to backend static resources..."
rm -rf "$BACKEND_STATIC_DIR"
cp -r "$FRONTEND_DIR/dist" "$BACKEND_STATIC_DIR"

echo "==> Building backend..."
cd "$BACKEND_DIR"
./mvnw package -DskipTests -q

if playwright_chromium_installed; then
  echo "[OK] Playwright Chromium is already installed."
else
  echo "==> Playwright Chromium is missing. Installing..."
  install_playwright_chromium
fi

echo ""
echo "=== Build complete. Starting server... ==="
echo ""

exec java -jar "$BACKEND_JAR"
