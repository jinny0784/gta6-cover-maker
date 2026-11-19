// Sunset Vice — Cover Art Maker.
// Turns a person's own photos into multi-panel cover art with a Vice City
// sunset / neon grade and bold display lettering, then exports a PNG.
// Everything runs locally on a <canvas>: photos are read from the person's
// own machine and never uploaded anywhere.

'use strict';

/* ------------------------------------------------------------------ state */

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');

const state = {
  photos: [null, null, null],          // HTMLImageElement per slot, or null
  photoNames: ['', '', ''],
  layout: 'stack',                     // 'stack' | 'triptych' | 'duo'
  width: 1080,
  height: 1350,
  grade: 'sunset',
  accent: '#ff2e88',
  title: 'VICE HEAT',
  tagline: 'One city. No rules.',
  badge: 'EST. 2026',
  grain: true,
  selectedPanel: 0,
  // One framing per panel: zoom multiplies the cover-fit scale, ox / oy
  // shift the photo inside its panel as a fraction of the spare room.
  framing: [
    { zoom: 1.0, ox: 0, oy: 0 },
    { zoom: 1.3, ox: -0.35, oy: 0.1 },
    { zoom: 1.5, ox: 0.3, oy: -0.15 },
    { zoom: 1.18, ox: 0, oy: 0.25 },
  ],
};

/* ------------------------------------------------------------- colour grade */

// Each grade is a canvas filter for the photo itself plus a vertical tint
// gradient laid over it with soft-light, the way a colourist would push a
// sunset or a neon night into a still.
const GRADES = {
  sunset: {
    label: 'Vice sunset',
    filter: 'saturate(1.38) contrast(1.13) brightness(1.04)',
    tint: [[255, 94, 58, 0.22], [255, 46, 136, 0.10], [24, 0, 54, 0.36]],
    shade: 'rgba(16, 0, 34, 0.20)',
  },
  neon: {
    label: 'Neon night',
    filter: 'saturate(1.52) contrast(1.18) brightness(0.98) hue-rotate(-8deg)',
    tint: [[41, 230, 255, 0.16], [124, 77, 255, 0.15], [2, 0, 24, 0.42]],
    shade: 'rgba(0, 2, 20, 0.26)',
  },
  gold: {
    label: 'Gold hour',
    filter: 'saturate(1.25) contrast(1.08) brightness(1.07) sepia(0.22)',
    tint: [[255, 201, 60, 0.20], [255, 138, 60, 0.10], [40, 16, 0, 0.30]],
    shade: 'rgba(26, 10, 0, 0.18)',
  },
  miami: {
    label: 'Miami pastel',
    filter: 'saturate(1.20) contrast(1.05) brightness(1.10)',
    tint: [[125, 240, 255, 0.14], [255, 158, 199, 0.12], [30, 10, 60, 0.22]],
    shade: 'rgba(14, 4, 30, 0.14)',
  },
};

/* ----------------------------------------------------------------- layouts */

// A layout is a list of panels; each panel is a polygon of [x, y] points in
// cover pixels. The slanted shared edges are the poster's signature: panels
// lean into each other instead of sitting in a plain grid.
function layoutPanels(layout, W, H) {
  if (layout === 'triptych') {
    return [
      [[0, 0], [0.365 * W, 0], [0.30 * W, H], [0, H]],
      [[0.365 * W, 0], [0.685 * W, 0], [0.645 * W, H], [0.30 * W, H]],
      [[0.685 * W, 0], [W, 0], [W, H], [0.645 * W, H]],
    ];
  }
  if (layout === 'duo') {
    return [
      [[0, 0], [0.605 * W, 0], [0.545 * W, H], [0, H]],
      [[0.605 * W, 0], [W, 0], [W, H], [0.545 * W, H]],
    ];
  }
  // 'stack': a tall hero panel, two stacked panels at its right, and a wide
  // strip along the bottom that carries the title.
  return [
    [[0, 0], [0.66 * W, 0], [0.63 * W, 0.62 * H], [0, 0.62 * H]],
    [[0.66 * W, 0], [W, 0], [W, 0.335 * H], [0.645 * W, 0.335 * H]],
    [[0.645 * W, 0.335 * H], [W, 0.335 * H], [W, 0.62 * H], [0.63 * W, 0.62 * H]],
    [[0, 0.62 * H], [W, 0.62 * H], [W, H], [0, H]],
  ];
}

