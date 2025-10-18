# 🚀 Git Workflow for VITato Project

## 📋 Pre-Commit Checklist

Before pushing to GitHub, ensure:

- [x] `.gitignore` is properly configured
- [x] `.env` file is NOT committed (only `.env.example`)
- [x] `node_modules/` is NOT committed
- [x] No sensitive data (API keys, passwords) in code
- [x] Build artifacts removed (`public/css/tailwind.css` can rebuild)
- [x] Test files reviewed (if you want to commit them)

---

## 🔧 Initial Git Setup (First Time)

```bash
# 1. Initialize git (if not already done)
git init

# 2. Add your GitHub remote
git remote add origin https://github.com/bishal692002/vitatoo.git

# Or if using SSH:
git remote add origin git@github.com:bishal692002/vitatoo.git

# 3. Check remote is added
git remote -v
```

---

## 📤 Pushing to GitHub (Step by Step)

### Step 1: Check what will be committed
```bash
# See all changed files
git status

# Review .gitignore is working (should NOT see .env or node_modules)
# You should see:
#   - Modified: .gitignore, .env.example, server.js, etc.
#   - New files: admin routes, models, public pages
#   - NOT see: .env, node_modules/, *.log files
```

### Step 2: Stage files
```bash
# Add all files (respecting .gitignore)
git add .

# Or add specific files
git add src/routes/admin.js
git add src/models/VendorApplication.js
git add public/vitato/
# ... etc

# Verify staged files
git status
```

### Step 3: Commit with descriptive message
```bash
git commit -m "feat: Add admin panel with vendor application system

- Implement vendor application submission form
- Create admin authentication and dashboard
- Add 4-tab admin interface (applications, vendors, analytics, database)
- Integrate Chart.js for analytics visualizations
- Add real-time Socket.IO notifications
- Implement vendor approval/rejection workflow
- Add database browser with JSON export
- Update security with multi-tier authentication
- Preserve all existing features (zero breaking changes)
- Add comprehensive documentation (5 MD files)

Features:
- Vendor application portal at /vendor-application.html
- Admin login at /vitato/admin-login.html
- Admin dashboard with analytics
- Real-time notifications
- Database management tools
- Enterprise-grade security

Docs: See ADMIN_FEATURES.md, QUICK_START.md, ARCHITECTURE.md"
```

### Step 4: Push to GitHub
```bash
# If first push to main branch
git branch -M main
git push -u origin main

# For subsequent pushes
git push

# If you get errors about diverged branches
git pull --rebase origin main
git push
```

---

## 🔍 Pre-Push Verification

### Verify .env is NOT staged
```bash
# This should return nothing (file should be ignored)
git ls-files | grep .env

# This should show .env.example (template is committed)
git ls-files | grep .env.example
```

### Verify node_modules is NOT staged
```bash
# This should return nothing
git ls-files | grep node_modules
```

### Check file sizes
```bash
# Large files that shouldn't be committed
find . -type f -size +10M -not -path "*/node_modules/*"
```

---

## 📝 Recommended Commit Message Format

```bash
# Feature additions
git commit -m "feat: Add admin vendor approval system"

# Bug fixes
git commit -m "fix: Resolve admin authentication token expiration"

# Documentation
git commit -m "docs: Update README with admin panel instructions"

# Refactoring
git commit -m "refactor: Improve admin dashboard performance"

# Style changes
git commit -m "style: Update admin UI with new gradient theme"

# Performance improvements
git commit -m "perf: Optimize database queries in analytics"

# Tests
git commit -m "test: Add admin authentication test suite"

# Configuration
git commit -m "chore: Update .gitignore for production"
```

---

## 🌿 Branch Strategy (Recommended)

### For solo development:
```bash
# Work directly on main
git checkout main
git pull
# Make changes
git add .
git commit -m "..."
git push
```

### For team development:
```bash
# Create feature branch
git checkout -b feature/admin-panel
# Make changes
git add .
git commit -m "..."
git push -u origin feature/admin-panel

# Create pull request on GitHub
# After review, merge to main
```

---

## 🔒 Security Reminders

### Never commit these files:
- `.env` (contains secrets)
- `node_modules/` (large, can reinstall)
- `*.log` files (temporary)
- `.DS_Store` (OS files)
- API keys or passwords in code
- Database dumps or backups

### Always use .env.example:
```bash
# Good: Template without secrets
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/db

# Bad: Actual credentials
MONGO_URI=mongodb+srv://bishal692002:Iamcool007@cluster0...
```

