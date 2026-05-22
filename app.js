// ══════════════════════════════════════
//  TileLove — app.js
//  Firebase (Firestore + Storage) backend
// ══════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, getDoc,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ── Firebase config ──
const firebaseConfig = {
  apiKey: "AIzaSyCpxKkfJmNj2EudEqZbNlLx0UdPDhDRYAY",
  authDomain: "puzzle-love-note.firebaseapp.com",
  projectId: "puzzle-love-note",
  storageBucket: "puzzle-love-note.firebasestorage.app",
  messagingSenderId: "163699031865",
  appId: "1:163699031865:web:6fa91a7e30f3a58aa072e8",
  measurementId: "G-7YF4BYC2BX"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// ════════════════════════════════════
//  STATE
// ════════════════════════════════════
let currentGridSize = 3;
let patternOrder = []; // tile indices in tap order
let rewardType = 'text';
let currentPuzzle = null; // puzzle loaded in play page
let playProgress = [];    // indices tapped so far

// ════════════════════════════════════
//  PAGE ROUTING
// ════════════════════════════════════
window.showPage = function(name, puzzleId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (name === 'home') loadGallery();
  if (name === 'create') initBuilder(currentGridSize);
  if (name === 'play' && puzzleId) loadPuzzle(puzzleId);
};

// ════════════════════════════════════
//  HOME — GALLERY
// ════════════════════════════════════
async function loadGallery() {
  const gallery = document.getElementById('gallery');
  const countEl = document.getElementById('puzzle-count');
  gallery.innerHTML = `<div class="loading-tiles">
    <div class="lt"></div><div class="lt"></div><div class="lt"></div>
    <div class="lt"></div><div class="lt"></div><div class="lt"></div>
  </div>`;

  try {
    const q = query(collection(db, 'puzzles'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    countEl.textContent = snap.size + ' puzzle' + (snap.size !== 1 ? 's' : '');

    if (snap.empty) {
      gallery.innerHTML = `<div class="empty-state">
        <div class="em-icon">🫧</div>
        <p>no puzzles yet.<br/>be the first to create one 💌</p>
      </div>`;
      return;
    }

    gallery.innerHTML = '';
    snap.forEach(docSnap => {
      const d = docSnap.data();
      gallery.appendChild(buildCard(docSnap.id, d));
    });
  } catch (e) {
    console.error(e);
    gallery.innerHTML = `<div class="empty-state"><p>couldn't load puzzles. check your connection 😔</p></div>`;
  }
}

function buildCard(id, d) {
  const card = document.createElement('div');
  card.className = 'puzzle-card';
  card.onclick = () => showPage('play', id);

  const size = d.gridSize || 3;
  const pattern = d.pattern || [];
  const total = size * size;

  // mini grid
  const miniGrid = document.createElement('div');
  miniGrid.className = 'card-mini-grid';
  miniGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  for (let i = 0; i < total; i++) {
    const tile = document.createElement('div');
    tile.className = 'card-mini-tile';
    const orderIdx = pattern.indexOf(i);
    if (orderIdx !== -1) {
      tile.classList.add('active', 'num');
      tile.textContent = orderIdx + 1;
    }
    miniGrid.appendChild(tile);
  }

  const rewardBadge = { text: '💬 message', image: '🖼 photo', video: '🎞 video' };

  card.innerHTML = ``;
  card.appendChild(miniGrid);
  card.insertAdjacentHTML('beforeend', `
    <div class="card-title">${escHtml(d.title || 'untitled puzzle')}</div>
    <div class="card-meta">
      <span>by ${escHtml(d.creator || 'anonymous')}</span>
      <span class="card-reward-badge">${rewardBadge[d.rewardType] || '💌'}</span>
    </div>
  `);
  return card;
}

// ════════════════════════════════════
//  CREATE — TILE BUILDER
// ════════════════════════════════════
window.initBuilder = function(size) {
  currentGridSize = size;
  patternOrder = [];
  updatePatternDisplay();

  const builder = document.getElementById('tile-builder');
  builder.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  builder.innerHTML = '';

  const total = size * size;
  for (let i = 0; i < total; i++) {
    const tile = document.createElement('div');
    tile.className = 'build-tile';
    tile.dataset.idx = i;
    tile.onclick = () => toggleTile(i, tile);
    builder.appendChild(tile);
  }
};

function toggleTile(idx, el) {
  const existing = patternOrder.indexOf(idx);
  if (existing !== -1) {
    // deselect — remove and renumber
    patternOrder.splice(existing, 1);
    el.classList.remove('selected');
    el.textContent = '';
    renumberTiles();
  } else {
    patternOrder.push(idx);
    el.classList.add('selected');
    el.textContent = patternOrder.length;
  }
  updatePatternDisplay();
}

function renumberTiles() {
  document.querySelectorAll('.build-tile').forEach(t => {
    const idx = parseInt(t.dataset.idx);
    const order = patternOrder.indexOf(idx);
    if (order !== -1) {
      t.classList.add('selected');
      t.textContent = order + 1;
    } else {
      t.classList.remove('selected');
      t.textContent = '';
    }
  });
}

function updatePatternDisplay() {
  const el = document.getElementById('pattern-display');
  if (patternOrder.length === 0) {
    el.textContent = 'no pattern set yet';
  } else {
    el.textContent = 'pattern: ' + patternOrder.map(i => i + 1).join(' → ');
  }
}

window.clearPattern = function() {
  patternOrder = [];
  document.querySelectorAll('.build-tile').forEach(t => {
    t.classList.remove('selected');
    t.textContent = '';
  });
  updatePatternDisplay();
};

// Size buttons
document.querySelectorAll('.size-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    initBuilder(parseInt(btn.dataset.size));
  };
});

// ── Reward tabs ──
window.switchRewardType = function(type, btn) {
  rewardType = type;
  document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.reward-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('rp-' + type).classList.remove('hidden');
};

// ── File preview ──
window.previewFile = function(type) {
  const input = document.getElementById('upload-' + type);
  const preview = document.getElementById('preview-' + type);
  const file = input.files[0];
  if (!file) return;

  preview.innerHTML = '';
  preview.classList.remove('hidden');

  if (type === 'image') {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  } else {
    const vid = document.createElement('video');
    vid.src = URL.createObjectURL(file);
    vid.controls = true;
    preview.appendChild(vid);
  }

  // hide upload inner
  document.querySelector(`#upload-${type}-zone .upload-inner`).style.display = 'none';
};

// ════════════════════════════════════
//  PUBLISH
// ════════════════════════════════════
window.publishPuzzle = async function() {
  const title = document.getElementById('c-title').value.trim();
  const creator = document.getElementById('c-creator').value.trim();
  const pw = document.getElementById('c-password').value;
  const pw2 = document.getElementById('c-password2').value;
  const message = document.getElementById('c-message').value.trim();

  // Validation
  if (!title) return toast('add a title for your puzzle! 🫠');
  if (!creator) return toast('add your name too 🥺');
  if (!pw) return toast('set a password to protect the reward 🔐');
  if (pw !== pw2) return toast('passwords don\'t match bestie 😅');
  if (patternOrder.length < 2) return toast('set a pattern with at least 2 tiles! 🎯');
  if (rewardType === 'text' && !message) return toast('write a message for them 💌');
  if (rewardType === 'image' && !document.getElementById('upload-image').files[0])
    return toast('upload a photo first 📸');
  if (rewardType === 'video' && !document.getElementById('upload-video').files[0])
    return toast('upload a video first 🎬');

  const btn = document.getElementById('publish-btn');
  btn.disabled = true;

  const progress = document.getElementById('publish-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');
  progress.classList.remove('hidden');

  try {
    let rewardData = {};

    if (rewardType === 'text') {
      progressFill.style.width = '80%';
      progressLabel.textContent = 'saving message…';
      rewardData = { type: 'text', content: message };

    } else {
      // Upload file to Firebase Storage
      const fileInput = document.getElementById('upload-' + rewardType);
      const file = fileInput.files[0];
      const ext = file.name.split('.').pop();
      const storagePath = `rewards/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const storageRef = ref(storage, storagePath);

      progressLabel.textContent = 'uploading file…';

      await new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);
        uploadTask.on('state_changed',
          (snap) => {
            const pct = (snap.bytesTransferred / snap.totalBytes) * 70;
            progressFill.style.width = pct + '%';
          },
          reject,
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            rewardData = { type: rewardType, url };
            progressFill.style.width = '80%';
            resolve();
          }
        );
      });
    }

    progressLabel.textContent = 'saving puzzle…';
    progressFill.style.width = '90%';

    // Hash the password (simple sha256 via Web Crypto)
    const pwHash = await hashPassword(pw);

    await addDoc(collection(db, 'puzzles'), {
      title,
      creator,
      gridSize: currentGridSize,
      pattern: patternOrder,
      rewardType,
      reward: rewardData,
      passwordHash: pwHash,
      createdAt: serverTimestamp()
    });

    progressFill.style.width = '100%';
    progressLabel.textContent = 'published! 🎉';

    setTimeout(() => {
      toast('puzzle published! 🚀 everyone can see it now');
      showPage('home');
      btn.disabled = false;
      progress.classList.add('hidden');
      progressFill.style.width = '0%';
      resetCreateForm();
    }, 800);

  } catch (err) {
    console.error(err);
    toast('something went wrong 😭 try again');
    btn.disabled = false;
    progress.classList.add('hidden');
  }
};

function resetCreateForm() {
  document.getElementById('c-title').value = '';
  document.getElementById('c-creator').value = '';
  document.getElementById('c-password').value = '';
  document.getElementById('c-password2').value = '';
  document.getElementById('c-message').value = '';
  patternOrder = [];
  initBuilder(3);
  document.querySelectorAll('.size-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  switchRewardType('text', document.querySelector('.rtab'));
}

// ════════════════════════════════════
//  PLAY
// ════════════════════════════════════
async function loadPuzzle(id) {
  const titleEl = document.getElementById('play-title');
  const creatorEl = document.getElementById('play-creator-tag');
  const hintEl = document.getElementById('play-hint');

  titleEl.textContent = 'loading…';
  creatorEl.textContent = '';
  document.getElementById('play-tile-grid').innerHTML = '';

  try {
    const snap = await getDoc(doc(db, 'puzzles', id));
    if (!snap.exists()) { titleEl.textContent = 'puzzle not found 😔'; return; }

    currentPuzzle = { id, ...snap.data() };
    playProgress = [];

    titleEl.textContent = currentPuzzle.title || 'untitled';
    creatorEl.textContent = '🫀 by ' + (currentPuzzle.creator || 'anonymous');
    hintEl.textContent = `tap tiles in order to unlock — ${currentPuzzle.pattern.length} tiles in the pattern`;

    buildPlayGrid();
    document.getElementById('play-status').textContent = '';
    document.getElementById('play-reset-btn').style.display = 'none';

  } catch (e) {
    console.error(e);
    titleEl.textContent = 'error loading puzzle 😔';
  }
}

function buildPlayGrid() {
  const grid = document.getElementById('play-tile-grid');
  const size = currentPuzzle.gridSize || 3;
  grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  grid.innerHTML = '';

  for (let i = 0; i < size * size; i++) {
    const tile = document.createElement('div');
    tile.className = 'play-tile';
    tile.dataset.idx = i;

    // Show tile number
    const label = document.createElement('span');
    label.className = 'tile-label';
    label.textContent = i + 1;
    tile.appendChild(label);

    tile.onclick = () => handleTileTap(i, tile);
    grid.appendChild(tile);
  }
}

function handleTileTap(idx, el) {
  if (el.classList.contains('locked')) return;

  const expected = currentPuzzle.pattern[playProgress.length];

  if (idx === expected) {
    // Correct tap!
    playProgress.push(idx);
    el.classList.add('pressed');

    flashTile(el, 'correct-flash');

    if (playProgress.length === currentPuzzle.pattern.length) {
      // Pattern complete!
      setTimeout(() => {
        document.getElementById('play-status').textContent = '🎉 correct! now unlock your reward…';
        document.getElementById('pw-modal').classList.remove('hidden');
      }, 400);
    } else {
      document.getElementById('play-status').textContent =
        `✓ ${playProgress.length} / ${currentPuzzle.pattern.length} correct`;
    }
  } else {
    // Wrong — flash red, reset
    flashTile(el, 'wrong-flash');
    document.getElementById('play-status').textContent = '😅 wrong tile! starting over…';

    setTimeout(() => {
      playProgress = [];
      document.querySelectorAll('.play-tile').forEach(t => {
        t.classList.remove('pressed', 'correct-flash');
      });
      document.getElementById('play-status').textContent = '';
      document.getElementById('play-reset-btn').style.display = '';
    }, 800);
  }
}

function flashTile(el, cls) {
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 500);
}

window.resetPlay = function() {
  playProgress = [];
  document.querySelectorAll('.play-tile').forEach(t => {
    t.classList.remove('pressed', 'correct-flash', 'locked');
  });
  document.getElementById('play-status').textContent = '';
  document.getElementById('play-reset-btn').style.display = 'none';
};

// ── Password check ──
window.checkPassword = async function() {
  const input = document.getElementById('pw-input').value;
  const errEl = document.getElementById('pw-err');
  const hash = await hashPassword(input);

  if (hash === currentPuzzle.passwordHash) {
    document.getElementById('pw-modal').classList.add('hidden');
    document.getElementById('pw-input').value = '';
    errEl.classList.add('hidden');
    showReward();
  } else {
    errEl.classList.remove('hidden');
    document.getElementById('pw-input').value = '';
  }
};

// Allow enter key on password input
document.getElementById('pw-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') window.checkPassword();
});

function showReward() {
  const modal = document.getElementById('reward-modal');
  const content = document.getElementById('reward-content');
  const r = currentPuzzle.reward;

  modal.classList.remove('hidden');
  content.innerHTML = '';

  if (r.type === 'text') {
    const div = document.createElement('div');
    div.className = 'reward-text';
    div.textContent = r.content;
    content.appendChild(div);
  } else if (r.type === 'image') {
    const img = document.createElement('img');
    img.src = r.url;
    img.alt = 'your reward';
    content.appendChild(img);
  } else if (r.type === 'video') {
    const vid = document.createElement('video');
    vid.src = r.url;
    vid.controls = true;
    vid.autoplay = true;
    content.appendChild(vid);
  }

  launchConfetti();
}

window.closeReward = function() {
  document.getElementById('reward-modal').classList.add('hidden');
};

// ── Confetti ──
function launchConfetti() {
  const wrap = document.getElementById('confetti-wrap');
  wrap.innerHTML = '';
  const colors = ['#ff3f7a', '#c8ff57', '#ff9f4a', '#66d9e8', '#fff'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div');
    c.className = 'confetti-piece';
    c.style.cssText = `
      left: ${Math.random() * 100}%;
      top: -10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${Math.random() * 8 + 4}px;
      height: ${Math.random() * 8 + 4}px;
      animation-delay: ${Math.random() * 1.5}s;
      animation-duration: ${Math.random() * 1.5 + 1.5}s;
    `;
    wrap.appendChild(c);
  }
}

// ════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════
async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.toast = function(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
};

// ════════════════════════════════════
//  INIT
// ════════════════════════════════════
initBuilder(3);
loadGallery();
