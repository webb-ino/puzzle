# 🧩 Puzzle Love

> **Hide ur heart in a puzzle. Let them crack the code to unlock ur message.**

A Gen Z-aesthetic puzzle note maker — create a tile grid with a secret tap pattern. When solved, it reveals a hidden message, image, or video. Perfect for couples 💌

---

## ✨ Features

- **Create a puzzle** — set grid size (3×3, 4×4, 5×5), number tiles in a secret order
- **Upload rewards** — text/poem, image, or video revealed on solve
- **Password protected** — only the recipient can access the puzzle
- **Public feed** — all puzzles browsable at `/explore`
- **Share link** — one tap generates a link to send via WhatsApp or Twitter
- **Deep link** — `?puzzle=ID` in URL auto-opens a specific puzzle
- **Firebase backend** — Firestore (puzzle data) + Storage (media uploads)

---

## 🚀 Setup

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/puzzle-love
cd puzzle-love
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Your project: **puzzle-love-note**
3. Enable:
   - **Firestore** — create a database in production mode
   - **Storage** — enable Firebase Storage
4. Set Firestore rules:
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /puzzles/{puzzleId} {
      allow read: if true;
      allow create: if true;
    }
  }
}
```
5. Set Storage rules:
```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 52428800; // 50MB
    }
  }
}
```

### 3. Run locally
Just open `index.html` in a browser — or use a local server:
```bash
npx serve .
# or
python3 -m http.server 8080
```

### 4. Deploy (GitHub Pages)
Push to GitHub, then enable **GitHub Pages** from the repo settings (use `main` branch, root `/`).

> **Note:** Firebase APIs are loaded via CDN — no build step needed!

---

## 📁 File Structure

```
puzzle-love/
├── index.html     — full single-page app
├── style.css      — Gen Z dark aesthetic
├── app.js         — Firebase + puzzle logic (ES module)
└── README.md
```

---

## 🎨 Design System

| Token      | Value         |
|------------|---------------|
| `--pink`   | `#ff2d78`     |
| `--lime`   | `#b8ff3c`     |
| `--purple` | `#9b5fff`     |
| `--cyan`   | `#00e5ff`     |
| Background | `#0a0a0f`     |
| Font       | Syne + DM Sans |

---

## 🔐 Security Notes

- Passwords are hashed with **SHA-256** via Web Crypto API before storing
- Plain-text passwords are never saved to Firestore
- Puzzle reward data is only revealed after correct pattern + password

---

## 💌 Made with love for couples who want to be extra
