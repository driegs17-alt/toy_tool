// sticker.js
// The dials, and the one function that draws a sticker from them.
// Every sticker is just ten numbers (plus an optional word), so each
// combination gets its own sticker number.

const SHAPES   = ['circle', 'square', 'star', 'flower', 'heart', 'burst'];
const COLORS   = ['#ff6b6b', '#ffa94d', '#ffd43b', '#a9e34b', '#38d9a9',
                  '#4dabf7', '#748ffc', '#da77f2', '#f783ac', '#f1f3f5'];
const INKS     = ['#1b1b1f', '#ffffff', '#c92a2a', '#1864ab', '#2b8a3e'];
const PATTERNS = ['none', 'dots', 'stripes', 'checks'];
const EYES     = ['none', 'dots', 'googly', 'hearts', 'x', 'sleepy'];
const MOUTHS   = ['none', 'smile', 'grin', 'o', 'flat', 'tongue'];

// The ten dials, in the order used for the sticker number.
const DIALS = [
  { key: 'shape',   label: 'Shape',   min: 0, count: SHAPES.length,   names: SHAPES },
  { key: 'points',  label: 'Points',  min: 3, count: 10 },
  { key: 'spike',   label: 'Spiky',   min: 0, count: 11 },
  { key: 'turn',    label: 'Tilt',    min: 0, count: 24 },
  { key: 'fill',    label: 'Color',   min: 0, count: COLORS.length,   swatches: COLORS },
  { key: 'pattern', label: 'Pattern', min: 0, count: PATTERNS.length, names: PATTERNS },
  { key: 'line',    label: 'Outline', min: 0, count: INKS.length,     swatches: INKS },
  { key: 'weight',  label: 'Line',    min: 0, count: 4 },
  { key: 'eyes',    label: 'Eyes',    min: 0, count: EYES.length,     names: EYES },
  { key: 'mouth',   label: 'Mouth',   min: 0, count: MOUTHS.length,   names: MOUTHS }
];

const WORD_MAX = 12;
const FACE_INK = '#1b1b1f';

function totalStickers() {
  return DIALS.reduce((n, d) => n * d.count, 1);
}

// Sticker number: count through every combination, like an odometer.
function stickerNumber(s) {
  let n = 0;
  for (const d of DIALS) n = n * d.count + (s[d.key] - d.min);
  return n + 1;
}

function randomSticker(keepWord) {
  const s = {};
  for (const d of DIALS) s[d.key] = d.min + Math.floor(Math.random() * d.count);
  s.word = keepWord || '';
  return s;
}

// Anything loaded from the wall gets forced back into range.
function cleanSticker(raw) {
  const s = {};
  for (const d of DIALS) {
    const v = Math.round(Number(raw && raw[d.key]));
    s[d.key] = Number.isFinite(v) ? Math.min(d.min + d.count - 1, Math.max(d.min, v)) : d.min;
  }
  s.word = typeof (raw && raw.word) === 'string' ? raw.word.slice(0, WORD_MAX) : '';
  return s;
}

