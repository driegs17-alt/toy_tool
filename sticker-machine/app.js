// app.js — the dials, the live sticker, and the shared wall.
import { FIREBASE_CONFIG } from './firebase-config.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('en-US');
const TOTAL = totalStickers();
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let current = randomSticker('');
let pop = 0;            // frames left in the "stuck!" bounce
let wallList = [];

// ---------- dials ----------
function buildControls() {
  const form = $('controls');

  for (const d of DIALS) {
    const field = document.createElement('fieldset');
    field.className = 'dial';
    const legend = document.createElement('legend');
    legend.innerHTML = `<span>${d.label}</span><span class="count mono">×${d.count}</span>`;
    field.append(legend);

    if (d.names || d.swatches) {
      const row = document.createElement('div');
      row.className = d.swatches ? 'swatches' : 'chips';
      (d.names || d.swatches).forEach((opt, i) => {
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = d.key;
        input.id = `${d.key}-${i}`;
        input.value = i;
        const label = document.createElement('label');
        label.htmlFor = input.id;
        if (d.swatches) {
          label.style.setProperty('--sw', opt);
          label.title = opt;
          label.innerHTML = `<span class="sr">${d.label} ${opt}</span>`;
        } else {
          label.textContent = opt;
        }
        row.append(input, label);
      });
      field.append(row);
    } else {
      const row = document.createElement('div');
      row.className = 'slider';
      row.innerHTML = `
        <input type="range" id="${d.key}" name="${d.key}" min="${d.min}" max="${d.min + d.count - 1}" step="1" aria-label="${d.label}">
        <output for="${d.key}" id="${d.key}-out" class="mono"></output>`;
      field.append(row);
    }
    form.append(field);
  }

  const wordField = document.createElement('fieldset');
  wordField.className = 'dial word';
  wordField.innerHTML = `
    <legend><span>Word</span><span class="count mono">optional</span></legend>
    <input type="text" id="word" name="word" maxlength="${WORD_MAX}" placeholder="up to ${WORD_MAX} letters" aria-label="Word on the sticker">`;
  form.append(wordField);

  const formula = document.createElement('p');
  formula.className = 'formula mono';
  formula.textContent = DIALS.map((d) => d.count).join(' × ') + ' = ' + fmt(TOTAL);
  form.append(formula);

  form.addEventListener('input', readControls);
  form.addEventListener('submit', (e) => e.preventDefault());
}