function panelCount() {
  return layoutPanels(state.layout, state.width, state.height).length;
}

function loadedPhotos() {
  const out = [];
  for (let i = 0; i < state.photos.length; i++) {
    if (state.photos[i]) out.push(state.photos[i]);
  }
  return out;
}

// Panel i shows loaded photo (i mod count), so a single photo fills every
// panel and three photos spread across them.
function photoForPanel(index) {
  const loaded = loadedPhotos();
  if (loaded.length === 0) return null;
  return loaded[index % loaded.length];
}

/* ------------------------------------------------------------ drawn scenery */

// Placeholder art for an empty panel: an original sunset strip with a sun,
// a skyline and palm silhouettes, drawn from paths — never a copied image.
// It keeps the cover looking finished before a photo is loaded, and each
// panel gets its own hue shift and sun position.
function drawPalm(c, x, y, s, flip) {
  c.save();
  c.translate(x, y);
  c.scale(flip * s, s);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(6, -52, 20, -96);
  c.lineTo(27, -94);
  c.quadraticCurveTo(14, -50, 10, 0);
  c.closePath();
  c.fill();
  const fronds = [[-58, -28], [-40, -44], [-14, -52], [16, -50], [42, -40], [58, -22]];
  c.lineWidth = 6;
  c.lineCap = 'round';
  for (const [fx, fy] of fronds) {
    c.beginPath();
    c.moveTo(23, -95);
    c.quadraticCurveTo(23 + fx * 0.55, -95 + fy * 0.75 - 12, 23 + fx, -95 + fy + 16);
    c.stroke();
  }
  c.restore();
}

function drawPlaceholderPanel(c, box, seed) {
  const { x, y, w, h } = box;
  const skies = [
    ['#2b1055', '#7597de', '#ff7e5f', '#feb47b'],
    ['#0f2027', '#2c5364', '#ff5e8a', '#ffc93c'],
    ['#3a1c71', '#d76d77', '#ffaf7b', '#ffe29f'],
    ['#141e30', '#243b55', '#ff6a5f', '#ffd194'],
  ];
  const pal = skies[seed % skies.length];
  const sky = c.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, pal[0]);
  sky.addColorStop(0.45, pal[1]);
  sky.addColorStop(0.78, pal[2]);
  sky.addColorStop(1, pal[3]);
  c.fillStyle = sky;
  c.fillRect(x, y, w, h);

  // Sun, low over the water line.
  const sunX = x + w * (0.3 + 0.14 * (seed % 3));
  const sunY = y + h * 0.66;
  const sunR = Math.min(w, h) * 0.20;
  const glow = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.6);
  glow.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
  glow.addColorStop(1, 'rgba(255, 120, 80, 0)');
  c.fillStyle = glow;
  c.fillRect(x, y, w, h);
  c.fillStyle = '#ffd873';
  c.beginPath();
  c.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  c.fill();

  // Skyline silhouette.
  c.fillStyle = 'rgba(16, 6, 32, 0.88)';
  c.strokeStyle = 'rgba(16, 6, 32, 0.88)';
  const base = y + h * 0.86;
  let bx = x - 10;
  let i = 0;
  while (bx < x + w + 10) {
    const bw = w * (0.10 + 0.05 * ((seed + i) % 3));
    const bh = h * (0.16 + 0.07 * ((seed * 2 + i) % 4));
    c.fillRect(bx, base - bh, bw, bh + h * 0.14);
    bx += bw + w * 0.025;
    i++;
  }
  c.fillRect(x, base, w, h - (base - y));
  drawPalm(c, x + w * 0.16, y + h * 0.98, Math.min(w, h) / 210, 1);
  drawPalm(c, x + w * 0.88, y + h * 0.99, Math.min(w, h) / 260, -1);
}

