#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
BACKEND_STATIC_DIR="$BACKEND_DIR/src/main/resources/static"
BACKEND_JAR="$BACKEND_DIR/target/backend-1.0.0.jar"

REQUIRED_NODE_MAJOR=20
REQUIRED_JAVA_MAJOR=21

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

echo "==> Ensuring Playwright Chromium is installed..."
mvn exec:java -e -q \
  -Dexec.mainClass=com.microsoft.playwright.CLI \
  -Dexec.args="install chromium" 2>/dev/null || \
  npx playwright install chromium 2>/dev/null || \
  echo "    [WARN] Could not auto-install Chromium. Run manually: npx playwright install chromium"

echo ""
echo "=== Build complete. Starting server... ==="
echo ""

exec java -jar "$BACKEND_JAR"