---

## 🧹 Clean Up Before Push

```bash
# Remove generated CSS (will rebuild)
rm public/css/tailwind.css
rm public/css/tailwind.css.map

# Remove logs
rm -rf logs/
rm *.log

# Remove OS files
find . -name ".DS_Store" -delete

# Remove test files (optional)
# rm test-admin-features.js

# Verify .env is present (don't delete, just don't commit)
ls -la | grep .env
# Should see: .env (not committed), .env.example (committed)
```

---

## 📦 What Gets Committed

### ✅ DO Commit:
- Source code (`.js`, `.html`, `.css`)
- Configuration templates (`.env.example`)
- Documentation (`.md` files)
- Package files (`package.json`, `package-lock.json`)
- Static assets (images, fonts) if small
- `.gitignore`, `.dockerignore`
- README, LICENSE

### ❌ DON'T Commit:
- `.env` (secrets)
- `node_modules/` (dependencies)
- Generated files (`tailwind.css`)
- Logs (`*.log`)
- OS files (`.DS_Store`, `Thumbs.db`)
- Editor configs (`.vscode/`, `.idea/`)
- Database dumps
- Large uploads folder
- Build artifacts

---

## 🎯 Complete Push Workflow

```bash
# 1. Clean up
rm -rf node_modules/.cache
rm public/css/tailwind.css*
find . -name ".DS_Store" -delete

# 2. Check .env is not staged
git status | grep .env
# Should only show .env.example if changed

# 3. Stage everything
git add .

# 4. Review what will be committed
git status
git diff --staged --name-only

# 5. Commit with descriptive message
git commit -m "feat: Complete admin panel implementation

- Add vendor application system
- Implement admin dashboard with 4 tabs
- Add real-time notifications
- Include comprehensive documentation
- Zero breaking changes to existing features"

# 6. Push to GitHub
git push -u origin main

# 7. Verify on GitHub
# Visit: https://github.com/bishal692002/vitatoo
# Check that .env is NOT visible
# Check that README.md renders properly
```

---

## 🚨 Emergency: Committed .env by Mistake

```bash
# If you accidentally committed .env:

# 1. Remove from git history (dangerous - only if not pushed)
git rm --cached .env
git commit --amend -m "chore: Remove .env from tracking"

# 2. If already pushed to GitHub:
# You MUST rotate all secrets immediately!
# - Generate new JWT_SECRET
# - Change MONGO_URI password
# - Regenerate Razorpay keys
# - Update ADMIN_PASS

# 3. Use BFG Repo Cleaner for complete removal from history
# https://rtyley.github.io/bfg-repo-cleaner/
```

---

## 📊 Post-Push Checklist

After pushing to GitHub:

- [ ] Visit GitHub repository
- [ ] Verify `.env` is NOT visible
- [ ] Check README.md renders correctly
- [ ] Verify documentation files display properly
- [ ] Check repository size is reasonable (< 100MB)
- [ ] Test cloning on another machine
- [ ] Set up GitHub repository settings:
  - [ ] Add description: "VITato - Campus Food Delivery Platform with Admin Panel"
  - [ ] Add topics: `food-delivery`, `admin-panel`, `nodejs`, `mongodb`, `express`, `socketio`
  - [ ] Set visibility (public/private)
  - [ ] Enable Issues
  - [ ] Add LICENSE file

---

## 🔗 Useful Git Commands

```bash
# View commit history
git log --oneline --graph

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard local changes
git checkout -- filename.js

# View differences
git diff

# View staged differences
git diff --staged

# Remove file from staging
git reset HEAD filename.js

# View remote URL
git remote -v

# Change remote URL
git remote set-url origin https://github.com/bishal692002/vitatoo.git

# Create and switch to new branch
git checkout -b feature-name

# Switch branches
git checkout main

# List branches
git branch -a

# Delete branch
git branch -d feature-name

# Fetch latest from remote
git fetch origin

# Pull latest changes
git pull origin main

# View file in another branch
git show branch-name:path/to/file
```

---

## 🎉 You're Ready!

Your repository is now properly configured for GitHub. All sensitive data is protected by `.gitignore`, and you have a clean, professional commit history.

**Next Steps:**
1. Run the complete push workflow above
2. Visit your GitHub repository
3. Add a good README (see README.md in project)
4. Share with your team or make public

**Happy coding!** 🚀