/* ----------------------------------------------------------------- panels */

function polygonPath(c, poly) {
  c.beginPath();
  c.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) c.lineTo(poly[i][0], poly[i][1]);
  c.closePath();
}

function polygonBox(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of poly) {
    minX = Math.min(minX, px); minY = Math.min(minY, py);
    maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Draw one photo into one panel: cover-fit the panel's bounding box, apply
// the panel's zoom and shift, grade it, and let the polygon clip do the
// slanted edges.
function drawPhotoPanel(c, poly, img, framing, grade) {
  const box = polygonBox(poly);
  c.save();
  polygonPath(c, poly);
  c.clip();
  const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * framing.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const spareX = Math.max(0, dw - box.w);
  const spareY = Math.max(0, dh - box.h);
  const dx = box.x + (box.w - dw) / 2 + framing.ox * spareX * 0.5;
  const dy = box.y + (box.h - dh) / 2 + framing.oy * spareY * 0.5;
  c.filter = grade.filter;
  c.drawImage(img, dx, dy, dw, dh);
  c.filter = 'none';
  applyGrade(c, box, grade);
  c.restore();
}

function applyGrade(c, box, grade) {
  const tint = c.createLinearGradient(0, box.y, 0, box.y + box.h);
  grade.tint.forEach(([r, g, b, a], i) => {
    tint.addColorStop(i / (grade.tint.length - 1), `rgba(${r}, ${g}, ${b}, ${a})`);
  });
  c.globalCompositeOperation = 'soft-light';
  c.fillStyle = tint;
  c.fillRect(box.x, box.y, box.w, box.h);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = grade.shade;
  c.fillRect(box.x, box.y + box.h * 0.72, box.w, box.h * 0.28);
}

/* --------------------------------------------------------------- lettering */

const TITLE_FONT = '"Arial Narrow", "Liberation Sans Narrow", Impact, "Franklin Gothic Medium", sans-serif';

function fitTitleSize(c, text, maxWidth, startPx) {
  let px = startPx;
  while (px > 24) {
    c.font = `italic 900 ${px}px ${TITLE_FONT}`;
    if (c.measureText(text).width <= maxWidth) break;
    px -= 4;
  }
  return px;
}

// A five-point star drawn from scratch, for the corner badge.
function starPath(c, cx, cy, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const ang = -Math.PI / 2 + i * Math.PI / 5;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
}

function drawBadge(c, W, H, alignLeft) {
  const r = Math.min(W, H) * 0.058;
  const cx = alignLeft ? r + W * 0.028 : W - r - W * 0.028;
  const cy = r + H * 0.024;
  c.save();
  try { c.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fillStyle = 'rgba(10, 4, 24, 0.82)';
  c.fill();
  c.lineWidth = Math.max(3, r * 0.10);
  c.strokeStyle = state.accent;
  c.stroke();
  starPath(c, cx, cy - r * 0.20, r * 0.46);
  c.fillStyle = '#ffc93c';
  c.fill();
  c.fillStyle = '#ffffff';
  // Shrink the badge word until it sits inside the ring.
  let badgePx = Math.max(9, r * 0.30);
  const badgeText = state.badge.toUpperCase();
  while (badgePx > 8) {
    c.font = `700 ${badgePx}px "Segoe UI", Arial, sans-serif`;
    if (c.measureText(badgeText).width <= r * 1.52) break;
    badgePx -= 1;
  }
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(state.badge.toUpperCase(), cx, cy + r * 0.52);
  c.restore();
}

function drawLettering(c, W, H) {
  const grade = GRADES[state.grade];
  const topTitle = state.layout === 'duo';
  c.save();
  try { c.letterSpacing = '0px'; } catch (e) { /* older canvas */ }

  // Scrim so the lettering sits on the art, never fights it.
  const scrimH = H * 0.40;
  const scrim = topTitle
    ? c.createLinearGradient(0, 0, 0, scrimH)
    : c.createLinearGradient(0, H, 0, H - scrimH);
  scrim.addColorStop(0, 'rgba(8, 2, 18, 0.62)');
  scrim.addColorStop(1, 'rgba(8, 2, 18, 0)');
  c.fillStyle = scrim;
  c.fillRect(0, topTitle ? 0 : H - scrimH, W, scrimH);

  const title = (state.title || 'UNTITLED').toUpperCase();
  const maxW = W * 0.92;
  const px = fitTitleSize(c, title, maxW, W * 0.165);
  c.font = `italic 900 ${px}px ${TITLE_FONT}`;
  try { c.letterSpacing = `${Math.round(px * 0.012)}px`; } catch (e) { /* older canvas */ }
  const titleW = c.measureText(title).width;
  const titleX = topTitle ? W * 0.045 : (W - titleW) / 2;
  const titleBase = topTitle ? H * 0.045 + px * 0.92 : H * 0.955 - px * 0.30;

  // Neon tagline bar above the title.
  const tag = (state.tagline || '').toUpperCase();
  if (tag) {
    c.font = `800 ${Math.round(px * 0.21)}px "Segoe UI", Arial, sans-serif`;
    try { c.letterSpacing = `${Math.round(px * 0.045)}px`; } catch (e) { /* older canvas */ }
    const tagW = c.measureText(tag).width;
    const padX = px * 0.22;
    const barH = px * 0.36;
    const barW = Math.min(titleW, tagW + padX * 2);
    const barX = topTitle ? titleX : (W - barW) / 2;
    const barY = topTitle ? titleBase + px * 0.16 : titleBase - px * 1.06;
    c.save();
    // Pre-shift so the italic lean pivots around the bar instead of
    // dragging it sideways off its centred position.
    c.translate(0.06 * (barY + barH / 2), 0);
    c.transform(1, 0, -0.06, 1, 0, 0);
    c.fillStyle = state.accent;
    c.fillRect(barX, barY, barW, barH);
    c.fillStyle = '#12041f';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(tag, barX + barW / 2, barY + barH * 0.54, barW - padX);
    c.restore();
  }

  // The title itself: accent echo, hard black outline, warm white face.
  // The same pivot trick as the tagline bar keeps a full-width title from
  // leaning off the left edge of the cover.
  c.save();
  c.translate(0.055 * titleBase, 0);
  c.transform(1, 0, -0.055, 1, 0, 0);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.font = `italic 900 ${px}px ${TITLE_FONT}`;
  c.fillStyle = state.accent;
  c.fillText(title, titleX + px * 0.045, titleBase + px * 0.05);
  c.lineJoin = 'round';
  c.lineWidth = px * 0.17;
  c.strokeStyle = '#0a0614';
  c.strokeText(title, titleX, titleBase);
  const face = c.createLinearGradient(0, titleBase - px, 0, titleBase);
  face.addColorStop(0, '#ffffff');
  face.addColorStop(0.75, '#fff3da');
  face.addColorStop(1, '#ffc98a');
  c.fillStyle = face;
  c.fillText(title, titleX, titleBase);
  // Neon underline that runs the width of the word.
  const under = c.createLinearGradient(titleX, 0, titleX + titleW, 0);
  under.addColorStop(0, state.accent);
  under.addColorStop(1, '#29e6ff');
  c.fillStyle = under;
  c.fillRect(titleX + px * 0.02, titleBase + px * 0.10, titleW * 0.985, px * 0.085);
  c.restore();

  drawBadge(c, W, H, topTitle);
  c.restore();
}

/* ---------------------------------------------------------------- finishing */

// One tile of film grain, generated once and reused as a pattern.
const grainTile = (() => {
  const t = document.createElement('canvas');
  t.width = 180; t.height = 180;
  const g = t.getContext('2d');
  const img = g.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 128);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return t;
})();

function drawFinishing(c, W, H) {
  if (state.grain) {
    c.save();
    c.globalCompositeOperation = 'overlay';
    c.globalAlpha = 0.07;
    c.fillStyle = c.createPattern(grainTile, 'repeat');
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  const vig = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.36, W / 2, H / 2, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(8, 0, 18, 0)');
  vig.addColorStop(1, 'rgba(8, 0, 18, 0.40)');
  c.fillStyle = vig;
  c.fillRect(0, 0, W, H);
}

/* -------------------------------------------------------------------- render */

function render() {
  const W = state.width;
  const H = state.height;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const grade = GRADES[state.grade];
  const panels = layoutPanels(state.layout, W, H);

  ctx.fillStyle = '#160f2a';
  ctx.fillRect(0, 0, W, H);

  panels.forEach((poly, i) => {
    const img = photoForPanel(i);
    if (img) {
      drawPhotoPanel(ctx, poly, img, state.framing[i], grade);
    } else {
      ctx.save();
      polygonPath(ctx, poly);
      ctx.clip();
      drawPlaceholderPanel(ctx, polygonBox(poly), i);
      ctx.restore();
    }
  });

  // Keylines: a dark cut, then a bright edge — the printed-poster look.
  const keyW = Math.max(5, W * 0.0075);
  for (const poly of panels) {
    polygonPath(ctx, poly);
    ctx.lineWidth = keyW * 2.1;
    ctx.strokeStyle = '#0a0614';
    ctx.stroke();
    polygonPath(ctx, poly);
    ctx.lineWidth = keyW * 0.9;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.stroke();
  }
  ctx.strokeStyle = '#0a0614';
  ctx.lineWidth = keyW * 2.4;
  ctx.strokeRect(0, 0, W, H);

  drawLettering(ctx, W, H);
  drawFinishing(ctx, W, H);

  document.getElementById('metaSize').textContent = `${W} × ${H}`;
  document.getElementById('metaLayout').textContent =
    { stack: 'Cover stack', triptych: 'Triptych', duo: 'Big duo' }[state.layout];
  document.getElementById('metaGrade').textContent = grade.label;
}

/* ------------------------------------------------------------------ controls */

function syncFramingControls() {
  const f = state.framing[state.selectedPanel];
  document.getElementById('zoomRange').value = Math.round(f.zoom * 100);
  document.getElementById('xRange').value = Math.round(f.ox * 100);
  document.getElementById('yRange').value = Math.round(f.oy * 100);
  document.getElementById('zoomVal').textContent = `— ${Math.round(f.zoom * 100)}%`;
  document.getElementById('xVal').textContent = `— ${Math.round(f.ox * 100)}`;
  document.getElementById('yVal').textContent = `— ${Math.round(f.oy * 100)}`;
}

function setSlotPhoto(slot, img, name) {
  state.photos[slot] = img;
  state.photoNames[slot] = name;
  document.getElementById(`thumb${slot}`).src = img.src;
  document.getElementById(`name${slot}`).textContent = name;
  render();
}

for (let slot = 0; slot < 3; slot++) {
  document.getElementById(`pick${slot}`).addEventListener('click', () => {
    document.getElementById(`file${slot}`).click();
  });
  document.getElementById(`file${slot}`).addEventListener('change', (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setSlotPhoto(slot, img, file.name);
    img.src = url;
  });
}

document.getElementById('sampleBtn').addEventListener('click', () => {
  const img = new Image();
  img.onload = () => setSlotPhoto(0, img, 'Sample — sunset strip (built in)');
  img.src = 'sample.jpg';
});

document.getElementById('clearBtn').addEventListener('click', () => {
  for (let slot = 0; slot < 3; slot++) {
    state.photos[slot] = null;
    state.photoNames[slot] = '';
    document.getElementById(`thumb${slot}`).removeAttribute('src');
    document.getElementById(`name${slot}`).textContent = `Photo ${'ABC'[slot]} — empty`;
  }
  render();
});

document.getElementById('titleInput').addEventListener('input', (ev) => { state.title = ev.target.value; render(); });
document.getElementById('taglineInput').addEventListener('input', (ev) => { state.tagline = ev.target.value; render(); });
document.getElementById('badgeInput').addEventListener('input', (ev) => { state.badge = ev.target.value; render(); });
document.getElementById('gradeSelect').addEventListener('change', (ev) => { state.grade = ev.target.value; render(); });
document.getElementById('grainCheck').addEventListener('change', (ev) => { state.grain = ev.target.checked; render(); });

function segWire(id, attr, apply) {
  const seg = document.getElementById(id);
  seg.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    for (const b of seg.querySelectorAll('button')) b.classList.toggle('on', b === btn);
    apply(btn.dataset[attr]);
  });
}