// ---------- outline of the shape, as a list of points ----------
function shapePoints(g, s, R) {
  const pts = [];
  const name = SHAPES[s.shape];
  const n = s.points;
  const k = s.spike / 10;                    // 0 … 1

  if (name === 'star' || name === 'burst') {
    const rays = name === 'star' ? n : n * 3;
    const inner = name === 'star' ? g.lerp(0.85, 0.38, k) : g.lerp(0.95, 0.72, k);
    for (let i = 0; i < rays * 2; i++) {
      const a = -g.HALF_PI + i * g.PI / rays;
      const r = i % 2 === 0 ? R : R * inner;
      pts.push([g.cos(a) * r, g.sin(a) * r]);
    }
    return pts;
  }

  if (name === 'heart') {
    for (let i = 0; i < 160; i++) {
      const t = i / 160 * g.TWO_PI;
      const wob = 1 + 0.06 * k * g.sin(n * t);
      const x = 16 * Math.pow(g.sin(t), 3);
      const y = -(13 * g.cos(t) - 5 * g.cos(2 * t) - 2 * g.cos(3 * t) - g.cos(4 * t));
      pts.push([x * R / 16 * wob, (y + 2) * R / 16 * wob]);
    }
    return pts;
  }

  for (let i = 0; i < 180; i++) {
    const a = i / 180 * g.TWO_PI;
    let r = R;
    if (name === 'square') {
      const p = 5;
      r = R * 0.92 * Math.pow(Math.pow(Math.abs(g.cos(a)), p) + Math.pow(Math.abs(g.sin(a)), p), -1 / p);
      r *= 1 + 0.07 * k * g.sin(n * 2 * a);
    } else if (name === 'flower') {
      const depth = g.lerp(0.08, 0.4, k);
      r = R * (1 - depth + depth * Math.abs(g.cos(n * a / 2)));
    } else {
      r = R * (1 + 0.08 * k * g.sin(n * 2 * a));  // circle, scalloped by Spiky
    }
    pts.push([g.cos(a) * r, g.sin(a) * r]);
  }
  return pts;
}

function outline(g, pts) {
  g.beginShape();
  for (const p of pts) g.vertex(p[0], p[1]);
  g.endShape(g.CLOSE);
}

// ---------- the sticker ----------
// g: a p5 sketch or p5.Graphics. look: {x, y} from -1 to 1 for googly eyes.
function drawSticker(g, s, x, y, size, look) {
  const R = size * 0.34;
  const pts = shapePoints(g, s, R);
  const ink = INKS[s.line];
  const word = (s.word || '').trim();
  const hasFace = s.eyes > 0 || s.mouth > 0;

  g.push();
  g.translate(x, y);

  g.push();
  g.rotate(s.turn * g.PI / 12);
  g.strokeJoin(g.ROUND);

  // shadow, then the white die-cut paper edge
  g.translate(R * 0.04, R * 0.07);
  g.noFill();
  g.stroke(0, 0, 0, 45);
  g.strokeWeight(R * 0.24);
  g.fill(0, 0, 0, 45);
  outline(g, pts);
  g.translate(-R * 0.04, -R * 0.07);
  g.stroke(255);
  g.fill(255);
  outline(g, pts);

  // body
  g.noStroke();
  g.fill(COLORS[s.fill]);
  outline(g, pts);

  // pattern, clipped to the body
  if (s.pattern > 0) {
    g.push();
    g.beginClip();
    outline(g, pts);
    g.endClip();
    drawPattern(g, s, R);
    g.pop();
  }

  // outline
  if (s.weight > 0) {
    g.noFill();
    g.stroke(ink);
    g.strokeWeight(R * 0.035 * s.weight);
    outline(g, pts);
  }
  g.pop();

  // face and word stay upright
  if (hasFace) drawFace(g, s, R, look || { x: 0, y: 0 }, word ? -R * 0.12 : 0);
  if (word) drawWord(g, word, R, hasFace ? R * 0.55 : 0, hasFace ? 0.3 : 0.5);

  g.pop();
}

function drawPattern(g, s, R) {
  const c = g.color(s.fill === 9 ? FACE_INK : '#ffffff');
  c.setAlpha(s.fill === 9 ? 45 : 95);
  const step = R * 0.3;
  if (PATTERNS[s.pattern] === 'dots') {
    g.noStroke();
    g.fill(c);
    for (let yy = -R * 1.2; yy < R * 1.2; yy += step) {
      for (let xx = -R * 1.2; xx < R * 1.2; xx += step) {
        const shift = Math.round(yy / step) % 2 ? step / 2 : 0;
        g.circle(xx + shift, yy, R * 0.11);
      }
    }
  } else if (PATTERNS[s.pattern] === 'stripes') {
    g.stroke(c);
    g.strokeWeight(R * 0.1);
    for (let i = -R * 2.4; i < R * 2.4; i += step) g.line(i, -R * 1.3, i + R * 1.3, R * 1.3);
  } else {
    g.noStroke();
    g.fill(c);
    for (let yy = -R * 1.2, row = 0; yy < R * 1.2; yy += step, row++) {
      for (let xx = -R * 1.2, col = 0; xx < R * 1.2; xx += step, col++) {
        if ((row + col) % 2 === 0) g.rect(xx, yy, step, step);
      }
    }
  }
}

