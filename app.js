// ════════════════════════════════════════════════
//  PUZZLE LOVE — app.js
//  Firebase + Puzzle logic
// ════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  doc, getDoc, serverTimestamp, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref as storageRef,
  uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ── Firebase Init ──────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCpxKkfJmNj2EudEqZbNlLx0UdPDhDRYAY",
  authDomain: "puzzle-love-note.firebaseapp.com",
  projectId: "puzzle-love-note",
  storageBucket: "puzzle-love-note.firebasestorage.app",
  messagingSenderId: "163699031865",
  appId: "1:163699031865:web:6fa91a7e30f3a58aa072e8",
  measurementId: "G-7YF4BYC2BX"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const storage = getStorage(app);

// ── State ──────────────────────────────────────
let state = {
  gridSize: 3,
  rewardType: 'text',
  pattern: [],           // ordered tile indices (builder)
  uploadedFile: null,    // File object
  uploadedPreviewURL: null,
  currentPuzzle: null,   // puzzle data when solving
  solveSequence: [],     // player's tap sequence
};

// ── Page Navigation ────────────────────────────
window.showPage = function(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
  if (id === 'page-explore') loadExplore();
};

window.hidePage = function() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  showPage('page-home');
};

// ── Size & Reward Selection ────────────────────
window.selectSize = function(btn, size) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.gridSize = size;
};

window.selectReward = function(btn, type) {
  document.querySelectorAll('.reward-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.rewardType = type;
  document.querySelectorAll('.reward-input').forEach(r => r.classList.remove('active'));
  document.getElementById('reward-' + type).classList.add('active');
};

// ── Message char count ─────────────────────────
document.getElementById('reward-message')?.addEventListener('input', function () {
  document.getElementById('msg-count').textContent = this.value.length;
});

// ── Toggle Password Visibility ─────────────────
window.togglePwd = function(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁️'; }
};

// ── File Upload ────────────────────────────────
window.handleFileUpload = function(input, type) {
  const file = input.files[0];
  if (!file) return;

  // Size check
  const maxMB = type === 'video' ? 50 : 10;
  if (file.size > maxMB * 1024 * 1024) {
    showToast(`file too big! max ${maxMB}MB`);
    return;
  }

  state.uploadedFile = file;
  const url = URL.createObjectURL(file);
  state.uploadedPreviewURL = url;

  const preview = document.getElementById(type === 'image' ? 'img-preview' : 'vid-preview');
  if (type === 'image') {
    preview.innerHTML = `<img src="${url}" alt="preview" /><p class="upload-filename">✓ ${file.name}</p>`;
  } else {
    preview.innerHTML = `<video src="${url}" controls></video><p class="upload-filename">✓ ${file.name}</p>`;
  }

  // Update upload zone text
  const zone = document.getElementById(type === 'image' ? 'img-upload-zone' : 'vid-upload-zone');
  zone.querySelector('p').innerHTML = `<strong style="color:var(--lime)">✓ file ready!</strong><br/><span class="hint">tap to change</span>`;
};

// ── Step 1 → Step 2 ────────────────────────────
window.goToStep2 = function() {
  const title    = document.getElementById('puzzle-title').value.trim();
  const password = document.getElementById('puzzle-password').value.trim();

  if (!title) { showToast('add a title first 😅'); return; }
  if (!password) { showToast('set a password! 🔐'); return; }

  // Validate reward
  if (state.rewardType === 'text') {
    const msg = document.getElementById('reward-message').value.trim();
    if (!msg) { showToast('write ur secret message 💬'); return; }
  } else {
    if (!state.uploadedFile) {
      showToast(`upload a ${state.rewardType} first!`); return;
    }
  }

  document.getElementById('step-1').classList.add('hidden');
  document.getElementById('step-2').classList.remove('hidden');
  buildPatternGrid();
};

window.goBackStep1 = function() {
  document.getElementById('step-2').classList.add('hidden');
  document.getElementById('step-1').classList.remove('hidden');
  state.pattern = [];
};

// ── Build Pattern Grid ─────────────────────────
function buildPatternGrid() {
  const builder = document.getElementById('puzzle-builder');
  const n = state.gridSize;
  builder.style.gridTemplateColumns = `repeat(${n}, var(--tile-size))`;
  builder.innerHTML = '';
  state.pattern = [];

  document.getElementById('pattern-total').textContent = n * n;
  document.getElementById('pattern-progress').innerHTML =
    `tap tiles to set pattern (0/<span id="pattern-total">${n * n}</span>)`;

  for (let i = 0; i < n * n; i++) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.index = i;
    tile.addEventListener('click', () => toggleTile(tile, i));
    builder.appendChild(tile);
  }
  updatePublishBtn();
}

