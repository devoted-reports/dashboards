#!/bin/bash
# Devoted Reports — one-time setup for team members
# Run: bash setup.sh

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Devoted Reports — Team Setup           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Check macOS / Homebrew ──────────────────────────────────
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "⚠️  This script is for Mac only. Windows users — contact Yuliia."
  exit 1
fi

if ! command -v brew &>/dev/null; then
  echo "📦 Installing Homebrew (package manager)..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo ""
fi

# ── 2. Install git ─────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  echo "📦 Installing git..."
  brew install git
else
  echo "✅ git — already installed"
fi

# ── 3. Install GitHub CLI ──────────────────────────────────────
if ! command -v gh &>/dev/null; then
  echo "📦 Installing GitHub CLI..."
  brew install gh
else
  echo "✅ GitHub CLI (gh) — already installed"
fi

# ── 4. GitHub auth ─────────────────────────────────────────────
echo ""
echo "🔐 Checking GitHub login..."

if gh auth status &>/dev/null; then
  echo "✅ GitHub — already logged in"
else
  echo ""
  echo "👉 Opening GitHub login in your browser..."
  echo "   Select: GitHub.com → HTTPS → Login with browser"
  echo ""
  gh auth login --hostname github.com --git-protocol https --web
fi

# ── 5. Clone the dashboards repo ───────────────────────────────
REPO_DIR="$HOME/devoted-dashboards"

if [ -d "$REPO_DIR/.git" ]; then
  echo "✅ Repo — already cloned at ~/devoted-dashboards"
  cd "$REPO_DIR" && git pull --quiet origin main
else
  echo ""
  echo "📁 Cloning devoted-reports/dashboards to ~/devoted-dashboards..."
  gh repo clone devoted-reports/dashboards "$REPO_DIR"
fi

# ── 6. Verify write access ─────────────────────────────────────
echo ""
echo "🧪 Testing write access..."
cd "$REPO_DIR"
TESTFILE=".setup-test-$(whoami)"
touch "$TESTFILE"
git add "$TESTFILE"
git commit -m "setup: verify access for $(whoami)" --quiet
git push origin main --quiet
git rm "$TESTFILE" --quiet
git commit -m "setup: cleanup test file" --quiet
git push origin main --quiet
echo "✅ Write access confirmed!"

# ── 7. Done ────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅ Setup complete!                     ║"
echo "╠══════════════════════════════════════════╣"
echo "║                                          ║"
echo "║  Your dashboards repo is ready at:       ║"
echo "║  ~/devoted-dashboards                    ║"
echo "║                                          ║"
echo "║  To publish a dashboard, open Claude     ║"
echo "║  Code and say:                           ║"
echo "║  'Опублікуй цей дашборд: /path/file.html'║"
echo "║                                          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