function drawFace(g, s, R, look, dy) {
  const ey = -R * 0.12 + dy, ex = R * 0.3, my = R * 0.22 + dy;
  const eye = EYES[s.eyes], mouth = MOUTHS[s.mouth];

  for (const side of [-1, 1]) {
    const cx = side * ex;
    if (eye === 'dots') {
      g.noStroke(); g.fill(FACE_INK);
      g.ellipse(cx, ey, R * 0.15, R * 0.19);
    } else if (eye === 'googly') {
      g.stroke(FACE_INK); g.strokeWeight(R * 0.03); g.fill(255);
      g.circle(cx, ey, R * 0.34);
      g.noStroke(); g.fill(FACE_INK);
      g.circle(cx + look.x * R * 0.07, ey + look.y * R * 0.07, R * 0.15);
    } else if (eye === 'hearts') {
      g.noStroke(); g.fill('#e03131');
      const h = R * 0.07;
      g.circle(cx - h * 0.55, ey - h * 0.3, h * 1.3);
      g.circle(cx + h * 0.55, ey - h * 0.3, h * 1.3);
      g.triangle(cx - h * 1.2, ey - h * 0.1, cx + h * 1.2, ey - h * 0.1, cx, ey + h * 1.3);
    } else if (eye === 'x') {
      g.stroke(FACE_INK); g.strokeWeight(R * 0.05);
      const h = R * 0.08;
      g.line(cx - h, ey - h, cx + h, ey + h);
      g.line(cx - h, ey + h, cx + h, ey - h);
    } else if (eye === 'sleepy') {
      g.noFill(); g.stroke(FACE_INK); g.strokeWeight(R * 0.05);
      g.arc(cx, ey - R * 0.02, R * 0.2, R * 0.14, 0, g.PI);
    }
  }

  g.stroke(FACE_INK);
  g.strokeWeight(R * 0.05);
  if (mouth === 'smile') {
    g.noFill();
    g.arc(0, my - R * 0.06, R * 0.4, R * 0.24, 0, g.PI);
  } else if (mouth === 'grin') {
    g.fill(255);
    g.arc(0, my - R * 0.06, R * 0.5, R * 0.38, 0, g.PI, g.CHORD);
  } else if (mouth === 'o') {
    g.noStroke(); g.fill(FACE_INK);
    g.ellipse(0, my, R * 0.16, R * 0.2);
  } else if (mouth === 'flat') {
    g.line(-R * 0.14, my, R * 0.14, my);
  } else if (mouth === 'tongue') {
    g.noStroke(); g.fill('#ff8787');
    g.ellipse(R * 0.06, my + R * 0.08, R * 0.14, R * 0.18);
    g.noFill(); g.stroke(FACE_INK);
    g.arc(0, my - R * 0.06, R * 0.4, R * 0.24, 0, g.PI);
  }
}

function drawWord(g, word, R, wy, scale) {
  g.textFont('Bagel Fat One');
  g.textAlign(g.CENTER, g.CENTER);
  let ts = R * scale;
  g.textSize(ts);
  const w = g.textWidth(word);
  if (w > R * 1.7) { ts *= R * 1.7 / w; g.textSize(ts); }
  g.strokeJoin(g.ROUND);
  g.stroke(255);
  g.strokeWeight(ts * 0.32);
  g.fill(FACE_INK);
  g.text(word, 0, wy);
}
