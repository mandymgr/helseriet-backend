#!/bin/bash
export CLAUDE_SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
echo "🚀 Activating Claude coordination for backend..."
source /Users/mandymarigjervikrygg/Desktop/helseriet-projekt/.claude-coordination/claude-hooks.sh
