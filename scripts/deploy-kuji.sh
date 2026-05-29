#!/usr/bin/env bash
# Deploy kuji-tracker to gh-pages branch directly (no GitHub Actions required)
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$REPO_ROOT/kuji-tracker/dist"
CURRENT_BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)

echo "==> Building kuji-tracker..."
cd "$REPO_ROOT/kuji-tracker"
npm run build

echo "==> Deploying to gh-pages branch..."
cd "$REPO_ROOT"

# Save current branch and stash any changes
git stash --include-untracked --quiet 2>/dev/null || true

# Switch to gh-pages or create it
if git show-ref --quiet refs/heads/gh-pages; then
  git checkout gh-pages
  # Remove old files (keep .git)
  find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} + 2>/dev/null || true
else
  git checkout --orphan gh-pages
  git rm -rf --cached . --quiet 2>/dev/null || true
  find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} + 2>/dev/null || true
fi

# Copy dist files
cp -r "$DIST_DIR"/. .

# Commit and push
git add -A
git commit -m "deploy: kuji-tracker $(date -u +%Y-%m-%dT%H:%M:%SZ)" || echo "Nothing to commit"
git push -u origin gh-pages --force

echo "==> Deployed! https://liuxi4048-crypto.github.io/claude-workspace/"

# Return to original branch
git checkout "$CURRENT_BRANCH" --quiet
git stash pop --quiet 2>/dev/null || true