segWire('layoutSeg', 'layout', (v) => { state.layout = v; render(); });
segWire('sizeSeg', 'size', (v) => {
  const [w, h] = v.split('x').map(Number);
  state.width = w; state.height = h; render();
});
segWire('panelSeg', 'panel', (v) => {
  state.selectedPanel = Math.min(Number(v), panelCount() - 1);
  syncFramingControls();
});

document.getElementById('accentRow').addEventListener('click', (ev) => {
  const sw = ev.target.closest('.swatch');
  if (!sw) return;
  for (const s of document.querySelectorAll('.swatch')) s.classList.toggle('on', s === sw);
  state.accent = sw.dataset.accent;
  render();
});

for (const [id, key] of [['zoomRange', 'zoom'], ['xRange', 'ox'], ['yRange', 'oy']]) {
  document.getElementById(id).addEventListener('input', (ev) => {
    const f = state.framing[state.selectedPanel];
    f[key] = Number(ev.target.value) / 100;
    syncFramingControls();
    render();
  });
}

// Drag on the cover itself: grab a panel, slide its photo around.
let drag = null;
canvas.addEventListener('pointerdown', (ev) => {
  const rect = canvas.getBoundingClientRect();
  const px = (ev.clientX - rect.left) * (canvas.width / rect.width);
  const py = (ev.clientY - rect.top) * (canvas.height / rect.height);
  const panels = layoutPanels(state.layout, state.width, state.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const box = polygonBox(panels[i]);
    if (px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h) {
      state.selectedPanel = i;
      for (const b of document.querySelectorAll('#panelSeg button')) {
        b.classList.toggle('on', Number(b.dataset.panel) === i);
      }
      syncFramingControls();
      drag = { x: ev.clientX, y: ev.clientY };
      canvas.setPointerCapture(ev.pointerId);
      break;
    }
  }
});
canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const f = state.framing[state.selectedPanel];
  f.ox = Math.max(-1, Math.min(1, f.ox + (ev.clientX - drag.x) / rect.width * 1.6));
  f.oy = Math.max(-1, Math.min(1, f.oy + (ev.clientY - drag.y) / rect.height * 1.6));
  drag = { x: ev.clientX, y: ev.clientY };
  syncFramingControls();
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });

document.getElementById('exportBtn').addEventListener('click', () => {
  render();
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sunset-vice-cover-${state.width}x${state.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
});

// A small handle for tools and screenshot drivers: render on demand and
// hand back the finished cover as a PNG data URL.
window.CoverApp = {
  render,
  exportDataURL() { render(); return canvas.toDataURL('image/png'); },
  setSize(w, h) { state.width = w; state.height = h; render(); },
  setLayout(v) { state.layout = v; render(); },
  setTitle(t) { state.title = t; document.getElementById('titleInput').value = t; render(); },
  setTagline(t) { state.tagline = t; document.getElementById('taglineInput').value = t; render(); },
  photoCount() { return loadedPhotos().length; },
};

syncFramingControls();
render();
