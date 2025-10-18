#!/bin/bash

# VITato - Git Push to GitHub Script
# Run: ./git-push.sh "your commit message"

echo "🚀 VITato - Pushing to GitHub"
echo "================================"

# Check if commit message provided
if [ -z "$1" ]; then
  echo "❌ Error: Commit message required"
  echo "Usage: ./git-push.sh \"your commit message\""
  exit 1
fi

COMMIT_MSG="$1"

# Add all files (respecting .gitignore)
echo "📦 Adding files..."
git add .

# Show what will be committed
echo ""
echo "📋 Files to be committed:"
git status --short

# Commit
echo ""
echo "💾 Committing..."
git commit -m "$COMMIT_MSG"

# Push to main branch
echo ""
echo "⬆️  Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Check your repository:"
echo "   https://github.com/bishal692002/vitatoo"