function readControls() {
  const form = $('controls');
  for (const d of DIALS) current[d.key] = Number(form.elements[d.key].value);
  current.word = $('word').value.replace(/[^\p{L}\p{N} !?&'.-]/gu, '').slice(0, WORD_MAX);
  updateReadout();
}

function writeControls() {
  const form = $('controls');
  for (const d of DIALS) {
    if (d.names || d.swatches) {
      $(`${d.key}-${current[d.key] - d.min}`).checked = true;
    } else {
      form.elements[d.key].value = current[d.key];
    }
  }
  $('word').value = current.word;
  updateReadout();
}

function updateReadout() {
  for (const d of DIALS) {
    const out = $(`${d.key}-out`);
    if (!out) continue;
    out.textContent = d.key === 'turn' ? `${current.turn * 15}°` : current[d.key];
  }
  $('number').textContent = '#' + fmt(stickerNumber(current));
}

// ---------- the live sticker on the cutting mat ----------
function drawMat(p) {
  p.background('#215640');
  const cell = p.width / 24;
  for (let i = 0; i <= 24; i++) {
    const major = i % 6 === 0;
    p.stroke(255, 255, 255, major ? 60 : 22);
    p.strokeWeight(major ? 1.4 : 1);
    p.line(i * cell, 0, i * cell, p.height);
    p.line(0, i * cell, p.width, i * cell);
  }
  p.stroke(255, 255, 255, 30);
  p.line(0, p.height, p.width, 0);           // the 45° guide
  p.noStroke();
  p.fill(255, 255, 255, 120);
  p.textFont('DM Mono');
  p.textSize(Math.max(9, cell * 0.42));
  p.textAlign(p.LEFT, p.TOP);
  for (let i = 1; i < 4; i++) p.text(i, i * 6 * cell + 4, 4);
}

new p5((p) => {
  p.setup = () => {
    const holder = $('mat');
    p.createCanvas(holder.clientWidth, holder.clientWidth).parent(holder);
  };
  p.windowResized = () => {
    const w = $('mat').clientWidth;
    p.resizeCanvas(w, w);
  };
  p.draw = () => {
    drawMat(p);
    const look = {
      x: p.constrain((p.mouseX - p.width / 2) / (p.width / 2), -1, 1),
      y: p.constrain((p.mouseY - p.height / 2) / (p.height / 2), -1, 1)
    };
    const bob = calm ? 0 : p.sin(p.frameCount * 0.04) * p.width * 0.006;
    const scale = pop > 0 ? 1 + 0.12 * p.sin((pop / 20) * p.PI) : 1;
    if (pop > 0) pop--;
    p.push();
    p.translate(p.width / 2, p.height / 2 + bob);
    p.scale(scale);
    drawSticker(p, current, 0, 0, p.width, look);
    p.pop();
  };
});

// ---------- small images of saved stickers ----------
let painter = null;
const thumbs = new Map();
const painterReady = new Promise((resolve) => {
  new p5((p) => {
    p.setup = () => {
      p.noCanvas();
      p.noLoop();
      painter = p.createGraphics(180, 180);
      painter.pixelDensity(2);
      resolve();
    };
  });
});

function thumb(s) {
  const key = JSON.stringify(s);
  if (!thumbs.has(key)) {
    painter.clear();
    drawSticker(painter, s, 90, 90, 170, null);
    thumbs.set(key, painter.elt.toDataURL('image/png'));
  }
  return thumbs.get(key);
}

// ---------- where saved stickers live ----------
async function makeStore() {
  const cfg = FIREBASE_CONFIG;
  if (cfg && cfg.apiKey && cfg.projectId) {
    try {
      const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
      const { initializeApp } = await import(base + 'firebase-app.js');
      const fs = await import(base + 'firebase-firestore.js');
      const db = fs.getFirestore(initializeApp(cfg));
      const col = fs.collection(db, 'stickers');
      return {
        shared: true,
        add: (s) => fs.addDoc(col, { ...s, createdAt: fs.serverTimestamp() }),
        watch(onList, onCount, onError) {
          const q = fs.query(col, fs.orderBy('createdAt', 'desc'), fs.limit(120));
          fs.onSnapshot(q, (snap) => {
            onList(snap.docs.map((doc) => cleanSticker(doc.data())));
            fs.getCountFromServer(col).then((r) => onCount(r.data().count)).catch(() => {});
          }, onError);
        }
      };
    } catch (err) {
      console.warn('Firebase did not load, saving on this device instead.', err);
    }
  }

  // No Firebase yet: keep stickers in this browser.
  const KEY = 'sticker-machine-wall';
  const load = () => {
    try { return (JSON.parse(localStorage.getItem(KEY)) || []).map(cleanSticker); } catch { return []; }
  };
  let listeners = null;
  return {
    shared: false,
    async add(s) {
      const list = [s, ...load()].slice(0, 300);
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
      if (listeners) { listeners.onList(list.slice(0, 120)); listeners.onCount(list.length); }
    },
    watch(onList, onCount) {
      listeners = { onList, onCount };
      const list = load();
      onList(list.slice(0, 120));
      onCount(list.length);
    }
  };
}

// ---------- the wall ----------
async function renderWall(list) {
  await painterReady;
  await document.fonts.load('40px "Bagel Fat One"').catch(() => {});
  wallList = list;
  const wall = $('wall');
  wall.replaceChildren(...list.map((s, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.dataset.i = i;
    const n = '#' + fmt(stickerNumber(s));
    const img = document.createElement('img');
    img.src = thumb(s);
    img.alt = `Sticker ${n}` + (s.word ? `, says ${s.word}` : '');
    img.width = 180;
    img.height = 180;
    const cap = document.createElement('span');
    cap.className = 'mono small';
    cap.textContent = n;
    btn.append(img, cap);
    btn.title = 'Remix this sticker';
    li.append(btn);
    return li;
  }));
  $('wallEmpty').hidden = list.length > 0;
}

function renderCount(count) {
  const pct = (count / TOTAL) * 100;
  const pctText = count === 0 ? '0' : pct < 0.01 ? pct.toPrecision(2) : pct.toFixed(2);
  $('wallCount').textContent =
    `${fmt(count)} saved · ${pctText}% of every possible sticker`;
}

$('wall').addEventListener('click', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  current = { ...wallList[Number(tile.dataset.i)] };
  writeControls();
  pop = 20;
  setStatus(`Remixing ${$('number').textContent}. Change a dial to make it yours.`);
  $('mat').scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
});

// ---------- buttons ----------
function setStatus(text) { $('status').textContent = text; }

$('shuffle').addEventListener('click', () => {
  current = randomSticker(current.word);
  writeControls();
  pop = 12;
  setStatus('');
});

let store;
$('save').addEventListener('click', async () => {
  const btn = $('save');
  btn.disabled = true;
  pop = 20;
  const n = $('number').textContent;
  try {
    await store.add({ ...current });
    setStatus(`Stuck! Sticker ${n} is on the wall.`);
  } catch (err) {
    setStatus("That didn't save. Check your connection and try again.");
    console.error(err);
  }
  setTimeout(() => { btn.disabled = false; }, 2000);
});

// ---------- start ----------
$('total').textContent = fmt(TOTAL);
$('total2').textContent = fmt(TOTAL);
buildControls();
writeControls();

store = await makeStore();
if (!store.shared) {
  $('wallNote').hidden = false;
  $('wallNote').textContent =
    'This wall only shows stickers saved on this device. Add your Firebase config to share one wall with everyone.';
}
store.watch(renderWall, renderCount, (err) => {
  $('wallCount').textContent = "Couldn't load the wall right now.";
  console.error(err);
});