function toggleTile(tile, idx) {
  if (tile.classList.contains('numbered')) {
    // Remove from pattern
    const pos = state.pattern.indexOf(idx);
    state.pattern.splice(pos, 1);
    tile.classList.remove('numbered');
    tile.removeAttribute('data-order');
    // Re-number remaining
    renumberTiles();
  } else {
    state.pattern.push(idx);
    tile.classList.add('numbered');
    tile.dataset.order = state.pattern.length;
  }
  const n = state.gridSize;
  document.getElementById('pattern-progress').innerHTML =
    `tap tiles to set pattern (${state.pattern.length}/<span id="pattern-total">${n * n}</span>)`;
  updatePublishBtn();
}

function renumberTiles() {
  const tiles = document.querySelectorAll('#puzzle-builder .tile');
  tiles.forEach(t => { t.classList.remove('numbered'); t.removeAttribute('data-order'); });
  state.pattern.forEach((idx, i) => {
    const t = document.querySelector(`#puzzle-builder .tile[data-index="${idx}"]`);
    if (t) { t.classList.add('numbered'); t.dataset.order = i + 1; }
  });
}

function updatePublishBtn() {
  const btn = document.getElementById('publish-btn');
  const total = state.gridSize * state.gridSize;
  btn.disabled = state.pattern.length !== total;
  if (state.pattern.length === total) {
    btn.textContent = '✦ generate link & publish';
  } else {
    btn.textContent = `number all tiles (${state.pattern.length}/${total})`;
  }
}

window.resetPattern = function() {
  state.pattern = [];
  buildPatternGrid();
};

