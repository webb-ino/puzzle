# 🫧 TileTok — Puzzle Notes for Couples

> Send a secret, tile by tile. Built for gen z lovers.

A web app where you build a tap-to-unlock tile puzzle for your person. Number the tiles in a secret pattern — they have to click in the right order to unlock your hidden message, image, or video.

## ✨ Features

- **Create puzzles** — pick grid size (3×3, 4×4, 5×5), add a message/image/video as reward
- **Set the pattern** — click tiles in unlock order; numbers appear
- **Share via link** — WhatsApp, Telegram, or native share
- **Play puzzles** — tap tiles in the right order; wrong = reset; correct = unlock!
- **Firebase backend** — puzzles stored in Firestore, play count tracked

## 🗂 File Structure

```
puzzle-love/
├── index.html      ← Landing page
├── create.html     ← Puzzle creator (3-step flow)
├── play.html       ← Puzzle player (loaded from URL ?id=)
├── style.css       ← All styles
└── README.md
```

## 🚀 Deploy to GitHub Pages

1. Push this folder to a GitHub repo
2. Go to **Settings → Pages → Source: main branch / root**
3. Your site will be live at `https://yourusername.github.io/repo-name/`

> **Important:** Update the `origin` in `create.html` if deploying to a custom domain, so share links generate correctly.

## 🔥 Firebase Setup

The app uses your existing Firebase project (`puzzle-love-note`). Firestore is used to store puzzles.

### Firestore Rules (set in Firebase Console)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /puzzles/{puzzleId} {
      allow read: if true;
      allow create: if true;
      allow update: if request.resource.data.keys().hasOnly(['plays']);
    }
  }
}
```

### Firestore Data Model

Each puzzle document in `puzzles/` collection:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Puzzle title shown to recipient |
| `gridSize` | number | 3, 4, or 5 |
| `rewardType` | string | `"text"`, `"image"`, or `"video"` |
| `rewardContent` | string | The message, image URL, or video URL |
| `tileColor` | string | `"pink"`, `"purple"`, `"blue"`, `"green"`, `"gold"`, `"dark"` |
| `pattern` | array | Ordered tile indices — the unlock sequence |
| `createdAt` | timestamp | Server timestamp |
| `plays` | number | How many times the puzzle was opened |

## 🎨 Design

- **Dark romantic maximalism** — deep backgrounds, pink/purple glows
- **Fonts:** Syne (display) + DM Sans (body)
- **Tile colors:** 6 themes — pink, purple, blue, green, gold, dark
- **Animations:** CSS transitions, confetti on unlock, shake on wrong tap
- **Mobile responsive** — works on all screen sizes

## 📱 Sharing

Share links look like:
```
https://yoursite.com/play.html?id=FIREBASE_DOC_ID
```

The recipient opens the link and sees the puzzle immediately — no account needed.

---

made with 🩷 for people in love
