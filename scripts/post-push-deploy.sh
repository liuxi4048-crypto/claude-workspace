#!/usr/bin/env bash
# Called by Claude Code PostToolUse hook after every Bash tool call.
# If the command pushed to master, automatically deploy kuji-tracker to gh-pages.

TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"

# Only act on pushes to master
if echo "$TOOL_INPUT" | grep -q "push.*origin.*master\|push.*master.*origin"; then
  REPO_ROOT="/home/user/claude-workspace"
  LOG="$REPO_ROOT/scripts/deploy.log"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Auto-deploy triggered by push to master" >> "$LOG"
  bash "$REPO_ROOT/scripts/deploy-kuji.sh" >> "$LOG" 2>&1
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Deploy succeeded" >> "$LOG"
  else
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Deploy failed (exit $EXIT_CODE)" >> "$LOG"
  fi
fi
