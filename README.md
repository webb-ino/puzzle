# 🫀 TileLove — Puzzle Notes for Couples

A Gen Z-aesthetic tile puzzle website where you can create hidden love notes, photos, or videos that can only be unlocked by tapping tiles in the correct order.

## ✨ Features

- **Create a puzzle** — pick a grid size (3×3, 4×4, 5×5), set a tile tap pattern, and attach a reward (message / photo / video)
- **Password protection** — the reward is public-facing but locked behind a password only the creator sets
- **Upload to Firebase Storage** — photos and videos are stored in Firebase, not URLs
- **Browse all puzzles** — everyone can see & try puzzles; only those with the password can unlock the reward
- **Confetti on unlock** 🎉

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/your-username/puzzle-love.git
cd puzzle-love
```

### 2. Firebase Setup

This project uses Firebase Firestore (database) and Firebase Storage (media uploads).

Your Firebase config is already embedded in `app.js`. If you want to use your own project, replace the `firebaseConfig` object.

### 3. Deploy Firebase Rules

Install Firebase CLI if you haven't:
```bash
npm install -g firebase-tools
firebase login
firebase init
```

Deploy security rules:
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### 4. Run locally

Since the app uses ES modules with Firebase CDN imports, you need a local server (not just opening `index.html`):

```bash
# Option A — Python
python3 -m http.server 3000

# Option B — Node
npx serve .

# Option C — VS Code Live Server extension
```

Open `http://localhost:3000`

### 5. Deploy to GitHub Pages

In your repo settings → Pages → set source to `main` branch → root `/`

Or use [Netlify](https://netlify.com) — drag & drop the folder.

## 📁 File Structure

```
puzzle-love/
├── index.html        # All pages (home, create, play) in one file
├── style.css         # Full styling — dark theme, gen z aesthetic
├── app.js            # Firebase logic, puzzle create/play
├── firestore.rules   # Firestore security rules
├── storage.rules     # Firebase Storage security rules
└── README.md
```

## 🔐 How the Password Works

Passwords are **never stored in plain text**. When you create a puzzle:
1. Your password is hashed using the browser's built-in `crypto.subtle.digest('SHA-256', ...)` 
2. Only the hash is saved to Firestore
3. When someone tries to unlock, their input is hashed and compared

## 🎨 Design

- **Fonts**: Syne (display) + DM Sans (body)
- **Palette**: Deep black background, warm cream text, acid green CTAs, hot pink accents
- **Vibe**: dark mode, textured noise overlay, glowy tile effects

## 🛠 Tech Stack

- Vanilla HTML/CSS/JS (no build step needed!)
- Firebase Firestore (puzzle data)
- Firebase Storage (image/video uploads)
- Google Fonts CDN
- Web Crypto API (password hashing)

---

Made with 🫀 for the ones who feel in patterns.