// ── Publish Puzzle ─────────────────────────────
window.publishPuzzle = async function() {
  const btn = document.getElementById('publish-btn');
  btn.disabled = true;
  btn.textContent = 'uploading... ⏳';

  try {
    const title    = document.getElementById('puzzle-title').value.trim();
    const password = document.getElementById('puzzle-password').value.trim();
    const rewardType = state.rewardType;
    let   rewardData = '';

    // Handle file upload to Firebase Storage
    if (rewardType !== 'text') {
      if (!state.uploadedFile) throw new Error('No file uploaded');
      const path = `rewards/${Date.now()}_${state.uploadedFile.name}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, state.uploadedFile);
      rewardData = await getDownloadURL(fileRef);
    } else {
      rewardData = document.getElementById('reward-message').value.trim();
    }

    // Hash password (simple — not crypto-grade but good UX)
    const pwdHash = await simpleHash(password);

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'puzzles'), {
      title,
      gridSize: state.gridSize,
      pattern: state.pattern,
      rewardType,
      rewardData,
      passwordHash: pwdHash,
      createdAt: serverTimestamp(),
    });

    // Show share modal
    const puzzleId = docRef.id;
    const link = `${window.location.origin}${window.location.pathname}?puzzle=${puzzleId}`;
    document.getElementById('share-link').value = link;
    document.getElementById('share-pwd-display').textContent = password;
    document.getElementById('share-modal').classList.remove('hidden');

  } catch (err) {
    console.error(err);
    showToast('something went wrong 😬 check console');
    btn.disabled = false;
    btn.textContent = '✦ generate link & publish';
  }
};

// ── Simple hash (SHA-256) ──────────────────────
async function simpleHash(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Share Modal ────────────────────────────────
window.closeShareModal = function() {
  document.getElementById('share-modal').classList.add('hidden');
  // Reset create form
  resetCreateForm();
};

function resetCreateForm() {
  document.getElementById('puzzle-title').value = '';
  document.getElementById('puzzle-password').value = '';
  document.getElementById('reward-message').value = '';
  document.getElementById('msg-count').textContent = '0';
  document.getElementById('img-preview').innerHTML = '';
  document.getElementById('vid-preview').innerHTML = '';
  state.pattern = []; state.uploadedFile = null; state.uploadedPreviewURL = null;
  state.rewardType = 'text'; state.gridSize = 3;
  selectSize(document.querySelector('.size-btn[data-size="3"]'), 3);
  selectReward(document.querySelector('.reward-btn[data-type="text"]'), 'text');
  document.getElementById('step-2').classList.add('hidden');
  document.getElementById('step-1').classList.remove('hidden');
}

window.copyLink = function() {
  const val = document.getElementById('share-link').value;
  navigator.clipboard.writeText(val).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'copied!';
    btn.style.background = 'var(--success)';
    btn.style.color = '#000';
    setTimeout(() => { btn.textContent = 'copy'; btn.style.background = ''; btn.style.color = ''; }, 2000);
  });
};

window.shareWhatsApp = function() {
  const link = document.getElementById('share-link').value;
  const pwd  = document.getElementById('share-pwd-display').textContent;
  const text = encodeURIComponent(`🧩 i made u a puzzle! unlock it with the password: *${pwd}*\n\n${link}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
};
window.shareTwitter = function() {
  const link = document.getElementById('share-link').value;
  const text = encodeURIComponent(`i hid something special in a puzzle 🧩💌 can u crack it?\n${link}`);
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
};

// ── Explore / Public Feed ──────────────────────
let allPuzzles = [];

async function loadExplore() {
  const grid = document.getElementById('explore-grid');
  grid.innerHTML = '<div class="loading-state">loading puzzles... 🧩</div>';
  try {
    const q = query(collection(db, 'puzzles'), orderBy('createdAt', 'desc'), limit(30));
    const snap = await getDocs(q);
    allPuzzles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPuzzleGrid(allPuzzles);
  } catch (e) {
    grid.innerHTML = '<div class="empty-state">couldn\'t load puzzles 😮‍💨<br/>check ur connection</div>';
  }
}

function renderPuzzleGrid(puzzles) {
  const grid = document.getElementById('explore-grid');
  if (!puzzles.length) {
    grid.innerHTML = '<div class="empty-state">no puzzles yet 🥺<br/>be the first to create one!</div>';
    return;
  }
  const emojis = ['💌','🎭','🌸','🔒','💘','🪐','🎀','💜','🌙'];
  grid.innerHTML = puzzles.map(p => {
    const emoji = emojis[Math.abs(p.id.charCodeAt(0)) % emojis.length];
    const size = `${p.gridSize}×${p.gridSize}`;
    const type = { text:'💬 message', image:'🖼️ image', video:'🎬 video' }[p.rewardType] || '💬';
    return `
      <div class="puzzle-card" onclick="openPuzzle('${p.id}')">
        <div class="card-emoji">${emoji}</div>
        <div class="card-title">${escHtml(p.title)}</div>
        <div class="card-meta">
          <span>${size} grid</span>
          <span>${p.gridSize * p.gridSize} tiles</span>
        </div>
        <span class="card-badge">🔒 password protected</span>
        <span class="card-badge" style="margin-left:4px">${type}</span>
      </div>`;
  }).join('');
}

window.filterPuzzles = function(val) {
  const filtered = allPuzzles.filter(p =>
    p.title.toLowerCase().includes(val.toLowerCase())
  );
  renderPuzzleGrid(filtered);
};

function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Open a Puzzle ──────────────────────────────
window.openPuzzle = async function(id) {
  try {
    const snap = await getDoc(doc(db, 'puzzles', id));
    if (!snap.exists()) { showToast('puzzle not found 😢'); return; }
    state.currentPuzzle = { id: snap.id, ...snap.data() };
    state.solveSequence = [];

    document.getElementById('solve-title').textContent = state.currentPuzzle.title;
    document.getElementById('solve-area').classList.add('hidden');
    document.getElementById('reward-reveal').classList.add('hidden');
    document.getElementById('pwd-gate').style.display = 'flex';
    document.getElementById('solve-password').value = '';
    document.getElementById('pwd-error').classList.add('hidden');

    showPage('page-solve');
  } catch(e) {
    showToast('error loading puzzle');
  }
};

// ── Password Check ─────────────────────────────
window.checkPassword = async function() {
  const input = document.getElementById('solve-password').value.trim();
  if (!input) return;
  const hash = await simpleHash(input);
  if (hash === state.currentPuzzle.passwordHash) {
    document.getElementById('pwd-gate').style.display = 'none';
    document.getElementById('solve-area').classList.remove('hidden');
    buildSolveGrid();
  } else {
    document.getElementById('pwd-error').classList.remove('hidden');
    document.getElementById('solve-password').style.borderColor = 'var(--error)';
    setTimeout(() => {
      document.getElementById('solve-password').style.borderColor = '';
    }, 1000);
  }
};

// ── Build Solve Grid ───────────────────────────
function buildSolveGrid() {
  const grid = document.getElementById('puzzle-solve');
  const n = state.currentPuzzle.gridSize;
  grid.style.gridTemplateColumns = `repeat(${n}, var(--tile-size))`;
  grid.innerHTML = '';
  state.solveSequence = [];

  for (let i = 0; i < n * n; i++) {
    const tile = document.createElement('div');
    tile.className = 'solve-tile';
    tile.dataset.index = i;
    tile.addEventListener('click', () => onSolveTap(tile, i));
    grid.appendChild(tile);
  }
  updateSolveStatus();
}

function onSolveTap(tile, idx) {
  if (tile.classList.contains('selected')) return;
  state.solveSequence.push(idx);
  tile.classList.add('selected');
  tile.dataset.seq = state.solveSequence.length;

  const n = state.currentPuzzle.gridSize;
  const total = n * n;

  if (state.solveSequence.length === total) {
    // Check against pattern
    const correct = JSON.stringify(state.solveSequence) === JSON.stringify(state.currentPuzzle.pattern);
    if (correct) {
      document.querySelectorAll('.solve-tile').forEach(t => t.classList.add('correct'));
      setTimeout(showReward, 800);
    } else {
      document.querySelectorAll('.solve-tile').forEach(t => t.classList.add('wrong'));
      setTimeout(resetSolve, 900);
      updateSolveStatus('wrong order! try again 😅');
    }
  } else {
    updateSolveStatus(`${state.solveSequence.length} / ${total} tiles tapped`);
  }
}

function updateSolveStatus(msg) {
  const n = state.currentPuzzle?.gridSize || 0;
  document.getElementById('solve-status').textContent = msg || `tap all ${n * n} tiles in order`;
}

window.resetSolve = function() {
  state.solveSequence = [];
  document.querySelectorAll('.solve-tile').forEach(t => {
    t.classList.remove('selected', 'correct', 'wrong');
    t.removeAttribute('data-seq');
  });
  updateSolveStatus();
};

function showReward() {
  const p = state.currentPuzzle;
  const content = document.getElementById('reward-content');
  if (p.rewardType === 'text') {
    content.innerHTML = `<p>${escHtml(p.rewardData)}</p>`;
  } else if (p.rewardType === 'image') {
    content.innerHTML = `<img src="${p.rewardData}" alt="reward" />`;
  } else if (p.rewardType === 'video') {
    content.innerHTML = `<video src="${p.rewardData}" controls autoplay></video>`;
  }
  document.getElementById('reward-reveal').classList.remove('hidden');
}

window.exitSolve = function() {
  document.getElementById('pwd-gate').style.display = '';
  showPage('page-explore');
};

// ── Toast ──────────────────────────────────────
function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.add('hidden'), duration);
}

// ── Deep Link (URL param) ──────────────────────
function checkDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('puzzle');
  if (id) openPuzzle(id);
}

// ── Init ───────────────────────────────────────
showPage('page-home');
checkDeepLink();
